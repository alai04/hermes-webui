<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useStreamingStore } from '@/stores/streaming'
import { useSettingsStore } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'
import { getMatchingCommands } from '@/composables/useCommands'
import { useVoiceInput } from '@/composables/useVoiceInput'
import FileTray from './FileTray.vue'
import VoiceButton from './VoiceButton.vue'
import ModelSelector from './ModelSelector.vue'
import CommandDropdown from './CommandDropdown.vue'

const { t } = useI18n()
const sessionStore = useSessionStore()
const streamingStore = useStreamingStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()


const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const text = ref('')
const uploading = ref(false)
const composerStatus = ref('')
const cmdDropdownQuery = ref('')
const showCmdDropdown = ref(false)

// Voice input
const { isRecording, startMic, stopMic } = useVoiceInput({
  onTranscript: (t) => {
    text.value = text.value ? text.value + ' ' + t : t
    autoResize()
  },
  onError: (msg) => { composerStatus.value = msg },
  onStatusChange: (rec) => { if (!rec) composerStatus.value = '' },
})

const canSend = computed(() =>
  (text.value.trim().length > 0 || sessionStore.pendingFiles.length > 0) &&
  !streamingStore.isStreaming
)

const placeholder = computed(() => {
  const name = settingsStore.botName || 'Hermes'
  return t('msg_placeholder', `Message ${name}…`)
})

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onInput() {
  autoResize()
  const val = text.value
  if (val.startsWith('/') && !val.includes('\n')) {
    const prefix = val.slice(1)
    getMatchingCommands(prefix).then(matches => {
      if (matches.length) {
        cmdDropdownQuery.value = prefix
        showCmdDropdown.value = true
      } else {
        showCmdDropdown.value = false
      }
    })
  } else {
    showCmdDropdown.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (showCmdDropdown.value) {
    if (e.key === 'Escape') { e.preventDefault(); showCmdDropdown.value = false; return }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') { e.preventDefault(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); return }
  }
  if (e.key === 'Enter') {
    if (e.isComposing) return
    const isMobile = window.matchMedia('(pointer:coarse)').matches
    const sendKey = settingsStore.sendKey || 'enter'
    if (sendKey === 'ctrl+enter' || (isMobile && sendKey === 'enter')) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); send() }
    } else {
      if (!e.shiftKey) { e.preventDefault(); send() }
    }
  }
}

function onPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItems = items.filter(i => i.type.startsWith('image/'))
  if (!imageItems.length) return
  e.preventDefault()
  const files = imageItems.map(i => {
    const blob = i.getAsFile()!
    const ext = i.type.split('/')[1] || 'png'
    return new File([blob], `screenshot-${Date.now()}.${ext}`, { type: i.type })
  })
  files.forEach(f => sessionStore.addPendingFile(f))
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files || [])
  files.forEach(f => sessionStore.addPendingFile(f))
}

function onDragover(e: DragEvent) { e.preventDefault() }

async function uploadFiles(): Promise<string[]> {
  if (!sessionStore.pendingFiles.length) return []
  if (!sessionStore.currentSession) return []
  const uploaded: string[] = []
  for (const file of sessionStore.pendingFiles) {
    const form = new FormData()
    form.append('session_id', sessionStore.currentSession.session_id)
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await res.json()
      if (res.ok) uploaded.push(data.filename)
    } catch {
      // skip failed uploads
    }
  }
  return uploaded
}

