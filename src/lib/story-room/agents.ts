// Story Room: Agent registry and pipeline configuration
// Static config only -- no runtime behavior

import type { AgentConfig, AgentRole } from './types.js';

export const AGENT_REGISTRY: Record<AgentRole, AgentConfig> = {
  'requirements-analyst': {
    role: 'requirements-analyst',
    order: 1,
    title: 'The Product Owner',
    tagline: 'Has opinions. All of them are priorities.',
    promptTemplate: 'prompts/story-room/requirements-analyst.md',
    timeoutMs: 20_000,
    maxTokens: 1500,
    model: 'gpt-4o-mini',
    critical: true,
    contextFields: [],
  },
  'story-architect': {
    role: 'story-architect',
    order: 2,
    title: 'The Tech Lead',
    tagline: 'Sees dependencies you didn\'t know existed.',
    promptTemplate: 'prompts/story-room/story-architect.md',
    timeoutMs: 20_000,
    maxTokens: 1500,
    model: 'gpt-4o-mini',
    critical: true,
    contextFields: ['parsedRequirements'],
  },
  'story-writer': {
    role: 'story-writer',
    order: 3,
    title: 'The Developer',
    tagline: 'Will ask what "simple" means until you cry.',
    promptTemplate: 'prompts/story-room/story-writer.md',
    timeoutMs: 25_000,
    maxTokens: 2500,
    model: 'gpt-4o-mini',
    critical: true,
    contextFields: ['parsedRequirements', 'storyMap'],
  },
  'devils-advocate': {
    role: 'devils-advocate',
    order: 4,
    title: 'The QA Engineer',
    tagline: 'Gets paid to break things. Would do it for free.',
    promptTemplate: 'prompts/story-room/devils-advocate.md',
    timeoutMs: 15_000,
    maxTokens: 1500,
    model: 'gpt-4o-mini',
    critical: false,
    contextFields: ['parsedRequirements', 'storyMap', 'draftStories'],
  },
  'refinement-agent': {
    role: 'refinement-agent',
    order: 5,
    title: 'The Scrum Master',
    tagline: 'Facilitates. Mediates. Takes the minutes nobody reads.',
    promptTemplate: 'prompts/story-room/refinement-agent.md',
    timeoutMs: 20_000,
    maxTokens: 2500,
    model: 'gpt-4o-mini',
    critical: false,
    contextFields: ['parsedRequirements', 'storyMap', 'draftStories', 'critique'],
  },
};

export const PIPELINE_ORDER: AgentRole[] = [
  'requirements-analyst',
  'story-architect',
  'story-writer',
  'devils-advocate',
  'refinement-agent',
];

export const HANDOFF_MESSAGES: Record<string, string> = {
  'requirements-analyst->story-architect': 'Requirements captured. Tech Lead, over to you for scoping.',
  'story-architect->story-writer': 'Architecture mapped. Dev, start writing these up.',
  'story-writer->devils-advocate': 'Stories drafted. QA, do your worst.',
  'devils-advocate->refinement-agent': 'Issues flagged. Scrum Master, bring it home.',
};

export const TOTAL_BUDGET_MS = 55_000;
export const PER_AGENT_TIMEOUT_MS = 20_000;

// Maps agent roles to the context key they produce
export const CONTEXT_KEYS: Record<AgentRole, string> = {
  'requirements-analyst': 'parsedRequirements',
  'story-architect': 'storyMap',
  'story-writer': 'draftStories',
  'devils-advocate': 'critique',
  'refinement-agent': 'finalStories',
};
