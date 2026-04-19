<template>
  <div class="sidebar-nav">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      class="nav-tab"
      :class="{ active: activePanel === tab.name }"
      @click="$emit('switch', tab.name)"
      :title="tab.label"
    >
      <component :is="tab.icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { t } from '@/composables/i18n'

defineProps<{ activePanel: string }>()
defineEmits<{ switch: [name: string] }>()

// Simple SVG icon components
const icons: Record<string, any> = {
  chat: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
  ]),
  tasks: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }),
    h('line', { x1: 16, y1: 2, x2: 16, y2: 6 }),
    h('line', { x1: 8, y1: 2, x2: 8, y2: 6 }),
    h('line', { x1: 3, y1: 10, x2: 21, y2: 10 })
  ]),
  skills: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
    h('path', { d: 'M2 17l10 5 10-5' }),
    h('path', { d: 'M2 12l10 5 10-5' })
  ]),
  memory: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6H8.2C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z' }),
    h('line', { x1: 9, y1: 17, x2: 15, y2: 17 }),
    h('line', { x1: 10, y1: 20, x2: 14, y2: 20 })
  ]),
  workspaces: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
  ]),
  profiles: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    h('circle', { cx: 12, cy: 7, r: 4 })
  ]),
  todos: () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: 3, y: 5, width: 6, height: 6, rx: 1 }),
    h('path', { d: 'm3 17 2 2 4-4' }),
    h('path', { d: 'M13 6h8' }),
    h('path', { d: 'M13 12h8' }),
    h('path', { d: 'M13 18h8' })
  ])
}

const tabs = [
  { name: 'chat', label: t('tab_chat'), icon: icons.chat },
  { name: 'tasks', label: t('tab_tasks'), icon: icons.tasks },
  { name: 'skills', label: t('tab_skills'), icon: icons.skills },
  { name: 'memory', label: t('tab_memory'), icon: icons.memory },
  { name: 'workspaces', label: t('tab_workspaces'), icon: icons.workspaces },
  { name: 'profiles', label: t('tab_profiles'), icon: icons.profiles },
  { name: 'todos', label: t('tab_todos'), icon: icons.todos },
]
</script>
