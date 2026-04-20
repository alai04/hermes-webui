<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const uiStore = useUIStore()
const sessionStore = useSessionStore()
const settingsStore = useSettingsStore()

const showWorkspaceDropdown = ref(false)
const updateDismissed = ref(false)

// Computed title
const sessionTitle = computed(() => {
  return sessionStore.currentSession?.title || settingsStore.botName
})

// Metadata line
const sessionMeta = computed(() => {
  const session = sessionStore.currentSession
  if (!session) return t('new_conversation')
  const parts: string[] = []
  if (session.workspace) parts.push(session.workspace)
  if (session.model) parts.push(session.model)
  return parts.length > 0 ? parts.join(' · ') : t('new_conversation')
})

// Workspace panel toggle
const workspacePanelActive = computed(
  () => uiStore.workspacePanelMode !== 'closed'
)

function toggleWorkspacePanel() {
  if (uiStore.workspacePanelMode === 'closed') {
    uiStore.setWorkspacePanelMode('browse')
  } else {
    uiStore.setWorkspacePanelMode('closed')
  }
  showWorkspaceDropdown.value = false
}

function toggleMobileSidebar() {
  uiStore.sidebarMobileOpen = !uiStore.sidebarMobileOpen
}

function dismissUpdate() {
  updateDismissed.value = true
}

function closeWorkspaceDropdown() {
  showWorkspaceDropdown.value = false
}
</script>

<template>
  <div class="topbar">
    <!-- Mobile hamburger -->
    <button
      class="mobile-hamburger"
      :aria-label="t('tab_chat')"
      @click="toggleMobileSidebar"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <!-- Title + meta -->
    <div class="topbar-info">
      <div class="topbar-title">{{ sessionTitle }}</div>
      <div class="topbar-meta">{{ sessionMeta }}</div>
    </div>

    <!-- Right chips -->
    <div class="topbar-chips">
      <!-- Profile chip -->
      <span
        v-if="sessionStore.currentSession?.profile"
        class="chip profile-chip-topbar"
        :title="t('tab_profiles')"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {{ sessionStore.currentSession.profile }}
      </span>

      <!-- Workspace panel toggle chip -->
      <div class="chip-wrap">
        <button
          class="chip workspace-toggle-btn"
          :class="{ active: workspacePanelActive }"
          :title="t('tab_workspaces')"
          :aria-pressed="workspacePanelActive"
          @click="toggleWorkspacePanel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span class="workspace-toggle-label">Files</span>
        </button>

        <!-- Workspace dropdown (if session has workspace) -->
        <div
          v-if="showWorkspaceDropdown && sessionStore.currentSession?.workspace"
          class="chip-dropdown"
        >
          <div class="chip-dropdown-path">{{ sessionStore.currentSession.workspace }}</div>
          <button
            class="chip-dropdown-action"
            @click="toggleWorkspacePanel(); closeWorkspaceDropdown()"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {{ workspacePanelActive ? t('no_workspace') : t('tab_workspaces') }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Update banner -->
  <Transition name="banner-slide">
    <div v-if="false && !updateDismissed" class="update-banner">
      <span>{{ t('settings_label_check_updates') }}</span>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="update-btn" @click="dismissUpdate">{{ t('cancel') }}</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 52px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.mobile-hamburger {
  display: none;
  background: none;
  border: none;
  color: var(--muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 900px) {
  .mobile-hamburger {
    display: flex;
  }
}

.topbar-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #e8e8e8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-meta {
  font-size: 11px;
  color: var(--muted, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  background: var(--surface2, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  color: var(--muted, #888);
  cursor: default;
}

.profile-chip-topbar {
  font-size: 11px;
}

.chip-wrap {
  position: relative;
}

.workspace-toggle-btn {
  background: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.workspace-toggle-btn:hover,
.workspace-toggle-btn.active {
  background: var(--accent-muted, rgba(224, 92, 58, 0.15));
  color: var(--accent, #e05c3a);
  border-color: var(--accent, #e05c3a);
}

.workspace-toggle-label {
  font-size: 12px;
}

.chip-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: var(--surface2, #1e1e1e);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  padding: 6px;
  z-index: 200;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.chip-dropdown-path {
  font-size: 11px;
  color: var(--muted, #888);
  padding: 4px 8px;
  word-break: break-all;
}

.chip-dropdown-action {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.chip-dropdown-action:hover {
  background: var(--surface3, rgba(255, 255, 255, 0.06));
}

/* Update banner */
.update-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  background: var(--accent-muted, rgba(224, 92, 58, 0.12));
  border-bottom: 1px solid var(--accent, #e05c3a);
  font-size: 12px;
  color: var(--text, #e8e8e8);
  flex-shrink: 0;
}

.update-btn {
  background: none;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.2));
  border-radius: 6px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.banner-slide-enter-from,
.banner-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
