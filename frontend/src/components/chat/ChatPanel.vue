<script setup lang="ts">
import { useStreamingStore } from '@/stores/streaming'
import MessageList from './MessageList.vue'
import Composer from '@/components/composer/Composer.vue'

const streamingStore = useStreamingStore()

const emit = defineEmits<{
  (e: 'suggest', text: string): void
}>()
</script>

<template>
  <div class="chat-panel">
    <!-- Busy indicator strip (visible in topbar when streaming) -->
    <div v-if="streamingStore.isStreaming" class="chat-busy-bar" aria-live="polite" aria-label="Generating response"></div>

    <!-- Message list (fills available height) -->
    <MessageList
      class="chat-message-list"
      @suggest="(text) => emit('suggest', text)"
    />

    <!-- Composer at bottom -->
    <Composer />
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}
.chat-message-list {
  flex: 1;
  min-height: 0;
}
.chat-busy-bar {
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--accent, #7cb9ff) 0%,
    var(--accent-text, #a8d5ff) 50%,
    var(--accent, #7cb9ff) 100%
  );
  background-size: 200% 100%;
  animation: busy-slide 1.4s linear infinite;
  flex-shrink: 0;
}
@keyframes busy-slide {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
