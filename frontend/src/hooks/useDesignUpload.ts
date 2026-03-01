import { useState, useEffect } from 'react'
import type { GenerationResponse } from '@/types/stories'

const processingMessages = [
  "Turning chaos into clarity…",
  "Hunting for user stories…",
  "Refining requirements like a boss…",
  "Analyzing design patterns…",
  "Extracting user insights…",
]

export function useDesignUpload(
  checkBackendHealth: () => Promise<boolean>,
  setResult: (result: GenerationResponse) => void,
  setError: (error: string) => void,
  clearError: () => void,
) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isProcessingFile) {
      interval = setInterval(() => {
        setProcessingMessageIndex(prev => (prev + 1) % processingMessages.length)
      }, 1500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessingFile])

  const processFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPG, or PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
    clearError()

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleAnalyzeDesign = async () => {
    if (!uploadedFile) {
      setError('Please upload a design file to analyze')
      return
    }

    setIsProcessingFile(true)
    clearError()

    try {
      const isBackendHealthy = await checkBackendHealth()
      if (!isBackendHealthy) {
        setError('Backend unreachable at /api/healthz. The serverless API may be starting up, please try again.')
        return
      }

      const formData = new FormData()
      formData.append('image', uploadedFile)
      formData.append('prompt', '')

      const response = await fetch('/api/analyze-design', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      const apiResponse = await response.json()
      const data: GenerationResponse = apiResponse.data
      setResult(data)
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to serverless API. Please try again in a moment.')
      } else if (err instanceof Error && err.message.includes('OpenAI')) {
        setError('API configuration error. Please check server logs and ensure OPENAI_API_KEY is set.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      }
    } finally {
      setIsProcessingFile(false)
    }
  }

  const handleClearFile = () => {
    setUploadedFile(null)
    setFilePreview(null)
    clearError()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  return {
    uploadedFile,
    isProcessingFile,
    filePreview,
    isDragOver,
    processingMessage: processingMessages[processingMessageIndex],
    handleFileUpload,
    handleAnalyzeDesign,
    handleClearFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
