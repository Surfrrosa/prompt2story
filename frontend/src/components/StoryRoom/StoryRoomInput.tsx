import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from '@/components/icons'

interface StoryRoomInputProps {
  onSubmit: (description: string, context?: string) => void
  isDisabled?: boolean
}

export function StoryRoomInput({ onSubmit, isDisabled }: StoryRoomInputProps) {
  const [description, setDescription] = useState('')
  const [context, setContext] = useState('')
  const [showContext, setShowContext] = useState(false)

  const handleSubmit = () => {
    if (!description.trim()) return
    onSubmit(description.trim(), context.trim() || undefined)
  }

  return (
    <Card className="bg-charcoal-lighter border-charcoal-light">
      <CardHeader>
        <CardTitle className="text-pure-white font-mono text-lg">
          Story Room
        </CardTitle>
        <CardDescription className="text-soft-gray">
          Describe what you want to build. Your refinement team will take it from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product, feature, or system you want user stories for..."
          className="min-h-[120px] bg-charcoal-light border-charcoal-light text-pure-white placeholder-soft-gray resize-none focus:ring-vivid-purple"
          disabled={isDisabled}
        />

        <div>
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="text-xs text-soft-gray hover:text-pure-white font-mono transition-colors"
          >
            {showContext ? '- Hide additional context' : '+ Add additional context'}
          </button>
          {showContext && (
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Technical constraints, target audience, existing systems..."
              className="mt-2 min-h-[80px] bg-charcoal-light border-charcoal-light text-pure-white placeholder-soft-gray resize-none focus:ring-vivid-purple text-sm"
              disabled={isDisabled}
            />
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isDisabled || !description.trim() || description.trim().length < 10}
          className="w-full bg-vivid-purple hover:bg-vivid-purple/80 text-pure-white font-mono"
        >
          {isDisabled ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Pipeline Running...
            </>
          ) : (
            'Enter the Story Room'
          )}
        </Button>

        {description.trim().length > 0 && description.trim().length < 10 && (
          <p className="text-xs font-mono" style={{ color: '#A0A0A099' }}>
            Minimum 10 characters needed
          </p>
        )}
      </CardContent>
    </Card>
  )
}
