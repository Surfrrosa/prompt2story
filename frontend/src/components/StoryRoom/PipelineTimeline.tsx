import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { AgentRole, AgentState } from '@/hooks/useStoryRoom'
import { PIPELINE_ORDER } from '@/hooks/useStoryRoom'

// Agent titles (duplicated from registry to avoid cross-package imports)
const AGENT_TITLES: Record<AgentRole, string> = {
  'requirements-analyst': 'PO',
  'story-architect': 'Tech Lead',
  'story-writer': 'Dev',
  'devils-advocate': 'QA',
  'refinement-agent': 'SM',
}

// Deadpan status messages that rotate during the initial wait
const WAITING_MESSAGES = [
  'Booking the conference room...',
  'Waiting for everyone to join...',
  'The PO is reprioritizing again...',
  'Calibrating expectations...',
  'Consulting the backlog...',
  'Cross-referencing assumptions...',
  'QA is already drafting objections...',
  'Warming up the pipeline...',
  'Scheduling a pre-meeting meeting...',
  'Aligning on definitions of done...',
  'Percolating...',
  'Recombobulating...',
  'The Scrum Master is taking notes...',
  'Estimating the estimates...',
  'Someone forgot to unmute...',
]

interface PipelineTimelineProps {
  agents: Record<AgentRole, AgentState>
  currentAgent: AgentRole | null
  elapsedMs: number
  budgetMs: number
}

// Inline styles for custom color + opacity combos (Tailwind modifiers don't work on CSS-var colors)
const DOT_STYLES: Record<string, React.CSSProperties> = {
  thinking: { backgroundColor: '#7A5FFF4D', color: '#7A5FFF' },
  skipped:  { color: '#A0A0A066' },
  waiting:  { color: '#A0A0A099' },
}

export function PipelineTimeline({
  agents,
  currentAgent,
  elapsedMs,
  budgetMs,
}: PipelineTimelineProps) {
  const progress = Math.min((elapsedMs / budgetMs) * 100, 100)

  // Check if any agent has moved past 'waiting'
  const anyAgentActive = Object.values(agents).some(
    (a) => a.status !== 'waiting'
  )

  // Rotate through waiting messages every 2.5s
  const [messageIndex, setMessageIndex] = useState(
    () => Math.floor(Math.random() * WAITING_MESSAGES.length)
  )
  useEffect(() => {
    if (anyAgentActive) return
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % WAITING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [anyAgentActive])

  return (
    <div className="mb-6">
      {/* Steps */}
      <div className="flex items-center justify-between mb-3">
        {PIPELINE_ORDER.map((role, i) => {
          const agent = agents[role]
          const isActive = role === currentAgent

          return (
            <div key={role} className="flex items-center flex-1">
              {/* Step dot + label */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300',
                    agent.status === 'complete' && 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
                    agent.status === 'thinking' && 'ring-2 ring-vivid-purple animate-pulse',
                    agent.status === 'error' && 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30',
                    (agent.status === 'skipped' || agent.status === 'waiting') && 'bg-charcoal-light',
                  )}
                  style={DOT_STYLES[agent.status] || {}}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-mono mt-1 transition-colors',
                    isActive ? 'text-vivid-purple' : '',
                  )}
                  style={isActive ? {} : { color: '#A0A0A099' }}
                >
                  {AGENT_TITLES[role]}
                </span>
              </div>

              {/* Connector line */}
              {i < PIPELINE_ORDER.length - 1 && (
                <div className="flex-1 mx-2 mt-[-14px]">
                  <div
                    className="h-0.5 rounded transition-colors duration-500"
                    style={{
                      backgroundColor: agent.status === 'complete' ? '#7A5FFF80' : '#2a2a2a',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Budget bar -- stays purple the whole way through */}
      <div className="w-full h-1 bg-charcoal-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-250"
          style={{
            width: `${progress}%`,
            backgroundColor: '#7A5FFF99',
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono" style={{ color: '#A0A0A066' }}>
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#A0A0A066' }}>
          {(budgetMs / 1000).toFixed(0)}s budget
        </span>
      </div>

      {/* Rotating status text during initial wait */}
      {!anyAgentActive && elapsedMs > 0 && (
        <p
          className="text-center font-mono text-xs mt-3 italic transition-opacity duration-500"
          style={{ color: '#7A5FFF99' }}
        >
          {WAITING_MESSAGES[messageIndex]}
        </p>
      )}
    </div>
  )
}
