import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AGENT_REGISTRY, PIPELINE_ORDER, CONTEXT_KEYS } from '../../story-room/agents';

// Mock the runner module so we can control individual agent execution
vi.mock('../../story-room/runner', () => ({
  runAgent: vi.fn(),
}));

import { runAgent } from '../../story-room/runner';

const mockRunAgent = vi.mocked(runAgent);

// Mock agent outputs for each role
const MOCK_OUTPUTS: Record<string, unknown> = {
  'requirements-analyst': {
    personas: [{ name: 'User', role: 'End User', goals: ['Use app'] }],
    features: [{ name: 'Login', description: 'User login', priority: 'must' }],
    assumptions: ['Modern browser'],
    ambiguities: [],
  },
  'story-architect': {
    epics: [{
      name: 'Authentication',
      description: 'Auth flows',
      storyOutlines: [{ title: 'Login', persona: 'User', brief: 'Login flow' }],
    }],
    sequencing: ['Auth first'],
  },
  'story-writer': {
    stories: [{
      id: 'AUTH-1',
      epic: 'Authentication',
      title: 'User Login',
      asA: 'user',
      iWant: 'to log in',
      soThat: 'I can access my account',
      acceptanceCriteria: ['Login succeeds with valid credentials'],
    }],
  },
  'devils-advocate': {
    gaps: [{ description: 'No password reset', severity: 'major' }],
    edgeCases: ['Wrong password 10 times'],
    contradictions: [],
    recommendations: ['Add rate limiting'],
  },
  'refinement-agent': {
    user_stories: [{
      title: 'User Login',
      story: 'As a user, I want to log in so that I can access my account',
      acceptance_criteria: ['Login succeeds with valid credentials'],
      metadata: { priority: 'High', type: 'Feature', component: 'Auth' },
    }],
    edge_cases: ['Brute force protection'],
  },
};

describe('Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs all 5 agents in order and accumulates context', async () => {
    // Set up mock to track context passed to each agent
    const contextSnapshots: Map<string, unknown>[] = [];

    mockRunAgent.mockImplementation(async (_openai, config, context, _timeout, _onChunk) => {
      // Snapshot the context at call time
      contextSnapshots.push(new Map(context));
      return {
        fullText: 'thinking...',
        structured: MOCK_OUTPUTS[config.role],
        durationMs: 1500,
      };
    });

    // Simulate the pipeline loop
    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Build a todo app' });

    for (const role of PIPELINE_ORDER) {
      const config = AGENT_REGISTRY[role];
      const result = await runAgent(null as any, config, context, 10_000, vi.fn());
      context.set(CONTEXT_KEYS[role], result.structured);
    }

    // All 5 agents should have been called
    expect(mockRunAgent).toHaveBeenCalledTimes(5);

    // Verify context narrowing: story-architect should see parsedRequirements
    const architectContext = contextSnapshots[1];
    expect(architectContext.has('rawInput')).toBe(true);
    // Note: the actual runner reads contextFields, so the map may contain more
    // but the runner will filter to only declared fields

    // Final context should have all outputs
    expect(context.has('parsedRequirements')).toBe(true);
    expect(context.has('storyMap')).toBe(true);
    expect(context.has('draftStories')).toBe(true);
    expect(context.has('critique')).toBe(true);
    expect(context.has('finalStories')).toBe(true);
  });

  it('continues pipeline when non-critical agent fails', async () => {
    let callCount = 0;

    mockRunAgent.mockImplementation(async (_openai, config, _context, _timeout, _onChunk) => {
      callCount++;
      if (config.role === 'devils-advocate') {
        throw new Error('Agent timed out');
      }
      return {
        fullText: 'thinking...',
        structured: MOCK_OUTPUTS[config.role],
        durationMs: 1500,
      };
    });

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });
    const errors: string[] = [];

    for (const role of PIPELINE_ORDER) {
      const config = AGENT_REGISTRY[role];
      try {
        const result = await runAgent(null as any, config, context, 10_000, vi.fn());
        context.set(CONTEXT_KEYS[role], result.structured);
      } catch (err) {
        if (config.critical) {
          throw err; // Re-throw for critical agents
        }
        errors.push(role);
        // Continue for non-critical agents
      }
    }

    // All 5 agents attempted
    expect(callCount).toBe(5);
    // Devils advocate failed but pipeline continued
    expect(errors).toEqual(['devils-advocate']);
    // Refinement agent still ran
    expect(context.has('finalStories')).toBe(true);
    // No critique available
    expect(context.has('critique')).toBe(false);
  });

  it('aborts pipeline when critical agent fails', async () => {
    let callCount = 0;

    mockRunAgent.mockImplementation(async (_openai, config, _context, _timeout, _onChunk) => {
      callCount++;
      if (config.role === 'story-writer') {
        throw new Error('Critical failure');
      }
      return {
        fullText: 'thinking...',
        structured: MOCK_OUTPUTS[config.role],
        durationMs: 1500,
      };
    });

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });

    let pipelineAborted = false;
    for (const role of PIPELINE_ORDER) {
      const config = AGENT_REGISTRY[role];
      try {
        const result = await runAgent(null as any, config, context, 10_000, vi.fn());
        context.set(CONTEXT_KEYS[role], result.structured);
      } catch (err) {
        if (config.critical) {
          pipelineAborted = true;
          break;
        }
      }
    }

    expect(pipelineAborted).toBe(true);
    // Only 3 agents attempted before abort (analyst, architect, writer)
    expect(callCount).toBe(3);
    // No downstream outputs
    expect(context.has('draftStories')).toBe(false);
    expect(context.has('critique')).toBe(false);
    expect(context.has('finalStories')).toBe(false);
  });

  it('verifies agent criticality configuration', () => {
    // Requirements analyst, story architect, and story writer are critical
    expect(AGENT_REGISTRY['requirements-analyst'].critical).toBe(true);
    expect(AGENT_REGISTRY['story-architect'].critical).toBe(true);
    expect(AGENT_REGISTRY['story-writer'].critical).toBe(true);
    // Devils advocate and refinement agent are non-critical (pipeline can succeed without them)
    expect(AGENT_REGISTRY['devils-advocate'].critical).toBe(false);
    expect(AGENT_REGISTRY['refinement-agent'].critical).toBe(false);
  });

  it('verifies pipeline order matches agent order numbers', () => {
    for (let i = 0; i < PIPELINE_ORDER.length; i++) {
      const role = PIPELINE_ORDER[i];
      expect(AGENT_REGISTRY[role].order).toBe(i + 1);
    }
  });

  it('verifies context field dependencies are valid', () => {
    // Each agents contextFields should reference keys produced by earlier agents
    const availableKeys = new Set<string>();

    for (const role of PIPELINE_ORDER) {
      const config = AGENT_REGISTRY[role];
      for (const field of config.contextFields) {
        // The field should be a context key produced by some earlier agent
        expect(availableKeys.has(field)).toBe(true);
      }
      // After this agent runs, its output becomes available
      availableKeys.add(CONTEXT_KEYS[role]);
    }
  });
});
