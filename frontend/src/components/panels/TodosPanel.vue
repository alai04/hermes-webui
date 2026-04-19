<template>
  <div class="panel-view" id="panelTodos">
    <div style="padding:10px 12px 4px;font-size:11px;color:var(--muted)">{{ t('current_task_list') }}</div>
    <div id="todoPanel" style="flex:1;overflow-y:auto;padding:8px 12px">
      <div v-if="!todos.length" style="color:var(--muted);font-size:12px">{{ t('todos_no_active') }}</div>
      <div v-for="todo in todos" :key="todo.id" class="todo-item">
        <span class="todo-status-icon" :class="todo.status">{{ statusIcon(todo.status) }}</span>
        <div class="todo-content">
          <div class="todo-text" :class="{ completed: todo.status === 'completed' }">{{ todo.content }}</div>
          <div class="todo-meta">{{ todo.id }} · {{ todo.status }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSessionStore } from '@/stores/sessions'
import { t } from '@/composables/i18n'

const sessionStore = useSessionStore()

const todos = computed(() => {
  const messages = sessionStore.activeSession?.messages || []
  // Find the most recent todo tool output
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'tool') {
      try {
        const d = JSON.parse(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
        if (d?.todos?.length) return d.todos
      } catch {}
    }
  }
  return []
})

function statusIcon(status: string) {
  return status === 'completed' ? '✓' : status === 'in_progress' ? '⟳' : status === 'cancelled' ? '✕' : '□'
}
</script>
