import { useState } from 'react'
import { postJson } from '@/lib/api'
import type { GenerationResponse, FeedbackState } from '@/types/stories'

export function useFeedbackAndRegenerate(
  result: GenerationResponse | null,
  updateResult: (result: GenerationResponse) => void,
  inputText: string,
  uploadedFile: File | null,
  includeMetadata: boolean,
  setSuccessMessage: (message: string) => void,
) {
  const [feedbackStates, setFeedbackStates] = useState<Map<number, FeedbackState>>(new Map())
  const [regeneratingStates, setRegeneratingStates] = useState<Set<number>>(new Set())
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())

  const toggleMetadataExpansion = (index: number) => {
    const newExpanded = new Set(expandedMetadata)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMetadata(newExpanded)
  }

  const handleFeedbackRating = (storyIndex: number, rating: 'up' | 'down') => {
    const newStates = new Map(feedbackStates)
    const currentState = newStates.get(storyIndex) || { rating: null, text: '', expanded: false, submitted: false }
    newStates.set(storyIndex, { ...currentState, rating, expanded: rating === 'down', submitted: false })
    setFeedbackStates(newStates)
  }

  const handleFeedbackTextChange = (storyIndex: number, text: string) => {
    const newStates = new Map(feedbackStates)
    const currentState = newStates.get(storyIndex) || { rating: null, text: '', expanded: false, submitted: false }
    newStates.set(storyIndex, { ...currentState, text })
    setFeedbackStates(newStates)
  }

  const handleSubmitFeedback = async (storyIndex: number) => {
    const feedbackState = feedbackStates.get(storyIndex)

    if (!feedbackState || !feedbackState.rating) {
      return
    }

    try {
      const story = result?.user_stories[storyIndex]

      await postJson('/api/submit-feedback', {
        rating: feedbackState.rating,
        feedback_text: feedbackState.text,
        story_title: story?.title,
        story_content: story?.story,
        timestamp: new Date().toISOString(),
      })

      const newStates = new Map(feedbackStates)
      newStates.set(storyIndex, { rating: 'down', text: '', expanded: false, submitted: true })
      setFeedbackStates(newStates)

      setSuccessMessage('Feedback submitted successfully!')
    } catch (error) {
      console.error('Feedback submission error:', error)
      setSuccessMessage('Failed to submit feedback')
    }
  }

  const handleRegenerateStory = async (storyIndex: number) => {
    if (!result) return

    const originalInput = inputText.trim() || (uploadedFile ? `Design file: ${uploadedFile.name}` : 'User input')

    const newRegeneratingStates = new Set(regeneratingStates)
    newRegeneratingStates.add(storyIndex)
    setRegeneratingStates(newRegeneratingStates)

    try {
      const currentStory = result.user_stories[storyIndex]

      const apiResponse = await postJson('/api/regenerate-story', {
        original_input: originalInput,
        current_story: currentStory,
        feedback: feedbackStates.get(storyIndex)?.text || '',
        include_metadata: includeMetadata,
      })

      const regeneratedStory = apiResponse.data?.regenerated_story || apiResponse.regenerated_story || apiResponse

      const updatedResult = { ...result }
      updatedResult.user_stories = [...result.user_stories]
      updatedResult.user_stories[storyIndex] = regeneratedStory
      updateResult(updatedResult)

      const newFeedbackStates = new Map(feedbackStates)
      newFeedbackStates.delete(storyIndex)
      setFeedbackStates(newFeedbackStates)

      setSuccessMessage('Story regenerated successfully!')
    } catch (error) {
      console.error('Story regeneration error:', error)
      setSuccessMessage('Failed to regenerate story')
    } finally {
      const newRegeneratingStates = new Set(regeneratingStates)
      newRegeneratingStates.delete(storyIndex)
      setRegeneratingStates(newRegeneratingStates)
    }
  }

  return {
    feedbackStates,
    regeneratingStates,
    expandedMetadata,
    toggleMetadataExpansion,
    handleFeedbackRating,
    handleFeedbackTextChange,
    handleSubmitFeedback,
    handleRegenerateStory,
  }
}
