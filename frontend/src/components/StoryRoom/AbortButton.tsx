import { Button } from '@/components/ui/button'

interface AbortButtonProps {
  onAbort: () => void
}

export function AbortButton({ onAbort }: AbortButtonProps) {
  return (
    <div className="flex justify-center mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onAbort}
        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 font-mono text-xs"
      >
        Abort Pipeline
      </Button>
    </div>
  )
}
