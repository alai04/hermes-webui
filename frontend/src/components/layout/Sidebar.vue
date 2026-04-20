<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore, type PanelName } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import HermesLogo from '@/components/shared/HermesLogo.vue'

const { t } = useI18n()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()

// Lazy panel components — only loaded when activated
const SessionList = defineAsyncComponent(() => import('@/components/sessions/SessionList.vue'))
const TasksPanel = defineAsyncComponent(() => import('@/components/panels/TasksPanel.vue'))
const SkillsPanel = defineAsyncComponent(() => import('@/components/panels/SkillsPanel.vue'))
const MemoryPanel = defineAsyncComponent(() => import('@/components/panels/MemoryPanel.vue'))
const WorkspacesPanel = defineAsyncComponent(() => import('@/components/panels/WorkspacesPanel.vue'))
const ProfilesPanel = defineAsyncComponent(() => import('@/components/panels/ProfilesPanel.vue'))
const TodosPanel = defineAsyncComponent(() => import('@/components/panels/TodosPanel.vue'))

function switchPanel(panel: PanelName) {
  uiStore.switchPanel(panel)
}

function toggleSettings() {
  uiStore.toggleSettings()
}

function closeMobileSidebar() {
  uiStore.sidebarMobileOpen = false
}
</script>

<template>
  <div class="sidebar-inner">
    <!-- Sidebar header -->
    <div class="sidebar-header">
      <HermesLogo :width="28" :height="28" />
      <span class="sidebar-bot-name">{{ settingsStore.botName }}</span>
      <!-- Mobile close button -->
      <button
        class="mobile-close-btn icon-btn"
        :aria-label="t('cancel')"
        @click="closeMobileSidebar"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Nav tabs -->
    <nav class="sidebar-nav" :aria-label="t('tab_chat')">
      <!-- Chat -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'chat' }"
        :title="t('tab_chat')"
        :aria-label="t('tab_chat')"
        @click="switchPanel('chat')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <!-- Tasks -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'tasks' }"
        :title="t('tab_tasks')"
        :aria-label="t('tab_tasks')"
        @click="switchPanel('tasks')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <!-- Skills -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'skills' }"
        :title="t('tab_skills')"
        :aria-label="t('tab_skills')"
        @click="switchPanel('skills')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </button>
      <!-- Memory -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'memory' }"
        :title="t('tab_memory')"
        :aria-label="t('tab_memory')"
        @click="switchPanel('memory')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6H8.2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
          <line x1="9" y1="17" x2="15" y2="17" />
          <line x1="10" y1="20" x2="14" y2="20" />
        </svg>
      </button>
      <!-- Spaces (workspaces) -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'workspaces' }"
        :title="t('tab_workspaces')"
        :aria-label="t('tab_workspaces')"
        @click="switchPanel('workspaces')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <!-- Profiles -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'profiles' }"
        :title="t('tab_profiles')"
        :aria-label="t('tab_profiles')"
        @click="switchPanel('profiles')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
      <!-- Todos -->
      <button
        class="nav-tab"
        :class="{ active: uiStore.currentPanel === 'todos' }"
        :title="t('tab_todos')"
        :aria-label="t('tab_todos')"
        @click="switchPanel('todos')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="6" height="6" rx="1" />
          <path d="m3 17 2 2 4-4" />
          <path d="M13 6h8" />
          <path d="M13 12h8" />
          <path d="M13 18h8" />
        </svg>
      </button>
    </nav>

    <!-- Panel content area -->
    <div class="panel-content">
      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'chat' }">
        <Suspense>
          <SessionList v-if="uiStore.currentPanel === 'chat'" />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'tasks' }">
        <Suspense v-if="uiStore.currentPanel === 'tasks'">
          <TasksPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'skills' }">
        <Suspense v-if="uiStore.currentPanel === 'skills'">
          <SkillsPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'memory' }">
        <Suspense v-if="uiStore.currentPanel === 'memory'">
          <MemoryPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'workspaces' }">
        <Suspense v-if="uiStore.currentPanel === 'workspaces'">
          <WorkspacesPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'profiles' }">
        <Suspense v-if="uiStore.currentPanel === 'profiles'">
          <ProfilesPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>

      <div class="panel-view" :class="{ active: uiStore.currentPanel === 'todos' }">
        <Suspense v-if="uiStore.currentPanel === 'todos'">
          <TodosPanel />
          <template #fallback>
            <div class="panel-loading">{{ t('loading') }}</div>
          </template>
        </Suspense>
      </div>
    </div>

    <!-- Sidebar bottom -->
    <div class="sidebar-bottom">
      <button class="hermes-launch-btn" :title="t('settings_title')" @click="toggleSettings">
        <span class="hermes-launch-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="hermes-gold-sidebar-btn" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#F5C542;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#D4961C;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold-sidebar-btn)" />
            <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9" />
            <path d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24" fill="#D4961C" opacity="0.8" />
            <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9" />
            <path d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24" fill="#D4961C" opacity="0.8" />
            <path d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42" fill="none" stroke="#F5C542" stroke-width="2.5" stroke-linecap="round" />
            <path d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42" fill="none" stroke="#D4961C" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="32" cy="10" r="4" fill="#F5C542" />
            <circle cx="32" cy="10" r="2" fill="#FFF8E1" opacity="0.7" />
          </svg>
        </span>
        <span class="hermes-launch-copy">
          <span class="hermes-launch-title">Hermes WebUI</span>
          <span class="hermes-launch-meta">{{ t('settings_title') }}, {{ t('import') }}</span>
        </span>
        <span class="hermes-launch-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 8px;
  flex-shrink: 0;
}

.sidebar-bot-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #e8e8e8);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-close-btn {
  display: none;
}

@media (max-width: 900px) {
  .mobile-close-btn {
    display: flex;
  }
}

.panel-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.panel-view {
  display: none;
  flex-direction: column;
  height: 100%;
}

.panel-view.active {
  display: flex;
}

.panel-loading {
  padding: 12px;
  color: var(--muted, #888);
  font-size: 12px;
}
</style>
