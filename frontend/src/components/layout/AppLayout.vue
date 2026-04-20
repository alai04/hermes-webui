<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useSessionStore } from '@/stores/session'
import { useResizable } from '@/composables/useResizable'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'

// Lazy-load the workspace panel (heavy)
const WorkspacePanel = defineAsyncComponent(() =>
  import('@/components/layout/WorkspacePanel.vue')
)

const uiStore = useUIStore()
const sessionStore = useSessionStore()

// Sidebar resizable (180–420px, default 240px)
const sidebarEl = ref<HTMLElement | null>(null)
const { width: sidebarWidth, handleMousedown: sidebarHandleMousedown } = useResizable(
  sidebarEl,
  'right',
  180,
  420,
  'hermes-sidebar-w'
)

// Right panel resizable (180–1200px, default 360px)
const panelEl = ref<HTMLElement | null>(null)
const { width: panelWidth, handleMousedown: panelHandleMousedown } = useResizable(
  panelEl,
  'left',
  180,
  1200,
  'hermes-panel-w'
)

const workspacePanelVisible = computed(
  () => uiStore.workspacePanelMode === 'browse' || uiStore.workspacePanelMode === 'preview'
)

const sidebarMobileOpen = computed(() => uiStore.sidebarMobileOpen)

function closeMobileOverlay() {
  uiStore.sidebarMobileOpen = false
}

function onKeydown(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey
  if (meta && e.key === 'k') {
    e.preventDefault()
    sessionStore.newSession()
    return
  }
  if (e.key === 'Escape') {
    if (uiStore.sidebarMobileOpen) {
      uiStore.sidebarMobileOpen = false
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="layout" :class="{ 'sidebar-mobile-open': sidebarMobileOpen }">
    <!-- Mobile sidebar backdrop -->
    <div
      v-if="sidebarMobileOpen"
      id="mobileOverlay"
      class="mobile-overlay"
      aria-hidden="true"
      @click="closeMobileOverlay"
    />

    <!-- Left sidebar -->
    <aside
      ref="sidebarEl"
      class="sidebar"
      :class="{ 'mobile-open': sidebarMobileOpen }"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <Sidebar />
      <!-- Sidebar drag handle -->
      <div
        class="resize-handle"
        role="separator"
        aria-orientation="vertical"
        @mousedown="sidebarHandleMousedown"
      />
    </aside>

    <!-- Main content column -->
    <main class="main">
      <Topbar />
      <slot />
    </main>

    <!-- Right workspace panel -->
    <Transition name="panel-slide">
      <aside
        v-if="workspacePanelVisible"
        ref="panelEl"
        class="workspace-panel-column"
        :style="{ width: panelWidth + 'px' }"
      >
        <!-- Panel drag handle (left edge) -->
        <div
          class="resize-handle resize-handle-left"
          role="separator"
          aria-orientation="vertical"
          @mousedown="panelHandleMousedown"
        />
        <WorkspacePanel />
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Sidebar transitions on mobile */
.sidebar {
  flex-shrink: 0;
  position: relative;
  transition: width 0.2s ease;
}

/* Mobile: sidebar becomes overlay */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 500;
    transform: translateX(-100%);
    transition: transform 0.25s ease, width 0.2s ease;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 499;
  background: rgba(0, 0, 0, 0.45);
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-panel-column {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle-left {
  right: auto;
  left: -3px;
}

/* Workspace panel slide transition */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  width: 0 !important;
  opacity: 0;
}
</style>
