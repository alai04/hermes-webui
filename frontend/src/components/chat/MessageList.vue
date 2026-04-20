<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useStreamingStore } from '@/stores/streaming'
import MessageBubble, { type MessageData } from './MessageBubble.vue'
import ThinkingBlock from './ThinkingBlock.vue'
import ToolCard, { type ToolCallData } from './ToolCard.vue'
import EmptyState from './EmptyState.vue'
import ApprovalCard from './ApprovalCard.vue'
import ClarifyCard from './ClarifyCard.vue'

const emit = defineEmits<{
  (e: 'suggest', text: string): void
}>()

const sessionStore = useSessionStore()
const streamingStore = useStreamingStore()

const scrollEl = ref<HTMLElement | null>(null)
const userScrolledUp = ref(false)
const showScrollBtn = ref(false)

// Live streaming assembly
const liveMessage = computed((): MessageData | null => {
  if (!streamingStore.isStreaming && !streamingStore.liveTokens) return null
  return {
    role: 'assistant',
    content: streamingStore.liveTokens,
    reasoning: streamingStore.liveThinking || undefined,
  }
})

const messages = computed(() => sessionStore.messages as MessageData[])

function isLastMessage(idx: number): boolean {
  return idx === messages.value.length - 1
}

function scrollToBottom(smooth = false) {
  if (!scrollEl.value) return
  scrollEl.value.scrollTo({
    top: scrollEl.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  })
  userScrolledUp.value = false
  showScrollBtn.value = false
}

function onScroll() {
  if (!scrollEl.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollEl.value
  const distFromBottom = scrollHeight - scrollTop - clientHeight
  userScrolledUp.value = distFromBottom > 80
  showScrollBtn.value = userScrolledUp.value
}

// Auto-scroll on new messages / tokens
watch(
  [() => messages.value.length, () => streamingStore.liveTokens],
  async () => {
    if (!userScrolledUp.value) {
      await nextTick()
      scrollToBottom()
    }
  }
)

// Scroll to bottom when session loads
watch(
  () => sessionStore.currentSession?.session_id,
  async () => {
    userScrolledUp.value = false
    await nextTick()
    scrollToBottom()
  }
)

async function handleRegenerate() {
  // Find last user message and re-send
  const msgs = sessionStore.messages
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      const sessionId = sessionStore.currentSession?.session_id
      if (!sessionId) return
      await streamingStore.startStream(sessionId, msgs[i].content as string)
      return
    }
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div
    class="messages"
    ref="scrollEl"
    @scroll="onScroll"
  >
    <!-- Scroll to bottom button -->
    <button
      v-show="showScrollBtn"
      class="scroll-to-bottom-btn"
      aria-label="Scroll to bottom"
      @click="scrollToBottom(true)"
    >
      &#8595;
    </button>

    <!-- Empty state -->
    <EmptyState @suggest="(text) => emit('suggest', text)" />

    <!-- Messages inner -->
    <div class="messages-inner" v-if="messages.length > 0 || streamingStore.isStreaming">
      <MessageBubble
        v-for="(msg, idx) in messages"
        :key="idx"
        :message="msg"
        :isLast="isLastMessage(idx)"
        @regenerate="handleRegenerate"
      />

      <!-- Live streaming content -->
      <template v-if="streamingStore.isStreaming || streamingStore.liveTokens">
        <!-- Thinking indicator while waiting for first token -->
        <ThinkingBlock
          v-if="!streamingStore.liveTokens && !streamingStore.liveThinking"
          :content="''"
          :streaming="true"
        />

        <!-- Live thinking block -->
        <ThinkingBlock
          v-if="streamingStore.liveThinking"
          :content="streamingStore.liveThinking"
          :streaming="streamingStore.isStreaming"
        />

        <!-- Live tool cards -->
        <ToolCard
          v-for="(tc, idx) in (streamingStore.toolCallsLive as ToolCallData[])"
          :key="tc.id ?? idx"
          :toolCall="tc"
        />

        <!-- Live assistant message bubble -->
        <MessageBubble
          v-if="liveMessage"
          :message="liveMessage"
          :isLast="true"
          :liveStreaming="true"
        />
      </template>
    </div>

    <!-- Approval overlay -->
    <ApprovalCard />

    <!-- Clarify overlay -->
    <ClarifyCard />
  </div>
</template>
