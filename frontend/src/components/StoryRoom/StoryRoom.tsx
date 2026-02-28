import { useStoryRoom } from '@/hooks/useStoryRoom'
import { StoryRoomInput } from './StoryRoomInput'
import { PipelineTimeline } from './PipelineTimeline'
import { AgentCardStack } from './AgentCardStack'
import { AbortButton } from './AbortButton'
import { FinalOutput } from './FinalOutput'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from '@/components/icons'

export function StoryRoom() {
  const { state, startPipeline, abort, reset } = useStoryRoom()

  return (
    <div className="space-y-4">
      {/* Input form -- shown when idle or after reset */}
      {state.status === 'idle' && (
        <StoryRoomInput onSubmit={(desc, ctx) => startPipeline(desc, ctx)} />
      )}

      {/* Pipeline visualization -- shown when running, complete, error, or aborted */}
      {state.status !== 'idle' && (
        <>
          <PipelineTimeline
            agents={state.agents}
            currentAgent={state.currentAgent}
            elapsedMs={state.elapsedMs}
            budgetMs={state.budgetMs}
          />

          <AgentCardStack
            agents={state.agents}
            currentAgent={state.currentAgent}
            handoffMessages={state.handoffMessages}
          />

          {state.status === 'running' && (
            <AbortButton onAbort={abort} />
          )}

          {state.status === 'complete' && (
            <FinalOutput
              output={state.finalOutput}
              onReset={reset}
              elapsedMs={state.elapsedMs}
            />
          )}

          {state.status === 'error' && (
            <Card className="bg-charcoal-lighter border-red-900/40 mt-4">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-mono text-sm font-bold mb-1">
                      Pipeline Failed
                    </p>
                    <p className="text-soft-gray text-sm">
                      {Object.values(state.agents)
                        .find((a) => a.status === 'error')
                        ?.error || 'An unexpected error occurred during processing.'}
                    </p>
                    <Button
                      onClick={reset}
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-vivid-purple hover:text-vivid-purple/80 font-mono text-xs"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {state.status === 'aborted' && (
            <Card className="bg-charcoal-lighter border-charcoal-light mt-4">
              <CardContent className="p-6 text-center">
                <p className="text-soft-gray font-mono text-sm">Pipeline aborted.</p>
                <Button
                  onClick={reset}
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-vivid-purple hover:text-vivid-purple/80 font-mono text-xs"
                >
                  Start Over
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
