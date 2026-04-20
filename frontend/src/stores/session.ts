import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { apiGet, apiPost } from '@/composables/useApi'

const SESSION_STORAGE_KEY = 'hermes-webui-session'

export interface SessionCompact {
  session_id: string
  title: string
  workspace: string | null
  model: string | null
  message_count: number
  created_at: number
  updated_at: number
  pinned: boolean
  archived: boolean
  project_id: string | null
  profile: string | null
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  [key: string]: unknown
}

export interface ToolCall {
  id?: string
  name?: string
  status?: string
  [key: string]: unknown
}

export const useSessionStore = defineStore('session', () => {
  const sessionList = ref<SessionCompact[]>([])
  const currentSession = ref<SessionCompact | null>(null)
  const messages = ref<Message[]>([])
  const busy = ref<boolean>(false)
  const pendingFiles = ref<File[]>([])
  const toolCalls = ref<ToolCall[]>([])
  const activeStreamId = ref<string | null>(null)
  const activeProfile = ref<string>('default')

  // Persist the current session ID to localStorage
  watch(
    () => currentSession.value?.session_id,
    (id) => {
      try {
        if (id) {
          localStorage.setItem(SESSION_STORAGE_KEY, id)
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      } catch {
        // localStorage unavailable — continue silently
      }
    }
  )

  function getStoredSessionId(): string | null {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY)
    } catch {
      return null
    }
  }

  async function fetchSessions(): Promise<void> {
    const data = await apiGet('/api/sessions')
    sessionList.value = data.sessions ?? []
  }

  async function loadSession(id: string): Promise<void> {
    const data = await apiGet('/api/session', { session_id: id })
    const session = data.session
    currentSession.value = {
      session_id: session.session_id,
      title: session.title,
      workspace: session.workspace ?? null,
      model: session.model ?? null,
      message_count: session.message_count ?? 0,
      created_at: session.created_at,
      updated_at: session.updated_at,
      pinned: session.pinned ?? false,
      archived: session.archived ?? false,
      project_id: session.project_id ?? null,
      profile: session.profile ?? null,
    }
    messages.value = session.messages ?? []
    toolCalls.value = session.tool_calls ?? []
    activeStreamId.value = session.active_stream_id ?? null
  }

  async function newSession(workspace?: string, model?: string): Promise<SessionCompact> {
    const body: Record<string, string> = {}
    if (workspace) body.workspace = workspace
    if (model) body.model = model
    const data = await apiPost('/api/session/new', body)
    const session = data.session as SessionCompact
    sessionList.value.unshift(session)
    currentSession.value = session
    messages.value = []
    toolCalls.value = []
    activeStreamId.value = null
    return session
  }

  async function deleteSession(id: string): Promise<void> {
    await apiPost('/api/session/delete', { session_id: id })
    sessionList.value = sessionList.value.filter((s) => s.session_id !== id)
    if (currentSession.value?.session_id === id) {
      currentSession.value = null
      messages.value = []
      toolCalls.value = []
      activeStreamId.value = null
    }
  }

  async function renameSession(id: string, title: string): Promise<void> {
    const data = await apiPost('/api/session/rename', { session_id: id, title })
    const updated = data.session as SessionCompact
    _patchSessionInList(updated)
    if (currentSession.value?.session_id === id) {
      currentSession.value = { ...currentSession.value, title: updated.title }
    }
  }

  async function pinSession(id: string, pinned: boolean): Promise<void> {
    const data = await apiPost('/api/session/pin', { session_id: id, pinned })
    const updated = data.session as SessionCompact
    _patchSessionInList(updated)
    if (currentSession.value?.session_id === id) {
      currentSession.value = { ...currentSession.value, pinned: updated.pinned }
    }
  }

  async function archiveSession(id: string, archived: boolean): Promise<void> {
    const data = await apiPost('/api/session/archive', { session_id: id, archived })
    const updated = data.session as SessionCompact
    _patchSessionInList(updated)
    if (currentSession.value?.session_id === id) {
      currentSession.value = { ...currentSession.value, archived: updated.archived }
    }
  }

  async function updateSession(
    id: string,
    workspace?: string,
    model?: string
  ): Promise<void> {
    const body: Record<string, string> = { session_id: id }
    if (workspace !== undefined) body.workspace = workspace
    if (model !== undefined) body.model = model
    const data = await apiPost('/api/session/update', body)
    const session = data.session
    _patchSessionInList(session)
    if (currentSession.value?.session_id === id) {
      currentSession.value = { ...currentSession.value, ...session }
      messages.value = session.messages ?? messages.value
      toolCalls.value = session.tool_calls ?? toolCalls.value
    }
  }

  async function clearSession(id: string): Promise<void> {
    await apiPost('/api/session/clear', { session_id: id })
    if (currentSession.value?.session_id === id) {
      messages.value = []
      toolCalls.value = []
      activeStreamId.value = null
      currentSession.value = { ...currentSession.value, message_count: 0, title: 'Untitled' }
    }
    const idx = sessionList.value.findIndex((s) => s.session_id === id)
    if (idx !== -1) {
      sessionList.value[idx] = {
        ...sessionList.value[idx],
        message_count: 0,
        title: 'Untitled',
      }
    }
  }

  function addPendingFile(file: File): void {
    pendingFiles.value.push(file)
  }

  function removePendingFile(index: number): void {
    pendingFiles.value.splice(index, 1)
  }

  function clearPendingFiles(): void {
    pendingFiles.value = []
  }

  function _patchSessionInList(updated: SessionCompact): void {
    const idx = sessionList.value.findIndex((s) => s.session_id === updated.session_id)
    if (idx !== -1) {
      sessionList.value[idx] = { ...sessionList.value[idx], ...updated }
    }
  }

  return {
    sessionList,
    currentSession,
    messages,
    busy,
    pendingFiles,
    toolCalls,
    activeStreamId,
    activeProfile,
    getStoredSessionId,
    fetchSessions,
    loadSession,
    newSession,
    deleteSession,
    renameSession,
    pinSession,
    archiveSession,
    updateSession,
    clearSession,
    addPendingFile,
    removePendingFile,
    clearPendingFiles,
    _patchSessionInList,
  }
})
