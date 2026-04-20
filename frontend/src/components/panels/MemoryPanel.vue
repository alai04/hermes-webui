<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'
import { renderMarkdown } from '@/utils/markdown'

const { t } = useI18n()

type MemoryTab = 'memory' | 'user'

const activeTab = ref<MemoryTab>('memory')
const memoryContent = ref('')
const userContent = ref('')
const loading = ref(false)
const error = ref('')

// Edit state
const editingSection = ref<MemoryTab | null>(null)
const editContent = ref('')
const editError = ref('')
const saving = ref(false)

async function loadMemory(force = false) {
  if (loading.value && !force) return
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet('/api/memory')
    memoryContent.value = data.memory ?? ''
    userContent.value = data.user ?? ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function startEdit(section: MemoryTab) {
  editingSection.value = section
  editContent.value = section === 'memory' ? memoryContent.value : userContent.value
  editError.value = ''
}

function cancelEdit() {
  editingSection.value = null
  editContent.value = ''
  editError.value = ''
}

async function saveEdit() {
  if (!editingSection.value) return
  saving.value = true
  editError.value = ''
  try {
    await apiPost('/api/memory/write', { section: editingSection.value, content: editContent.value })
    if (editingSection.value === 'memory') {
      memoryContent.value = editContent.value
    } else {
      userContent.value = editContent.value
    }
    editingSection.value = null
  } catch (e: any) {
    editError.value = e.message
  } finally {
    saving.value = false
  }
}

function currentContent(): string {
  return activeTab.value === 'memory' ? memoryContent.value : userContent.value
}

onMounted(loadMemory)
</script>

<template>
  <div class="memory-panel" style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
      <button
        :class="['nav-tab', { active: activeTab === 'memory' }]"
        style="flex:1;padding:8px 12px;font-size:11px;background:none;border:none;cursor:pointer;color:var(--muted)"
        :style="activeTab === 'memory' ? 'color:var(--text);border-bottom:2px solid var(--accent)' : ''"
        @click="activeTab = 'memory'"
      >
        {{ t('my_notes') }}
      </button>
      <button
        :class="['nav-tab', { active: activeTab === 'user' }]"
        style="flex:1;padding:8px 12px;font-size:11px;background:none;border:none;cursor:pointer;color:var(--muted)"
        :style="activeTab === 'user' ? 'color:var(--text);border-bottom:2px solid var(--accent)' : ''"
        @click="activeTab = 'user'"
      >
        {{ t('user_profile') }}
      </button>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" style="padding:12px;color:var(--muted);font-size:12px;flex-shrink:0">{{ t('loading') }}</div>
    <div v-else-if="error" style="padding:12px;color:var(--accent);font-size:12px;flex-shrink:0">{{ error }}</div>

    <!-- Content area -->
    <template v-else>
      <!-- Edit form -->
      <div v-if="editingSection === activeTab" style="flex:1;display:flex;flex-direction:column;padding:8px 12px;overflow:hidden">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">
          {{ t('editing') }}: {{ activeTab === 'memory' ? t('memory_notes_label') : t('user_profile') }}
        </div>
        <textarea
          v-model="editContent"
          style="flex:1;width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:11px;outline:none;resize:none;font-family:'SF Mono',ui-monospace,monospace;box-sizing:border-box;line-height:1.5;min-height:0"
        />
        <div style="display:flex;gap:6px;margin-top:6px;flex-shrink:0">
          <button class="cron-btn run" style="flex:1" :disabled="saving" @click="saveEdit">
            {{ saving ? t('saving', 'Saving…') : t('save') }}
          </button>
          <button class="cron-btn" style="flex:1" @click="cancelEdit">{{ t('cancel') }}</button>
        </div>
        <div v-if="editError" style="font-size:11px;color:var(--accent);margin-top:6px">{{ editError }}</div>
      </div>

      <!-- Read-only view -->
      <div v-else style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:6px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <span style="font-size:11px;color:var(--muted)">
            {{ activeTab === 'memory' ? t('memory_notes_label') : t('user_profile') }}
          </span>
          <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="startEdit(activeTab)">
            ✎ {{ t('edit') }}
          </button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:0 12px 12px">
          <div
            v-if="!currentContent()"
            style="color:var(--muted);font-size:12px;padding:4px 0"
          >
            {{ activeTab === 'memory' ? t('no_notes_yet') : t('no_profile_yet') }}
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-else
            class="preview-area"
            style="font-size:13px;line-height:1.6"
            v-html="renderMarkdown(currentContent())"
          />
        </div>
      </div>
    </template>
  </div>
</template>
