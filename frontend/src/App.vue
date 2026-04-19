<template>
  <div class="layout" :class="{ 'workspace-panel-collapsed': !workspacePanelOpen }">
    <!-- Mobile overlay -->
    <div v-if="mobileSidebarOpen" class="mobile-overlay" @click="closeMobileSidebar" />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileSidebarOpen }">
      <SidebarNav :activePanel="activePanel" @switch="switchPanel" />

      <ChatPanel v-show="activePanel === 'chat'" @select-session="selectSession" />
      <TasksPanel v-show="activePanel === 'tasks'" />
      <SkillsPanel v-show="activePanel === 'skills'" />
      <MemoryPanel v-show="activePanel === 'memory'" />
      <WorkspacesPanel v-show="activePanel === 'workspaces'" @select-workspace="selectWorkspace" />
      <ProfilesPanel v-show="activePanel === 'profiles'" @switch-profile="handleProfileSwitch" />
      <TodosPanel v-show="activePanel === 'todos'" />

      <div class="sidebar-bottom">
        <button class="hermes-launch-btn" @click="showSettings = true">
          <span class="hermes-launch-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="hermes-gold-sidebar" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#F5C542;stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:#D4961C;stop-opacity:1"/>
                </linearGradient>
              </defs>
              <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold-sidebar)"/>
              <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9"/>
              <path d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24" fill="#D4961C" opacity="0.8"/>
              <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9"/>
              <path d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24" fill="#D4961C" opacity="0.8"/>
              <path d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42" fill="none" stroke="#F5C542" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42" fill="none" stroke="#D4961C" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="10" r="4" fill="#F5C542"/>
              <circle cx="32" cy="10" r="2" fill="#FFF8E1" opacity="0.7"/>
            </svg>
          </span>
          <span class="hermes-launch-copy">
            <span class="hermes-launch-title">Hermes WebUI</span>
            <span class="hermes-launch-meta">Preferences, imports, exports</span>
          </span>
          <span class="hermes-launch-chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </button>
      </div>

      <div class="resize-handle" @mousedown="startResize"></div>
    </aside>

    <!-- Main content -->
    <main class="main">
      <TopBar
        :session-title="sessionTitle"
        :session-meta="sessionMeta"
        :workspace-panel-open="workspacePanelOpen"
        @toggle-mobile="toggleMobileSidebar"
        @toggle-workspace-panel="toggleWorkspacePanel"
        @show-settings="showSettings = true"
      />

      <div class="content-area">
        <ChatArea
          v-if="activePanel === 'chat'"
          :messages="chatMessages"
          :is-streaming="isStreaming"
          :is-thinking="isThinking"
          :thinking-content="thinkingContent"
          :assistant-text="assistantText"
          :tool-calls="toolCalls"
          @send="handleSend"
          @cancel="handleCancel"
          @clear="handleClear"
        />
        <WorkspacePanel
          v-else
          :open="workspacePanelOpen"
          @close="workspacePanelOpen = false"
        />
      </div>
    </main>

    <!-- Settings overlay -->
    <SettingsOverlay
      :visible="showSettings"
      @close="showSettings = false"
    />

    <!-- Onboarding overlay -->
    <OnboardingOverlay
      :visible="showOnboarding"
      @complete="showOnboarding = false"
      @skip="showOnboarding = false"
    />

    <!-- Toast notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSessionStore } from '@/stores/sessions'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useSidebarStore } from '@/stores/sidebar'
import SidebarNav from '@/components/SidebarNav.vue'
import ChatPanel from '@/components/panels/ChatPanel.vue'
import TasksPanel from '@/components/panels/TasksPanel.vue'
import SkillsPanel from '@/components/panels/SkillsPanel.vue'
import MemoryPanel from '@/components/panels/MemoryPanel.vue'
import WorkspacesPanel from '@/components/panels/WorkspacesPanel.vue'
import ProfilesPanel from '@/components/panels/ProfilesPanel.vue'
import TodosPanel from '@/components/panels/TodosPanel.vue'
import TopBar from '@/components/TopBar.vue'
import ChatArea from '@/components/chat/ChatArea.vue'
import WorkspacePanel from '@/components/workspace/WorkspacePanel.vue'
import SettingsOverlay from '@/components/settings/SettingsOverlay.vue'
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import { getOnboardingStatus } from '@/api'
import { t, setLocale } from '@/composables/i18n'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const sidebarStore = useSidebarStore()

const activePanel = ref('chat')
const showSettings = ref(false)
const showOnboarding = ref(false)
const mobileSidebarOpen = ref(false)
const workspacePanelOpen = ref(false)

