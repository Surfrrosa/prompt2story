import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

interface UserStory {
  title: string
  story: string
  acceptance_criteria: string[]
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

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/generate-user-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate user stories')
      }

      const data: GenerationResponse = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
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
          </div>
        )}
      </div>
    </div>
  )
}

export default App
