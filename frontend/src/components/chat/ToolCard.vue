<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ToolCallData {
  id?: string
  name?: string
  args?: unknown
  input?: unknown
  result?: unknown
  output?: unknown
  done?: boolean
  error?: string
  status?: 'running' | 'done' | 'error'
}

const props = defineProps<{
  toolCall: ToolCallData
}>()

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

const formattedName = computed(() => {
  const raw = props.toolCall.name ?? 'tool'
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const isDone = computed(() => {
  return props.toolCall.done === true || props.toolCall.status === 'done' || props.toolCall.status === 'error'
})

const hasError = computed(() => {
  return !!props.toolCall.error || props.toolCall.status === 'error'
})

const argsJson = computed(() => {
  const args = props.toolCall.args ?? props.toolCall.input
  if (args === undefined || args === null) return ''
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
})

const resultText = computed(() => {
  const res = props.toolCall.result ?? props.toolCall.output
  if (res === undefined || res === null) return ''
  if (typeof res === 'string') return res.slice(0, 500)
  try {
    return JSON.stringify(res, null, 2).slice(0, 500)
  } catch {
    return String(res)
  }
})
</script>

<template>
  <div class="tool-card" :class="{ 'tool-card-error': hasError }">
    <div class="tool-card-header" @click="toggle" role="button" :aria-expanded="isOpen">
      <span class="tool-card-status" aria-hidden="true">
        <!-- Running spinner -->
        <span v-if="!isDone" class="tool-card-running-dot"></span>
        <!-- Error icon -->
        <svg v-else-if="hasError" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--error, #ef5350)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <!-- Done checkmark -->
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text, #7cb9ff)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
      <span class="tool-card-name" :class="{ 'tool-card-name-error': hasError }">{{ formattedName }}</span>
      <span v-if="hasError && toolCall.error" class="tool-card-error-msg">{{ toolCall.error }}</span>
      <span class="tool-card-toggle" aria-hidden="true" :class="{ open: isOpen }">&#9654;</span>
    </div>

    <div v-if="isOpen" class="tool-card-body">
      <div v-if="argsJson" class="tool-card-section">
        <div class="tool-card-section-label">Arguments</div>
        <pre class="tool-card-pre">{{ argsJson }}</pre>
      </div>
      <div v-if="isDone && resultText" class="tool-card-section">
        <div class="tool-card-section-label">{{ hasError ? 'Error' : 'Result' }}</div>
        <pre class="tool-card-pre" :class="{ 'tool-card-pre-error': hasError }">{{ resultText }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card-error {
  border-color: rgba(239, 83, 80, 0.3) !important;
}
.tool-card-name-error {
  color: var(--error, #ef5350) !important;
}
.tool-card-error-msg {
  font-size: 10px;
  color: var(--error, #ef5350);
  opacity: 0.8;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-card-toggle {
  margin-left: auto;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform-origin: center;
  transition: transform 0.18s ease;
}
.tool-card-toggle.open {
  transform: rotate(90deg);
}
.tool-card-body {
  padding: 0 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool-card-section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.tool-card-pre {
  font-family: 'SF Mono', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  background: var(--code-bg, rgba(0,0,0,0.2));
  border-radius: 4px;
  padding: 6px 8px;
  max-height: 180px;
  overflow-y: auto;
}
.tool-card-pre-error {
  color: var(--error, #ef5350);
}
</style>
