import { defineStore } from 'pinia'
import { ref } from 'vue'
import { startChat, createSSEStream, cancelStream, checkStreamStatus } from '@/api'
import { useSessionStore } from './sessions'

export interface ToolCall {
  name: string
  preview: string
  args: Record<string, any>
  snippet: string
  done: boolean
  tid?: string
  is_error?: boolean
  duration?: number
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<any[]>([])
  const toolCalls = ref<ToolCall[]>([])
  const isStreaming = ref(false)
  const currentStreamId = ref<string | null>(null)
  const assistantText = ref('')
  const reasoningText = ref('')
  const isThinking = ref(false)
  const thinkingContent = ref('')

  // Thinking tag patterns
  const THINK_PATTERNS = [
    { open: '<think>', close: '</think>' },
    { open: '<|channel>thought\n', close: '<channel|>' },
    { open: '<|turn|>thinking\n', close: '<turn|>' },
  ]

  function addMessage(msg: any) {
    messages.value.push(msg)
  }

  function setMessages(msgs: any[]) {
    messages.value = msgs
  }

  async function sendMessage(
    sessionId: string,
    text: string,
    attachments?: string[],
    workspace?: string,
    model?: string
  ) {
    const sessionStore = useSessionStore()
    const startData = await startChat(sessionId, text, attachments, workspace, model)
    currentStreamId.value = startData.stream_id
    isStreaming.value = true
    sessionStore.activeStreamId = startData.stream_id
    sessionStore.isBusy = true

    // Start SSE stream
    startSSEStream(sessionId, startData.stream_id)
  }

  function startSSEStream(sessionId: string, streamId: string) {
    const source = createSSEStream(streamId)

    source.addEventListener('token', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      assistantText.value += d.text
      updateAssistantMessage()
    })

    source.addEventListener('reasoning', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      reasoningText.value += d.text || ''
      updateThinking()
    })

    source.addEventListener('tool', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      if (d.name === 'clarify') return
      const tc: ToolCall = {
        name: d.name,
        preview: d.preview || '',
        args: d.args || {},
        snippet: '',
        done: false,
        tid: d.tid || `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }
      toolCalls.value.push(tc)
    })

    source.addEventListener('tool_complete', (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      if (d.name === 'clarify') return
      // Mark the most recent incomplete tool call as done
      const tc = [...toolCalls.value].reverse().find(t => !t.done)
      if (tc) {
        tc.done = true
        tc.is_error = !!d.is_error
        if (d.duration !== undefined) tc.duration = d.duration
      }
    })

    source.addEventListener('title', (e: MessageEvent) => {
      const d = JSON.parse(e.data || '{}')
      const newTitle = String(d.title || '').trim()
      if (!newTitle) return
      const sessionStore = useSessionStore()
      if (sessionStore.activeSession?.session_id === sessionId) {
        sessionStore.activeSession.title = newTitle
      }
      sessionStore.loadSessions()
    })

    source.addEventListener('done', async (e: MessageEvent) => {
      const d = JSON.parse(e.data)
      const sessionStore = useSessionStore()

      if (sessionStore.activeSession?.session_id === sessionId) {
        sessionStore.activeSession = d.session
        messages.value = d.session.messages || []
        toolCalls.value = (d.session.tool_calls || []).map((tc: any) => ({ ...tc, done: true }))
        sessionStore.isBusy = false
      }

      cleanup()
      source.close()
    })

    source.addEventListener('stream_end', () => {
      source.close()
    })

    source.addEventListener('cancel', () => {
      cleanup()
      source.close()
      messages.value.push({ role: 'assistant', content: '*Task cancelled.*' })
    })

    source.addEventListener('error', async () => {
      // Attempt reconnect once
      try {
        const st = await checkStreamStatus(streamId)
        if (st.active) {
          source.close()
          startSSEStream(sessionId, streamId)
          return
        }
      } catch { /* fall through to error handling */ }
      cleanup()
      source.close()
    })

    function cleanup() {
      isStreaming.value = false
      currentStreamId.value = null
      assistantText.value = ''
      reasoningText.value = ''
      isThinking.value = false
      thinkingContent.value = ''
      const sessionStore = useSessionStore()
      sessionStore.isBusy = false
      sessionStore.activeStreamId = null
    }
  }

  function updateAssistantMessage() {
    // Parse thinking blocks from assistant text
    const raw = assistantText.value
    if (reasoningText.value) return // reasoning handled separately

    for (const { open, close } of THINK_PATTERNS) {
      const trimmed = raw.trimStart()
      if (trimmed.startsWith(open)) {
        const ci = trimmed.indexOf(close, open.length)
        if (ci !== -1) {
          // Complete thinking block - strip it
          assistantText.value = trimmed.slice(ci + close.length).replace(/^\s+/, '')
          isThinking.value = false
          return
        }
        // Inside thinking block
        isThinking.value = true
        thinkingContent.value = trimmed.slice(open.length).trim()
        assistantText.value = ''
        return
      }
      if (open.startsWith(trimmed)) {
        isThinking.value = true
        thinkingContent.value = ''
        assistantText.value = ''
        return
      }
    }
    isThinking.value = false
  }

  function updateThinking() {
    if (reasoningText.value) {
      isThinking.value = true
      thinkingContent.value = reasoningText.value
    }
  }

  async function cancelMessage() {
    if (currentStreamId.value) {
      try {
        await cancelStream(currentStreamId.value)
      } catch (e) {
        console.warn('Cancel failed:', e)
      }
      isStreaming.value = false
      currentStreamId.value = null
      const sessionStore = useSessionStore()
      sessionStore.isBusy = false
      sessionStore.activeStreamId = null
    }
  }

  function clearChat() {
    messages.value = []
    toolCalls.value = []
    assistantText.value = ''
    reasoningText.value = ''
    isThinking.value = false
    thinkingContent.value = ''
  }

  return {
    messages,
    toolCalls,
    isStreaming,
    currentStreamId,
    assistantText,
    reasoningText,
    isThinking,
    thinkingContent,
    addMessage,
    setMessages,
    sendMessage,
    cancelMessage,
    clearChat,
  }
})
