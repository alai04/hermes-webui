<script setup lang="ts">
import { toasts, dismissToast } from '@/composables/useToast'
</script>

<template>
  <Teleport to="#toast-portal">
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          role="status"
          @click="dismissToast(toast.id)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  background: var(--surface2, #2a2a2a);
  color: var(--text, #e8e8e8);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  pointer-events: auto;
  max-width: 320px;
  word-break: break-word;
}

.toast-enter-active { transition: all 0.2s ease; }
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.96); }
.toast-leave-to { opacity: 0; transform: translateY(8px) scale(0.95); }
</style>
