<template>
  <div class="panel-view active" id="panelChat">
    <div class="sidebar-section">
      <button class="new-chat-btn" @click="handleNewChat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>{{ t('new_conversation') }}</span>
        <span style="font-size:10px;opacity:.5;margin-left:4px">⌘K</span>
      </button>
    </div>
    <div class="session-search">
      <input
        :placeholder="t('filter_conversations')"
        :value="searchQuery"
        @input="onSearch"
      />
    </div>
    <div class="session-list" ref="sessionListRef">
      <template v-if="pinnedSessions.length">
        <div class="session-group-header" @click="collapsed.pinned = !collapsed.pinned">
          <span>★ Pinned</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline :points="collapsed.pinned ? '9 18 15 12 9 6' : '6 9 12 15 18 9'"/>
          </svg>
        </div>
        <div v-show="!collapsed.pinned">
          <SessionItem
            v-for="s in pinnedSessions"
            :key="s.session_id"
            :session="s"
            :active="activeSessionId === s.session_id"
            @select="$emit('select-session', s.session_id)"
          />
        </div>
      </template>

      <template v-for="({ label, sessions }, idx) in groupedSessions" :key="label + idx">
        <div class="session-group-header" @click="collapsed[label] = !collapsed[label]">
          <span>{{ label }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline :points="collapsed[label] ? '9 18 15 12 9 6' : '6 9 12 15 18 9'"/>
          </svg>
        </div>
        <div v-show="!collapsed[label]">
          <SessionItem
            v-for="s in sessions"
            :key="s.session_id"
            :session="s"
            :active="activeSessionId === s.session_id"
            @select="$emit('select_session', s.session_id)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useSessionStore } from '@/stores/sessions'
import { t } from '@/composables/i18n'
import { formatRelativeTime } from '@/utils/markdown'
import SessionItem from './SessionItem.vue'

const sessionStore = useSessionStore()
const emit = defineEmits<{ 'select-session': [id: string] }>()

const searchQuery = computed({
  get: () => sessionStore.searchQuery,
  set: (v: string) => { sessionStore.searchQuery = v }
})

const pinnedSessions = computed(() => sessionStore.pinnedSessions)
const unpinnedSessions = computed(() => sessionStore.unpinnedSessions)
const activeSessionId = computed(() => sessionStore.activeSession?.session_id)

const collapsed = reactive<Record<string, boolean>>({})

const groupedSessions = computed(() => {
  const now = Date.now()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7))
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const groups: Record<string, typeof unpinnedSessions.value> = {}

  for (const s of unpinnedSessions.value) {
    const ts = s.updated_at * 1000
    let label: string
    if (ts >= startOfToday) label = t('session_time_bucket_today')
    else if (ts >= startOfYesterday) label = t('session_time_bucket_yesterday')
    else if (ts >= startOfWeek) label = t('session_time_bucket_this_week')
    else if (ts >= startOfLastWeek) label = t('session_time_bucket_last_week')
    else label = t('session_time_bucket_older')

    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  }

  return Object.entries(groups).map(([label, sessions]) => ({ label, sessions }))
})

function onSearch(e: Event) {
  sessionStore.searchQuery = (e.target as HTMLInputElement).value
}

async function handleNewChat() {
  await sessionStore.createSession()
  emit('select-session', sessionStore.activeSession!.session_id)
}
</script>
