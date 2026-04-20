<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  content: string
  streaming: boolean
}>()

const { t } = useI18n()
const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="thinking-card" :class="{ open: isOpen }">
    <div class="thinking-card-header" @click="toggle" role="button" :aria-expanded="isOpen">
      <span class="thinking-card-icon" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      </span>
      <span class="thinking-card-label">
        <span v-if="streaming" class="thinking-badge">
          {{ t('thinking') }}&hellip;
          <span class="thinking-spinner" aria-hidden="true"></span>
        </span>
        <span v-else>{{ t('thinking') }}</span>
      </span>
      <span class="thinking-card-toggle" aria-hidden="true">&#9654;</span>
    </div>
    <div class="thinking-card-body">
      <pre>{{ props.content || '\u2026' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.thinking-spinner {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
  margin-left: 4px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
