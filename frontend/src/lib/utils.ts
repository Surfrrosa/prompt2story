import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function classifyApiError(err: unknown): string {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return 'Cannot connect to serverless API. Please try again in a moment.'
  }
  if (err instanceof Error && err.message.includes('OpenAI')) {
    return 'API configuration error. Please check server logs and ensure OPENAI_API_KEY is set.'
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred'
}
