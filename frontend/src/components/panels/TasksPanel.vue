<template>
  <div class="panel-view" id="panelTasks">
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:11px;color:var(--muted)">{{ t('scheduled_jobs') }}</div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="showForm = !showForm">
        + {{ t('new_job') }}
      </button>
    </div>

    <div v-if="showForm" class="cron-create-form">
      <input v-model="form.name" :placeholder="'Job name (optional)'" />
      <input v-model="form.schedule" :placeholder="t('cron_schedule_placeholder')" required />
      <textarea v-model="form.prompt" rows="3" :placeholder="t('cron_prompt_placeholder')" required></textarea>
      <select v-model="form.deliver">
        <option value="local">Local (save output only)</option>
        <option value="discord">Discord</option>
        <option value="telegram">Telegram</option>
      </select>
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitCreate">{{ t('create_job') }}</button>
        <button class="cron-btn" style="flex:1" @click="showForm = false">{{ t('cancel') }}</button>
      </div>
      <div v-if="formError" class="form-error">{{ formError }}</div>
    </div>

    <div class="cron-list" v-if="!isLoading">
      <div v-if="!jobs.length" style="padding:16px;color:var(--muted);font-size:12px">
        {{ t('cron_no_jobs') }}
      </div>
      <div v-for="job in jobs" :key="job.id" class="cron-item">
        <div class="cron-header" @click="job.expanded = !job.expanded">
          <span class="cron-name">{{ job.name }}</span>
          <span class="cron-status" :class="getJobStatusClass(job)">{{ getJobStatusLabel(job) }}</span>
        </div>
        <div v-if="job.expanded" class="cron-body">
          <div class="cron-schedule">{{ job.schedule }}</div>
          <div class="cron-prompt">{{ (job.prompt || '').slice(0, 200) }}</div>
          <div class="cron-actions">
            <button class="cron-btn run" @click="cronStore.runNow(job.id)">{{ t('cron_run_now') }}</button>
            <button class="cron-btn" @click="cronStore.togglePause(job.id, job.state !== 'paused')">{{ job.state === 'paused' ? t('cron_resume') : t('cron_pause') }}</button>
            <button class="cron-btn" @click="handleDelete(job.id)">{{ t('delete_title') }}</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCronStore } from '@/stores/cron'
import { t } from '@/composables/i18n'

const cronStore = useCronStore()
const showForm = ref(false)
const form = ref({ name: '', schedule: '', prompt: '', deliver: 'local' })
const formError = ref('')

const jobs = cronStore.jobs
const isLoading = cronStore.isLoading

function getJobStatusClass(job: any) {
  if (job.enabled === false) return 'disabled'
  if (job.state === 'paused') return 'paused'
  if (job.last_status === 'error') return 'error'
  return 'active'
}

function getJobStatusLabel(job: any) {
  if (job.enabled === false) return t('cron_status_off')
  if (job.state === 'paused') return t('cron_status_paused')
  if (job.last_status === 'error') return t('cron_status_error')
  return t('cron_status_active')
}

async function submitCreate() {
  formError.value = ''
  if (!form.value.schedule) { formError.value = t('cron_schedule_required'); return }
  if (!form.value.prompt) { formError.value = t('cron_prompt_required'); return }
  try {
    await cronStore.createJob(form.value)
    showForm.value = false
    form.value = { name: '', schedule: '', prompt: '', deliver: 'local' }
  } catch (e: any) {
    formError.value = e.message
  }
}

async function handleDelete(id: string) {
  if (confirm('Delete this job? This cannot be undone.')) {
    await cronStore.removeJob(id)
  }
}

onMounted(() => { cronStore.loadCrons() })
</script>
