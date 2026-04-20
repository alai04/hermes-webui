<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'
import { renderMarkdown } from '@/utils/markdown'

const { t } = useI18n()

const props = defineProps<{
  path: string
  sessionId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

type PreviewMode = 'code' | 'md' | 'image'

const mode = ref<PreviewMode>('code')
const codeContent = ref('')
const mdContent = ref('')
const rawContent = ref('')
const loading = ref(false)
const error = ref('')
const editing = ref(false)
const editContent = ref('')
const dirty = ref(false)
const saving = ref(false)

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'])
const MD_EXTS = new Set(['.md', '.markdown', '.mdown'])
const DOWNLOAD_EXTS = new Set([
  '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.odt', '.ods', '.odp',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.flac', '.mov', '.avi', '.mkv', '.webm',
  '.exe', '.dmg', '.pkg', '.deb', '.rpm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.bin', '.dat', '.db', '.sqlite', '.pyc', '.class', '.so', '.dylib', '.dll',
])

function fileExt(p: string): string {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(i).toLowerCase() : ''
}

const ext = computed(() => fileExt(props.path))
const fileName = computed(() => props.path.split('/').pop() ?? props.path)

const imageUrl = computed(() =>
  `api/file/raw?session_id=${encodeURIComponent(props.sessionId)}&path=${encodeURIComponent(props.path)}`
)

const downloadUrl = computed(() =>
  `api/file/raw?session_id=${encodeURIComponent(props.sessionId)}&path=${encodeURIComponent(props.path)}&download=1`
)

async function load() {
  loading.value = true
  error.value = ''
  editing.value = false
  dirty.value = false
  editContent.value = ''

  if (DOWNLOAD_EXTS.has(ext.value)) {
    triggerDownload()
    loading.value = false
    emit('close')
    return
  }

  if (IMAGE_EXTS.has(ext.value)) {
    mode.value = 'image'
    loading.value = false
    return
  }

  try {
    const data = await apiGet('/api/file', { session_id: props.sessionId, path: props.path })
    if (data.binary) {
      triggerDownload()
      emit('close')
      loading.value = false
      return
    }
    rawContent.value = data.content ?? ''
    if (MD_EXTS.has(ext.value)) {
      mode.value = 'md'
      mdContent.value = rawContent.value
    } else {
      mode.value = 'code'
      codeContent.value = rawContent.value
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function triggerDownload() {
  const a = document.createElement('a')
  a.href = downloadUrl.value
  a.download = fileName.value
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 100)
}

function enterEdit() {
  editContent.value = rawContent.value
  editing.value = true
  dirty.value = false
}

function cancelEdit() {
  if (dirty.value && !confirm(t('unsaved_confirm', 'Discard unsaved changes?'))) return
  editing.value = false
  dirty.value = false
}

async function saveEdit() {
  saving.value = true
  try {
    await apiPost('/api/file/save', {
      session_id: props.sessionId,
      path: props.path,
      content: editContent.value,
    })
    rawContent.value = editContent.value
    if (mode.value === 'code') codeContent.value = editContent.value
    else mdContent.value = editContent.value
    editing.value = false
    dirty.value = false
  } catch (e: any) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (dirty.value && !confirm(t('unsaved_confirm', 'Discard unsaved changes?'))) return
  emit('close')
}

// Warn on navigation/unload if dirty
function onBeforeUnloadHandler(e: BeforeUnloadEvent) {
  if (dirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

window.addEventListener('beforeunload', onBeforeUnloadHandler)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnloadHandler)
})

watch(() => [props.path, props.sessionId], load, { immediate: true })
</script>

<template>
  <div class="preview-area" style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Header bar -->
    <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0;min-width:0">
      <span
        class="preview-badge"
        :class="mode"
        style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(255,255,255,.08);color:var(--muted);flex-shrink:0"
      >{{ mode === 'image' ? 'image' : mode === 'md' ? 'md' : ext || 'text' }}</span>
      <span
        style="flex:1;font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        :title="path"
      >{{ fileName }}</span>
      <a
        :href="downloadUrl"
        :download="fileName"
        class="cron-btn"
        style="padding:2px 6px;font-size:10px;text-decoration:none"
        title="Download"
      >⬇</a>
      <button
        v-if="mode !== 'image'"
        class="cron-btn run"
        style="padding:2px 6px;font-size:10px"
        @click="editing ? saveEdit() : enterEdit()"
      >
        {{ editing ? (saving ? t('saving', 'Saving…') : '💾 ' + t('save')) : '✎ ' + t('edit') }}
      </button>
      <button
        v-if="editing"
        class="cron-btn"
        style="padding:2px 6px;font-size:10px"
        @click="cancelEdit"
      >{{ t('cancel') }}</button>
      <button
        class="cron-btn"
        style="padding:2px 6px;font-size:10px"
        @click="handleClose"
      >✕</button>
    </div>

    <!-- Body -->
    <div v-if="loading" style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>
    <div v-else-if="error" style="padding:12px;color:var(--accent);font-size:12px">{{ error }}</div>
    <template v-else>
      <!-- Edit textarea -->
      <textarea
        v-if="editing"
        v-model="editContent"
        style="flex:1;width:100%;background:rgba(255,255,255,.04);border:none;outline:none;color:var(--text);padding:12px;font-size:12px;font-family:'SF Mono',ui-monospace,monospace;resize:none;line-height:1.5;box-sizing:border-box"
        @input="dirty = true"
        @keydown.escape="cancelEdit"
      />

      <!-- Image preview -->
      <div v-else-if="mode === 'image'" id="previewImgWrap" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:12px">
        <img
          :src="imageUrl"
          :alt="path"
          style="max-width:100%;max-height:100%;object-fit:contain"
        />
      </div>

      <!-- Markdown preview -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-else-if="mode === 'md'"
        id="previewMd"
        style="flex:1;overflow-y:auto;padding:12px;font-size:13px;line-height:1.6"
        v-html="renderMarkdown(mdContent)"
      />

      <!-- Code preview -->
      <pre
        v-else
        id="previewCode"
        style="flex:1;overflow:auto;padding:12px;font-size:12px;font-family:'SF Mono',ui-monospace,monospace;margin:0;line-height:1.5;color:var(--text);white-space:pre"
      >{{ codeContent }}</pre>
    </template>
  </div>
</template>
