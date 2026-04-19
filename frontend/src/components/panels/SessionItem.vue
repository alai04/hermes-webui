<template>
  <div
    class="session-item"
    :class="{ active, 'menu-open': menuOpen }"
    @click="$emit('select')"
  >
    <div class="session-title" :title="session.title || 'Untitled'">
      {{ session.title || 'Untitled' }}
    </div>
    <div class="session-meta">
      <span class="session-time">{{ formatRelativeTime(session.updated_at) }}</span>
      <span class="session-model">{{ getModelLabel(session.model) }}</span>
    </div>
    <div class="session-actions">
      <button
        class="session-action-btn"
        :class="{ active: session.pinned }"
        :title="session.pinned ? 'Unpin' : 'Pin'"
        @click.stop="sessionStore.togglePin(session.session_id)"
      >
        <svg v-if="session.pinned" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.4 12,14 8,11.5 4,14 5,9.4 1.5,6.2 6.2,5.8"/>
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
          <polygon points="8,2 9.8,6.2 14.2,6.2 10.7,9.2 12,13.8 8,11 4,13.8 5.3,9.2 1.8,6.2 6.2,6.2"/>
        </svg>
      </button>
      <button
        class="session-action-btn"
        title="More"
        @click.stop="toggleMenu"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.25"/>
          <circle cx="8" cy="8" r="1.25"/>
          <circle cx="8" cy="13" r="1.25"/>
        </svg>
      </button>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="menuOpen" class="session-action-menu" ref="menuRef">
        <button @click.stop="handlePinToggle">
          {{ session.pinned ? 'Unpin conversation' : 'Pin conversation' }}
        </button>
        <button @click.stop="handleArchiveToggle">
          {{ session.archived ? 'Restore conversation' : 'Archive conversation' }}
        </button>
        <button class="danger" @click.stop="handleDelete">
          Delete conversation
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SessionSummary } from '@/api'
import { useSessionStore } from '@/stores/sessions'
import { formatRelativeTime, getModelLabel } from '@/utils/markdown'

const props = defineProps<{
  session: SessionSummary
  active: boolean
}>()
defineEmits<{ select: [] }>()

const sessionStore = useSessionStore()
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

async function handlePinToggle() {
  menuOpen.value = false
  await sessionStore.togglePin(props.session.session_id)
}

async function handleArchiveToggle() {
  menuOpen.value = false
  await sessionStore.toggleArchive(props.session.session_id)
}

async function handleDelete() {
  menuOpen.value = false
  if (confirm('Delete this conversation? This cannot be undone.')) {
    await sessionStore.deleteSessionById(props.session.session_id)
  }
}

// Close menu on outside click
import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  document.addEventListener('click', () => { menuOpen.value = false })
})
onUnmounted(() => {
  document.removeEventListener('click', () => { menuOpen.value = false })
})
</script>
