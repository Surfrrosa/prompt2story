import { Button } from '@/components/ui/button'
import { Mail, X } from '@/components/icons'

interface ExportModalProps {
  isOpen: boolean
  email: string
  onEmailChange: (email: string) => void
  onConfirm: (withEmail: boolean) => void
  onDecline: () => void
  onDismiss: () => void
}

export function ExportModal({ isOpen, email, onEmailChange, onConfirm, onDecline, onDismiss }: ExportModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onDismiss}
    >
      <div
        className="bg-charcoal-lighter border border-charcoal-light rounded-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-soft-gray hover:text-pure-white transition-colors"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-purple-400" />
          </div>

          <h3 className="text-xl font-semibold text-pure-white">
            Want it emailed to you + new features as they launch?
          </h3>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Your email here"
              className="w-full px-4 py-2 bg-charcoal-light border border-charcoal-light rounded-lg text-pure-white placeholder-soft-gray focus:outline-none focus:ring-2 focus:ring-vivid-purple focus:border-transparent"
            />

            <div className="flex gap-3">
              <Button
                onClick={() => onConfirm(true)}
                disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                className="flex-1 bg-vivid-purple hover:bg-charcoal-light text-pure-white"
              >
                Yes, send it to me
              </Button>
              <Button
                onClick={onDecline}
                variant="outline"
                className="flex-1 bg-charcoal-light border-charcoal-light text-pure-white hover:bg-charcoal-lighter hover:border-soft-gray hover:text-pure-white"
              >
                No thanks
              </Button>
            </div>
          </div>

          <p className="text-xs text-soft-gray">
            Low-friction opt-in • No spam, ever
          </p>
        </div>
      </div>
    </div>
  )
}
