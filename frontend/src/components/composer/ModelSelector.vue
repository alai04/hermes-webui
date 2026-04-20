<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'

const emit = defineEmits<{
  (e: 'model-change', model: string): void
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()

interface ModelEntry {
  id: string
  name?: string
  provider?: string
}

const models = ref<ModelEntry[]>([])
const isOpen = ref(false)
const searchQuery = ref('')
const customModel = ref('')
const showCustomInput = ref(false)
const dropdownEl = ref<HTMLElement | null>(null)

const currentModel = computed(() => {
  return sessionStore.currentSession?.model ?? ''
})

const currentModelLabel = computed(() => {
  const m = models.value.find((x) => x.id === currentModel.value)
  if (m?.name) return m.name
  if (currentModel.value) {
    // Show just the model part after the last slash
    return currentModel.value.split('/').pop() ?? currentModel.value
  }
  return 'Model'
})

// Group models by provider
const groupedModels = computed(() => {
  const filtered = models.value.filter((m) => {
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (m.id + (m.name ?? '') + (m.provider ?? '')).toLowerCase().includes(q)
  })
  const groups: Record<string, ModelEntry[]> = {}
  for (const m of filtered) {
    const provider = m.provider ?? m.id.split('/')[0] ?? 'Other'
    if (!groups[provider]) groups[provider] = []
    groups[provider].push(m)
  }
  return groups
})

const hasResults = computed(() => {
  return Object.keys(groupedModels.value).length > 0
})

async function loadModels() {
  try {
    const res = await fetch('/api/models', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      const raw = data.models ?? data
      models.value = normalizeModels(raw)
    }
  } catch { /* ignore */ }

  // Try live endpoint in background
  try {
    const res2 = await fetch('/api/models/live', { credentials: 'include' })
    if (res2.ok) {
      const data2 = await res2.json()
      const live = data2.models ?? data2
      if (normalizeModels(live).length > 0) models.value = normalizeModels(live)
    }
  } catch { /* ignore */ }
}

function normalizeModels(raw: unknown): ModelEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((m: any) => {
    if (typeof m === 'string') return { id: m }
    if (typeof m === 'object' && m != null) return { id: m.id ?? m.model ?? '', name: m.name ?? m.display_name, provider: m.provider }
    return { id: '' }
  }).filter((m) => !!m.id)
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    showCustomInput.value = false
  }
}

function selectModel(id: string) {
  emit('model-change', id)
  if (sessionStore.currentSession) {
    sessionStore.currentSession = { ...sessionStore.currentSession, model: id }
  }
  isOpen.value = false
}

function selectCustom() {
  if (customModel.value.trim()) {
    selectModel(customModel.value.trim())
  }
}

function onClickOutside(e: MouseEvent) {
  if (dropdownEl.value && !dropdownEl.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  loadModels()
  document.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div class="composer-model-wrap" ref="dropdownEl">
    <button
      class="composer-model-chip"
      :class="{ active: isOpen }"
      type="button"
      :title="t('settings_label_model')"
      @click="toggleDropdown"
    >
      <span class="composer-model-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <path d="M15 2v2"/><path d="M15 20v2"/>
          <path d="M2 15h2"/><path d="M2 9h2"/>
          <path d="M20 15h2"/><path d="M20 9h2"/>
          <path d="M9 2v2"/><path d="M9 20v2"/>
        </svg>
      </span>
      <span class="composer-model-label">{{ currentModelLabel }}</span>
      <span class="composer-model-chevron" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="model-dropdown open">
      <div class="model-dropdown-search">
        <input
          type="text"
          class="model-search-input"
          v-model="searchQuery"
          :placeholder="t('model_search_placeholder')"
          autofocus
          @keydown.escape="isOpen = false"
        />
      </div>

      <div v-if="hasResults" class="model-list">
        <template v-for="(group, provider) in groupedModels" :key="provider">
          <div class="model-group-label">{{ provider }}</div>
          <button
            v-for="m in group"
            :key="m.id"
            class="model-item"
            :class="{ active: m.id === currentModel }"
            type="button"
            @click="selectModel(m.id)"
          >
            {{ m.name ?? m.id.split('/').pop() ?? m.id }}
          </button>
        </template>
      </div>
      <div v-else class="model-no-results">{{ t('model_search_no_results') }}</div>

      <!-- Custom model -->
      <div class="model-custom-section">
        <button
          v-if="!showCustomInput"
          class="model-item model-custom-toggle"
          type="button"
          @click="showCustomInput = true"
        >
          + {{ t('model_custom_label') }}
        </button>
        <div v-else class="model-custom-input-wrap">
          <input
            type="text"
            class="model-custom-input"
            v-model="customModel"
            :placeholder="t('model_custom_placeholder')"
            @keydown.enter="selectCustom"
            @keydown.escape="showCustomInput = false"
          />
          <button class="model-custom-send" type="button" @click="selectCustom">&#8629;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-dropdown-search {
  padding: 8px 10px 4px;
  border-bottom: 1px solid var(--border2, rgba(255,255,255,0.08));
}
.model-search-input {
  width: 100%;
  background: var(--input-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  box-sizing: border-box;
}
.model-search-input:focus {
  border-color: var(--accent);
}
.model-list {
  padding: 4px 0;
  max-height: 220px;
  overflow-y: auto;
}
.model-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 6px 12px 2px;
}
.model-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  font-size: 13px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.1s;
}
.model-item:hover,
.model-item.active {
  background: rgba(255,255,255,0.07);
}
.model-item.active {
  color: var(--accent-text, #7cb9ff);
  font-weight: 600;
}
.model-no-results {
  padding: 12px 14px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}
.model-custom-section {
  border-top: 1px solid var(--border2, rgba(255,255,255,0.08));
  padding: 4px 0;
}
.model-custom-toggle {
  font-style: italic;
  color: var(--muted) !important;
  font-size: 12px;
}
.model-custom-input-wrap {
  display: flex;
  gap: 4px;
  padding: 6px 10px;
}
.model-custom-input {
  flex: 1;
  background: var(--input-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 4px 8px;
  outline: none;
}
.model-custom-input:focus {
  border-color: var(--accent);
}
.model-custom-send {
  background: var(--accent-bg);
  border: 1px solid var(--accent-bg-strong);
  border-radius: 5px;
  color: var(--accent-text, #7cb9ff);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
}
</style>
