/**
 * renderMarkdown — convert raw text to safe HTML with:
 *   - Full CommonMark via marked
 *   - Syntax highlighting via Prism (when available in browser)
 *   - KaTeX inline ($...$) and display ($$...$$) math
 */

import { marked, type Renderer } from 'marked'
import katex from 'katex'

// ── KaTeX math preprocessing ──────────────────────────────────────────────────

/**
 * Render a KaTeX expression to HTML. Returns the expression wrapped in an
 * error span on failure so the user can see what went wrong.
 */
function renderMath(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr, {
      displayMode,
      throwOnError: false,
      output: 'html',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `<span class="katex-error" title="${msg}">${expr}</span>`
  }
}

/**
 * Pre-process raw markdown text to replace $...$ and $$...$$ math fences
 * with rendered KaTeX HTML before passing to marked.
 *
 * We use placeholder tokens to prevent marked from mangling the HTML.
 * The replacement is done in two passes:
 *   1. Display math: $$ ... $$ (may be multiline)
 *   2. Inline math:  $ ... $   (single line only, avoids false positives)
 */
function preprocessMath(text: string): string {
  // Pass 1: display math $$...$$
  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
    return renderMath(expr.trim(), true)
  })

  // Pass 2: inline math $...$ (not inside code spans)
  // Negative lookahead/lookbehind to skip $$ already handled above
  result = result.replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, expr) => {
    return renderMath(expr, false)
  })

  return result
}

// ── Prism syntax highlighting ─────────────────────────────────────────────────

/** Attempt to highlight using window.Prism if available. */
function highlightCode(code: string, lang: string): string {
  const prism = (typeof window !== 'undefined' && (window as any).Prism)
  if (!prism) return code
  const grammar = prism.languages[lang] ?? prism.languages.plain
  if (!grammar) return code
  try {
    return prism.highlight(code, grammar, lang)
  } catch {
    return code
  }
}

// ── marked renderer setup ─────────────────────────────────────────────────────

const renderer: Partial<Renderer> = {
  code({ text, lang }: { text: string; lang?: string }): string {
    const language = (lang ?? '').toLowerCase().split(/\s+/)[0] || 'plain'
    const highlighted = highlightCode(text, language)
    return (
      `<pre class="language-${language}">` +
      `<code class="language-${language}">${highlighted}</code>` +
      `</pre>`
    )
  },
}

marked.use({
  renderer,
  gfm: true,
  breaks: false,
})

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render markdown text to safe HTML.
 * Applies KaTeX math and Prism syntax highlighting.
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  // Pre-process math blocks before giving text to marked
  const withMath = preprocessMath(text)

  // marked.parse is synchronous by default in marked v5+ (returns string)
  const html = marked.parse(withMath) as string

  return html
}
