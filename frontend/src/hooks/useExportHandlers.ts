import { useState, useEffect, useCallback } from 'react'
import { downloadBlob } from '@/lib/utils'
import type { GenerationResponse } from '@/types/stories'

export function useExportHandlers(result: GenerationResponse | null, includeMetadata: boolean) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailSignupSuccess, setEmailSignupSuccess] = useState(false)
  const [emailSignupDismissed, setEmailSignupDismissed] = useState(
    () => localStorage.getItem('emailSignupDismissed') === 'true' || localStorage.getItem('emailSubmitted') === 'true'
  )
  const [showExportModal, setShowExportModal] = useState(false)
  const [pendingExportAction, setPendingExportAction] = useState<(() => void) | null>(null)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [donationModalDismissed, setDonationModalDismissed] = useState(
    () => localStorage.getItem('donationModalDismissed') === 'true'
  )

  const handleModalDismiss = useCallback(() => {
    setShowExportModal(false)
    setPendingExportAction(null)
    setEmail('')
  }, [])

  useEffect(() => {
    if (!showExportModal) return

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleModalDismiss()
    }
    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [showExportModal, handleModalDismiss])

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
        markdown += '\n<details><summary>Metadata</summary>\n\n'
        if (story.metadata.priority) markdown += `- Priority: ${story.metadata.priority}\n`
        if (story.metadata.type) markdown += `- Type: ${story.metadata.type}\n`
        if (story.metadata.component) markdown += `- Component: ${story.metadata.component}\n`
        if (story.metadata.effort) markdown += `- Effort: ${story.metadata.effort}\n`
        if (story.metadata.persona) {
          const persona = story.metadata.persona === 'Other' && story.metadata.persona_other
            ? story.metadata.persona_other
            : story.metadata.persona
          markdown += `- Persona: ${persona}\n`
        }
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

  const showDonationAfterExport = () => {
    if (!donationModalDismissed) {
      setTimeout(() => setShowDonationModal(true), 1500)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!result) return

    try {
      const markdown = generateMarkdown(result)
      await navigator.clipboard.writeText(markdown)
      setCopySuccess('Copied to clipboard!')
      setTimeout(() => setCopySuccess(null), 3000)
      showDonationAfterExport()
    } catch {
      setCopySuccess('Failed to copy')
      setTimeout(() => setCopySuccess(null), 3000)
    }
  }

  const handleDownloadMarkdown = () => {
    if (!result) return
    downloadBlob(generateMarkdown(result), 'user-stories.md', 'text/markdown')
    showDonationAfterExport()
  }

  const handleDownloadJSON = () => {
    if (!result) return

    const exportData = includeMetadata ? result : {
      user_stories: result.user_stories.map(story => ({
        title: story.title,
        story: story.story,
        acceptance_criteria: story.acceptance_criteria,
      })),
      edge_cases: result.edge_cases,
    }

    downloadBlob(JSON.stringify(exportData, null, 2), 'user-stories.json', 'application/json')
    showDonationAfterExport()
  }

  const handleExportWithModal = (exportAction: () => void) => {
    if (emailSignupDismissed) {
      exportAction()
      return
    }

    setPendingExportAction(() => exportAction)
    setShowExportModal(true)
  }

  const handleExportConfirm = (withEmail: boolean) => {
    if (withEmail && email) {
      // Email submission handled externally if needed
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
    setEmailSignupDismissed(true)
    localStorage.setItem('emailSignupDismissed', 'true')
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      return
    }

    setEmailSignupSuccess(true)
    setEmail('')
    localStorage.setItem('emailSubmitted', 'true')

    setTimeout(() => {
      setEmailSignupSuccess(false)
      setEmailSignupDismissed(true)
      localStorage.setItem('emailSignupDismissed', 'true')
    }, 2000)
  }

  const handleDismissEmailSignup = () => {
    setEmailSignupDismissed(true)
    localStorage.setItem('emailSignupDismissed', 'true')
  }

  const handleDismissDonation = () => {
    setShowDonationModal(false)
    setDonationModalDismissed(true)
    localStorage.setItem('donationModalDismissed', 'true')
  }

  const setSuccessMessage = (message: string) => {
    setCopySuccess(message)
    setTimeout(() => setCopySuccess(null), 3000)
  }

  return {
    copySuccess,
    setSuccessMessage,
    email,
    setEmail,
    emailSignupSuccess,
    emailSignupDismissed,
    showExportModal,
    showDonationModal,
    handleCopyToClipboard,
    handleDownloadMarkdown,
    handleDownloadJSON,
    handleExportWithModal,
    handleExportConfirm,
    handleExportDecline,
    handleModalDismiss,
    handleEmailSignup,
    handleDismissEmailSignup,
    handleDismissDonation,
  }
}
