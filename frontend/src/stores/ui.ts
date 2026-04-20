import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PanelName = 'chat' | 'tasks' | 'skills' | 'memory' | 'workspaces' | 'profiles' | 'todos'
export type WorkspacePanelMode = 'closed' | 'browse' | 'preview'

const WORKSPACE_PANEL_KEY = 'hermes-webui-workspace-panel'

export const useUIStore = defineStore('ui', () => {
  const currentPanel = ref<PanelName>('chat')
  const settingsOpen = ref<boolean>(false)
  const onboardingOpen = ref<boolean>(false)
  const workspacePanelMode = ref<WorkspacePanelMode>('closed')
  const activeProfile = ref<string>('default')
  const sidebarMobileOpen = ref<boolean>(false)

  function switchPanel(name: PanelName): void {
    currentPanel.value = name
  }

  function toggleSettings(): void {
    settingsOpen.value = !settingsOpen.value
  }

  function toggleOnboarding(): void {
    onboardingOpen.value = !onboardingOpen.value
  }

  function setWorkspacePanelMode(mode: WorkspacePanelMode): void {
    workspacePanelMode.value = mode
    const open = mode !== 'closed'
    // Persist open/closed state across reloads
    try {
      localStorage.setItem(WORKSPACE_PANEL_KEY, open ? 'open' : 'closed')
    } catch {
      // localStorage unavailable — continue silently
    }
    // Update the data attribute used by CSS for layout transitions
    document.documentElement.dataset.workspacePanel = open ? 'open' : 'closed'
  }

  function syncWorkspacePanelState(hasPreview: boolean, hasSession: boolean): void {
    if (hasPreview) {
      if (workspacePanelMode.value === 'closed') {
        setWorkspacePanelMode('preview')
      }
      return
    }
    if (!hasSession) {
      setWorkspacePanelMode('closed')
      return
    }
    if (workspacePanelMode.value === 'preview') {
      setWorkspacePanelMode('closed')
    }
  }

  function initWorkspacePanelFromStorage(): void {
    try {
      const stored = localStorage.getItem(WORKSPACE_PANEL_KEY)
      if (stored === 'open') {
        workspacePanelMode.value = 'browse'
        document.documentElement.dataset.workspacePanel = 'open'
      } else {
        workspacePanelMode.value = 'closed'
        document.documentElement.dataset.workspacePanel = 'closed'
      }
    } catch {
      workspacePanelMode.value = 'closed'
    }
  }

  return {
    currentPanel,
    settingsOpen,
    onboardingOpen,
    workspacePanelMode,
    activeProfile,
    sidebarMobileOpen,
    switchPanel,
    toggleSettings,
    toggleOnboarding,
    setWorkspacePanelMode,
    syncWorkspacePanelState,
    initWorkspacePanelFromStorage,
  }
})
