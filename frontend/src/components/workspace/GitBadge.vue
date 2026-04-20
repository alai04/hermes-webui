<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { apiGet } from '@/composables/useApi'

const props = defineProps<{
  sessionId: string
}>()

interface GitInfo {
  is_repo?: boolean
  is_git?: boolean
  branch?: string
  dirty?: number
  behind?: number
  ahead?: number
}

const gitInfo = ref<GitInfo | null>(null)
const badgeText = ref('')
const isDirty = ref(false)

async function refresh() {
  if (!props.sessionId) return
  try {
    const data = await apiGet('/api/git-info', { session_id: props.sessionId })
    const g: GitInfo = data.git ?? {}
    if (g.is_git || g.is_repo) {
      gitInfo.value = g
      let text = g.branch ?? 'git'
      if ((g.dirty ?? 0) > 0) text += ` · ${g.dirty}Δ`
      if ((g.behind ?? 0) > 0) text += ` ↓${g.behind}`
      if ((g.ahead ?? 0) > 0) text += ` ↑${g.ahead}`
      badgeText.value = text
      isDirty.value = (g.dirty ?? 0) > 0
    } else {
      gitInfo.value = null
      badgeText.value = ''
    }
  } catch {
    gitInfo.value = null
    badgeText.value = ''
  }
}

watch(() => props.sessionId, refresh)
onMounted(refresh)

defineExpose({ refresh })
</script>

<template>
  <span
    v-if="gitInfo && badgeText"
    id="gitBadge"
    :class="['git-badge', { dirty: isDirty }]"
    style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.08);color:var(--muted);white-space:nowrap;cursor:default;user-select:none"
    :title="isDirty ? 'Uncommitted changes' : 'Git branch'"
  >
    {{ badgeText }}
  </span>
</template>
