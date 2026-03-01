import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X } from '@/components/icons'

interface EmailSignupCardProps {
  dismissed: boolean
  email: string
  success: boolean
  onEmailChange: (email: string) => void
  onSubmit: (e: React.FormEvent) => void
  onDismiss: () => void
}

export function EmailSignupCard({ dismissed, email, success, onEmailChange, onSubmit, onDismiss }: EmailSignupCardProps) {
  if (dismissed) return null

  return (
    <Card className="bg-charcoal-lighter border-charcoal-light mb-8 animate-in slide-in-from-top-2 duration-300">
      <CardContent className="pt-6 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-soft-gray hover:text-pure-white transition-colors duration-150"
          aria-label="Dismiss email signup"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-soft-gray mb-4">
            <strong>Get notified when we launch advanced features. No spam, ever.</strong>
          </p>
          {success ? (
            <div className="text-green-400 font-medium animate-in slide-in-from-top-2 duration-200">
              Thanks — you're in!
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Your email here"
                className="flex-1 px-4 py-2 bg-charcoal-light border border-charcoal-light rounded-lg text-pure-white placeholder-soft-gray focus:outline-none focus:ring-2 focus:ring-vivid-purple focus:border-transparent"
                required
              />
              <Button
                type="submit"
                className="bg-vivid-purple hover:bg-charcoal-light text-pure-white px-6"
              >
                Submit
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
