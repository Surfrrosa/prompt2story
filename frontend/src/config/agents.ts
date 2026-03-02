import type { AgentRole } from '@/hooks/useStoryRoom'

/** Full agent display names and taglines, used in AgentCardStack */
export const AGENT_CONFIG: Record<AgentRole, { title: string; tagline: string }> = {
  'requirements-analyst': {
    title: 'The Product Owner',
    tagline: 'Has opinions. All of them are priorities.',
  },
  'story-architect': {
    title: 'The Tech Lead',
    tagline: 'Sees dependencies you didn\'t know existed.',
  },
  'story-writer': {
    title: 'The Developer',
    tagline: 'Will ask what "simple" means until you cry.',
  },
  'devils-advocate': {
    title: 'The QA Engineer',
    tagline: 'Gets paid to break things. Would do it for free.',
  },
  'refinement-agent': {
    title: 'The Scrum Master',
    tagline: 'Facilitates. Mediates. Takes the minutes nobody reads.',
  },
}

/** Abbreviated agent names for the pipeline timeline */
export const AGENT_TITLES: Record<AgentRole, string> = {
  'requirements-analyst': 'PO',
  'story-architect': 'Tech Lead',
  'story-writer': 'Dev',
  'devils-advocate': 'QA',
  'refinement-agent': 'SM',
}
