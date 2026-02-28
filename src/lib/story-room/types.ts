// Story Room: Multi-agent pipeline types
// Shared between backend orchestrator and frontend state machine

export type AgentRole =
  | 'requirements-analyst'
  | 'story-architect'
  | 'story-writer'
  | 'devils-advocate'
  | 'refinement-agent';

export interface AgentConfig {
  role: AgentRole;
  order: number;
  title: string;
  tagline: string;
  promptTemplate: string;
  timeoutMs: number;
  maxTokens: number;
  model: string;
  critical: boolean;
  contextFields: string[];
}

export type AgentStatus = 'waiting' | 'thinking' | 'complete' | 'error' | 'skipped';

// SSE event payloads

export interface AgentStatusEvent {
  status: AgentStatus;
  message?: string;
}

export interface AgentChunkEvent {
  text: string;
  accumulated: number;
}

export interface AgentCompleteEvent {
  status: 'complete' | 'error';
  output: unknown;
  durationMs: number;
}

export interface HandoffEvent {
  fromAgent: AgentRole;
  toAgent: AgentRole;
  message: string;
}

export interface PipelineDoneEvent {
  totalDurationMs: number;
  finalOutput: unknown;
  agentSummaries: AgentSummary[];
}

export interface PipelineErrorEvent {
  failedAgent: AgentRole;
  error: string;
  partialOutput?: unknown;
}

export interface AgentSummary {
  role: AgentRole;
  status: AgentStatus;
  durationMs: number;
}

// Discriminated union for SSE events
export type StoryRoomSSEEvent =
  | { type: 'agent-status'; agentRole: AgentRole; data: AgentStatusEvent; timestamp: number; correlationId: string }
  | { type: 'agent-chunk'; agentRole: AgentRole; data: AgentChunkEvent; timestamp: number; correlationId: string }
  | { type: 'agent-complete'; agentRole: AgentRole; data: AgentCompleteEvent; timestamp: number; correlationId: string }
  | { type: 'handoff'; agentRole: AgentRole; data: HandoffEvent; timestamp: number; correlationId: string }
  | { type: 'pipeline-done'; agentRole: AgentRole; data: PipelineDoneEvent; timestamp: number; correlationId: string }
  | { type: 'pipeline-error'; agentRole: AgentRole; data: PipelineErrorEvent; timestamp: number; correlationId: string };

// State used by both backend tracking and frontend reducer

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  streamedText: string;
  output: unknown | null;
  durationMs: number;
  error?: string;
}

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error' | 'aborted';

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
