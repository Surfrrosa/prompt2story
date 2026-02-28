import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { setCorsHeaders, getEnv } from './_env.js';
import { StoryRoomInputSchema } from '../src/lib/story-room/schemas.js';
import {
  AGENT_REGISTRY,
  PIPELINE_ORDER,
  HANDOFF_MESSAGES,
  TOTAL_BUDGET_MS,
  CONTEXT_KEYS,
} from '../src/lib/story-room/agents.js';
import { runAgent } from '../src/lib/story-room/runner.js';
import { sendSSE, setupSSEHeaders } from '../src/lib/story-room/sse.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  logRequest,
  logError,
  getCorrelationId,
} from '../src/lib/api-response.js';
import type { AgentRole, AgentSummary } from '../src/lib/story-room/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiResponse = new ApiResponse(req, res);
  const origin = (req.headers.origin as string) ?? null;
  const correlationId = getCorrelationId(req);

  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return apiResponse.error(new ApiError(
      ApiErrorCode.METHOD_NOT_ALLOWED,
      'Only POST method is allowed'
    ));
  }

  // Rate limiting (same tier as generation endpoints)
  const rateLimitResult = rateLimiters.generation(req);
  Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateLimitResult.allowed) {
    return apiResponse.rateLimited(
      rateLimitResult.resetTime,
      Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    );
  }

  logRequest(req, correlationId, { endpoint: 'story-room' });

  // Validate environment
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return apiResponse.error(new ApiError(
      ApiErrorCode.CONFIGURATION_ERROR,
      'Missing required environment variable: OPENAI_API_KEY'
    ));
  }

  // Validate input
  const parsed = StoryRoomInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiResponse.validationError({
      detail: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
    });
  }

  // SSE mode only -- set headers and start pipeline
  setupSSEHeaders(res, correlationId);

  try {
    await runPipeline(res, parsed.data, correlationId, env.OPENAI_API_KEY);
  } catch (err) {
    logError(
      err instanceof Error ? err : new Error(String(err)),
      correlationId,
      { endpoint: 'story-room' }
    );
    sendSSE(res, {
      type: 'pipeline-error',
      agentRole: 'requirements-analyst',
      data: {
        failedAgent: 'requirements-analyst',
        error: err instanceof Error ? err.message : 'Unexpected pipeline error',
      },
    }, correlationId);
  } finally {
    res.end();
  }
}

async function runPipeline(
  res: VercelResponse,
  input: { description: string; context?: string },
  correlationId: string,
  apiKey: string,
): Promise<void> {
  const openai = new OpenAI({
    apiKey,
    timeout: 50_000,
    maxRetries: 1,
  });

  const context = new Map<string, unknown>();
  context.set('rawInput', input);

  const budgetStart = Date.now();
  const agentSummaries: AgentSummary[] = [];
  let accumulatedChars = 0;

  for (let i = 0; i < PIPELINE_ORDER.length; i++) {
    const role: AgentRole = PIPELINE_ORDER[i]!;
    const config = AGENT_REGISTRY[role];
    const elapsed = Date.now() - budgetStart;
    const remaining = TOTAL_BUDGET_MS - elapsed;

    // Budget check
    if (remaining < 3000) {
      if (!config.critical) {
        sendSSE(res, {
          type: 'agent-status',
          agentRole: role,
          data: { status: 'skipped', message: 'Budget exhausted' },
        }, correlationId);
        agentSummaries.push({ role, status: 'skipped', durationMs: 0 });
        continue;
      }
      // Critical agent with no budget
      sendSSE(res, {
        type: 'pipeline-error',
        agentRole: role,
        data: {
          failedAgent: role,
          error: 'Time budget exhausted before critical agent could run',
        },
      }, correlationId);
      return;
    }

    const agentTimeout = Math.min(config.timeoutMs, remaining - 2000);

    // Signal: agent is thinking
    sendSSE(res, {
      type: 'agent-status',
      agentRole: role,
      data: { status: 'thinking' },
    }, correlationId);

    const agentStart = Date.now();

    try {
      const result = await runAgent(openai, config, context, agentTimeout, (chunk) => {
        accumulatedChars += chunk.length;
        sendSSE(res, {
          type: 'agent-chunk',
          agentRole: role,
          data: { text: chunk, accumulated: accumulatedChars },
        }, correlationId);
      });

      // Store output in context for downstream agents
      context.set(CONTEXT_KEYS[role], result.structured);

      sendSSE(res, {
        type: 'agent-complete',
        agentRole: role,
        data: {
          status: 'complete',
          output: result.structured,
          durationMs: result.durationMs,
        },
      }, correlationId);

      agentSummaries.push({ role, status: 'complete', durationMs: result.durationMs });

      // Handoff message to next agent
      const nextRole = PIPELINE_ORDER[i + 1] as AgentRole | undefined;
      if (nextRole) {
        const handoffKey = `${role}->${nextRole}`;
        const message = HANDOFF_MESSAGES[handoffKey] || 'Proceeding.';
        sendSSE(res, {
          type: 'handoff',
          agentRole: role,
          data: { fromAgent: role, toAgent: nextRole, message },
        }, correlationId);
      }
    } catch (err) {
      const durationMs = Date.now() - agentStart;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (config.critical) {
        sendSSE(res, {
          type: 'agent-status',
          agentRole: role,
          data: { status: 'error' as const, message: errorMessage },
        }, correlationId);
        sendSSE(res, {
          type: 'pipeline-error',
          agentRole: role,
          data: {
            failedAgent: role,
            error: errorMessage,
            partialOutput: Object.fromEntries(context),
          },
        }, correlationId);
        return;
      }

      // Non-critical: mark as error, continue pipeline
      sendSSE(res, {
        type: 'agent-status',
        agentRole: role,
        data: { status: 'error' as const, message: errorMessage },
      }, correlationId);
      agentSummaries.push({ role, status: 'error', durationMs });

      // Still send handoff if there's a next agent
      const nextRole2 = PIPELINE_ORDER[i + 1] as AgentRole | undefined;
      if (nextRole2) {
        sendSSE(res, {
          type: 'handoff',
          agentRole: role,
          data: {
            fromAgent: role,
            toAgent: nextRole2,
            message: 'Previous step encountered difficulties. Proceeding regardless.',
          },
        }, correlationId);
      }
    }
  }

  // Pipeline complete -- use Refiner output if available, fall back to Writer's draft
  const finalOutput =
    context.get(CONTEXT_KEYS['refinement-agent']) ??
    context.get(CONTEXT_KEYS['story-writer']) ??
    null;

  sendSSE(res, {
    type: 'pipeline-done',
    agentRole: 'refinement-agent',
    data: {
      totalDurationMs: Date.now() - budgetStart,
      finalOutput,
      agentSummaries,
    },
  }, correlationId);
}
