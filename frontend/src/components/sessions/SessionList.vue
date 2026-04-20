<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore, type SessionCompact } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import SessionItem from './SessionItem.vue'

const { t } = useI18n()
const sessionStore = useSessionStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')

// Time bucket helpers
function now() {
  return Date.now()
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const TODAY_START = startOfDay(now())
const YESTERDAY_START = TODAY_START - 86400000
const WEEK_START = TODAY_START - 6 * 86400000
const LAST_WEEK_START = WEEK_START - 7 * 86400000

type Bucket = 'pinned' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'older'

function getBucket(session: SessionCompact): Bucket {
  if (session.pinned) return 'pinned'
  const ts = (session.updated_at || session.created_at || 0) * 1000
  if (ts >= TODAY_START) return 'today'
  if (ts >= YESTERDAY_START) return 'yesterday'
  if (ts >= WEEK_START) return 'this_week'
  if (ts >= LAST_WEEK_START) return 'last_week'
  return 'older'
}

const BUCKET_LABELS: Record<Bucket, string> = {
  pinned: 'Pinned',
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  last_week: 'Last week',
  older: 'Older',
}

interface BucketGroup {
  bucket: Bucket
  label: string
  sessions: SessionCompact[]
}

const filteredSessions = computed<SessionCompact[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = sessionStore.sessionList.filter((s) => !s.archived)
  if (!q) return list
  return list.filter((s) => s.title?.toLowerCase().includes(q))
})

const groupedSessions = computed<BucketGroup[]>(() => {
  const buckets = new Map<Bucket, SessionCompact[]>()
  const bucketOrder: Bucket[] = ['pinned', 'today', 'yesterday', 'this_week', 'last_week', 'older']

  for (const s of filteredSessions.value) {
    const b = getBucket(s)
    if (!buckets.has(b)) buckets.set(b, [])
    buckets.get(b)!.push(s)
  }

  const groups: BucketGroup[] = []
  for (const b of bucketOrder) {
    const sessions = buckets.get(b)
    if (sessions && sessions.length > 0) {
      groups.push({ bucket: b, label: BUCKET_LABELS[b], sessions })
    }
  }
  return groups
})

// CLI session count display
const cliSessionCount = computed(() => {
  if (!settingsStore.showCliSessions) return 0
  // CLI sessions would be included in sessionList if backend returns them
  // Count sessions that were created outside the UI (heuristic: no title or title starts with 'claude')
  return 0
})

async function handleNewSession() {
  await sessionStore.newSession()
}

onMounted(async () => {
  try {
    await sessionStore.fetchSessions()
  } catch {
    // Sessions load failed
  }
})
</script>

<template>
  <div class="panel-sessions">
    <!-- New conversation button -->
    <div class="sidebar-section">
      <button class="new-chat-btn" @click="handleNewSession">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>{{ t('new_conversation') }}</span>
        <span class="new-chat-hint">Cmd+K</span>
      </button>
    </div>

    <!-- Search input -->
    <div class="session-search">
      <input
        v-model="searchQuery"
        :placeholder="t('filter_conversations')"
        class="session-search-input"
        type="search"
        autocomplete="off"
      />
    </div>

    <!-- Session list -->
    <div class="session-list">
      <template v-if="groupedSessions.length > 0">
        <template v-for="group in groupedSessions" :key="group.bucket">
          <div class="session-bucket-label">{{ group.label }}</div>
          <SessionItem
            v-for="session in group.sessions"
            :key="session.session_id"
            :session="session"
          />
        </template>
      </template>
      <div v-else class="session-empty">
        <span v-if="searchQuery">{{ t('skills_no_match') }}</span>
        <span v-else>{{ t('new_conversation') }}</span>
      </div>

      <!-- CLI session count -->
      <div v-if="settingsStore.showCliSessions && cliSessionCount > 0" class="cli-session-count">
        + {{ cliSessionCount }} {{ t('tab_tasks') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-sessions {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-section {
  padding: 8px 10px;
  flex-shrink: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 10px;
  background: var(--surface2, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.new-chat-btn:hover {
  background: var(--surface3, rgba(255, 255, 255, 0.08));
}

.new-chat-hint {
  font-size: 10px;
  opacity: 0.45;
  margin-left: auto;
}

.session-search {
  padding: 0 10px 6px;
  flex-shrink: 0;
}

.session-search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 7px;
  color: var(--text, #e8e8e8);
  font-size: 12px;
  padding: 5px 9px;
  outline: none;
  box-sizing: border-box;
}

.session-search-input::placeholder {
  color: var(--muted, #888);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 8px;
}

.session-bucket-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px 3px;
  opacity: 0.6;
}

.session-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--muted, #888);
}

.cli-session-count {
  padding: 6px 12px;
  font-size: 10px;
  color: var(--muted, #888);
  opacity: 0.6;
}
</style>
