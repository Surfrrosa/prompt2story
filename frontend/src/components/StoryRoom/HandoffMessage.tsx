interface HandoffMessageProps {
  message: string
}

export function HandoffMessage({ message }: HandoffMessageProps) {
  return (
    <div className="flex items-center gap-2 py-2 px-4 text-soft-gray text-xs font-mono animate-fadeIn">
      <span className="text-vivid-purple/60">--</span>
      <span className="italic">{message}</span>
      <span className="text-vivid-purple/60">--</span>
    </div>
  )
}
