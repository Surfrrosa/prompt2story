import { cn } from '@/lib/utils'

export type GenerateMode = 'quick' | 'story-room'

interface ModeToggleProps {
  mode: GenerateMode
  onChange: (mode: GenerateMode) => void
  disabled?: boolean
}

export function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-deep-charcoal rounded-lg p-1 border border-charcoal-light">
      <button
        className={cn(
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          mode === 'story-room'
            ? 'bg-vivid-purple text-pure-white'
            : 'text-soft-gray hover:text-pure-white',
        )}
        onClick={() => onChange('story-room')}
        disabled={disabled}
      >
        Story Room
      </button>
      <button
        className={cn(
          'px-4 py-2 rounded-md text-sm font-medium transition-colors',
          mode === 'quick'
            ? 'bg-vivid-purple text-pure-white'
            : 'text-soft-gray hover:text-pure-white',
        )}
        onClick={() => onChange('quick')}
        disabled={disabled}
      >
        Quick Generate
      </button>
    </div>
  )
}
