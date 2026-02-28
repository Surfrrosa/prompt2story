import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Copy, Download, ChevronDown, ChevronRight } from '@/components/icons'

interface UserStory {
  title: string
  story: string
  acceptance_criteria: string[]
  metadata?: {
    priority?: 'Low' | 'Medium' | 'High'
    type?: string
    component?: string
    effort?: string
    persona?: string
  }
}

interface FinalOutputData {
  user_stories: UserStory[]
  edge_cases?: string[]
}

// Normalize different agent output formats into a common shape
// The Refiner outputs { user_stories: [...] }, the Writer outputs { stories: [...] }
function normalizeOutput(raw: unknown): FinalOutputData | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, any>

  // Refiner format (preferred)
  if (Array.isArray(obj.user_stories) && obj.user_stories.length > 0) {
    return obj as FinalOutputData
  }

  // Writer format (fallback when Refiner was skipped)
  if (Array.isArray(obj.stories) && obj.stories.length > 0) {
    return {
      user_stories: obj.stories.map((s: any) => ({
        title: s.title || 'Untitled Story',
        story: [s.asA && `As a ${s.asA}`, s.iWant && `I want ${s.iWant}`, s.soThat && `so that ${s.soThat}`]
          .filter(Boolean)
          .join(', '),
        acceptance_criteria: s.acceptanceCriteria || s.acceptance_criteria || [],
        metadata: {
          component: s.epic,
          persona: s.asA,
        },
      })),
      edge_cases: [],
    }
  }

  return null
}

interface FinalOutputProps {
  output: unknown
  onReset: () => void
  elapsedMs: number
}

export function FinalOutput({ output, onReset, elapsedMs }: FinalOutputProps) {
  const [expandedMetadata, setExpandedMetadata] = useState<Set<number>>(new Set())
  const [copySuccess, setCopySuccess] = useState(false)

  const data = normalizeOutput(output)
  if (!data?.user_stories?.length) {
    return (
      <Card className="bg-charcoal-lighter border-charcoal-light mt-4">
        <CardContent className="p-6 text-center">
          <p className="text-soft-gray font-mono text-sm">
            Pipeline completed but no stories were generated.
          </p>
          <Button
            onClick={onReset}
            variant="ghost"
            className="mt-3 text-vivid-purple hover:text-vivid-purple/80 font-mono text-sm"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const toggleMetadata = (index: number) => {
    setExpandedMetadata((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleCopy = async () => {
    const markdown = data.user_stories
      .map((s, i) => {
        let md = `## ${i + 1}. ${s.title}\n\n`
        md += `${s.story}\n\n`
        md += `### Acceptance Criteria\n`
        md += s.acceptance_criteria.map((c) => `- ${c}`).join('\n')
        return md
      })
      .join('\n\n---\n\n')

    await navigator.clipboard.writeText(markdown)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleDownload = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-stories.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-pure-white font-mono text-sm font-bold">
            {data.user_stories.length} Stories Generated
          </span>
          <span className="text-soft-gray/60 font-mono text-xs">
            ({(elapsedMs / 1000).toFixed(1)}s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-soft-gray hover:text-pure-white font-mono text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            {copySuccess ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-soft-gray hover:text-pure-white font-mono text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-vivid-purple hover:text-vivid-purple/80 font-mono text-xs"
          >
            New Run
          </Button>
        </div>
      </div>

      {/* Story cards */}
      {data.user_stories.map((story, index) => (
        <Card key={index} className="bg-charcoal-lighter border-charcoal-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-pure-white text-base">{story.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-purple-400 mb-1 text-sm">User Story</h4>
              <p className="text-soft-gray italic text-sm">{story.story}</p>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-1 text-sm">Acceptance Criteria</h4>
              <ul className="space-y-1">
                {story.acceptance_criteria.map((criteria, ci) => (
                  <li key={ci} className="text-soft-gray text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">-</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>

            {story.metadata && (
              <div className="border-t border-charcoal-light pt-3">
                <button
                  onClick={() => toggleMetadata(index)}
                  className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors font-mono"
                >
                  {expandedMetadata.has(index) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Metadata
                </button>

                {expandedMetadata.has(index) && (
                  <div className="mt-2 p-2 bg-charcoal-light rounded-lg text-xs grid grid-cols-2 gap-2">
                    {story.metadata.priority && (
                      <div className="flex justify-between">
                        <span className="text-soft-gray">Priority:</span>
                        <Badge
                          variant="outline"
                          className={
                            story.metadata.priority === 'High'
                              ? 'border-red-500 text-red-400 text-[10px]'
                              : story.metadata.priority === 'Medium'
                                ? 'border-yellow-500 text-yellow-400 text-[10px]'
                                : 'border-green-500 text-green-400 text-[10px]'
                          }
                        >
                          {story.metadata.priority}
                        </Badge>
                      </div>
                    )}
                    {story.metadata.type && (
                      <div className="flex justify-between">
                        <span className="text-soft-gray">Type:</span>
                        <span className="text-pure-white">{story.metadata.type}</span>
                      </div>
                    )}
                    {story.metadata.component && (
                      <div className="flex justify-between">
                        <span className="text-soft-gray">Component:</span>
                        <span className="text-pure-white">{story.metadata.component}</span>
                      </div>
                    )}
                    {story.metadata.effort && (
                      <div className="flex justify-between">
                        <span className="text-soft-gray">Effort:</span>
                        <span className="text-pure-white">{story.metadata.effort}</span>
                      </div>
                    )}
                    {story.metadata.persona && (
                      <div className="flex justify-between">
                        <span className="text-soft-gray">Persona:</span>
                        <span className="text-pure-white">{story.metadata.persona}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edge cases */}
      {data.edge_cases && data.edge_cases.length > 0 && (
        <Card className="bg-charcoal-lighter border-charcoal-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-pure-white text-base">Edge Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.edge_cases.map((edgeCase, i) => (
                <li key={i} className="text-soft-gray text-sm flex items-start gap-2">
                  <span className="text-amber-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                  <span>{edgeCase}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
