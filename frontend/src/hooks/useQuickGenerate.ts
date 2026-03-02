import { useState } from 'react'
import { generateUserStoriesStreaming } from '@/lib/api'
import { classifyApiError } from '@/lib/utils'
import type { GenerationResponse } from '@/types/stories'

export interface QuickGenerateSettings {
  includeMetadata: boolean
  inferEdgeCases: boolean
  includeAdvancedCriteria: boolean
  expandAllComponents: boolean
}

export function useQuickGenerate() {
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [settings, setSettings] = useState<QuickGenerateSettings>({
    includeMetadata: true,
    inferEdgeCases: true,
    includeAdvancedCriteria: true,
    expandAllComponents: true,
  })

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)
    setStreamingText('')

    try {
      const payload = {
        text: inputText,
        include_metadata: settings.includeMetadata,
        infer_edge_cases: settings.inferEdgeCases,
        include_advanced_criteria: settings.includeAdvancedCriteria,
        expand_all_components: settings.expandAllComponents,
      }

      await generateUserStoriesStreaming(
        payload,
        (chunk: string) => {
          setStreamingText(prev => prev + chunk)
        },
        (data: GenerationResponse) => {
          setResult(data)
          setStreamingText('')
          setIsLoading(false)
        },
        (err: Error) => {
          setError(classifyApiError(err))
          setStreamingText('')
          setIsLoading(false)
        }
      )
    } catch (err) {
      setError(classifyApiError(err))
      setStreamingText('')
      setIsLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    inputText,
    setInputText,
    isLoading,
    result,
    setResult,
    error,
    setError,
    clearError,
    streamingText,
    settings,
    setSettings,
    handleGenerate,
  }
}
