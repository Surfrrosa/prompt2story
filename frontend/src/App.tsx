import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle, AlertTriangle, Copy, Download, Settings, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react'

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
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())
  const [feedbackStates, setFeedbackStates] = useState<Map<number, { rating: 'up' | 'down' | null, text: string, expanded: boolean }>>(new Map())

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
          include_metadata: includeMetadata 
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
    const currentState = newStates.get(storyIndex) || { rating: null, text: '', expanded: false }
    newStates.set(storyIndex, { ...currentState, rating, expanded: true })
    setFeedbackStates(newStates)
  }

  const handleFeedbackTextChange = (storyIndex: number, text: string) => {
    const newStates = new Map(feedbackStates)
    const currentState = newStates.get(storyIndex) || { rating: null, text: '', expanded: false }
    newStates.set(storyIndex, { ...currentState, text })
    setFeedbackStates(newStates)
  }

  const handleSubmitFeedback = async (storyIndex: number) => {
    const feedbackState = feedbackStates.get(storyIndex)
    if (!feedbackState || !feedbackState.rating) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const story = result?.user_stories[storyIndex]
      
      await fetch(`${apiUrl}/submit-feedback`, {
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

      const newStates = new Map(feedbackStates)
      newStates.set(storyIndex, { rating: null, text: '', expanded: false })
      setFeedbackStates(newStates)
      
      setCopySuccess('Feedback submitted successfully!')
      setTimeout(() => setCopySuccess(null), 3000)
    } catch (error) {
      setCopySuccess('Failed to submit feedback')
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">User Story Generator</h1>
          <p className="text-gray-400">Transform unstructured text into structured user stories with AI</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Input Text
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter your unstructured requirements, ideas, or feature descriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Example: We need a login system where users can sign up with email, reset passwords, and have different access levels..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-32 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
              disabled={isLoading}
            />
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
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
            
            <Button 
              onClick={handleGenerate}
              disabled={isLoading || !inputText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
              <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Generated User Stories
              </h2>
              <div className="space-y-4">
                {result.user_stories.map((story, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
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
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
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
                            className={`p-2 rounded-lg transition-colors ${
                              feedbackStates.get(index)?.rating === 'up'
                                ? 'bg-green-600 text-white'
                                : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'
                            }`}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleFeedbackRating(index, 'down')}
                            className={`p-2 rounded-lg transition-colors ${
                              feedbackStates.get(index)?.rating === 'down'
                                ? 'bg-red-600 text-white'
                                : 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                            }`}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {feedbackStates.get(index)?.expanded && (
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
                <Card className="bg-gray-800 border-gray-700">
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

            <Card className="bg-gray-800 border-gray-700">
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
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    onClick={handleDownloadMarkdown}
                    variant="outline"
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download as Markdown
                  </Button>
                  <Button
                    onClick={handleDownloadJSON}
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
      </div>
    </div>
  )
}

export default App
