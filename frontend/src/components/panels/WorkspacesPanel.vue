<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const sessionStore = useSessionStore()

interface Workspace {
  path: string
  name: string
}

const workspaces = ref<Workspace[]>([])
const loading = ref(false)
const error = ref('')
const addPath = ref('')
const addError = ref('')

// Rename state
const renamingPath = ref<string | null>(null)
const renameValue = ref('')

async function loadWorkspaces() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet('/api/workspaces')
    workspaces.value = data.workspaces ?? []
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function useWorkspace(ws: Workspace) {
  const session = sessionStore.currentSession
  if (!session) return
  try {
    await sessionStore.updateSession(session.session_id, ws.path, session.model ?? undefined)
  } catch (e: any) {
    alert(e.message)
  }
}

async function addWorkspace() {
  const path = addPath.value.trim()
  if (!path) return
  addError.value = ''
  try {
    const data = await apiPost('/api/workspaces/add', { path })
    workspaces.value = data.workspaces ?? workspaces.value
    addPath.value = ''
  } catch (e: any) {
    addError.value = e.message
  }
}

async function removeWorkspace(path: string) {
  if (!confirm(t('workspace_remove_confirm_message', { path }, `Remove workspace ${path}?`))) return
  try {
    const data = await apiPost('/api/workspaces/remove', { path })
    workspaces.value = data.workspaces ?? workspaces.value
  } catch (e: any) {
    alert(e.message)
  }
}

function startRename(ws: Workspace) {
  renamingPath.value = ws.path
  renameValue.value = ws.name
}

async function submitRename(path: string) {
  const name = renameValue.value.trim()
  if (!name) { renamingPath.value = null; return }
  try {
    const data = await apiPost('/api/workspaces/rename', { path, name })
    workspaces.value = data.workspaces ?? workspaces.value
  } catch (e: any) {
    alert(e.message)
  } finally {
    renamingPath.value = null
  }
}

onMounted(loadWorkspaces)
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Description -->
    <div style="padding:10px 12px 4px;font-size:11px;color:var(--muted);flex-shrink:0">
      {{ t('workspace_desc') }}
    </div>

    <!-- Content -->
    <div style="flex:1;overflow-y:auto;padding:0 12px 12px">
      <div v-if="loading" style="color:var(--muted);font-size:12px;padding:8px 0">{{ t('loading') }}</div>
      <div v-else-if="error" style="color:var(--accent);font-size:12px;padding:8px 0">{{ error }}</div>
      <template v-else>
        <!-- Workspace list -->
        <div v-for="ws in workspaces" :key="ws.path" class="ws-row" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div class="ws-row-info" style="flex:1;min-width:0">
            <!-- Rename inline -->
            <div v-if="renamingPath === ws.path" style="display:flex;gap:4px">
              <input
                v-model="renameValue"
                style="flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border2);border-radius:5px;color:var(--text);padding:3px 6px;font-size:12px;outline:none"
                @keyup.enter="submitRename(ws.path)"
                @keyup.escape="renamingPath = null"
              />
              <button class="ws-action-btn" @click="submitRename(ws.path)">✓</button>
              <button class="ws-action-btn" @click="renamingPath = null">✕</button>
            </div>
            <template v-else>
              <div
                class="ws-row-name"
                style="font-size:12px;font-weight:500;color:var(--text);cursor:pointer"
                :title="t('double_click_rename')"
                @dblclick="startRename(ws)"
              >{{ ws.name }}</div>
              <div class="ws-row-path" style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ws.path }}</div>
            </template>
          </div>
          <div class="ws-row-actions" style="display:flex;gap:4px;flex-shrink:0">
            <button
              class="ws-action-btn"
              :title="t('workspace_use_title', 'Use this workspace')"
              :class="{ active: sessionStore.currentSession?.workspace === ws.path }"
              @click="useWorkspace(ws)"
            >
              → {{ t('workspace_use') }}
            </button>
            <button class="ws-action-btn danger" :title="t('remove')" @click="removeWorkspace(ws.path)">✕</button>
          </div>
        </div>

        <!-- Add workspace row -->
        <div class="ws-add-row" style="display:flex;gap:6px;margin-top:10px">
          <input
            v-model="addPath"
            :placeholder="t('workspace_add_path_placeholder', 'Enter workspace path...')"
            style="flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border2);border-radius:7px;color:var(--text);padding:7px 10px;font-size:12px;outline:none"
            @keyup.enter="addWorkspace"
          />
          <button class="ws-action-btn" @click="addWorkspace">+ {{ t('add') }}</button>
        </div>
        <div v-if="addError" style="font-size:11px;color:var(--accent);margin-top:4px">{{ addError }}</div>
        <div style="font-size:11px;color:var(--muted);padding:4px 0 8px">
          {{ t('workspace_paths_validated_hint', 'Paths are validated when added.') }}
        </div>
      </template>
    </div>
  </div>
</template>
