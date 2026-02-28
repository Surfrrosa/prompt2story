// Story Room: Extract structured JSON from agent output and validate

import {
  ParsedRequirementsSchema,
  StoryMapSchema,
  DraftStoriesSchema,
  CritiqueSchema,
} from './schemas.js';
import { UserStoriesResponseSchema } from '../schemas.js';
import type { AgentRole } from './types.js';

const SCHEMA_MAP: Record<AgentRole, any> = {
  'requirements-analyst': ParsedRequirementsSchema,
  'story-architect': StoryMapSchema,
  'story-writer': DraftStoriesSchema,
  'devils-advocate': CritiqueSchema,
  'refinement-agent': UserStoriesResponseSchema,
};

export function parseAgentOutput(fullText: string, role: AgentRole): unknown {
  // Extract the last JSON block from the agent's mixed thinking+JSON output
  const jsonBlocks = [...fullText.matchAll(/```json\s*([\s\S]*?)\s*```/g)];

  let raw: unknown;

  if (jsonBlocks.length > 0) {
    // Use the last JSON block (agents may produce preliminary JSON then correct)
    const lastMatch = jsonBlocks[jsonBlocks.length - 1];
    const lastBlock = lastMatch?.[1];
    if (!lastBlock) {
      throw new Error(`Agent ${role} produced an empty JSON block`);
    }
    raw = JSON.parse(lastBlock);
  } else {
    // Fallback: try to parse the entire output as JSON (agent may have skipped fences)
    try {
      raw = JSON.parse(fullText);
    } catch {
      // Last resort: find the first { ... } or [ ... ] structure
      const jsonMatch = fullText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch?.[1]) {
        throw new Error(`Agent ${role} did not produce a JSON block`);
      }
      raw = JSON.parse(jsonMatch[1]);
    }
  }

  const schema = SCHEMA_MAP[role];
  if (schema) {
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.warn(`Agent ${role} output validation warning:`, result.error.message);
      // Return raw data anyway -- partial output is better than nothing
      return raw;
    }
    return result.data;
  }

  return raw;
}
