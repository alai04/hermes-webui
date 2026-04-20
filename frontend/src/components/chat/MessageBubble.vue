<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useStreamingStore } from '@/stores/streaming'
import { renderMarkdown } from '@/utils/markdown'
import { parseThinkingBlocks } from '@/utils/thinking'
import HermesLogo from '@/components/shared/HermesLogo.vue'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolCard, { type ToolCallData } from './ToolCard.vue'
import TokenUsage, { type UsageData } from './TokenUsage.vue'

export interface MessageData {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  attachments?: string[]
  tool_calls?: ToolCallData[]
  usage?: UsageData
  _ts?: number
  reasoning?: string
  [key: string]: unknown
}

const props = defineProps<{
  message: MessageData
  isLast?: boolean
  liveStreaming?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', index: number, content: string): void
  (e: 'regenerate'): void
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const streamingStore = useStreamingStore()

const isEditing = ref(false)
const editText = ref('')
const copied = ref(false)

const parsed = computed(() => {
  if (props.message.role !== 'assistant') return null
  return parseThinkingBlocks(props.message.content)
})

const renderedContent = computed((): string => {
  if (props.message.role !== 'assistant') return ''
  const text = parsed.value?.content ?? props.message.content
  return renderMarkdown(text)
})

const thinkingText = computed((): string => {
  if (props.message.reasoning) return props.message.reasoning
  return parsed.value?.thinking ?? ''
})

const hasThinking = computed(() => !!thinkingText.value)

const isUser = computed(() => props.message.role === 'user')
const isAssistant = computed(() => props.message.role === 'assistant')

function startEdit() {
  editText.value = props.message.content
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editText.value = ''
}

async function saveEdit() {
  const idx = sessionStore.messages.indexOf(props.message as any)
  if (idx === -1) return
  try {
    await fetch('/api/session/edit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionStore.currentSession?.session_id,
        message_index: idx,
        content: editText.value,
      }),
    })
    sessionStore.messages[idx] = { ...sessionStore.messages[idx], content: editText.value }
    isEditing.value = false
  } catch (err) {
    console.error('[MessageBubble] edit error:', err)
  }
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard not available
  }
}

async function regenerate() {
  emit('regenerate')
}

const imageAttachments = computed(() => {
  return (props.message.attachments ?? []).filter((a) =>
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a)
  )
})

const fileAttachments = computed(() => {
  return (props.message.attachments ?? []).filter((a) =>
    !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(a)
  )
})

const toolCalls = computed((): ToolCallData[] => {
  return (props.message.tool_calls as ToolCallData[] | undefined) ?? []
})
</script>

<template>
  <div
    class="msg-row"
    :class="{
      'msg-row-user': isUser,
      'msg-row-assistant': isAssistant,
    }"
  >
    <!-- Role label -->
    <div class="msg-role" :class="isUser ? 'user' : 'assistant'">
      <span v-if="isAssistant" class="msg-role-icon" aria-hidden="true">
        <HermesLogo :width="18" :height="18" />
      </span>
      <span>{{ isUser ? t('you') : 'Hermes' }}</span>
    </div>

    <!-- Thinking block (assistant only) -->
    <ThinkingBlock
      v-if="isAssistant && hasThinking"
      :content="thinkingText"
      :streaming="!!liveStreaming"
    />

    <!-- Tool cards -->
    <ToolCard
      v-for="(tc, idx) in toolCalls"
      :key="tc.id ?? idx"
      :toolCall="tc"
    />

    <!-- Message body -->
    <div class="msg-body">
      <!-- User: plain text or edit mode -->
      <template v-if="isUser">
        <div v-if="!isEditing" class="msg-text">
          {{ message.content }}
        </div>
        <div v-else class="msg-edit-wrap">
          <textarea
            class="msg-edit-area"
            v-model="editText"
            rows="4"
            @keydown.escape="cancelEdit"
          />
          <div class="msg-edit-actions">
            <button class="sm-btn" @click="cancelEdit">{{ t('cancel') }}</button>
            <button class="sm-btn" style="color:var(--accent-text)" @click="saveEdit">{{ t('save') }}</button>
          </div>
        </div>
      </template>

      <!-- Assistant: rendered markdown -->
      <div
        v-else-if="isAssistant"
        class="msg-markdown"
        v-html="renderedContent"
      />

      <!-- Image attachments -->
      <div v-if="imageAttachments.length > 0" class="msg-attachments-images">
        <img
          v-for="(src, i) in imageAttachments"
          :key="i"
          :src="`/api/file?path=${encodeURIComponent(src)}`"
          class="msg-attachment-img"
          :alt="src"
          loading="lazy"
        />
      </div>

      <!-- File attachments -->
      <div v-if="fileAttachments.length > 0" class="msg-attachments-files">
        <span
          v-for="(file, i) in fileAttachments"
          :key="i"
          class="msg-attachment-chip"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
            <polyline points="13 2 13 9 20 9"/>
          </svg>
          {{ file.split('/').pop() }}
        </span>
      </div>
    </div>

    <!-- Token usage (assistant only) -->
    <TokenUsage
      v-if="isAssistant && message.usage"
      :usage="message.usage as UsageData"
    />

    <!-- Action buttons (hover) -->
    <div class="msg-actions">
      <button
        class="msg-action-btn"
        :title="copied ? t('copied') : t('copy')"
        @click="copyContent"
        :aria-label="t('copy')"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </button>
      <button
        v-if="isUser && !isEditing && !sessionStore.busy"
        class="msg-action-btn"
        :title="t('edit_message')"
        @click="startEdit"
        :aria-label="t('edit_message')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
      <button
        v-if="isAssistant && isLast && !streamingStore.isStreaming"
        class="msg-action-btn"
        :title="t('regenerate')"
        @click="regenerate"
        :aria-label="t('regenerate')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.msg-role-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
.msg-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-markdown {
  /* inherits .msg-body styles from global style.css */
}
.msg-edit-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.msg-edit-area {
  width: 100%;
  background: var(--input-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  padding: 8px 12px;
  resize: vertical;
  font-family: inherit;
  outline: none;
}
.msg-edit-area:focus {
  border-color: var(--accent);
}
.msg-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.msg-attachments-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.msg-attachment-img {
  max-width: 200px;
  max-height: 160px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
}
.msg-attachments-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.msg-attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
  background: var(--hover-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 999px;
  padding: 2px 8px;
}
</style>
