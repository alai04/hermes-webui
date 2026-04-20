<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  {
    title: '',
    message: '',
    confirmLabel: '',
    cancelLabel: '',
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (!props.show) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
  } else if (e.key === 'Enter') {
    e.preventDefault()
    emit('confirm')
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="show"
        class="dialog-backdrop"
        role="dialog"
        :aria-label="title || t('dialog_confirm_title')"
        aria-modal="true"
        @click.self="emit('cancel')"
      >
        <div class="dialog-panel">
          <div v-if="title" class="dialog-title">{{ title }}</div>
          <div v-if="message" class="dialog-message">{{ message }}</div>
          <div class="dialog-actions">
            <button class="dialog-btn dialog-cancel" @click="emit('cancel')">
              {{ cancelLabel || t('cancel') }}
            </button>
            <button class="dialog-btn dialog-confirm" @click="emit('confirm')">
              {{ confirmLabel || t('dialog_confirm_btn') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 8000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog-panel {
  background: var(--surface2, #1e1e1e);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8e8e8);
  margin-bottom: 10px;
}

.dialog-message {
  font-size: 13px;
  color: var(--muted, #888);
  line-height: 1.5;
  margin-bottom: 20px;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dialog-btn {
  padding: 7px 16px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  transition: opacity 0.15s;
}

.dialog-btn:hover {
  opacity: 0.85;
}

.dialog-cancel {
  background: transparent;
  color: var(--muted, #888);
}

.dialog-confirm {
  background: var(--accent, #e05c3a);
  color: #fff;
  border-color: transparent;
}

/* Transition */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