async function send() {
  if (isRecording.value) { stopMic(); return }
  const msgText = text.value.trim()
  if (!msgText && !sessionStore.pendingFiles.length) return
  if (streamingStore.isStreaming) return

  // Create session if needed
  if (!sessionStore.currentSession) {
    await sessionStore.newSession()
  }
  const session = sessionStore.currentSession!

  // Upload pending files
  uploading.value = true
  composerStatus.value = sessionStore.pendingFiles.length ? t('uploading', 'Uploading…') : ''
  let uploaded: string[] = []
  try {
    uploaded = await uploadFiles()
  } catch { /* ignore */ } finally {
    uploading.value = false
    composerStatus.value = ''
  }

  let finalMsg = msgText
  if (uploaded.length && !finalMsg) finalMsg = `I've uploaded ${uploaded.length} file(s): ${uploaded.join(', ')}`
  else if (uploaded.length) finalMsg = `${msgText}\n\n[Attached files: ${uploaded.join(', ')}]`
  if (!finalMsg) return

  text.value = ''
  sessionStore.clearPendingFiles()
  await nextTick()
  autoResize()
  showCmdDropdown.value = false

  // Optimistic title
  if (!session.title || session.title === 'Untitled') {
    const provisional = finalMsg.slice(0, 64)
    sessionStore.renameSession(session.session_id, provisional).catch(() => {})
  }

  // Add user message optimistically
  sessionStore.messages.push({
    role: 'user',
    content: msgText || `(${uploaded.length} file(s))`,
    attachments: uploaded.length ? uploaded : undefined,
    _ts: Date.now() / 1000,
  })

  try {
    await streamingStore.startStream(
      session.session_id,
      finalMsg,
      uploaded.length ? uploaded : undefined,
      session.model || undefined,
      session.workspace || undefined,
    )
  } catch (e: unknown) {
    composerStatus.value = String((e as Error)?.message || t('error_prefix', 'Error'))
  }
}

function onCommandSelect(cmd: string) {
  text.value = '/' + cmd + ' '
  showCmdDropdown.value = false
  textareaRef.value?.focus()
  autoResize()
}

function attachFiles() { fileInputRef.value?.click() }

function onFileInput(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  files.forEach(f => sessionStore.addPendingFile(f))
  ;(e.target as HTMLInputElement).value = ''
}

// Global Cmd+K — new chat
async function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (!streamingStore.isStreaming) {
      await sessionStore.newSession()
      textareaRef.value?.focus()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <div class="composer-wrap" @drop="onDrop" @dragover="onDragover">
    <!-- File tray -->
    <FileTray
      v-if="sessionStore.pendingFiles.length"
      :files="sessionStore.pendingFiles"
      @remove="sessionStore.removePendingFile"
    />

    <!-- Approval / clarify overlays are rendered by MessageList, not here -->

    <div class="composer-box">
      <!-- Command dropdown -->
      <CommandDropdown
        v-if="showCmdDropdown"
        :query="cmdDropdownQuery"
        @select="onCommandSelect"
        @close="showCmdDropdown = false"
      />

      <div class="composer-inner">
        <textarea
          ref="textareaRef"
          v-model="text"
          class="composer-textarea"
          rows="1"
          :placeholder="placeholder"
          :disabled="streamingStore.isStreaming && !canSend"
          @input="onInput"
          @keydown="onKeydown"
          @paste="onPaste"
        />
        <div class="composer-actions">
          <button
            class="icon-btn"
            :title="t('attach_file', 'Attach file')"
            @click="attachFiles"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <VoiceButton
            :is-recording="isRecording"
            @click="isRecording ? stopMic() : startMic()"
          />
          <button
            v-if="streamingStore.isStreaming"
            class="icon-btn cancel-btn"
            :title="t('cancel', 'Cancel')"
            @click="streamingStore.cancelStream(sessionStore.currentSession?.session_id || '')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </button>
          <button
            v-else
            class="send-btn"
            :disabled="!canSend"
            :title="t('send', 'Send')"
            @click="send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Composer footer: model + profile chips -->
      <div class="composer-footer">
        <ModelSelector />
        <span class="profile-chip">
          {{ uiStore.activeProfile || 'default' }}
        </span>
        <span v-if="composerStatus" class="composer-status">{{ composerStatus }}</span>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display:none"
      @change="onFileInput"
    />
  </div>
</template>

<style scoped>
.composer-wrap {
  position: relative;
  padding: 0 16px 12px;
  flex-shrink: 0;
}
.composer-box {
  background: var(--input-bg, var(--surface));
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 8px 12px 6px;
}
.composer-inner {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.composer-textarea {
  flex: 1;
  min-height: 36px;
  max-height: 200px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  overflow-y: auto;
}
.composer-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-bottom: 2px;
}
.send-btn {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}
.send-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.send-btn:not(:disabled):hover { opacity: 0.85; }
.cancel-btn {
  background: var(--danger, #ef4444);
  color: #fff;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.composer-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  flex-wrap: wrap;
}
.profile-chip {
  background: var(--surface2, rgba(255,255,255,.06));
  border: 1px solid var(--border2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: var(--muted);
}
.composer-status {
  margin-left: auto;
  opacity: 0.7;
  font-size: 11px;
}
</style>
