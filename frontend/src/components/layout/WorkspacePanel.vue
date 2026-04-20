<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'
import { useSessionStore } from '@/stores/session'
import FileBreadcrumb from '@/components/workspace/FileBreadcrumb.vue'
import GitBadge from '@/components/workspace/GitBadge.vue'
import FileTree from '@/components/workspace/FileTree.vue'
import FilePreview from '@/components/workspace/FilePreview.vue'

const { t } = useI18n()
const uiStore = useUIStore()
const sessionStore = useSessionStore()

const currentDir = ref('.')
const openFilePath = ref<string | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const fileTreeRef = ref<InstanceType<typeof FileTree> | null>(null)
const gitBadgeRef = ref<InstanceType<typeof GitBadge> | null>(null)

const sessionId = computed(() => sessionStore.currentSession?.session_id ?? '')
const isOpen = computed(() => uiStore.workspacePanelMode !== 'closed')

// ── Resize drag ──────────────────────────────────────────────────────────────
const panelWidth = ref(320)
const MIN_WIDTH = 180
const MAX_WIDTH = 1200
let dragStartX = 0
let dragStartWidth = 0
let dragging = false

function onResizeStart(e: MouseEvent) {
  dragging = true
  dragStartX = e.clientX
  dragStartWidth = panelRef.value?.offsetWidth ?? panelWidth.value
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (!dragging) return
  const delta = dragStartX - e.clientX // dragging left edge of right panel
  const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth + delta))
  panelWidth.value = newWidth
}

function onResizeEnd() {
  dragging = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

// ── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(path: string) {
  currentDir.value = path
  openFilePath.value = null
  uiStore.setWorkspacePanelMode('browse')
}

function openFile(path: string) {
  openFilePath.value = path
  uiStore.setWorkspacePanelMode('preview')
}

function closePreview() {
  openFilePath.value = null
  uiStore.setWorkspacePanelMode('browse')
}

function navigateUp() {
  if (!currentDir.value || currentDir.value === '.') return
  const parts = currentDir.value.split('/')
  parts.pop()
  currentDir.value = parts.length ? parts.join('/') : '.'
}

function close() {
  uiStore.setWorkspacePanelMode('closed')
}

function refresh() {
  fileTreeRef.value?.loadDir(currentDir.value)
  gitBadgeRef.value?.refresh()
}

function newFile() {
  fileTreeRef.value?.newFile()
}

function newFolder() {
  fileTreeRef.value?.newFolder()
}

// Reset dir when session changes
watch(sessionId, () => {
  currentDir.value = '.'
  openFilePath.value = null
})

onMounted(() => {
  // Sync mode on mount
})
</script>

<template>
  <div
    v-if="isOpen"
    ref="panelRef"
    class="rightpanel"
    :style="{
      width: panelWidth + 'px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg2, var(--bg))',
    }"
  >
    <!-- Resize handle (on left edge) -->
    <div
      style="position:absolute;left:0;top:0;bottom:0;width:4px;cursor:col-resize;z-index:10"
      @mousedown="onResizeStart"
    />

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0;min-width:0">
      <!-- Breadcrumb or file path -->
      <FileBreadcrumb
        :path="openFilePath ?? currentDir"
        :session-id="sessionId"
        @navigate="navigateTo"
      />

      <GitBadge ref="gitBadgeRef" :session-id="sessionId" />

      <!-- Controls -->
      <div style="display:flex;gap:2px;flex-shrink:0">
        <button
          v-if="!openFilePath && currentDir !== '.'"
          class="cron-btn"
          style="padding:2px 5px;font-size:11px"
          :title="t('navigate_up', 'Up')"
          @click="navigateUp"
        >↑</button>
        <button
          v-if="!openFilePath"
          class="cron-btn"
          style="padding:2px 5px;font-size:11px"
          :title="t('new_file_prompt', 'New file')"
          @click="newFile"
        >+f</button>
        <button
          v-if="!openFilePath"
          class="cron-btn"
          style="padding:2px 5px;font-size:11px"
          :title="t('new_folder_prompt', 'New folder')"
          @click="newFolder"
        >+d</button>
        <button
          v-if="!openFilePath"
          class="cron-btn"
          style="padding:2px 5px;font-size:11px"
          title="Refresh"
          @click="refresh"
        >↺</button>
        <button
          class="cron-btn"
          style="padding:2px 5px;font-size:11px"
          title="Close panel"
          @click="close"
        >✕</button>
      </div>
    </div>

    <!-- Body -->
    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">
      <FilePreview
        v-if="openFilePath && sessionId"
        :path="openFilePath"
        :session-id="sessionId"
        @close="closePreview"
      />
      <div v-else-if="!sessionId" style="padding:12px;color:var(--muted);font-size:12px">
        {{ t('workspace_empty_no_path') }}
      </div>
      <FileTree
        v-else
        ref="fileTreeRef"
        :session-id="sessionId"
        :current-dir="currentDir"
        @open-file="openFile"
        @navigate="navigateTo"
      />
    </div>
  </div>
</template>
