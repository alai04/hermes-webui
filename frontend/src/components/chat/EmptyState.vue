<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useStreamingStore } from '@/stores/streaming'
import HermesLogo from '@/components/shared/HermesLogo.vue'

const { t } = useI18n()
const sessionStore = useSessionStore()
const streamingStore = useStreamingStore()

const emit = defineEmits<{
  (e: 'suggest', text: string): void
}>()

function onSuggest(text: string) {
  emit('suggest', text)
}
</script>

<template>
  <div
    v-if="!streamingStore.isStreaming && (!sessionStore.currentSession || sessionStore.messages.length === 0)"
    class="empty-state"
    id="emptyState"
  >
    <div class="empty-logo">
      <HermesLogo :width="80" :height="80" />
    </div>
    <h2>{{ t('empty_title') }}</h2>
    <p>{{ t('empty_subtitle') }}</p>
    <div class="suggestion-grid">
      <button class="suggestion" @click="onSuggest(t('suggest_files'))">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{{ t('suggest_files') }}</span>
      </button>
      <button class="suggestion" @click="onSuggest(t('suggest_schedule'))">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="12" y2="16"/>
        </svg>
        <span>{{ t('suggest_schedule') }}</span>
      </button>
      <button class="suggestion" @click="onSuggest(t('suggest_plan'))">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <span>{{ t('suggest_plan') }}</span>
      </button>
    </div>
  </div>
</template>
