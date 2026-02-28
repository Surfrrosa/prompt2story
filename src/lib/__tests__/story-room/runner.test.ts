import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgent } from '../../story-room/runner';
import { AGENT_REGISTRY } from '../../story-room/agents';

// Mock fs.readFileSync to return a template
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => `
# {{title}}
> {{tagline}}
You are {{title}}. Analyze the following:
{{contextJson}}
Output your analysis then a JSON block.
`),
}));

// Helper: create an async iterable that yields chunks
function createMockStream(texts: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of texts) {
        yield { choices: [{ delta: { content: text } }] };
      }
    },
  };
}

// Helper: create a stream that never resolves (for timeout testing)
function createHangingStream() {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: 'Thinking...' } }] };
      // Then hang forever
      await new Promise(() => {});
    },
  };
}

function createMockOpenAI(stream: any) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockReturnValue(stream),
      },
    },
  } as any;
}

describe('runAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs agent and extracts structured output', async () => {
    const stream = createMockStream([
      'Analyzing the requirements. I see a todo app request.',
      '\n\n```json\n',
      '{"personas":[],"features":[],"assumptions":["Modern browsers"],"ambiguities":[]}\n',
      '```',
    ]);
    const mockOpenAI = createMockOpenAI(stream);
    const onChunk = vi.fn();

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Build a todo app' });

    const result = await runAgent(
      mockOpenAI,
      AGENT_REGISTRY['requirements-analyst'],
      context,
      10_000,
      onChunk,
    );

    expect(result.structured).toBeDefined();
    expect((result.structured as any).assumptions).toEqual(['Modern browsers']);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(onChunk).toHaveBeenCalled();
  });

  it('passes only declared context fields to the agent', async () => {
    const stream = createMockStream([
      '```json\n{"epics":[],"sequencing":[]}\n```',
    ]);
    const mockOpenAI = createMockOpenAI(stream);

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });
    context.set('parsedRequirements', { personas: [], features: [] });
    context.set('extraField', 'should not be passed');

    await runAgent(
      mockOpenAI,
      AGENT_REGISTRY['story-architect'],
      context,
      10_000,
      vi.fn(),
    );

    // Check that the system message was built with only the declared fields
    const createCall = mockOpenAI.chat.completions.create.mock.calls[0][0];
    const systemMessage = createCall.messages[0].content;
    expect(systemMessage).toContain('parsedRequirements');
    expect(systemMessage).not.toContain('extraField');
  });

  it('enforces timeout', async () => {
    const stream = createHangingStream();
    const mockOpenAI = createMockOpenAI(stream);

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });

    await expect(
      runAgent(
        mockOpenAI,
        AGENT_REGISTRY['requirements-analyst'],
        context,
        100, // Very short timeout
        vi.fn(),
      )
    ).rejects.toThrow(/timed out/);
  });

  it('calls onChunk for each text chunk', async () => {
    const stream = createMockStream([
      'First chunk. ',
      'Second chunk. ',
      '```json\n{"personas":[],"features":[],"assumptions":[],"ambiguities":[]}\n```',
    ]);
    const mockOpenAI = createMockOpenAI(stream);
    const onChunk = vi.fn();

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });

    await runAgent(
      mockOpenAI,
      AGENT_REGISTRY['requirements-analyst'],
      context,
      10_000,
      onChunk,
    );

    expect(onChunk).toHaveBeenCalledTimes(3);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'First chunk. ');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Second chunk. ');
  });

  it('uses the correct model from agent config', async () => {
    const stream = createMockStream([
      '```json\n{"personas":[],"features":[],"assumptions":[],"ambiguities":[]}\n```',
    ]);
    const mockOpenAI = createMockOpenAI(stream);

    const context = new Map<string, unknown>();
    context.set('rawInput', { description: 'Test' });

    await runAgent(
      mockOpenAI,
      AGENT_REGISTRY['requirements-analyst'],
      context,
      10_000,
      vi.fn(),
    );

    const createCall = mockOpenAI.chat.completions.create.mock.calls[0][0];
    expect(createCall.model).toBe('gpt-4o-mini');
    expect(createCall.stream).toBe(true);
  });
});
