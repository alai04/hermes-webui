<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStreamingStore } from '@/stores/streaming'

const { t } = useI18n()
const streamingStore = useStreamingStore()

const customAnswer = ref('')
const responding = ref(false)

const pending = computed(() => streamingStore.pendingClarify as Record<string, unknown> | null)

const choices = computed((): string[] => {
  const c = pending.value?.choices_offered ?? pending.value?.choices
  if (Array.isArray(c)) return c as string[]
  return []
})

async function sendResponse(text: string) {
  const sessionId = streamingStore.pendingSessionId
  if (!text.trim() || !sessionId || responding.value) return

  responding.value = true
  try {
    await fetch('/api/clarify/respond', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        response: text.trim(),
      }),
    })
    streamingStore.pendingClarify = null
    customAnswer.value = ''
  } catch (err) {
    console.error('[ClarifyCard] respond error:', err)
  } finally {
    responding.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendResponse(customAnswer.value)
  }
}
</script>

<template>
  <div
    v-if="pending"
    class="clarify-card visible"
    role="dialog"
    aria-labelledby="clarifyHeadingVue"
    aria-describedby="clarifyQuestionVue clarifyHintVue"
  >
    <div class="clarify-inner">
      <div class="clarify-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 17h.01"/>
          <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span id="clarifyHeadingVue">{{ t('clarify_heading') }}</span>
      </div>
      <div class="clarify-question" id="clarifyQuestionVue">
        {{ (pending.question ?? pending.message) as string }}
      </div>
      <div v-if="choices.length > 0" class="clarify-choices">
        <button
          v-for="(choice, idx) in choices"
          :key="idx"
          class="clarify-choice"
          :disabled="responding"
          @click="sendResponse(choice)"
        >
          {{ choice }}
        </button>
        <button
          class="clarify-choice clarify-choice-other"
          :disabled="responding"
          @click="customAnswer = ''; ($event.target as HTMLElement).closest('.clarify-card')?.querySelector<HTMLInputElement>('.clarify-input')?.focus()"
        >
          {{ t('clarify_other') }}
        </button>
      </div>
      <div class="clarify-response">
        <input
          class="clarify-input"
          type="text"
          v-model="customAnswer"
          :placeholder="t('clarify_input_placeholder')"
          :disabled="responding"
          @keydown="onKeydown"
        />
        <button
          class="clarify-submit"
          :disabled="responding || !customAnswer.trim()"
          @click="sendResponse(customAnswer)"
        >
          {{ t('clarify_send') }}
        </button>
      </div>
      <div class="clarify-hint" id="clarifyHintVue">{{ t('clarify_hint') }}</div>
    </div>
  </div>
</template>

<style scoped>
.clarify-choice {
  background: var(--hover-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  margin: 2px;
}
.clarify-choice:hover:not(:disabled) {
  background: var(--accent-bg, rgba(124,185,255,0.12));
  border-color: var(--accent-bg-strong, rgba(124,185,255,0.25));
}
.clarify-choice:disabled {
  opacity: 0.5;
  cursor: default;
}
.clarify-choice-other {
  opacity: 0.7;
}
</style>
