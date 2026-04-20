<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const sessionStore = useSessionStore()

interface TodoItem {
  id?: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  activeForm?: string
}

const todos = computed<TodoItem[]>(() => {
  const messages = sessionStore.messages
  // Walk messages in reverse to find the most recent TodoWrite tool result
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m && m.role === 'tool') {
      try {
        const raw = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        const d = JSON.parse(raw)
        if (d && Array.isArray(d.todos) && d.todos.length) {
          return d.todos as TodoItem[]
        }
      } catch {
        // continue
      }
    }
  }
  return []
})

function statusIcon(status: string): string {
  switch (status) {
    case 'in_progress': return '⟳'
    case 'completed': return '✓'
    case 'cancelled': return '✕'
    default: return '○'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'in_progress': return 'var(--blue, #0288A8)'
    case 'completed': return 'rgba(100,200,100,.8)'
    case 'cancelled': return 'rgba(200,100,100,.5)'
    default: return 'var(--muted)'
  }
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <div style="padding:10px 12px 4px;font-size:11px;color:var(--muted);flex-shrink:0">
      {{ t('current_task_list') }}
    </div>
    <div id="todoPanel" style="flex:1;overflow-y:auto;padding:8px 12px">
      <div v-if="!todos.length" style="color:var(--muted);font-size:12px;padding:4px 0">
        {{ t('todos_no_active') }}
      </div>
      <div
        v-for="(todo, idx) in todos"
        :key="todo.id ?? idx"
        style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"
      >
        <span
          style="font-size:14px;display:inline-flex;align-items:center;flex-shrink:0;margin-top:1px"
          :style="{ color: statusColor(todo.status) }"
        >
          {{ statusIcon(todo.status) }}
        </span>
        <div style="flex:1;min-width:0">
          <div
            style="font-size:13px;line-height:1.4"
            :style="{
              color: todo.status === 'in_progress' ? 'var(--text)' : 'var(--text)',
              textDecoration: todo.status === 'completed' ? 'line-through' : 'none',
              opacity: todo.status === 'completed' ? 0.5 : 1,
            }"
          >
            {{ todo.content }}
          </div>
          <div v-if="todo.id" style="font-size:10px;color:var(--muted);margin-top:2px;opacity:.6">
            {{ todo.id }} · {{ todo.status }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
