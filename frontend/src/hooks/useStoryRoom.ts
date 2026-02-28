// Story Room: useReducer-based state machine for the multi-agent pipeline
// Includes a playback queue to create smooth sequential animation even when
// events arrive batched (Vercel dev buffers SSE responses)

import { useReducer, useCallback, useRef } from 'react';

// Agent types inlined to avoid cross-package import issues with Vite
type AgentRole =
  | 'requirements-analyst'
  | 'story-architect'
  | 'story-writer'
  | 'devils-advocate'
  | 'refinement-agent';

type AgentStatus = 'waiting' | 'thinking' | 'complete' | 'error' | 'skipped';
type PipelineStatus = 'idle' | 'running' | 'complete' | 'error' | 'aborted';

interface HandoffEvent {
  fromAgent: AgentRole;
  toAgent: AgentRole;
  message: string;
}

interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  streamedText: string;
  output: unknown | null;
  durationMs: number;
  error?: string;
}

export interface PipelineState {
  correlationId: string;
  status: PipelineStatus;
  agents: Record<AgentRole, AgentState>;
  currentAgent: AgentRole | null;
  handoffMessages: HandoffEvent[];
  startedAt: number | null;
  elapsedMs: number;
  budgetMs: number;
  finalOutput: unknown | null;
}

const PIPELINE_ORDER: AgentRole[] = [
  'requirements-analyst',
  'story-architect',
  'story-writer',
  'devils-advocate',
  'refinement-agent',
];

// Reducer actions

type StoryRoomAction =
  | { type: 'START_PIPELINE'; correlationId: string }
  | { type: 'AGENT_STATUS'; role: AgentRole; status: AgentStatus; message?: string }
  | { type: 'AGENT_CHUNK'; role: AgentRole; text: string }
  | { type: 'AGENT_COMPLETE'; role: AgentRole; output: unknown; durationMs: number }
  | { type: 'HANDOFF'; fromAgent: AgentRole; toAgent: AgentRole; message: string }
  | { type: 'PIPELINE_DONE'; finalOutput: unknown; totalDurationMs: number }
  | { type: 'PIPELINE_ERROR'; failedAgent: AgentRole; error: string }
  | { type: 'ABORT' }
  | { type: 'RESET' }
  | { type: 'TICK' };

function createInitialState(): PipelineState {
  const agents = {} as Record<AgentRole, AgentState>;
  for (const role of PIPELINE_ORDER) {
    agents[role] = {
      role,
      status: 'waiting',
      streamedText: '',
      output: null,
      durationMs: 0,
    };
  }
  return {
    correlationId: '',
    status: 'idle',
    agents,
    currentAgent: null,
    handoffMessages: [],
    startedAt: null,
    elapsedMs: 0,
    budgetMs: 55_000,
    finalOutput: null,
  };
}

function storyRoomReducer(state: PipelineState, action: StoryRoomAction): PipelineState {
  switch (action.type) {
    case 'START_PIPELINE':
      return {
        ...createInitialState(),
        status: 'running',
        correlationId: action.correlationId,
        startedAt: Date.now(),
      };

    case 'AGENT_STATUS':
      return {
        ...state,
        currentAgent: action.status === 'thinking' ? action.role : state.currentAgent,
        agents: {
          ...state.agents,
          [action.role]: {
            ...state.agents[action.role],
            status: action.status,
            error: action.message,
          },
        },
      };

    case 'AGENT_CHUNK':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.role]: {
            ...state.agents[action.role],
            streamedText: state.agents[action.role].streamedText + action.text,
          },
        },
      };

    case 'AGENT_COMPLETE':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.role]: {
            ...state.agents[action.role],
            status: 'complete',
            output: action.output,
            durationMs: action.durationMs,
          },
        },
      };

    case 'HANDOFF':
      return {
        ...state,
        handoffMessages: [
          ...state.handoffMessages,
          { fromAgent: action.fromAgent, toAgent: action.toAgent, message: action.message },
        ],
      };

    case 'PIPELINE_DONE':
      return {
        ...state,
        status: 'complete',
        currentAgent: null,
        finalOutput: action.finalOutput,
        elapsedMs: action.totalDurationMs,
      };

    case 'PIPELINE_ERROR':
      return {
        ...state,
        status: 'error',
        currentAgent: null,
        agents: {
          ...state.agents,
          [action.failedAgent]: {
            ...state.agents[action.failedAgent],
            status: 'error',
            error: action.error,
          },
        },
      };

    case 'ABORT':
      return { ...state, status: 'aborted', currentAgent: null };

    case 'RESET':
      return createInitialState();

    case 'TICK':
      return {
        ...state,
        elapsedMs: state.startedAt ? Date.now() - state.startedAt : 0,
      };

    default:
      return state;
  }
}

