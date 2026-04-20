<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore, type SessionCompact } from '@/stores/session'
import SessionMenu from './SessionMenu.vue'

const props = defineProps<{
  session: SessionCompact
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()

const isHovered = ref(false)
const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const isActive = computed(
  () => sessionStore.currentSession?.session_id === props.session.session_id
)

// Inline rename state
const renaming = ref(false)
const renameValue = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

function formatTimeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts * 1000) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  const days = Math.floor(secs / 86400)
  if (days < 7) return `${days}d ago`
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const timeAgo = computed(() =>
  formatTimeAgo(props.session.updated_at || props.session.created_at)
)

const messageCount = computed(() => props.session.message_count ?? 0)

function handleClick() {
  if (renaming.value) return
  sessionStore.loadSession(props.session.session_id)
}

function openMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
}

function closeMenu() {
  menuVisible.value = false
}

async function startRename() {
  renaming.value = true
  renameValue.value = props.session.title || ''
  await nextTick()
  renameInputRef.value?.select()
}

async function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const newTitle = renameValue.value.trim()
  if (newTitle && newTitle !== props.session.title) {
    try {
      await sessionStore.renameSession(props.session.session_id, newTitle)
    } catch {
      // rename failed — ignore
    }
  }
}

function cancelRename() {
  renaming.value = false
}

function onRenameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') commitRename()
  else if (e.key === 'Escape') cancelRename()
}
</script>

<template>
  <div
    class="session-item"
    :class="{ active: isActive, 'menu-open': menuVisible }"
    role="button"
    :tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick.stop
  >
    <!-- Pin indicator -->
    <span v-if="session.pinned" class="session-pin" :title="t('tab_todos')" aria-hidden="true">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" stroke="none">
        <polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.4 12,14 8,11.5 4,14 5,9.4 1.5,6.2 6.2,5.8" />
      </svg>
    </span>

    <!-- Content -->
    <div class="session-item-body">
      <!-- Title (inline rename on dblclick) -->
      <input
        v-if="renaming"
        ref="renameInputRef"
        v-model="renameValue"
        class="session-rename-input"
        type="text"
        @blur="commitRename"
        @keydown="onRenameKeydown"
        @click.stop
        @dblclick.stop
      />
      <div
        v-else
        class="session-title"
        @dblclick.stop="startRename"
      >
        {{ session.title || t('untitled') }}
      </div>

      <div class="session-meta">
        <span class="session-time">{{ timeAgo }}</span>
        <span v-if="messageCount > 0" class="session-count">
          {{ messageCount }}
        </span>
        <!-- Project chip -->
        <span v-if="session.project_id" class="session-project-chip">
          <span class="project-dot" aria-hidden="true" />
          {{ session.project_id }}
        </span>
      </div>
    </div>

    <!-- 3-dot menu button (shown on hover or menu open) -->
    <button
      v-show="isHovered || menuVisible || isActive"
      class="session-more-btn icon-btn"
      :aria-label="t('edit')"
      @click.stop="openMenu"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true">
        <circle cx="8" cy="3" r="1.25" />
        <circle cx="8" cy="8" r="1.25" />
        <circle cx="8" cy="13" r="1.25" />
      </svg>
    </button>

    <!-- Context menu -->
    <SessionMenu
      v-if="menuVisible"
      :session="session"
      :x="menuX"
      :y="menuY"
      @close="closeMenu"
    />
  </div>
</template>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 12px;
  cursor: pointer;
  border-radius: 7px;
  margin: 1px 6px;
  transition: background 0.12s;
  position: relative;
  min-height: 44px;
}

.session-item:hover,
.session-item.menu-open {
  background: var(--surface2, rgba(255, 255, 255, 0.05));
}

.session-item.active {
  background: var(--surface3, rgba(255, 255, 255, 0.08));
}

.session-pin {
  color: var(--accent, #e05c3a);
  flex-shrink: 0;
  line-height: 1;
}

.session-item-body {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 12px;
  color: var(--text, #e8e8e8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.session-rename-input {
  width: 100%;
  background: var(--surface3, rgba(255, 255, 255, 0.08));
  border: 1px solid var(--accent, #e05c3a);
  border-radius: 4px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  padding: 2px 6px;
  outline: none;
  box-sizing: border-box;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.session-time {
  font-size: 10px;
  color: var(--muted, #888);
  opacity: 0.7;
}

.session-count {
  font-size: 10px;
  color: var(--muted, #888);
  opacity: 0.5;
}

.session-project-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--muted, #888);
  background: var(--surface2, rgba(255, 255, 255, 0.05));
  border-radius: 10px;
  padding: 1px 5px;
}

.project-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent, #e05c3a);
  flex-shrink: 0;
}

.session-more-btn {
  flex-shrink: 0;
  opacity: 0.6;
  transition: opacity 0.12s;
  padding: 3px;
  border-radius: 4px;
}

.session-more-btn:hover {
  opacity: 1;
  background: var(--surface3, rgba(255, 255, 255, 0.08));
}
</style>
