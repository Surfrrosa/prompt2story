import { Button } from '@/components/ui/button'
import { X } from '@/components/icons'

interface DonationModalProps {
  isOpen: boolean
  onDismiss: () => void
}

export function DonationModal({ isOpen, onDismiss }: DonationModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        className="bg-charcoal-lighter border border-charcoal-light rounded-xl max-w-md w-full p-6 relative animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-soft-gray hover:text-pure-white transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <span className="text-6xl">☕</span>
          </div>

          <h3 className="text-xl font-semibold text-pure-white">
            Glad this saved you some time!
          </h3>

          <p className="text-soft-gray text-sm">
            This tool is 100% free and always will be. If it helped you out, consider buying me a coffee to keep the servers running.
          </p>

          <div className="flex gap-3 pt-2">
            <a
              href="https://buymeacoffee.com/shainapauley"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                className="w-full bg-vivid-purple hover:bg-purple-600 text-pure-white"
              >
                ☕ Buy Me a Coffee ($3)
              </Button>
            </a>
            <Button
              onClick={onDismiss}
              variant="outline"
              className="flex-1 bg-charcoal-light border-charcoal-light text-pure-white hover:bg-charcoal-lighter hover:border-soft-gray"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-soft-gray pt-2">
            This won't pop up again • No spam, ever
          </p>
        </div>
      </div>
    </div>
  )
}
