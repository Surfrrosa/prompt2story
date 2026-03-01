import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown } from '@/components/icons'
import type { UserStory, FeedbackState } from '@/types/stories'

interface UserStoryCardProps {
  story: UserStory
  index: number
  includeMetadata: boolean
  isMetadataExpanded: boolean
  feedbackState: FeedbackState | undefined
  isRegenerating: boolean
  onToggleMetadata: (index: number) => void
  onFeedbackRating: (index: number, rating: 'up' | 'down') => void
  onFeedbackTextChange: (index: number, text: string) => void
  onSubmitFeedback: (index: number) => void
  onRegenerate: (index: number) => void
}

export function UserStoryCard({
  story,
  index,
  includeMetadata,
  isMetadataExpanded,
  feedbackState,
  isRegenerating,
  onToggleMetadata,
  onFeedbackRating,
  onFeedbackTextChange,
  onSubmitFeedback,
  onRegenerate,
}: UserStoryCardProps) {
  return (
    <Card className="bg-charcoal-lighter border-charcoal-light rounded-xl">
      <CardHeader>
        <CardTitle className="text-pure-white">{story.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-purple-400 mb-2">User Story</h4>
          <p className="text-soft-gray italic">{story.story}</p>
        </div>
        <div>
          <h4 className="font-medium text-green-400 mb-2">Acceptance Criteria</h4>
          <ul className="space-y-1">
            {story.acceptance_criteria.map((criteria, criteriaIndex) => (
              <li key={criteriaIndex} className="text-soft-gray flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>

        {includeMetadata && story.metadata && (
          <div className="border-t border-charcoal-light pt-4">
            <button
              onClick={() => onToggleMetadata(index)}
              className="flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isMetadataExpanded ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200 rotate-0" />
              )}
              Metadata
            </button>

            {isMetadataExpanded && (
              <div className="mt-3 p-3 bg-charcoal-light rounded-lg border border-charcoal-light">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {story.metadata.priority && (
                    <div className="flex justify-between">
                      <span className="text-soft-gray">Priority:</span>
                      <Badge
                        variant="outline"
                        className={`${
                          story.metadata.priority === 'High' ? 'border-red-500 text-red-400' :
                          story.metadata.priority === 'Medium' ? 'border-yellow-500 text-yellow-400' :
                          'border-green-500 text-green-400'
                        }`}
                      >
                        {story.metadata.priority}
                      </Badge>
                    </div>
                  )}
                  {story.metadata.type && (
                    <div className="flex justify-between">
                      <span className="text-soft-gray">Type:</span>
                      <Badge variant="outline" className="border-purple-500 text-purple-400">
                        {story.metadata.type}
                      </Badge>
                    </div>
                  )}
                  {story.metadata.component && (
                    <div className="flex justify-between">
                      <span className="text-soft-gray">Component:</span>
                      <span className="text-soft-gray">{story.metadata.component}</span>
                    </div>
                  )}
                  {story.metadata.effort && (
                    <div className="flex justify-between">
                      <span className="text-soft-gray">Effort:</span>
                      <span className="text-soft-gray">{story.metadata.effort}</span>
                    </div>
                  )}
                  {story.metadata.persona && (
                    <div className="flex justify-between sm:col-span-2">
                      <span className="text-soft-gray">Persona:</span>
                      <span className="text-soft-gray">
                        {story.metadata.persona === 'Other' && story.metadata.persona_other
                          ? story.metadata.persona_other
                          : story.metadata.persona}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-charcoal-light pt-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => onFeedbackRating(index, 'up')}
              title="Like this output?"
              className={`p-2 rounded-lg transition-colors duration-150 ease-in-out ${
                feedbackState?.rating === 'up'
                  ? 'bg-green-600 text-pure-white'
                  : 'text-soft-gray hover:text-green-400 hover:bg-charcoal-light'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => onFeedbackRating(index, 'down')}
              title="Dislike this output?"
              className={`p-2 rounded-lg transition-colors duration-150 ease-in-out ${
                feedbackState?.rating === 'down'
                  ? 'bg-red-600 text-pure-white'
                  : 'text-soft-gray hover:text-red-400 hover:bg-charcoal-light'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRegenerate(index)
              }}
              disabled={isRegenerating}
              title="Regenerate story"
              className="px-3 py-2 rounded-lg text-sm transition-colors duration-150 ease-in-out text-soft-gray hover:text-vivid-purple hover:bg-charcoal-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </button>
          </div>

          {feedbackState?.rating === 'up' && (
            <div className="text-sm text-green-400 animate-in slide-in-from-top-2 duration-200">
              Thanks! We're glad it was helpful.
            </div>
          )}

          {feedbackState?.rating === 'down' && feedbackState?.submitted && (
            <div className="text-sm text-green-400 animate-in slide-in-from-top-2 duration-200">
              Thanks for the feedback!
            </div>
          )}

          {feedbackState?.rating === 'down' && feedbackState?.expanded && !feedbackState?.submitted && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-sm text-soft-gray mb-2">
                  What could be improved?
                </label>
                <Textarea
                  value={feedbackState?.text || ''}
                  onChange={(e) => onFeedbackTextChange(index, e.target.value)}
                  placeholder="Share your thoughts on how this user story could be better..."
                  className="min-h-20 bg-charcoal-light border-charcoal-light text-pure-white placeholder-soft-gray resize-none"
                />
              </div>
              <Button
                onClick={() => onSubmitFeedback(index)}
                disabled={!feedbackState?.rating}
                className="bg-vivid-purple hover:bg-charcoal-light text-pure-white"
              >
                Submit Feedback
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
