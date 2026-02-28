import { AgentCard } from './AgentCard'
import { HandoffMessage } from './HandoffMessage'
import type { AgentRole, AgentState, HandoffEvent } from '@/hooks/useStoryRoom'
import { PIPELINE_ORDER } from '@/hooks/useStoryRoom'

// Agent display config (inlined to avoid cross-package imports)
const AGENT_CONFIG: Record<AgentRole, { title: string; tagline: string }> = {
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

interface AgentCardStackProps {
  agents: Record<AgentRole, AgentState>
  currentAgent: AgentRole | null
  handoffMessages: HandoffEvent[]
}

export function AgentCardStack({ agents, currentAgent, handoffMessages }: AgentCardStackProps) {
  // Build interleaved list: agent card, then handoff message (if any)
  const elements: JSX.Element[] = []

  for (let i = 0; i < PIPELINE_ORDER.length; i++) {
    const role = PIPELINE_ORDER[i]
    const agent = agents[role]
    const config = AGENT_CONFIG[role]

    elements.push(
      <AgentCard
        key={role}
        title={config.title}
        tagline={config.tagline}
        status={agent.status}
        streamedText={agent.streamedText}
        durationMs={agent.durationMs}
        isActive={role === currentAgent}
        error={agent.error}
      />
    )

    // Find handoff message from this agent
    const handoff = handoffMessages.find((h) => h.fromAgent === role)
    if (handoff) {
      elements.push(
        <HandoffMessage key={`handoff-${role}`} message={handoff.message} />
      )
    }
  }

  return <div className="space-y-2">{elements}</div>
}
