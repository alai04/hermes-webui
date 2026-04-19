<template>
  <div class="panel-view" id="panelWorkspaces">
    <div style="padding:10px 12px 4px;font-size:11px;color:var(--muted)">{{ t('workspace_desc') }}</div>
    <div style="flex:1;overflow-y:auto;padding:0 12px 12px">
      <div v-if="!workspaces.length" style="color:var(--muted);font-size:12px">{{ t('loading') }}</div>
      <div v-for="ws in workspaces" :key="ws.path" class="workspace-item">
        <span class="workspace-name" :class="{ active: ws.path === activeWorkspace }" @click="$emit('select-workspace', ws.path, ws.name)">
          {{ ws.name || ws.path.split('/').pop() }}
        </span>
        <span class="workspace-path">{{ ws.path }}</span>
        <button class="ws-remove" @click="handleRemove(ws.path)" title="Remove">×</button>
      </div>
      <div class="add-workspace">
        <input v-model="newPath" :placeholder="t('workspace_choose_path')" @keyup.enter="handleAdd" />
        <button @click="handleAdd">{{ t('add') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { useSessionStore } from '@/stores/sessions'
import { t } from '@/composables/i18n'

const sidebarStore = useSidebarStore()
const sessionStore = useSessionStore()
const newPath = ref('')

const workspaces = sidebarStore.workspaces
const activeWorkspace = ref(sessionStore.activeSession?.workspace || '')

async function handleAdd() {
  if (!newPath.value.trim()) return
  try {
    await sidebarStore.addWs(newPath.value.trim())
    newPath.value = ''
  } catch (e: any) {
    alert(e.message)
  }
}

async function handleRemove(path: string) {
  if (confirm(`Remove "${path}"?`)) {
    await sidebarStore.removeWs(path)
  }
}

defineEmits<{ 'select-workspace': [path: string, name?: string] }>()

onMounted(() => { sidebarStore.loadWorkspaces() })
</script>