// SSE event -> reducer action mapping
function toAction(event: any): StoryRoomAction | null {
  switch (event.type) {
    case 'agent-status':
      return { type: 'AGENT_STATUS', role: event.agentRole, status: event.data.status, message: event.data.message };
    case 'agent-chunk':
      return { type: 'AGENT_CHUNK', role: event.agentRole, text: event.data.text };
    case 'agent-complete':
      return { type: 'AGENT_COMPLETE', role: event.agentRole, output: event.data.output, durationMs: event.data.durationMs };
    case 'handoff':
      return { type: 'HANDOFF', fromAgent: event.data.fromAgent, toAgent: event.data.toAgent, message: event.data.message };
    case 'pipeline-done':
      return { type: 'PIPELINE_DONE', finalOutput: event.data.finalOutput, totalDurationMs: event.data.totalDurationMs };
    case 'pipeline-error':
      return { type: 'PIPELINE_ERROR', failedAgent: event.data.failedAgent, error: event.data.error };
    default:
      return null;
  }
}

// Playback delay per event type -- creates the typewriter/reveal effect
function getPlaybackDelay(action: StoryRoomAction): number {
  switch (action.type) {
    case 'AGENT_STATUS':
      // Pause before an agent starts thinking -- the card needs to appear first
      return (action as any).status === 'thinking' ? 300 : 150;
    case 'AGENT_CHUNK': {
      // Typing speed: scale delay by chunk length for consistent reading pace
      const textLen = (action as any).text?.length || 1;
      return Math.min(Math.max(textLen * 6, 12), 80);
    }
    case 'AGENT_COMPLETE':
      return 400;
    case 'HANDOFF':
      return 600;
    case 'PIPELINE_DONE':
    case 'PIPELINE_ERROR':
      return 250;
    default:
      return 50;
  }
}

export function useStoryRoom() {
  const [state, dispatch] = useReducer(storyRoomReducer, undefined, createInitialState);
  const abortRef = useRef<AbortController | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventQueueRef = useRef<StoryRoomAction[]>([]);
  const isPlayingRef = useRef(false);

  // Drain the event queue with delays between dispatches
  const drainQueue = useCallback(() => {
    if (eventQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const action = eventQueueRef.current.shift()!;
    dispatch(action);

    const delay = getPlaybackDelay(action);
    playbackRef.current = setTimeout(drainQueue, delay);
  }, []);

  // Enqueue an action for playback
  const enqueue = useCallback((action: StoryRoomAction) => {
    eventQueueRef.current.push(action);
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      drainQueue();
    }
  }, [drainQueue]);

  const startPipeline = useCallback(async (description: string, context?: string) => {
    // Abort any existing run
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Clear any pending playback
    if (playbackRef.current) clearTimeout(playbackRef.current);
    eventQueueRef.current = [];
    isPlayingRef.current = false;

    const correlationId = crypto.randomUUID();
    dispatch({ type: 'START_PIPELINE', correlationId });

    // Start elapsed time ticker
    tickRef.current = setInterval(() => dispatch({ type: 'TICK' }), 250);

    try {
      const response = await fetch('/api/story-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ description, context }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody?.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split('\n\n');
        buffer = segments.pop() || '';

        for (const segment of segments) {
          if (!segment.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(segment.slice(6));
            const action = toAction(event);
            if (action) enqueue(action);
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        dispatch({ type: 'ABORT' });
      } else {
        dispatch({
          type: 'PIPELINE_ERROR',
          failedAgent: 'requirements-analyst',
          error: (err as Error).message,
        });
      }
    } finally {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
  }, [enqueue]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    eventQueueRef.current = [];
    isPlayingRef.current = false;
    dispatch({ type: 'ABORT' });
  }, []);

  const reset = useCallback(() => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    eventQueueRef.current = [];
    isPlayingRef.current = false;
    dispatch({ type: 'RESET' });
  }, []);

  return { state, startPipeline, abort, reset };
}

// Re-export types for components
export type { AgentRole, AgentStatus, AgentState, HandoffEvent, PipelineStatus };
export { PIPELINE_ORDER };
