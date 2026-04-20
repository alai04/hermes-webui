import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiPost } from '@/composables/useApi'
import { useSessionStore } from './session'

export interface LiveToolCall {
  id?: string
  name?: string
  status: 'running' | 'done' | 'error'
  input?: unknown
  output?: unknown
  [key: string]: unknown
}

interface ActiveStream {
  source: EventSource
  streamId: string
}

export const useStreamingStore = defineStore('streaming', () => {
  const activeStreams = ref<Map<string, ActiveStream>>(new Map())
  const liveTokens = ref<string>('')
  const liveThinking = ref<string>('')
  const toolCallsLive = ref<LiveToolCall[]>([])
  const isStreaming = ref<boolean>(false)
  const currentStreamId = ref<string | null>(null)

  // Polling intervals for approval/clarify
  let _approvalPollInterval: ReturnType<typeof setInterval> | null = null
  let _clarifyPollInterval: ReturnType<typeof setInterval> | null = null

  // Approval and clarify pending state (components subscribe to these)
  const pendingApproval = ref<Record<string, unknown> | null>(null)
  const pendingClarify = ref<Record<string, unknown> | null>(null)
  const pendingSessionId = ref<string | null>(null)

  async function startStream(
    sessionId: string,
    message: string,
    attachments?: string[],
    model?: string,
    workspace?: string
  ): Promise<string> {
    const sessionStore = useSessionStore()

    // Build the POST body for /api/chat/start
    const body: Record<string, unknown> = {
      session_id: sessionId,
      message,
    }
    if (attachments && attachments.length > 0) body.attachments = attachments
    if (model) body.model = model
    if (workspace) body.workspace = workspace

    const data = await apiPost('/api/chat/start', body)
    const streamId: string = data.stream_id

    // Reset live state for new turn
    liveTokens.value = ''
    liveThinking.value = ''
    toolCallsLive.value = []
    isStreaming.value = true
    sessionStore.busy = true
    sessionStore.activeStreamId = streamId
    currentStreamId.value = streamId

    const source = new EventSource(
      `/api/chat/stream?stream_id=${encodeURIComponent(streamId)}`,
    )

    activeStreams.value.set(sessionId, { source, streamId })

    source.addEventListener('token', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        liveTokens.value += payload.text ?? ''
      } catch {
        // Some backends send plain text tokens — fall back to raw data
        liveTokens.value += e.data
      }
    })

    source.addEventListener('tool_start', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        toolCallsLive.value.push({ ...payload, status: 'running' })
      } catch {
        // Ignore malformed events
      }
    })

    source.addEventListener('tool_end', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const idx = toolCallsLive.value.findIndex(
          (tc) => tc.id === payload.id || tc.name === payload.name
        )
        if (idx !== -1) {
          toolCallsLive.value[idx] = {
            ...toolCallsLive.value[idx],
            ...payload,
            status: payload.error ? 'error' : 'done',
          }
        }
      } catch {
        // Ignore malformed events
      }
    })

    source.addEventListener('stream_end', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        _finalizeStream(sessionId, payload)
      } catch {
        _finalizeStream(sessionId, {})
      }
    })

    source.addEventListener('error', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        console.error('[streaming] SSE error event:', payload)
      } catch {
        // Generic error
      }
      _cleanupStream(sessionId)
    })

    source.addEventListener('cancel', () => {
      _cleanupStream(sessionId)
    })

    source.onerror = () => {
      // Connection dropped — finalize with what we have
      _cleanupStream(sessionId)
    }

    // Start polling for approval/clarify requests
    pendingSessionId.value = sessionId
    _startPolling(sessionId)

    return streamId
  }

  async function cancelStream(): Promise<void> {
    const sid = currentStreamId.value
    if (!sid) return
    try {
      await fetch(`/api/chat/cancel?stream_id=${encodeURIComponent(sid)}`, {
        credentials: 'include',
      })
    } catch {
      // Best-effort cancel
    }
    // Clean up all active streams on cancel
    for (const sessionId of activeStreams.value.keys()) {
      _cleanupStream(sessionId)
    }
  }

  function _finalizeStream(sessionId: string, payload: Record<string, unknown>): void {
    const sessionStore = useSessionStore()
    // Push the final assistant message from the payload if present
    if (payload.messages && Array.isArray(payload.messages)) {
      sessionStore.messages = payload.messages
    } else if (liveTokens.value) {
      sessionStore.messages.push({
        role: 'assistant',
        content: liveTokens.value,
      })
    }
    if (payload.tool_calls && Array.isArray(payload.tool_calls)) {
      sessionStore.toolCalls = payload.tool_calls
    }
    // Update session compact if present
    if (payload.session) {
      const updatedSession = payload.session as Record<string, unknown>
      if (sessionStore.currentSession?.session_id === sessionId) {
        sessionStore.currentSession = {
          ...sessionStore.currentSession,
          ...(updatedSession as any),
        }
        const idx = sessionStore.sessionList.findIndex((s) => s.session_id === sessionId)
        if (idx !== -1) {
          sessionStore.sessionList[idx] = {
            ...sessionStore.sessionList[idx],
            ...(updatedSession as any),
          }
        }
      }
    }
    _cleanupStream(sessionId)
  }

  function _cleanupStream(sessionId: string): void {
    const sessionStore = useSessionStore()
    const stream = activeStreams.value.get(sessionId)
    if (stream) {
      stream.source.close()
      activeStreams.value.delete(sessionId)
    }
    isStreaming.value = activeStreams.value.size > 0
    sessionStore.busy = isStreaming.value
    sessionStore.activeStreamId = null
    currentStreamId.value = null
    liveTokens.value = ''
    liveThinking.value = ''
    toolCallsLive.value = []
    _stopPolling()
    pendingApproval.value = null
    pendingClarify.value = null
    pendingSessionId.value = null
  }

  function _startPolling(sessionId: string): void {
    _stopPolling()

    _approvalPollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/approval/pending?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: 'include' }
        )
        if (res.ok) {
          const data = await res.json()
          pendingApproval.value = data.pending ?? null
        }
      } catch {
        // Polling error — continue
      }
    }, 2000)

    _clarifyPollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/clarify/pending?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: 'include' }
        )
        if (res.ok) {
          const data = await res.json()
          pendingClarify.value = data.pending ?? null
        }
      } catch {
        // Polling error — continue
      }
    }, 2000)
  }

  function _stopPolling(): void {
    if (_approvalPollInterval !== null) {
      clearInterval(_approvalPollInterval)
      _approvalPollInterval = null
    }
    if (_clarifyPollInterval !== null) {
      clearInterval(_clarifyPollInterval)
      _clarifyPollInterval = null
    }
  }

  return {
    activeStreams,
    liveTokens,
    liveThinking,
    toolCallsLive,
    isStreaming,
    currentStreamId,
    pendingApproval,
    pendingClarify,
    pendingSessionId,
    startStream,
    cancelStream,
  }
})
