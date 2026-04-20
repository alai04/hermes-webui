<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'

const { t } = useI18n()

const props = defineProps<{
  sessionId: string
  currentDir: string
}>()

const emit = defineEmits<{
  (e: 'open-file', path: string): void
  (e: 'navigate', path: string): void
}>()

interface FileEntry {
  name: string
  type: 'file' | 'dir'
  path: string
  git?: boolean
}

const entries = ref<FileEntry[]>([])
const loading = ref(false)
const dirCache = ref<Record<string, FileEntry[]>>({})
const expandedDirs = ref<Set<string>>(new Set())

// Context menu state
const contextMenu = ref<{ x: number; y: number; entry: FileEntry } | null>(null)

// ── localStorage expansion persistence ───────────────────────────────────────
function wsExpandKey(): string | null {
  try {
    const sessions: any = JSON.parse(localStorage.getItem('hermes-webui-session') ?? 'null')
    const ws = sessions?.workspace
    return ws ? `hermes-webui-expanded:${ws}` : null
  } catch {
    return null
  }
}

function saveExpandedDirs() {
  const key = wsExpandKey()
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify([...expandedDirs.value])) } catch { /* */ }
}

function restoreExpandedDirs() {
  const key = wsExpandKey()
  if (!key) { expandedDirs.value = new Set(); return }
  try {
    const raw = localStorage.getItem(key)
    expandedDirs.value = raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { expandedDirs.value = new Set() }
}

async function loadDir(path: string, _force = false) {
  loading.value = true
  try {
    if (!path || path === '.') {
      dirCache.value = {}
      restoreExpandedDirs()
    }
    const data = await apiGet('/api/list', { session_id: props.sessionId, path: path || '.' })
    const fetched: FileEntry[] = data.entries ?? []
    if (!path || path === '.') {
      entries.value = fetched
    } else {
      dirCache.value[path] = fetched
    }
    // Pre-fetch expanded dirs on root load
    if (!path || path === '.') {
      for (const dirPath of expandedDirs.value) {
        if (!dirCache.value[dirPath]) {
          try {
            const dc = await apiGet('/api/list', { session_id: props.sessionId, path: dirPath })
            dirCache.value[dirPath] = dc.entries ?? []
          } catch { dirCache.value[dirPath] = [] }
        }
      }
    }
  } catch (e) {
    console.warn('loadDir error', e)
  } finally {
    loading.value = false
  }
}

async function toggleDir(entry: FileEntry) {
  if (expandedDirs.value.has(entry.path)) {
    expandedDirs.value.delete(entry.path)
  } else {
    expandedDirs.value.add(entry.path)
    if (!dirCache.value[entry.path]) {
      try {
        const data = await apiGet('/api/list', { session_id: props.sessionId, path: entry.path })
        dirCache.value[entry.path] = data.entries ?? []
      } catch { dirCache.value[entry.path] = [] }
    }
  }
  saveExpandedDirs()
}

function handleFileClick(entry: FileEntry) {
  emit('open-file', entry.path)
}

function handleDirDblClick(entry: FileEntry) {
  emit('navigate', entry.path)
}

function fileIcon(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const icons: Record<string, string> = {
    ts: '📘', tsx: '📘', js: '📒', jsx: '📒', vue: '💚',
    py: '🐍', rs: '🦀', go: '🔵', java: '☕', rb: '💎',
    md: '📝', txt: '📄', json: '📋', yaml: '📋', yml: '📋',
    html: '🌐', css: '🎨', scss: '🎨', less: '🎨',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼', webp: '🖼',
    pdf: '📕', zip: '🗜', tar: '🗜', gz: '🗜',
    sh: '⚙️', bash: '⚙️', zsh: '⚙️',
    toml: '📋', lock: '🔒',
  }
  return icons[ext] ?? '📄'
}

function dirIcon(expanded: boolean): string {
  return expanded ? '📂' : '📁'
}

// Context menu
function openContextMenu(e: MouseEvent, entry: FileEntry) {
  e.preventDefault()
  contextMenu.value = { x: e.clientX, y: e.clientY, entry }
}

function closeContextMenu() {
  contextMenu.value = null
}

async function renameEntry(entry: FileEntry) {
  closeContextMenu()
  const newName = prompt(t('double_click_rename', 'New name:'), entry.name)
  if (!newName || newName === entry.name) return
  const dir = entry.path.split('/').slice(0, -1).join('/') || '.'
  const newPath = dir === '.' ? newName : `${dir}/${newName}`
  try {
    await apiPost('/api/file/rename', { session_id: props.sessionId, path: entry.path, new_path: newPath })
    await loadDir(props.currentDir)
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteEntry(entry: FileEntry) {
  closeContextMenu()
  if (!confirm(t('delete_confirm', { name: entry.name }))) return
  try {
    await apiPost('/api/file/delete', { session_id: props.sessionId, path: entry.path })
    await loadDir(props.currentDir)
  } catch (e: any) {
    alert(e.message)
  }
}

function downloadEntry(entry: FileEntry) {
  closeContextMenu()
  const url = `api/file/raw?session_id=${encodeURIComponent(props.sessionId)}&path=${encodeURIComponent(entry.path)}&download=1`
  const a = document.createElement('a')
  a.href = url
  a.download = entry.name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 100)
}

async function newFile() {
  const name = prompt(t('new_file_prompt', 'New file name (e.g. notes.md):'))
  if (!name) return
  const path = props.currentDir === '.' ? name : `${props.currentDir}/${name}`
  try {
    await apiPost('/api/file/create', { session_id: props.sessionId, path, content: '' })
    await loadDir(props.currentDir)
    emit('open-file', path)
  } catch (e: any) {
    alert(e.message)
  }
}

async function newFolder() {
  const name = prompt(t('new_folder_prompt', 'New folder name:'))
  if (!name) return
  const path = props.currentDir === '.' ? name : `${props.currentDir}/${name}`
  try {
    await apiPost('/api/file/create-dir', { session_id: props.sessionId, path })
    await loadDir(props.currentDir)
  } catch (e: any) {
    alert(e.message)
  }
}

defineExpose({ loadDir, newFile, newFolder })

watch(() => [props.sessionId, props.currentDir], () => {
  loadDir(props.currentDir)
}, { immediate: false })

onMounted(() => {
  loadDir(props.currentDir || '.')
})
</script>

<template>
  <div
    id="fileTree"
    style="flex:1;overflow-y:auto;font-size:12px"
    @click.self="closeContextMenu"
  >
    <div v-if="loading && !entries.length" style="padding:8px 12px;color:var(--muted)">{{ t('loading') }}</div>

    <!-- Render root entries -->
    <template v-for="entry in entries" :key="entry.path">
      <!-- Directory entry -->
      <div
        v-if="entry.type === 'dir'"
        class="file-entry dir-entry"
        style="display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;user-select:none"
        @click="toggleDir(entry)"
        @dblclick="handleDirDblClick(entry)"
        @contextmenu="openContextMenu($event, entry)"
      >
        <span>{{ dirIcon(expandedDirs.has(entry.path)) }}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">{{ entry.name }}</span>
      </div>

      <!-- Expanded directory children (recursive via cache) -->
      <div
        v-if="entry.type === 'dir' && expandedDirs.has(entry.path)"
        style="padding-left:16px"
      >
        <template v-for="child in dirCache[entry.path] ?? []" :key="child.path">
          <div
            v-if="child.type === 'dir'"
            class="file-entry dir-entry"
            style="display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;user-select:none"
            @click="toggleDir(child)"
            @dblclick="handleDirDblClick(child)"
            @contextmenu="openContextMenu($event, child)"
          >
            <span>{{ dirIcon(expandedDirs.has(child.path)) }}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">{{ child.name }}</span>
          </div>
          <div
            v-else
            class="file-entry"
            style="display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;user-select:none"
            @click="handleFileClick(child)"
            @contextmenu="openContextMenu($event, child)"
          >
            <span>{{ fileIcon(child.name) }}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">{{ child.name }}</span>
          </div>
        </template>
      </div>

      <!-- File entry -->
      <div
        v-if="entry.type === 'file'"
        class="file-entry"
        style="display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;user-select:none"
        @click="handleFileClick(entry)"
        @contextmenu="openContextMenu($event, entry)"
      >
        <span>{{ fileIcon(entry.name) }}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">{{ entry.name }}</span>
      </div>
    </template>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu"
        style="position:fixed;z-index:9999;background:var(--bg2,#1e1e1e);border:1px solid var(--border);border-radius:6px;padding:4px 0;min-width:140px;box-shadow:0 4px 12px rgba(0,0,0,.4)"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
        @click.stop
      >
        <div
          style="padding:6px 12px;font-size:12px;cursor:pointer;color:var(--text)"
          @click="renameEntry(contextMenu!.entry)"
        >✎ {{ t('rename', 'Rename') }}</div>
        <div
          v-if="contextMenu.entry.type === 'file'"
          style="padding:6px 12px;font-size:12px;cursor:pointer;color:var(--text)"
          @click="downloadEntry(contextMenu!.entry)"
        >⬇ {{ t('download', 'Download') }}</div>
        <div
          style="padding:6px 12px;font-size:12px;cursor:pointer;color:var(--accent)"
          @click="deleteEntry(contextMenu!.entry)"
        >🗑 {{ t('delete_title') }}</div>
      </div>
      <!-- Click-away overlay -->
      <div
        v-if="contextMenu"
        style="position:fixed;inset:0;z-index:9998"
        @click="closeContextMenu"
      />
    </Teleport>
  </div>
</template>
