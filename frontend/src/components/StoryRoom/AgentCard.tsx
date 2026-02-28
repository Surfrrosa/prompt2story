import { useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AgentStatusBadge } from './AgentStatusBadge'
import { TypingCursor } from './TypingCursor'
import type { AgentStatus } from '@/hooks/useStoryRoom'

interface AgentCardProps {
  title: string
  tagline: string
  status: AgentStatus
  streamedText: string
  durationMs: number
  isActive: boolean
  error?: string
}

// Strip JSON blocks from display text -- users see thinking, not raw JSON
// Handles both complete ```json...``` blocks and trailing partial blocks from timeouts
function stripJsonBlocks(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, '')   // complete fenced blocks
    .replace(/```json[\s\S]*$/g, '')       // trailing partial block (agent timed out mid-JSON)
    .trim()
}

export function AgentCard({
  title,
  tagline,
  status,
  streamedText,
  durationMs,
  isActive,
  error,
}: AgentCardProps) {
  const textRef = useRef<HTMLDivElement>(null)

  // Auto-scroll streamed text to bottom
  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight
    }
  }, [streamedText])

  const showText = status === 'thinking' || status === 'complete' || status === 'error'
  const displayText = stripJsonBlocks(streamedText)

  return (
    <Card
      className={cn(
        'bg-charcoal-lighter border-charcoal-light transition-all duration-300',
        isActive && 'ring-2 ring-vivid-purple shadow-lg shadow-vivid-purple/10',
        status === 'waiting' && 'opacity-40',
        status === 'skipped' && 'opacity-30',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h3 className="text-pure-white font-mono text-sm font-bold truncate">
              {title}
            </h3>
            <p className="text-soft-gray text-xs italic truncate">{tagline}</p>
          </div>
          <div className="flex-shrink-0 ml-3">
            <AgentStatusBadge status={status} durationMs={durationMs} />
          </div>
        </div>

        {showText && displayText && (
          <div
            ref={textRef}
            className="font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed mt-3 pr-1 scrollbar-thin"
            style={{ color: '#d4d4d8' }}
          >
            {displayText}
            {isActive && <TypingCursor />}
          </div>
        )}

        {status === 'error' && error && (
          <p className="text-red-400 text-xs mt-2 font-mono">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
