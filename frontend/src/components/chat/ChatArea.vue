<template>
  <div class="messages" ref="messagesRef">
    <!-- Empty state -->
    <div class="empty-state" v-if="!messages.length && !isStreaming">
      <div class="empty-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80">
          <defs>
            <linearGradient id="hermes-gold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#F5C542;stop-opacity:1"/>
              <stop offset="100%" style="stop-color:#D4961C;stop-opacity:1"/>
            </linearGradient>
          </defs>
          <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold)"/>
          <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9"/>
          <path d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24" fill="#D4961C" opacity="0.8"/>
          <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9"/>
          <path d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24" fill="#D4961C" opacity="0.8"/>
          <path d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42" fill="none" stroke="#F5C542" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42" fill="none" stroke="#D4961C" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="32" cy="10" r="4" fill="#F5C542"/>
          <circle cx="32" cy="10" r="2" fill="#FFF8E1" opacity="0.7"/>
        </svg>
      </div>
      <h2>{{ t('empty_title') }}</h2>
      <p>{{ t('empty_subtitle') }}</p>
      <div class="suggestion-grid">
        <button class="suggestion" @click="$emit('send', 'What files are in this workspace?')">
          {{ t('suggest_files') }}
        </button>
        <button class="suggestion" @click="$emit('send', 'What\'s on my schedule today?')">
          {{ t('suggest_schedule') }}
        </button>
        <button class="suggestion" @click="$emit('send', 'Help me plan a small project.')">
          {{ t('suggest_plan') }}
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="messages-inner">
      <!-- Thinking indicator -->
      <div v-if="isThinking" class="thinking-indicator">
        <div class="thinking-spinner">⟳</div>
        <div class="thinking-text">{{ t('thinking') }}...</div>
      </div>

      <!-- Live assistant text -->
      <div v-if="isStreaming && assistantText" class="assistant-segment">
        <div class="msg-body" v-html="renderedAssistantText"></div>
      </div>

      <!-- Tool calls -->
      <div v-for="(tc, idx) in toolCalls" :key="idx" class="tool-call-card" :class="{ done: tc.done, error: tc.is_error }">
        <div class="tool-call-header">
          <span class="tool-call-name">{{ tc.name }}</span>
          <span class="tool-call-status">{{ tc.done ? '✓' : '⟳' }}</span>
        </div>
        <div v-if="tc.preview" class="tool-call-preview">{{ tc.preview }}</div>
      </div>

      <!-- Regular messages -->
      <div v-for="(msg, idx) in displayedMessages" :key="idx" class="msg-row" :class="msg.role">
        <div class="msg-avatar">
          <span v-if="msg.role === 'user'">{{ t('you').charAt(0) }}</span>
          <span v-else>H</span>
        </div>
        <div class="msg-body" v-html="renderMessage(msg)"></div>
        <div class="msg-actions">
          <button @click="copyMessage(msg)" title="Copy">{{ copiedIdx === idx ? t('copied') : t('copy') }}</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Composer -->
  <div class="composer">
    <div class="composer-input-wrap">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        :placeholder="'Message Hermes...'"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      ></textarea>
      <div class="composer-actions">
        <button class="action-btn" @click="$emit('clear')" title="Clear">✕</button>
        <button v-if="isStreaming" class="action-btn cancel" @click="$emit('cancel')" title="Cancel">■</button>
        <button v-else class="send-btn" :disabled="!inputText.trim()" @click="handleSend">➤</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { t } from '@/composables/i18n'
import { renderMarkdown, extractDisplayText } from '@/utils/markdown'

const props = defineProps<{
  messages: any[]
  isStreaming: boolean
  isThinking: boolean
  thinkingContent: string
  assistantText: string
  toolCalls: any[]
}>()

const emit = defineEmits<{
  send: [text: string, attachments?: string[]]
  cancel: []
  clear: []
}>()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messagesRef = ref<HTMLElement | null>(null)
const copiedIdx = ref(-1)

const displayedMessages = computed(() => {
  // Don't show messages that are part of the streaming content
  return props.messages
})

const renderedAssistantText = computed(() => {
  return renderMarkdown(extractDisplayText(props.assistantText))
})

function renderMessage(msg: any): string {
  if (msg.role === 'user') {
    return escapeHtml(msg.content || '')
  }
  return renderMarkdown(msg.content || '')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]
  )
}

function autoResize() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 200) + 'px'
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
  autoResize()
}

async function copyMessage(msg: any) {
  try {
    await navigator.clipboard.writeText(msg.content || '')
    copiedIdx.value = props.messages.indexOf(msg)
    setTimeout(() => { copiedIdx.value = -1 }, 2000)
  } catch {}
}

// Auto-scroll on new messages
watch(() => props.messages.length, async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
})
</script>
