<template>
  <div class="rightpanel" v-show="open">
    <div class="panel-header">
      <div class="breadcrumb-bar" ref="breadcrumbBar">
        <span class="breadcrumb-seg breadcrumb-link" @click="loadDir('.')">~</span>
        <template v-for="(part, idx) in pathParts" :key="idx">
          <span class="breadcrumb-sep">/</span>
          <span class="breadcrumb-seg breadcrumb-link" @click="loadDir(partsUpTo(idx))">{{ part }}</span>
        </template>
      </div>
      <div class="panel-actions">
        <button @click="loadDir(currentDir)" title="Refresh">⟳</button>
        <button @click="handleNewFile" title="New file">+ File</button>
        <button @click="handleNewFolder" title="New folder">+ Folder</button>
      </div>
    </div>

    <div class="panel-content">
      <!-- File tree -->
      <div v-if="!previewPath" class="file-tree">
        <div v-for="entry in sortedEntries" :key="entry.name" class="file-tree-item" :class="entry.type" @click="handleEntryClick(entry)">
          <span class="file-icon">{{ entry.type === 'dir' ? '📁' : fileIcon(entry.name) }}</span>
          <span class="file-name">{{ entry.name }}</span>
          <span class="file-size" v-if="entry.type === 'file'">{{ formatSize(entry.size) }}</span>
        </div>
      </div>

      <!-- File preview -->
      <div v-else class="file-preview">
        <div class="preview-header">
          <span class="preview-path">{{ previewPath }}</span>
          <button class="preview-close" @click="closePreview">×</button>
        </div>
        <div class="preview-content">
          <img v-if="previewMode === 'image'" :src="previewUrl" class="preview-image" />
          <pre v-else-if="previewMode === 'code'" class="preview-code">{{ previewContent }}</pre>
          <div v-else class="preview-md" v-html="renderMarkdown(previewContent)"></div>
        </div>
        <div v-if="canEdit" class="preview-actions">
          <button v-if="!editing" @click="startEdit">{{ t('edit') }}</button>
          <template v-else>
            <button @click="saveEdit">{{ t('save') }}</button>
            <button @click="cancelEdit">{{ t('cancel') }}</button>
          </template>
        </div>
        <textarea v-if="editing" v-model="editContent" class="preview-edit-area"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/sessions'
import { listFiles, readFile, saveFile, createFile, createDir, getRawFileUrl } from '@/api'
import { renderMarkdown, fileExt, isImageFile, isMdFile } from '@/utils/markdown'
import { t } from '@/composables/i18n'

const sessionStore = useSessionStore()
const entries = ref<any[]>([])
const currentDir = ref('.')
const previewPath = ref('')
const previewMode = ref<'code' | 'image' | 'md' | ''>('')
const previewContent = ref('')
const previewUrl = ref('')
const editing = ref(false)
const editContent = ref('')

const pathParts = computed(() => {
  if (currentDir.value === '.') return []
  return currentDir.value.split('/')
})

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

const canEdit = computed(() => previewMode.value === 'code' || previewMode.value === 'md')

const isOpen = defineModel<boolean>('open', { default: false })

async function loadDir(path = '.') {
  if (!sessionStore.activeSession) return
  try {
    const data = await listFiles(sessionStore.activeSession.session_id, path)
    entries.value = data.entries || []
    currentDir.value = path
    previewPath.value = ''
    previewMode.value = ''
  } catch (e) {
    console.warn('Failed to load directory:', e)
  }
}

function partsUpTo(idx: number): string {
  return pathParts.value.slice(0, idx + 1).join('/')
}

async function handleEntryClick(entry: any) {
  if (entry.type === 'dir') {
    const newPath = currentDir.value === '.' ? entry.name : `${currentDir.value}/${entry.name}`
    await loadDir(newPath)
    return
  }

  const filePath = currentDir.value === '.' ? entry.name : `${currentDir.value}/${entry.name}`
  previewPath.value = filePath

  if (isImageFile(filePath)) {
    previewMode.value = 'image'
    if (sessionStore.activeSession) {
      previewUrl.value = getRawFileUrl(sessionStore.activeSession.session_id, filePath)
    }
    return
  }

  try {
    if (!sessionStore.activeSession) return
    const data = await readFile(sessionStore.activeSession.session_id, filePath)
    previewContent.value = data.content
    previewMode.value = isMdFile(filePath) ? 'md' : 'code'
  } catch (e) {
    console.warn('Failed to read file:', e)
  }
}

function closePreview() {
  previewPath.value = ''
  previewMode.value = ''
  previewContent.value = ''
  editing.value = false
}

function startEdit() {
  editing.value = true
  editContent.value = previewContent.value
}

async function saveEdit() {
  if (!sessionStore.activeSession || !previewPath.value) return
  try {
    await saveFile(sessionStore.activeSession.session_id, previewPath.value, editContent.value)
    previewContent.value = editContent.value
    editing.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

function cancelEdit() {
  editing.value = false
  editContent.value = ''
}

async function handleNewFile() {
  const name = prompt(t('new_file_prompt'))
  if (!name || !sessionStore.activeSession) return
  try {
    const path = currentDir.value === '.' ? name : `${currentDir.value}/${name}`
    await createFile(sessionStore.activeSession.session_id, path)
    await loadDir(currentDir.value)
  } catch (e: any) {
    alert(e.message)
  }
}

async function handleNewFolder() {
  const name = prompt(t('new_folder_prompt'))
  if (!name || !sessionStore.activeSession) return
  try {
    const path = currentDir.value === '.' ? name : `${currentDir.value}/${name}`
    await createDir(sessionStore.activeSession.session_id, path)
    await loadDir(currentDir.value)
  } catch (e: any) {
    alert(e.message)
  }
}

function fileIcon(name: string): string {
  const ext = fileExt(name)
  if (['.js', '.ts', '.vue'].includes(ext)) return '📄'
  if (['.py', '.rb', '.go', '.rs'].includes(ext)) return '📄'
  if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) return '⚙️'
  if (['.md', '.txt'].includes(ext)) return '📝'
  return '📄'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Watch for session changes
watch(() => sessionStore.activeSession?.session_id, () => {
  if (sessionStore.activeSession) loadDir('.')
})
</script>
