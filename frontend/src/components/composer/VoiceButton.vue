<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useVoiceInput } from '@/composables/useVoiceInput'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{
  (e: 'transcript', text: string): void
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()

function showToastError(key: string) {
  // Emit to parent or show simple console warning — full toast system TBD
  const msg = key.startsWith('mic_error:') ? `${t('mic_error')}${key.slice(10)}` : t(key as any) ?? key
  console.warn('[VoiceButton]', msg)
  // Attempt to use the global toast portal if available
  const portal = document.getElementById('toast-portal')
  if (portal) {
    const el = document.createElement('div')
    el.className = 'toast toast-error'
    el.textContent = msg
    portal.appendChild(el)
    setTimeout(() => el.remove(), 3500)
  }
}

const { isSupported, isRecording, startMic, stopMic } = useVoiceInput({
  onTranscript: (text) => emit('transcript', text),
  onError: (key) => showToastError(key),
  onStatusChange: () => {},
  language: settingsStore.language ? `${settingsStore.language}-${settingsStore.language.toUpperCase()}` : undefined,
})

function toggle() {
  if (isRecording.value) {
    stopMic()
  } else {
    startMic()
  }
}
</script>

<template>
  <button
    v-if="isSupported"
    class="icon-btn mic-btn"
    :class="{ recording: isRecording }"
    :title="isRecording ? 'Stop recording' : 'Voice input'"
    :aria-label="isRecording ? 'Stop recording' : 'Voice input'"
    :aria-pressed="isRecording"
    type="button"
    @click="toggle"
  >
    <!-- Mic icon (idle) -->
    <svg
      v-if="!isRecording"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="1" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
    <!-- Stop icon (recording) -->
    <svg
      v-else
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  </button>
</template>
