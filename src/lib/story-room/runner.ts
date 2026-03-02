// Story Room: Single-agent execution with streaming and JSON extraction

import type OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { AgentConfig } from './types.js';
import { parseAgentOutput } from './parser.js';

export interface AgentResult {
  fullText: string;
  structured: unknown;
  durationMs: number;
}

export async function runAgent(
  openai: OpenAI,
  config: AgentConfig,
  context: Map<string, unknown>,
  timeoutMs: number,
  onChunk: (text: string) => void,
): Promise<AgentResult> {
  const start = Date.now();

  // Build narrowed context: only fields this agent declared
  const agentContext: Record<string, unknown> = {};
  agentContext.rawInput = context.get('rawInput');
  for (const field of config.contextFields) {
    if (context.has(field)) {
      agentContext[field] = context.get(field);
    }
  }

  const prompt = loadPromptTemplate(config.promptTemplate);
  const systemMessage = populateTemplate(prompt, {
    title: config.title,
    tagline: config.tagline,
    contextJson: JSON.stringify(agentContext, null, 2),
  });

  // Stream completion with timeout race
  const stream = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: 'Begin your analysis.' },
    ],
    stream: true,
    max_tokens: config.maxTokens,
    temperature: 0.3,
  });

  let fullText = '';
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Agent ${config.role} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    await Promise.race([
      (async () => {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk(content);
          }
        }
      })(),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId!);
  }

  const structured = parseAgentOutput(fullText, config.role);

  return {
    fullText,
    structured,
    durationMs: Date.now() - start,
  };
}

const templateCache = new Map<string, string>();

function loadPromptTemplate(templatePath: string): string {
  const cached = templateCache.get(templatePath);
  if (cached) return cached;

  const possiblePaths = [
    join(process.cwd(), templatePath),
    join(process.cwd(), '..', templatePath),
  ];

  for (const path of possiblePaths) {
    try {
      const content = readFileSync(path, 'utf-8');
      templateCache.set(templatePath, content);
      return content;
    } catch {
      continue;
    }
  }

  // Should not happen in production -- prompt files are deployed with the app
  throw new Error(`Prompt template not found: ${templatePath}`);
}

function populateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
