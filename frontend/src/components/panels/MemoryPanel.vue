<template>
  <div class="panel-view" id="panelMemory">
    <div style="padding:8px 12px 4px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <span style="font-size:11px;color:var(--muted)">{{ t('personal_memory') }}</span>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="editing = !editing">
        ✏️ {{ t('edit') }}
      </button>
    </div>

    <div class="memory-panel" v-if="!editing && !memoryLoading">
      <div v-if="memoryData?.memory" class="memory-content" v-html="renderedMemory"></div>
      <div v-else style="color:var(--muted);font-size:12px">{{ t('no_notes_yet') }}</div>
    </div>
    <div v-else-if="memoryLoading" style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>

    <div v-if="editing" class="memory-edit-form">
      <textarea v-model="editContent" rows="10"></textarea>
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitSave">{{ t('save') }}</button>
        <button class="cron-btn" style="flex:1" @click="editing = false">{{ t('cancel') }}</button>
      </div>
      <div v-if="error" class="form-error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { t } from '@/composables/i18n'
import { renderMarkdown } from '@/utils/markdown'

const sidebarStore = useSidebarStore()
const editing = ref(false)
const editContent = ref('')
const error = ref('')

const memoryData = sidebarStore.memoryData
const memoryLoading = sidebarStore.memoryLoading

const renderedMemory = computed(() => {
  return memoryData.value?.memory ? renderMarkdown(memoryData.value.memory) : ''
})

function submitSave() {
  error.value = ''
  sidebarStore.saveMemory('memory', editContent.value)
    .then(() => { editing.value = false })
    .catch((e: any) => { error.value = e.message })
}

onMounted(() => {
  sidebarStore.loadMemory()
})
</script>
