import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle, AlertTriangle, Copy, Download } from '@/components/icons'
import { useQuickGenerate } from '@/hooks/useQuickGenerate'
import { useExportHandlers } from '@/hooks/useExportHandlers'
import { useDesignUpload } from '@/hooks/useDesignUpload'
import { useFeedbackAndRegenerate } from '@/hooks/useFeedbackAndRegenerate'
import { QuickGenerateSettings } from './QuickGenerateSettings'
import { DesignUploadZone } from './DesignUploadZone'
import { UserStoryCard } from './UserStoryCard'
import { ExportModal } from './ExportModal'
import { DonationModal } from './DonationModal'
import { EmailSignupCard } from './EmailSignupCard'

export function QuickGenerateMode() {
  const [inputMode, setInputMode] = useState<'text' | 'design'>('text')

  const generate = useQuickGenerate()
  const exportHandlers = useExportHandlers(generate.result, generate.settings.includeMetadata)
  const designUpload = useDesignUpload(
    generate.checkBackendHealth,
    generate.updateResult,
    generate.setError,
    generate.clearError,
  )
  const feedback = useFeedbackAndRegenerate(
    generate.result,
    generate.updateResult,
    generate.inputText,
    designUpload.uploadedFile,
    generate.settings.includeMetadata,
    exportHandlers.setSuccessMessage,
  )

  return (
    <>
      <EmailSignupCard
        dismissed={exportHandlers.emailSignupDismissed}
        email={exportHandlers.email}
        success={exportHandlers.emailSignupSuccess}
        onEmailChange={exportHandlers.setEmail}
        onSubmit={exportHandlers.handleEmailSignup}
        onDismiss={exportHandlers.handleDismissEmailSignup}
      />

      <Card className="bg-charcoal-lighter border-charcoal-light mb-8">
        <CardHeader>
          <CardTitle className="text-pure-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Input Method
          </CardTitle>
          <CardDescription className="text-soft-gray">
            Choose how you want to generate user stories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Mode Toggle */}
          <div className="flex items-center space-x-4 p-3 bg-charcoal-light rounded-lg border border-charcoal-light">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="inputMode"
                value="text"
                checked={inputMode === 'text'}
                onChange={(e) => setInputMode(e.target.value as 'text' | 'design')}
                className="w-4 h-4 text-vivid-purple bg-charcoal-light border-soft-gray focus:ring-vivid-purple focus:ring-2"
              />
              <span className="text-sm text-soft-gray">Text Input</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="inputMode"
                value="design"
                checked={inputMode === 'design'}
                onChange={(e) => setInputMode(e.target.value as 'text' | 'design')}
                className="w-4 h-4 text-vivid-purple bg-charcoal-light border-soft-gray focus:ring-vivid-purple focus:ring-2"
              />
              <span className="text-sm text-soft-gray">Design Upload</span>
            </label>
          </div>

          {inputMode === 'text' ? (
            <>
              <Textarea
                placeholder="Ex: We discussed in the meeting that users should get SMS alerts when their tasks are overdue. Also, marketing needs the dashboard export by Friday."
                value={generate.inputText}
                onChange={(e) => generate.setInputText(e.target.value)}
                className="min-h-32 bg-charcoal-light border-charcoal-light text-pure-white placeholder-soft-gray resize-none"
                disabled={generate.isLoading}
              />

              <QuickGenerateSettings
                includeMetadata={generate.settings.includeMetadata}
                inferEdgeCases={generate.settings.inferEdgeCases}
                includeAdvancedCriteria={generate.settings.includeAdvancedCriteria}
                expandAllComponents={generate.settings.expandAllComponents}
                disabled={generate.isLoading}
                onIncludeMetadataChange={(v) => generate.setSettings(s => ({ ...s, includeMetadata: v }))}
                onInferEdgeCasesChange={(v) => generate.setSettings(s => ({ ...s, inferEdgeCases: v }))}
                onIncludeAdvancedCriteriaChange={(v) => generate.setSettings(s => ({ ...s, includeAdvancedCriteria: v }))}
                onExpandAllComponentsChange={(v) => generate.setSettings(s => ({ ...s, expandAllComponents: v }))}
              />

              <Button
                onClick={generate.handleGenerate}
                disabled={generate.isLoading || !generate.inputText.trim()}
                className="w-full bg-vivid-purple hover:bg-charcoal-light text-pure-white transition-colors duration-150 ease-in-out"
              >
                {generate.isLoading ? (
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
              <DesignUploadZone
                isDragOver={designUpload.isDragOver}
                isProcessingFile={designUpload.isProcessingFile}
                processingMessage={designUpload.processingMessage}
                uploadedFile={designUpload.uploadedFile}
                filePreview={designUpload.filePreview}
                onFileUpload={designUpload.handleFileUpload}
                onClearFile={designUpload.handleClearFile}
                onDragEnter={designUpload.handleDragEnter}
                onDragLeave={designUpload.handleDragLeave}
                onDragOver={designUpload.handleDragOver}
                onDrop={designUpload.handleDrop}
              />

              <QuickGenerateSettings
                includeMetadata={generate.settings.includeMetadata}
                inferEdgeCases={generate.settings.inferEdgeCases}
                includeAdvancedCriteria={generate.settings.includeAdvancedCriteria}
                expandAllComponents={generate.settings.expandAllComponents}
                disabled={designUpload.isProcessingFile}
                onIncludeMetadataChange={(v) => generate.setSettings(s => ({ ...s, includeMetadata: v }))}
                onInferEdgeCasesChange={(v) => generate.setSettings(s => ({ ...s, inferEdgeCases: v }))}
                onIncludeAdvancedCriteriaChange={(v) => generate.setSettings(s => ({ ...s, includeAdvancedCriteria: v }))}
                onExpandAllComponentsChange={(v) => generate.setSettings(s => ({ ...s, expandAllComponents: v }))}
              />

              <Button
                onClick={designUpload.handleAnalyzeDesign}
                disabled={designUpload.isProcessingFile || !designUpload.uploadedFile}
                className="w-full bg-vivid-purple hover:bg-charcoal-light text-pure-white transition-colors duration-150 ease-in-out"
              >
                {designUpload.isProcessingFile ? (
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

      {generate.error && (
        <Card className="bg-red-900/20 border-red-800 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{generate.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {generate.streamingText && generate.isLoading && (
        <Card className="bg-charcoal-lighter border-charcoal-light mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-vivid-purple">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-soft-gray font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto p-4 bg-charcoal-dark rounded-lg">
              {generate.streamingText}
            </div>
          </CardContent>
        </Card>
      )}

      {generate.result && (
        <div className="space-y-6">
          <div>
            <div className="border-t border-charcoal-light pt-6 mb-6"></div>
            <h2 className="text-2xl font-semibold mb-4 text-pure-white flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Generated User Stories
            </h2>
            <div className="space-y-4">
              {(() => {
                try {
                  if (!generate.result.user_stories || !Array.isArray(generate.result.user_stories)) {
                    console.error('user_stories is not an array:', generate.result.user_stories)
                    return <div className="text-red-400">Error: Invalid user stories data</div>
                  }

                  return generate.result.user_stories.map((story, index) => (
                    <UserStoryCard
                      key={index}
                      story={story}
                      index={index}
                      includeMetadata={generate.settings.includeMetadata}
                      isMetadataExpanded={feedback.expandedMetadata.has(index)}
                      feedbackState={feedback.feedbackStates.get(index)}
                      isRegenerating={feedback.regeneratingStates.has(index)}
                      onToggleMetadata={feedback.toggleMetadataExpansion}
                      onFeedbackRating={feedback.handleFeedbackRating}
                      onFeedbackTextChange={feedback.handleFeedbackTextChange}
                      onSubmitFeedback={feedback.handleSubmitFeedback}
                      onRegenerate={feedback.handleRegenerateStory}
                    />
                  ))
                } catch (error) {
                  console.error('Error rendering user stories:', error)
                  return (
                    <div className="text-red-400 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                      <h3 className="font-medium mb-2">Rendering Error</h3>
                      <p>Error displaying user stories: {error instanceof Error ? error.message : 'Unknown error'}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">Debug Info</summary>
                        <pre className="text-xs mt-2 bg-black/30 p-2 rounded overflow-auto">
                          {JSON.stringify(generate.result, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )
                }
              })()}
            </div>
          </div>

          {generate.result.edge_cases.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-pure-white">Edge Cases</h2>
              <Card className="bg-charcoal-lighter border-charcoal-light rounded-xl">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    {generate.result.edge_cases.map((edgeCase, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="border-yellow-600 text-yellow-400 mt-1">
                          {index + 1}
                        </Badge>
                        <span className="text-soft-gray">{edgeCase}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="bg-charcoal-lighter border-charcoal-light rounded-xl">
            <CardHeader>
              <CardTitle className="text-pure-white flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription className="text-soft-gray">
                Export your generated user stories and edge cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => exportHandlers.handleExportWithModal(exportHandlers.handleCopyToClipboard)}
                  variant="outline"
                  className="flex-1 bg-charcoal-light border-charcoal-light text-pure-white hover:bg-charcoal-lighter hover:border-soft-gray hover:text-pure-white"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => exportHandlers.handleExportWithModal(exportHandlers.handleDownloadMarkdown)}
                  variant="outline"
                  className="flex-1 bg-charcoal-light border-charcoal-light text-pure-white hover:bg-charcoal-lighter hover:border-soft-gray hover:text-pure-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as Markdown
                </Button>
                <Button
                  onClick={() => exportHandlers.handleExportWithModal(exportHandlers.handleDownloadJSON)}
                  variant="outline"
                  className="flex-1 bg-charcoal-light border-charcoal-light text-pure-white hover:bg-charcoal-lighter hover:border-soft-gray hover:text-pure-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as JSON
                </Button>
              </div>
              {exportHandlers.copySuccess && (
                <div className="text-center text-green-400 text-sm">
                  {exportHandlers.copySuccess}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ExportModal
        isOpen={exportHandlers.showExportModal}
        email={exportHandlers.email}
        onEmailChange={exportHandlers.setEmail}
        onConfirm={exportHandlers.handleExportConfirm}
        onDecline={exportHandlers.handleExportDecline}
        onDismiss={exportHandlers.handleModalDismiss}
      />

      <DonationModal
        isOpen={exportHandlers.showDonationModal}
        onDismiss={exportHandlers.handleDismissDonation}
      />
    </>
  )
}
