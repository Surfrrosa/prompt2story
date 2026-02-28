import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/hooks/useStoryRoom'

const STATUS_CONFIG: Record<AgentStatus, { label: string; className: string }> = {
  waiting: {
    label: 'Queued',
    className: 'bg-charcoal-light text-soft-gray border-charcoal-light',
  },
  thinking: {
    label: 'Thinking...',
    className: 'bg-vivid-purple/20 text-vivid-purple border-vivid-purple/30 animate-pulse',
  },
  complete: {
    label: 'Done',
    className: 'bg-green-900/30 text-green-400 border-green-800/40',
  },
  error: {
    label: 'Failed',
    className: 'bg-red-900/30 text-red-400 border-red-800/40',
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-charcoal-light text-soft-gray/60 border-charcoal-light',
  },
}

interface AgentStatusBadgeProps {
  status: AgentStatus
  durationMs: number
}

export function AgentStatusBadge({ status, durationMs }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const label = status === 'complete' && durationMs > 0
    ? `Done (${(durationMs / 1000).toFixed(1)}s)`
    : config.label

  return (
    <Badge variant="outline" className={cn('text-[10px] font-mono', config.className)}>
      {label}
    </Badge>
  )
}
