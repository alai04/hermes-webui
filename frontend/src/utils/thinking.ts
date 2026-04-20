/**
 * parseThinkingBlocks — extract and strip thinking/reasoning sections
 * from assistant messages.
 *
 * Supported formats:
 *   1. <think>...</think>  (standard XML-style, e.g. QwQ, DeepSeek-R1 via OpenAI-compat)
 *   2. <|channel>thought...  (Hermes-style special token, ends at next token or EOS)
 *   3. <|turn|>thinking...   (alternate Hermes turn-level thinking marker)
 */

export interface ThinkingResult {
  /** The extracted thinking/reasoning text (may be empty) */
  thinking: string
  /** The remaining visible content with thinking blocks removed */
  content: string
}

/**
 * Parse thinking blocks out of a raw assistant message string.
 * Returns { thinking, content } where content is safe to render as Markdown.
 */
export function parseThinkingBlocks(text: string): ThinkingResult {
  if (!text) return { thinking: '', content: '' }

  const thinkingParts: string[] = []
  let remaining = text

  // ── Format 1: <think>...</think> (greedy, handles nested only one level) ──
  // Use a non-greedy match to extract the innermost/first block.
  const thinkTagRe = /<think>([\s\S]*?)<\/think>/gi
  let match: RegExpExecArray | null
  const thinkMatches: string[] = []

  // Reset lastIndex
  thinkTagRe.lastIndex = 0
  // eslint-disable-next-line no-cond-assign
  while ((match = thinkTagRe.exec(remaining)) !== null) {
    thinkMatches.push(match[1].trim())
  }
  if (thinkMatches.length > 0) {
    thinkingParts.push(...thinkMatches)
    remaining = remaining.replace(thinkTagRe, '').trim()
  }

  // ── Format 2: <|channel>thought...  ──────────────────────────────────────
  // This token marks everything after it (until the next special token or end)
  // as internal monologue. We treat it as a prefix that runs to the first
  // non-thought line or to a recognisable transition.
  const channelRe = /^<\|channel\>(.*)$/im
  const channelMatch = channelRe.exec(remaining)
  if (channelMatch) {
    thinkingParts.push(channelMatch[1].trim())
    remaining = remaining.replace(channelRe, '').trim()
  }

  // ── Format 3: <|turn|>thinking... ────────────────────────────────────────
  // Similar to format 2 — a leading marker that prefixes internal reasoning.
  const turnRe = /^<\|turn\|>(.*)$/im
  const turnMatch = turnRe.exec(remaining)
  if (turnMatch) {
    thinkingParts.push(turnMatch[1].trim())
    remaining = remaining.replace(turnRe, '').trim()
  }

  return {
    thinking: thinkingParts.filter(Boolean).join('\n\n'),
    content: remaining,
  }
}
