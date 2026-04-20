import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  duration: number
}

let _nextId = 1
export const toasts = ref<ToastItem[]>([])

export function showToast(message: string, duration = 3000): void {
  const id = _nextId++
  toasts.value.push({ id, message, duration })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
