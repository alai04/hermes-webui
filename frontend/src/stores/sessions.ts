import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getSessions,
  getSession,
  createNewSession,
  renameSession,
  updateSession,
  deleteSession,
  clearSession,
  pinSession,
  archiveSession,
  moveSession,
  type SessionSummary,
  type SessionFull,
  getProjects,
  createProject,
  renameProject,
  deleteProject,
  type ApiError,
} from '@/api'

export interface ProjectItem {
  project_id: string
  name: string
  color: string
  created_at: number
}

export const useSessionStore = defineStore('sessions', () => {
  const allSessions = ref<SessionSummary[]>([])
  const allProjects = ref<ProjectItem[]>([])
  const activeSession = ref<SessionFull | null>(null)
  const activeStreamId = ref<string | null>(null)
  const isBusy = ref(false)
  const searchQuery = ref('')
  const showArchived = ref(false)
  const activeProject = ref<string | null>(null)
  const showAllProfiles = ref(false)

  const filteredSessions = computed(() => {
    let sessions = [...allSessions.value]

    // Filter by search query
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      sessions = sessions.filter(s =>
        (s.title || 'Untitled').toLowerCase().includes(q)
      )
    }

    // Filter by project
    if (activeProject.value) {
      sessions = sessions.filter(s => s.project_id === activeProject.value)
    }

    // Filter by profile
    if (!showAllProfiles.value && activeSession.value?.profile) {
      sessions = sessions.filter(s => s.is_cli_session || s.profile === activeSession.value?.profile)
    }

    // Filter archived
    if (!showArchived.value) {
      sessions = sessions.filter(s => !s.archived)
    }

    // Sort by updated_at descending
    return sessions.sort((a, b) => b.updated_at - a.updated_at)
  })

  const pinnedSessions = computed(() =>
    filteredSessions.value.filter(s => s.pinned)
  )

  const unpinnedSessions = computed(() =>
    filteredSessions.value.filter(s => !s.pinned)
  )

  async function loadSessions() {
    try {
      const [sessionsData, projectsData] = await Promise.all([
        getSessions(),
        getProjects(),
      ])
      allSessions.value = sessionsData.sessions || []
      allProjects.value = projectsData.projects || []
    } catch (e) {
      console.warn('Failed to load sessions:', e)
    }
  }

  async function loadSession(sessionId: string) {
    const data = await getSession(sessionId)
    activeSession.value = data.session
    localStorage.setItem('hermes-webui-session', sessionId)
    return data.session
  }

  async function createSession(workspace?: string, model?: string) {
    const data = await createNewSession(workspace, model)
    activeSession.value = data.session
    activeStreamId.value = null
    isBusy.value = false
    localStorage.setItem('hermes-webui-session', data.session.session_id)
    await loadSessions()
    return data.session
  }

  async function renameSessionById(sessionId: string, title: string) {
    await renameSession(sessionId, title)
    await loadSessions()
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value.title = title
    }
  }

  async function updateSessionData(sessionId: string, workspace?: string, model?: string) {
    const data = await updateSession(sessionId, workspace, model)
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value = data.session
    }
    await loadSessions()
    return data.session
  }

  async function deleteSessionById(sessionId: string) {
    await deleteSession(sessionId)
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value = null
      activeStreamId.value = null
      isBusy.value = false
    }
    await loadSessions()
  }

  async function clearSessionMessages(sessionId: string) {
    await clearSession(sessionId)
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value.messages = []
      activeSession.value.tool_calls = []
    }
    await loadSessions()
  }

  async function togglePin(sessionId: string) {
    const session = allSessions.value.find(s => s.session_id === sessionId)
    if (!session) return
    const newPinned = !session.pinned
    await pinSession(sessionId, newPinned)
    session.pinned = newPinned
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value.pinned = newPinned
    }
  }

  async function toggleArchive(sessionId: string) {
    const session = allSessions.value.find(s => s.session_id === sessionId)
    if (!session) return
    const newArchived = !session.archived
    await archiveSession(sessionId, newArchived)
    session.archived = newArchived
    if (activeSession.value?.session_id === sessionId) {
      activeSession.value.archived = newArchived
    }
    await loadSessions()
  }

  async function moveToProject(sessionId: string, projectId: string | null) {
    await moveSession(sessionId, projectId)
    await loadSessions()
  }

  // Project management
  async function loadProjects() {
    const data = await getProjects()
    allProjects.value = data.projects || []
  }

  async function addProject(name: string, color?: string) {
    await createProject(name, color)
    await loadProjects()
  }

  async function renameProjectById(projectId: string, name: string, color?: string) {
    await renameProject(projectId, name, color)
    await loadProjects()
  }

  async function removeProject(projectId: string) {
    await deleteProject(projectId)
    if (activeProject.value === projectId) {
      activeProject.value = null
    }
    await loadProjects()
  }

  return {
    allSessions,
    allProjects,
    activeSession,
    activeStreamId,
    isBusy,
    searchQuery,
    showArchived,
    activeProject,
    showAllProfiles,
    filteredSessions,
    pinnedSessions,
    unpinnedSessions,
    loadSessions,
    loadSession,
    createSession,
    renameSessionById,
    updateSessionData,
    deleteSessionById,
    clearSessionMessages,
    togglePin,
    toggleArchive,
    moveToProject,
    loadProjects,
    addProject,
    renameProjectById,
    removeProject,
  }
})
