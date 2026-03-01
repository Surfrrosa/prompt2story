import { useState } from 'react'
import { getHealth, generateUserStoriesStreaming } from '@/lib/api'
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

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      await getHealth()
      return true
    } catch {
      return false
    }
  }

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
      const isBackendHealthy = await checkBackendHealth()
      if (!isBackendHealthy) {
        setError('Backend unreachable at /api/healthz. The serverless API may be starting up, please try again.')
        setIsLoading(false)
        return
      }

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
          if (err.message.includes('fetch')) {
            setError('Cannot connect to serverless API. Please try again in a moment.')
          } else if (err.message.includes('OpenAI')) {
            setError('API configuration error. Please check server logs and ensure OPENAI_API_KEY is set.')
          } else {
            setError(err.message || 'An unexpected error occurred')
          }
          setStreamingText('')
          setIsLoading(false)
        }
      )
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to serverless API. Please try again in a moment.')
      } else if (err instanceof Error && err.message.includes('OpenAI')) {
        setError('API configuration error. Please check server logs and ensure OPENAI_API_KEY is set.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      }
      setStreamingText('')
      setIsLoading(false)
    }
  }

  const updateResult = (newResult: GenerationResponse) => {
    setResult(newResult)
  }

  const clearError = () => setError(null)

  return {
    inputText,
    setInputText,
    isLoading,
    result,
    updateResult,
    error,
    setError,
    clearError,
    streamingText,
    settings,
    setSettings,
    handleGenerate,
    checkBackendHealth,
  }
}
