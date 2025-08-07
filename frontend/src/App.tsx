import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle, AlertTriangle, Copy, Download, Settings, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Mail, X } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

interface Metadata {
  priority: 'Low' | 'Medium' | 'High'
  type: 'Feature' | 'Bug' | 'Chore' | 'Enhancement'
  component: string
  effort: string
  persona: 'End User' | 'Admin' | 'Support Agent' | 'Engineer' | 'Designer' | 'QA' | 'Customer' | 'Other'
  persona_other?: string
}

interface UserStory {
  title: string
  story: string
  acceptance_criteria: string[]
  metadata?: Metadata
}

interface GenerationResponse {
  user_stories: UserStory[]
  edge_cases: string[]
}

function App() {
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<GenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [includeMetadata, setIncludeMetadata] = useState(false)
  const [inferEdgeCases, setInferEdgeCases] = useState(true)
  const [includeAdvancedCriteria, setIncludeAdvancedCriteria] = useState(true)
  const [expandAllComponents, setExpandAllComponents] = useState(true)
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())
  const [feedbackStates, setFeedbackStates] = useState<Map<number, { rating: 'up' | 'down' | null, text: string, expanded: boolean, submitted: boolean }>>(new Map())
  const [regeneratingStates, setRegeneratingStates] = useState<Set<number>>(new Set())
  
  const [email, setEmail] = useState('')
  const [emailSignupSuccess, setEmailSignupSuccess] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [pendingExportAction, setPendingExportAction] = useState<(() => void) | null>(null)
  const [emailSignupDismissed, setEmailSignupDismissed] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'design'>('text')

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)
    setCopySuccess(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/generate-user-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: inputText,
          include_metadata: includeMetadata,
          infer_edge_cases: inferEdgeCases,
          include_advanced_criteria: includeAdvancedCriteria,
          expand_all_components: expandAllComponents
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate user stories')
      }

      const data: GenerationResponse = await response.json()
      console.log('API Response:', data)
      console.log('Include Metadata:', includeMetadata)
      if (data.user_stories && data.user_stories.length > 0) {
        console.log('First story metadata:', data.user_stories[0].metadata)
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const generateMarkdown = (data: GenerationResponse): string => {
    let markdown = '# User Stories\n\n'
    
    data.user_stories.forEach((story, index) => {
      markdown += `## ${index + 1}. ${story.title}\n\n`
      markdown += `**User Story:** ${story.story}\n\n`
      markdown += `**Acceptance Criteria:**\n`
      story.acceptance_criteria.forEach(criteria => {
        markdown += `- ${criteria}\n`
      })
      
      if (includeMetadata && story.metadata) {
        markdown += '\n<details><summary>🧩 Metadata</summary>\n\n'
        markdown += `- Priority: ${story.metadata.priority}\n`
        markdown += `- Type: ${story.metadata.type}\n`
        markdown += `- Component: ${story.metadata.component}\n`
        markdown += `- Effort: ${story.metadata.effort}\n`
        markdown += `- Persona: ${story.metadata.persona === 'Other' && story.metadata.persona_other ? story.metadata.persona_other : story.metadata.persona}\n`
        markdown += '\n</details>\n'
      }
      
      markdown += '\n'
    })

    if (data.edge_cases.length > 0) {
      markdown += '# Edge Cases\n\n'
      data.edge_cases.forEach((edgeCase, index) => {
        markdown += `${index + 1}. ${edgeCase}\n`
      })
    }

    return markdown
  }

  const handleCopyToClipboard = async () => {
    if (!result) return

    try {
      const markdown = generateMarkdown(result)
      await navigator.clipboard.writeText(markdown)
      setCopySuccess('Copied to clipboard!')
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (err) {
      setCopySuccess('Failed to copy')
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }

  const handleDownloadMarkdown = () => {
    if (!result) return

    const markdown = generateMarkdown(result)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-stories.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadJSON = () => {
    if (!result) return

    const exportData = includeMetadata ? result : {
      user_stories: result.user_stories.map(story => ({
        title: story.title,
        story: story.story,
        acceptance_criteria: story.acceptance_criteria
      })),
      edge_cases: result.edge_cases
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-stories.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
    console.log('handleSubmitFeedback called with storyIndex:', storyIndex)
    const feedbackState = feedbackStates.get(storyIndex)
    console.log('feedbackState:', feedbackState)
    
    if (!feedbackState || !feedbackState.rating) {
      console.log('No feedback state or rating, returning early')
      return
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const story = result?.user_stories[storyIndex]
      console.log('Submitting feedback to:', `${apiUrl}/submit-feedback`)
      console.log('Story:', story)
      
      const response = await fetch(`${apiUrl}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackState.rating,
          feedback_text: feedbackState.text,
          story_title: story?.title,
          story_content: story?.story,
          timestamp: new Date().toISOString()
        })
      })

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      const newStates = new Map(feedbackStates)
      newStates.set(storyIndex, { rating: 'down', text: '', expanded: false, submitted: true })
      setFeedbackStates(newStates)
      
      setCopySuccess('Feedback submitted successfully!')
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (error) {
      console.error('Feedback submission error:', error)
      setCopySuccess('Failed to submit feedback')
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }

  const handleRegenerateStory = async (storyIndex: number) => {
    if (!result || !inputText.trim()) return

    const newRegeneratingStates = new Set(regeneratingStates)
    newRegeneratingStates.add(storyIndex)
    setRegeneratingStates(newRegeneratingStates)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const currentStory = result.user_stories[storyIndex]
      
      const response = await fetch(`${apiUrl}/regenerate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_input: inputText,
          current_story: currentStory,
          include_metadata: includeMetadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to regenerate story')
      }

      const regeneratedStory = await response.json()
      
      const updatedResult = { ...result }
      updatedResult.user_stories = [...result.user_stories]
      updatedResult.user_stories[storyIndex] = regeneratedStory
      setResult(updatedResult)

      const newFeedbackStates = new Map(feedbackStates)
      newFeedbackStates.delete(storyIndex)
      setFeedbackStates(newFeedbackStates)

      setCopySuccess('Story regenerated successfully!')
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (error) {
      console.error('Story regeneration error:', error)
      setCopySuccess('Failed to regenerate story')
      setTimeout(() => setCopySuccess(null), 3000)
    } finally {
      const newRegeneratingStates = new Set(regeneratingStates)
      newRegeneratingStates.delete(storyIndex)
      setRegeneratingStates(newRegeneratingStates)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      return
    }
    
    setEmailSignupSuccess(true)
    setEmail('')
    
    setTimeout(() => {
      setEmailSignupSuccess(false)
      setEmailSignupDismissed(true)
      localStorage.setItem('emailSignupDismissed', 'true')
    }, 2000) // Wait 2 seconds to show success message
  }

  const handleDismissEmailSignup = () => {
    setEmailSignupDismissed(true)
    localStorage.setItem('emailSignupDismissed', 'true')
  }

  useEffect(() => {
    const dismissed = localStorage.getItem('emailSignupDismissed')
    if (dismissed === 'true') {
      setEmailSignupDismissed(true)
    }
  }, [])

  const handleExportWithModal = (exportAction: () => void) => {
    setPendingExportAction(() => exportAction)
    setShowExportModal(true)
  }

  const handleExportConfirm = (withEmail: boolean) => {
    if (withEmail && email) {
      console.log('Sending export to:', email)
    }
    
    if (pendingExportAction) {
      pendingExportAction()
    }
    
    setShowExportModal(false)
    setPendingExportAction(null)
  }

  const handleExportDecline = () => {
    if (pendingExportAction) {
      pendingExportAction()
    }
    
    setShowExportModal(false)
    setPendingExportAction(null)
  }

  const handleModalDismiss = () => {
    setShowExportModal(false)
    setPendingExportAction(null)
    setEmail('')
  }

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showExportModal) {
        handleModalDismiss()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showExportModal])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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
    setError(null)

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

  const handleAnalyzeDesign = async () => {
    if (!uploadedFile) {
      setError('Please upload a design file to analyze')
      return
    }

    setIsProcessingFile(true)
    setError(null)
    setResult(null)
    setCopySuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('include_metadata', includeMetadata.toString())
      formData.append('infer_edge_cases', inferEdgeCases.toString())
      formData.append('include_advanced_criteria', includeAdvancedCriteria.toString())
      formData.append('expand_all_components', expandAllComponents.toString())

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/analyze-design`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to analyze design')
      }

      const data: GenerationResponse = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsProcessingFile(false)
    }
  }

  const handleClearFile = () => {
    setUploadedFile(null)
    setFilePreview(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">AI User Story Generator</h1>
          <p className="text-gray-400">Transform meeting notes and requirements into structured user stories with AI. The perfect product manager tool for agile teams.</p>
        </div>

        {/* Email Signup Form */}
        {!emailSignupDismissed && (
          <Card className="bg-gray-800 border-gray-700 mb-8 animate-in slide-in-from-top-2 duration-300">
            <CardContent className="pt-6 relative">
              <button
                onClick={handleDismissEmailSignup}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-150"
                aria-label="Dismiss email signup"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  <strong>Get notified when we launch advanced features — no spam, ever.</strong>
                </p>
                {emailSignupSuccess ? (
                  <div className="text-green-400 font-medium animate-in slide-in-from-top-2 duration-200">
                    Thanks — you're in!
                  </div>
                ) : (
                  <form onSubmit={handleEmailSignup} className="flex gap-3 max-w-md mx-auto">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email here"
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <Button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    >
                      Submit
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Input Method
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose how you want to generate user stories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input Mode Toggle */}
            <div className="flex items-center space-x-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="text"
                  checked={inputMode === 'text'}
                  onChange={(e) => setInputMode(e.target.value as 'text' | 'design')}
                  className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">Text Input</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="design"
                  checked={inputMode === 'design'}
                  onChange={(e) => setInputMode(e.target.value as 'text' | 'design')}
                  className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">Design Upload</span>
              </label>
            </div>

            {inputMode === 'text' ? (
              <>
                <Textarea
                  placeholder="Ex: We discussed in the meeting that users should get SMS alerts when their tasks are overdue. Also, marketing needs the dashboard export by Friday."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-32 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                  disabled={isLoading}
                />
                
                <div className="space-y-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                        disabled={isLoading}
                      />
                      <span className="text-sm text-gray-300">Add Suggested Metadata</span>
                    </label>
                  </div>
                  
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center space-x-1">
                      <Settings className="h-4 w-4" />
                      <span>Advanced Options</span>
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-2 ml-5 space-y-2 border-l border-gray-700 pl-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inferEdgeCases}
                          onChange={(e) => setInferEdgeCases(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isLoading}
                        />
                        <span className="text-xs text-gray-400">Infer edge cases</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAdvancedCriteria}
                          onChange={(e) => setIncludeAdvancedCriteria(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isLoading}
                        />
                        <span className="text-xs text-gray-400">Include advanced acceptance criteria</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={expandAllComponents}
                          onChange={(e) => setExpandAllComponents(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isLoading}
                        />
                        <span className="text-xs text-gray-400">Expand to all visible UI components</span>
                      </label>
                    </div>
                  </details>
                </div>
                
                <Button 
                  onClick={handleGenerate}
                  disabled={isLoading || !inputText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 ease-in-out"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating User Stories...
                    </>
                  ) : (
                    'Generate User Stories'
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload Design File (PNG, JPG, PDF)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      disabled={isProcessingFile}
                    />
                  </div>

                  {uploadedFile && (
                    <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-300">{uploadedFile.name}</span>
                        <button
                          onClick={handleClearFile}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {filePreview && (
                        <img
                          src={filePreview}
                          alt="Design preview"
                          className="max-w-full h-48 object-contain rounded border border-gray-600"
                        />
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                        disabled={isProcessingFile}
                      />
                      <span className="text-sm text-gray-300">Add Suggested Metadata</span>
                    </label>
                  </div>
                  
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center space-x-1">
                      <Settings className="h-4 w-4" />
                      <span>Advanced Options</span>
                      <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-2 ml-5 space-y-2 border-l border-gray-700 pl-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inferEdgeCases}
                          onChange={(e) => setInferEdgeCases(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isProcessingFile}
                        />
                        <span className="text-xs text-gray-400">Infer edge cases</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeAdvancedCriteria}
                          onChange={(e) => setIncludeAdvancedCriteria(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isProcessingFile}
                        />
                        <span className="text-xs text-gray-400">Include advanced acceptance criteria</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={expandAllComponents}
                          onChange={(e) => setExpandAllComponents(e.target.checked)}
                          className="w-3 h-3 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
                          disabled={isProcessingFile}
                        />
                        <span className="text-xs text-gray-400">Expand to all visible UI components</span>
                      </label>
                    </div>
                  </details>
                </div>
                
                <Button 
                  onClick={handleAnalyzeDesign}
                  disabled={isProcessingFile || !uploadedFile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 ease-in-out"
                >
                  {isProcessingFile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Design...
                    </>
                  ) : (
                    'Analyze Design'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="bg-red-900/20 border-red-800 mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            <div>
              <div className="border-t border-gray-600 pt-6 mb-6"></div>
              <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Generated User Stories
              </h2>
              <div className="space-y-4">
                {result.user_stories.map((story, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700 rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-white">{story.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-blue-400 mb-2">User Story</h4>
                        <p className="text-gray-300 italic">{story.story}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-400 mb-2">Acceptance Criteria</h4>
                        <ul className="space-y-1">
                          {story.acceptance_criteria.map((criteria, criteriaIndex) => (
                            <li key={criteriaIndex} className="text-gray-300 flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{criteria}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {includeMetadata && story.metadata && (
                        <div className="border-t border-gray-600 pt-4">
                          <button
                            onClick={() => toggleMetadataExpansion(index)}
                            className="flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            {expandedMetadata.has(index) ? (
                              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                            ) : (
                              <ChevronRight className="h-4 w-4 transition-transform duration-200 rotate-0" />
                            )}
                            🧩 Metadata
                          </button>
                          
                          {expandedMetadata.has(index) && (
                            <div className="mt-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Priority:</span>
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
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Type:</span>
                                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                                    {story.metadata.type}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Component:</span>
                                  <span className="text-gray-300">{story.metadata.component}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Effort:</span>
                                  <span className="text-gray-300">{story.metadata.effort}</span>
                                </div>
                                <div className="flex justify-between sm:col-span-2">
                                  <span className="text-gray-400">Persona:</span>
                                  <span className="text-gray-300">
                                    {story.metadata.persona === 'Other' && story.metadata.persona_other 
                                      ? story.metadata.persona_other 
                                      : story.metadata.persona}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="border-t border-gray-600 pt-4 mt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <button
                            onClick={() => handleFeedbackRating(index, 'up')}
                            title="Like this output?"
                            className={`p-2 rounded-lg transition-colors duration-150 ease-in-out ${
                              feedbackStates.get(index)?.rating === 'up'
                                ? 'bg-green-600 text-white'
                                : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                            }`}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleFeedbackRating(index, 'down')}
                            title="Dislike this output?"
                            className={`p-2 rounded-lg transition-colors duration-150 ease-in-out ${
                              feedbackStates.get(index)?.rating === 'down'
                                ? 'bg-red-600 text-white'
                                : 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                            }`}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateStory(index)}
                            disabled={regeneratingStates.has(index)}
                            title="Regenerate story"
                            className="px-3 py-2 rounded-lg text-sm transition-colors duration-150 ease-in-out text-gray-400 hover:text-blue-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {regeneratingStates.has(index) ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                                Regenerating...
                              </>
                            ) : (
                              'Regenerate'
                            )}
                          </button>
                        </div>
                        
                        {/* Show thank you message for thumbs up */}
                        {feedbackStates.get(index)?.rating === 'up' && (
                          <div className="text-sm text-green-400 animate-in slide-in-from-top-2 duration-200">
                            Thanks! We're glad it was helpful.
                          </div>
                        )}
                        
                        {/* Show thank you message for submitted thumbs down feedback */}
                        {feedbackStates.get(index)?.rating === 'down' && feedbackStates.get(index)?.submitted && (
                          <div className="text-sm text-green-400 animate-in slide-in-from-top-2 duration-200">
                            Thanks for the feedback!
                          </div>
                        )}
                        
                        {/* Show feedback form for thumbs down */}
                        {feedbackStates.get(index)?.rating === 'down' && feedbackStates.get(index)?.expanded && !feedbackStates.get(index)?.submitted && (
                          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <label className="block text-sm text-gray-400 mb-2">
                                What could be improved?
                              </label>
                              <Textarea
                                value={feedbackStates.get(index)?.text || ''}
                                onChange={(e) => handleFeedbackTextChange(index, e.target.value)}
                                placeholder="Share your thoughts on how this user story could be better..."
                                className="min-h-20 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                              />
                            </div>
                            <Button
                              onClick={() => handleSubmitFeedback(index)}
                              disabled={!feedbackStates.get(index)?.rating}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Submit Feedback
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {result.edge_cases.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-white">Edge Cases</h2>
                <Card className="bg-gray-800 border-gray-700 rounded-xl">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {result.edge_cases.map((edgeCase, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Badge variant="outline" className="border-yellow-600 text-yellow-400 mt-1">
                            {index + 1}
                          </Badge>
                          <span className="text-gray-300">{edgeCase}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-gray-800 border-gray-700 rounded-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Options
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Export your generated user stories and edge cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleExportWithModal(handleCopyToClipboard)}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    onClick={() => handleExportWithModal(handleDownloadMarkdown)}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download as Markdown
                  </Button>
                  <Button
                    onClick={() => handleExportWithModal(handleDownloadJSON)}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download as JSON
                  </Button>
                </div>
                {copySuccess && (
                  <div className="text-center text-green-400 text-sm">
                    {copySuccess}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleModalDismiss}
          >
            <div 
              className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleModalDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-400" />
                </div>
                
                <h3 className="text-xl font-semibold text-white">
                  Want it emailed to you + new features as they launch?
                </h3>
                
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email here"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleExportConfirm(true)}
                      disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Yes, send it to me
                    </Button>
                    <Button
                      onClick={handleExportDecline}
                      variant="outline"
                      className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                    >
                      No thanks
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-400">
                  Low-friction opt-in • No spam, ever
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
