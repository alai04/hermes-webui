<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="remove(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
  duration: number
}

const toasts = ref<Toast[]>([])
let nextId = 1

function showToast(message: string, duration = 3000, type: Toast['type'] = 'info') {
  const id = nextId++
  toasts.value.push({ id, message, type, duration })
  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

function remove(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// Provide showToast to child components
provide('showToast', showToast)

// Make it available globally for API calls
;(window as any).showToast = showToast
</script>
