<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore, type SessionCompact } from '@/stores/session'
import AppDialog from '@/components/shared/AppDialog.vue'

const props = defineProps<{
  session: SessionCompact
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()

const menuRef = ref<HTMLElement | null>(null)
const showDeleteDialog = ref(false)

// Computed position — clamp to viewport on mount
const left = ref(props.x)
const top = ref(props.y)

onMounted(() => {
  if (!menuRef.value) return
  const rect = menuRef.value.getBoundingClientRect()
  const vpW = window.innerWidth
  const vpH = window.innerHeight
  let l = props.x
  let t_ = props.y
  if (l + rect.width > vpW - 8) l = vpW - rect.width - 8
  if (l < 8) l = 8
  if (t_ + rect.height > vpH - 8) t_ = vpH - rect.height - 8
  if (t_ < 8) t_ = 8
  left.value = l
  top.value = t_

  // Close on outside click
  document.addEventListener('mousedown', onOutsideClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onKeydown)
})

function onOutsideClick(e: MouseEvent) {
  if (!menuRef.value?.contains(e.target as Node)) {
    emit('close')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

async function handlePin() {
  emit('close')
  try {
    await sessionStore.pinSession(props.session.session_id, !props.session.pinned)
  } catch {
    // ignore
  }
}

async function handleArchive() {
  emit('close')
  try {
    await sessionStore.archiveSession(props.session.session_id, !props.session.archived)
  } catch {
    // ignore
  }
}

function handleDeleteIntent() {
  showDeleteDialog.value = true
}

async function handleDeleteConfirm() {
  showDeleteDialog.value = false
  try {
    await sessionStore.deleteSession(props.session.session_id)
  } catch (err) {
    console.error('[SessionMenu] delete failed:', err)
  }
  emit('close')
}

function handleDeleteCancel() {
  showDeleteDialog.value = false
}

function handleExport() {
  const url = `/api/session/export?session_id=${encodeURIComponent(props.session.session_id)}`
  window.open(url, '_blank')
  emit('close')
}
</script>

<template>
  <!-- Delete confirmation dialog -->
  <AppDialog
    :show="showDeleteDialog"
    :title="t('delete_title')"
    :message="t('delete_confirm', { name: session.title || t('untitled') })"
    :confirm-label="t('delete_title')"
    :cancel-label="t('cancel')"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />

  <!-- Context menu -->
  <Teleport to="body">
    <div
      ref="menuRef"
      class="session-action-menu"
      role="menu"
      :style="{ left: left + 'px', top: top + 'px' }"
    >
      <!-- Pin / Unpin -->
      <button class="session-action-opt" role="menuitem" @click="handlePin">
        <span class="ws-opt-icon" aria-hidden="true">
          <svg v-if="session.pinned" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
            <polygon points="8,2 9.8,6.2 14.2,6.2 10.7,9.2 12,13.8 8,11 4,13.8 5.3,9.2 1.8,6.2 6.2,6.2" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none">
            <polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.4 12,14 8,11.5 4,14 5,9.4 1.5,6.2 6.2,5.8" />
          </svg>
        </span>
        <span>{{ session.pinned ? t('no_workspace') : t('tab_todos') }}</span>
      </button>

      <!-- Archive / Unarchive -->
      <button class="session-action-opt" role="menuitem" @click="handleArchive">
        <span class="ws-opt-icon" aria-hidden="true">
          <svg v-if="session.archived" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="1.5" y="2" width="13" height="3" rx="1" />
            <path d="M2.5 5v8h11V5" />
            <polyline points="6.5,7 8,5.5 9.5,7" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="1.5" y="2" width="13" height="3" rx="1" />
            <path d="M2.5 5v8h11V5" />
            <line x1="6" y1="8.5" x2="10" y2="8.5" />
          </svg>
        </span>
        <span>{{ session.archived ? t('workspace_desc') : t('import') }}</span>
      </button>

      <!-- Export -->
      <button class="session-action-opt" role="menuitem" @click="handleExport">
        <span class="ws-opt-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="4.5" y="4.5" width="8.5" height="8.5" rx="1.5" />
            <path d="M3 11.5V3h8.5" />
          </svg>
        </span>
        <span>{{ t('transcript') }}</span>
      </button>

      <div class="session-menu-divider" role="separator" />

      <!-- Delete -->
      <button class="session-action-opt session-action-danger" role="menuitem" @click="handleDeleteIntent">
        <span class="ws-opt-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M4.5 4.5v8.5h7v-8.5" />
            <line x1="7" y1="7" x2="7" y2="11" />
            <line x1="9" y1="7" x2="9" y2="11" />
          </svg>
        </span>
        <span>{{ t('delete_title') }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.session-action-menu {
  position: fixed;
  z-index: 1000;
  background: var(--surface2, #1c1c1c);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 9px;
  padding: 5px;
  min-width: 200px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.session-action-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.session-action-opt:hover {
  background: var(--surface3, rgba(255, 255, 255, 0.07));
}

.session-action-danger {
  color: var(--accent, #e05c3a);
}

.ws-opt-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.7;
}

.session-menu-divider {
  height: 1px;
  background: var(--border, rgba(255, 255, 255, 0.08));
  margin: 4px 5px;
}
</style>
