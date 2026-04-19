// Markdown renderer utility
import { marked } from 'marked'

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'])
const MD_EXTS = new Set(['.md', '.markdown', '.mdown'])

export function fileExt(p: string): string {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(i).toLowerCase() : ''
}

export function isImageFile(path: string): boolean {
  return IMAGE_EXTS.has(fileExt(path))
}

export function isMdFile(path: string): boolean {
  return MD_EXTS.has(fileExt(path))
}

export function renderMarkdown(content: string): string {
  return marked.parse(content || '') as string
}

export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]
  )
}

export function formatRelativeTime(timestamp: number, nowMs = Date.now()): string {
  if (!timestamp) return 'Unknown'
  const diffMs = Math.max(0, nowMs - timestamp * 1000)
  const minute = 60 * 1000
  const hour = 60 * minute

  if (diffMs < minute) return 'just now'
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  const hours = Math.floor(diffMs / hour)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(diffMs / (24 * hour))
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'

  const date = new Date(timestamp * 1000)
  const now = new Date(nowMs)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (date.getFullYear() !== now.getFullYear()) options.year = 'numeric'
  return date.toLocaleDateString(undefined, options)
}

export function formatTokens(n: number): string {
  if (!n || n < 0) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

export function getModelLabel(modelId: string): string {
  if (!modelId) return 'Unknown'
  return modelId.split('/').pop() || 'Unknown'
}

export function extractDisplayText(text: string): string {
  // Strip thinking blocks from display
  const thinkPatterns = [
    { open: '<think>', close: '</think>' },
    { open: '<|channel>thought\n', close: '<channel|>' },
    { open: '<|turn|>thinking\n', close: '<turn|>' },
  ]

  let result = text
  for (const { open, close } of thinkPatterns) {
    const trimmed = result.trimStart()
    if (trimmed.startsWith(open)) {
      const ci = trimmed.indexOf(close, open.length)
      if (ci !== -1) {
        result = trimmed.slice(ci + close.length).replace(/^\s+/, '')
      } else {
        result = ''
      }
    }
  }
  return result
}