// Computed
const sessionTitle = computed(() => sessionStore.activeSession?.title || 'Hermes')
const sessionMeta = computed(() => {
  const s = sessionStore.activeSession
  if (!s) return t('new_conversation')
  return t('active_conversation_meta', s.title || t('untitled'), s.message_count || 0)
})
const chatMessages = computed(() => chatStore.messages)
const isStreaming = computed(() => chatStore.isStreaming)
const isThinking = computed(() => chatStore.isThinking)
const thinkingContent = computed(() => chatStore.thinkingContent)
const assistantText = computed(() => chatStore.assistantText)
const toolCalls = computed(() => chatStore.toolCalls)

function switchPanel(name: string) {
  activePanel.value = name
  mobileSidebarOpen.value = false

  // Lazy-load panel data
  if (name === 'tasks') sidebarStore.loadCrons?.()
  if (name === 'skills') sidebarStore.loadSkills()
  if (name === 'memory') sidebarStore.loadMemory()
  if (name === 'workspaces') sidebarStore.loadWorkspaces()
  if (name === 'profiles') sidebarStore.loadProfiles()
}

async function selectSession(sessionId: string) {
  try {
    await sessionStore.loadSession(sessionId)
    const session = sessionStore.activeSession
    if (session) {
      chatStore.setMessages(session.messages || [])
      chatStore.clearChat()
    }
    activePanel.value = 'chat'
    closeMobileSidebar()
  } catch (e) {
    console.error('Failed to load session:', e)
  }
}

async function handleSend(text: string, attachments?: string[]) {
  if (!sessionStore.activeSession) {
    await sessionStore.createSession()
  }
  const session = sessionStore.activeSession
  if (!session) return

  await chatStore.sendMessage(
    session.session_id,
    text,
    attachments,
    session.workspace,
    session.model
  )

  // Set provisional title
  if (session.title === 'Untitled' && text) {
    const provisionalTitle = text.slice(0, 64)
    session.title = provisionalTitle
    sessionStore.renameSessionById(session.session_id, provisionalTitle).catch(() => {})
    sessionStore.loadSessions()
  }
}

function handleCancel() {
  chatStore.cancelMessage()
}

async function handleClear() {
  if (!sessionStore.activeSession) return
  const ok = confirm(t('clear_conversation_message'))
  if (!ok) return
  await sessionStore.clearSessionMessages(sessionStore.activeSession.session_id)
  chatStore.clearChat()
}

async function selectWorkspace(path: string, name?: string) {
  if (!sessionStore.activeSession) return
  await sessionStore.updateSessionData(
    sessionStore.activeSession.session_id,
    path
  )
}

async function handleProfileSwitch(name: string) {
  await sidebarStore.switchToProfile(name)
  // Start new session after profile switch
  await sessionStore.createSession()
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

function toggleWorkspacePanel() {
  workspacePanelOpen.value = !workspacePanelOpen.value
}

// Sidebar resize
function startResize(e: MouseEvent) {
  const sidebar = document.querySelector('.sidebar')
  if (!sidebar) return
  const startX = e.clientX
  const startW = sidebar.getBoundingClientRect().width

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    const newW = Math.min(420, Math.max(180, startW + delta))
    sidebar.style.width = newW + 'px'
  }
  const onUp = () => {
    localStorage.setItem('hermes-sidebar-w', String(parseInt(sidebar.style.width)))
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (!chatStore.isStreaming) {
      sessionStore.createSession()
      closeMobileSidebar()
    }
  }
  if (e.key === 'Escape') {
    if (showSettings.value) showSettings.value = false
    if (showOnboarding.value) showOnboarding.value = false
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)

  // Load settings
  await settingsStore.loadSettings()

  // Set locale
  const lang = settingsStore.settings.language || 'en'
  setLocale(lang)

  // Load sessions
  await sessionStore.loadSessions()

  // Restore last session
  const lastSid = localStorage.getItem('hermes-webui-session')
  if (lastSid) {
    try {
      await sessionStore.loadSession(lastSid)
      const session = sessionStore.activeSession
      if (session) {
        chatStore.setMessages(session.messages || [])
      }
    } catch { /* ignore */ }
  }

  // Check onboarding
  try {
    const obStatus = await getOnboardingStatus()
    showOnboarding.value = !obStatus.completed
  } catch { /* ignore */ }

  // Restore workspace panel state
  const panelState = localStorage.getItem('hermes-webui-workspace-panel')
  workspacePanelOpen.value = panelState === 'open'
})
</script>
