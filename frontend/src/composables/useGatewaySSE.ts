import { ref, onBeforeUnmount } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

/**
 * Opens an SSE connection to /api/sessions/gateway/stream.
 * Updates the session store when sessions_changed events arrive.
 * Only connects when settings.showCliSessions is true.
 */
export function useGatewaySSE() {
  const isConnected = ref(false)
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function connect() {
    if (stopped || eventSource) return

    const settingsStore = useSettingsStore()
    if (!settingsStore.showCliSessions) return

    try {
      eventSource = new EventSource('/api/sessions/gateway/stream', undefined)
      isConnected.value = true

      eventSource.addEventListener('sessions_changed', () => {
        // Refresh session list from server
        const sessionStore = useSessionStore()
        sessionStore.fetchSessions().catch(() => {
          // ignore — best-effort update
        })
      })

      eventSource.addEventListener('session_update', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data)
          const sessionStore = useSessionStore()
          if (payload.session) {
            sessionStore._patchSessionInList(payload.session)
          }
        } catch {
          // Ignore malformed events
        }
      })

      eventSource.onerror = () => {
        cleanup()
        if (!stopped) {
          // Reconnect after 5 seconds
          reconnectTimer = setTimeout(() => {
            if (!stopped) connect()
          }, 5000)
        }
      }
    } catch {
      isConnected.value = false
    }
  }

  function cleanup() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    isConnected.value = false
  }

  function startGatewaySSE() {
    stopped = false
    connect()
  }

  function stopGatewaySSE() {
    stopped = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    cleanup()
  }

  onBeforeUnmount(() => {
    stopGatewaySSE()
  })

  return {
    isConnected,
    startGatewaySSE,
    stopGatewaySSE,
  }
}
