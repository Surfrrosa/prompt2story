// Story Room: SSE helper utilities

import type { VercelResponse } from '@vercel/node';
import type { AgentRole, AgentStatus } from './types.js';

interface SSEEventPayload {
  type: string;
  agentRole: AgentRole;
  data: Record<string, unknown>;
}

function flush(res: VercelResponse): void {
  // Force flush through Vercel dev proxy and other buffering layers
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
}

export function sendSSE(
  res: VercelResponse,
  event: SSEEventPayload,
  correlationId: string
): void {
  const fullEvent = {
    ...event,
    timestamp: Date.now(),
    correlationId,
  };
  res.write(`data: ${JSON.stringify(fullEvent)}\n\n`);
  flush(res);
}

export function sendAgentStatus(
  res: VercelResponse,
  role: AgentRole,
  status: AgentStatus,
  correlationId: string,
  message?: string
): void {
  sendSSE(res, {
    type: 'agent-status',
    agentRole: role,
    data: { status, message },
  }, correlationId);
}

export function sendAgentChunk(
  res: VercelResponse,
  role: AgentRole,
  text: string,
  accumulated: number,
  correlationId: string
): void {
  sendSSE(res, {
    type: 'agent-chunk',
    agentRole: role,
    data: { text, accumulated },
  }, correlationId);
}

export function setupSSEHeaders(res: VercelResponse, correlationId: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Correlation-Id': correlationId,
  });
  // Flush headers immediately and send padding to push through proxy buffers
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }
  // Send initial comment to force the connection open through buffering proxies
  res.write(': connected\n\n');
  flush(res);
}
