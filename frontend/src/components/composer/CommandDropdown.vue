<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  query: string  // text after the leading /
}>()

const emit = defineEmits<{
  (e: 'select', command: string): void
  (e: 'close'): void
}>()

const { t } = useI18n()

interface Command {
  name: string
  desc: string
  arg?: string
  source?: 'builtin' | 'skill'
}

// Built-in slash commands
const BUILTIN_COMMANDS: Command[] = [
  { name: 'help',        desc: t('cmd_clear'),           source: 'builtin' },
  { name: 'clear',       desc: t('cmd_clear'),           source: 'builtin' },
  { name: 'compress',    desc: t('cmd_compress'),         source: 'builtin', arg: '[focus topic]' },
  { name: 'model',       desc: t('cmd_model'),            source: 'builtin', arg: 'model_name' },
  { name: 'workspace',   desc: t('cmd_workspace'),        source: 'builtin', arg: 'name' },
  { name: 'new',         desc: t('cmd_new'),              source: 'builtin' },
  { name: 'usage',       desc: t('cmd_usage'),            source: 'builtin' },
  { name: 'theme',       desc: t('cmd_theme'),            source: 'builtin', arg: 'name' },
  { name: 'personality', desc: t('cmd_personality'),      source: 'builtin', arg: 'name' },
  { name: 'skills',      desc: t('cmd_skills'),           source: 'builtin', arg: 'query' },
  { name: 'stop',        desc: t('cmd_stop'),             source: 'builtin' },
  { name: 'title',       desc: t('cmd_title'),            source: 'builtin', arg: '[title]' },
  { name: 'retry',       desc: t('cmd_retry'),            source: 'builtin' },
  { name: 'undo',        desc: t('cmd_undo'),             source: 'builtin' },
  { name: 'status',      desc: t('cmd_status'),           source: 'builtin' },
  { name: 'voice',       desc: t('cmd_voice'),            source: 'builtin' },
]

const skillCommands = ref<Command[]>([])
const selectedIdx = ref(0)

async function loadSkillCommands() {
  try {
    const res = await fetch('/api/skills', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      const skills = (data.skills ?? data) as Array<{ name: string; description?: string }>
      skillCommands.value = skills.map((s) => ({
        name: s.name,
        desc: s.description ?? '',
        source: 'skill' as const,
      }))
    }
  } catch { /* ignore */ }
}

const filteredCommands = computed((): Command[] => {
  const q = props.query.toLowerCase()
  const all: Command[] = [...BUILTIN_COMMANDS, ...skillCommands.value]
  if (!q) return all
  return all.filter((c) => c.name.startsWith(q))
})

const isOpen = computed(() => filteredCommands.value.length > 0 && props.query !== undefined)

// Reset selection when query changes
watch(() => props.query, () => {
  selectedIdx.value = 0
})

function select(cmd: Command) {
  emit('select', `/${cmd.name}`)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIdx.value = Math.min(selectedIdx.value + 1, filteredCommands.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIdx.value = Math.max(selectedIdx.value - 1, 0)
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    const cmd = filteredCommands.value[selectedIdx.value]
    if (cmd) select(cmd)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  loadSkillCommands()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true)
})
</script>

<template>
  <div v-if="isOpen" class="cmd-dropdown open">
    <div
      v-for="(cmd, idx) in filteredCommands"
      :key="cmd.name"
      class="cmd-item"
      :class="{ selected: idx === selectedIdx }"
      @mouseenter="selectedIdx = idx"
      @mousedown.prevent="select(cmd)"
    >
      <div class="cmd-item-head">
        <span class="cmd-item-name">
          /{{ cmd.name }}
          <span v-if="cmd.arg" class="cmd-item-arg">
            &nbsp;{{ cmd.arg.startsWith('[') ? cmd.arg : `<${cmd.arg}>` }}
          </span>
        </span>
        <span
          v-if="cmd.source === 'skill'"
          class="cmd-item-badge cmd-item-badge-skill"
        >Skill</span>
      </div>
      <div class="cmd-item-desc">{{ cmd.desc }}</div>
    </div>
  </div>
</template>
