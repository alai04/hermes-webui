<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'

const { t } = useI18n()

interface CronJob {
  id: string
  name: string
  schedule: string | { expression?: string }
  schedule_display?: string
  prompt: string
  deliver?: string
  skills?: string[]
  enabled?: boolean
  state?: string
  last_status?: string
  next_run_at?: string
  last_run_at?: string
}

interface Skill {
  name: string
  category?: string
  description?: string
}

const jobs = ref<CronJob[]>([])
const loading = ref(false)
const error = ref('')
const showCreateForm = ref(false)
const expandedJobs = ref<Set<string>>(new Set())
const editingJobId = ref<string | null>(null)

// Create form state
const createName = ref('')
const createSchedule = ref('')
const createPrompt = ref('')
const createDeliver = ref('local')
const createSelectedSkills = ref<string[]>([])
const createSkillSearch = ref('')
const createSkillDropdown = ref<Skill[]>([])
const createError = ref('')
const skillsCache = ref<Skill[] | null>(null)

// Edit form state (per-job inline)
const editForms = ref<Record<string, { name: string; schedule: string; prompt: string; error: string }>>({})

// Output state
const jobOutputs = ref<Record<string, string>>({})
const jobHistories = ref<Record<string, { ts: string; snippet: string }[]>>({})
const showHistory = ref<Set<string>>(new Set())

async function loadCrons() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet('/api/crons')
    jobs.value = data.jobs ?? []
    // Load outputs for all jobs
    for (const job of jobs.value) {
      loadCronOutput(job.id)
    }
  } catch (e: any) {
    error.value = e.message ?? 'Failed to load jobs'
  } finally {
    loading.value = false
  }
}

async function loadCronOutput(jobId: string) {
  try {
    const data = await apiGet('/api/crons/output', { job_id: jobId, limit: '1' })
    if (!data.outputs?.length) {
      jobOutputs.value[jobId] = t('cron_no_runs_yet', 'No runs yet')
      return
    }
    const out = data.outputs[0]
    const ts = (out.filename as string).replace('.md', '').replace(/_/g, ' ')
    const snippet = extractOutputSnippet(out.content as string)
    jobOutputs.value[jobId] = ts + '\n\n' + snippet
  } catch {
    // ignore
  }
}

async function loadCronHistory(jobId: string) {
  if (showHistory.value.has(jobId)) {
    showHistory.value.delete(jobId)
    return
  }
  try {
    const data = await apiGet('/api/crons/output', { job_id: jobId, limit: '20' })
    const entries = (data.outputs ?? []).map((out: any) => ({
      ts: (out.filename as string).replace('.md', '').replace(/_/g, ' '),
      snippet: extractOutputSnippet(out.content as string),
    }))
    jobHistories.value[jobId] = entries
    showHistory.value.add(jobId)
  } catch {
    // ignore
  }
}

function extractOutputSnippet(content: string): string {
  const lines = content.split('\n')
  const idx = lines.findIndex((l) => l.startsWith('## Response') || l.startsWith('# Response'))
  const body = (idx >= 0 ? lines.slice(idx + 1) : lines).join('\n').trim()
  return body.slice(0, 600) || '(empty)'
}

function getStatusClass(job: CronJob): string {
  if (job.enabled === false) return 'disabled'
  if (job.state === 'paused') return 'paused'
  if (job.last_status === 'error') return 'error'
  return 'active'
}

function getStatusLabel(job: CronJob): string {
  if (job.enabled === false) return t('cron_status_off')
  if (job.state === 'paused') return t('cron_status_paused')
  if (job.last_status === 'error') return t('cron_status_error')
  return t('cron_status_active')
}

function getScheduleDisplay(job: CronJob): string {
  if (job.schedule_display) return job.schedule_display
  if (typeof job.schedule === 'string') return job.schedule
  return job.schedule?.expression ?? ''
}

function formatDate(ts?: string): string {
  if (!ts) return t('never', 'Never')
  try { return new Date(ts).toLocaleString() } catch { return ts }
}

function toggleJob(id: string) {
  if (expandedJobs.value.has(id)) {
    expandedJobs.value.delete(id)
  } else {
    expandedJobs.value.add(id)
  }
}

async function runJob(id: string) {
  try {
    await apiPost('/api/crons/run', { job_id: id })
    setTimeout(() => loadCronOutput(id), 5000)
  } catch (e: any) {
    alert(e.message)
  }
}

async function pauseJob(id: string) {
  try {
    await apiPost('/api/crons/pause', { job_id: id })
    await loadCrons()
  } catch (e: any) {
    alert(e.message)
  }
}

async function resumeJob(id: string) {
  try {
    await apiPost('/api/crons/resume', { job_id: id })
    await loadCrons()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteJob(id: string) {
  if (!confirm(t('cron_delete_confirm_message'))) return
  try {
    await apiPost('/api/crons/delete', { job_id: id })
    await loadCrons()
  } catch (e: any) {
    alert(e.message)
  }
}

function openEditForm(job: CronJob) {
  editForms.value[job.id] = {
    name: job.name ?? '',
    schedule: getScheduleDisplay(job),
    prompt: job.prompt ?? '',
    error: '',
  }
  editingJobId.value = job.id
}

function closeEditForm(id: string) {
  delete editForms.value[id]
  if (editingJobId.value === id) editingJobId.value = null
}

async function saveEditForm(id: string) {
  const form = editForms.value[id]
  if (!form) return
  if (!form.schedule.trim()) { form.error = t('cron_schedule_required', 'Schedule required'); return }
  if (!form.prompt.trim()) { form.error = t('cron_prompt_required', 'Prompt required'); return }
  form.error = ''
  try {
    const updates: Record<string, string> = { job_id: id, schedule: form.schedule, prompt: form.prompt }
    if (form.name.trim()) updates.name = form.name
    await apiPost('/api/crons/update', updates)
    closeEditForm(id)
    await loadCrons()
  } catch (e: any) {
    form.error = e.message
  }
}

// Create form
async function loadSkillsCache() {
  if (skillsCache.value) return
  try {
    const data = await apiGet('/api/skills')
    skillsCache.value = data.skills ?? []
  } catch { skillsCache.value = [] }
}

function blurSkillSearch() { setTimeout(() => { createSkillDropdown.value = [] }, 150) }

function onSkillSearchInput() {
  const q = createSkillSearch.value.trim().toLowerCase()
  if (!q || !skillsCache.value) { createSkillDropdown.value = []; return }
  createSkillDropdown.value = skillsCache.value
    .filter((s) => !createSelectedSkills.value.includes(s.name) &&
      (s.name.toLowerCase().includes(q) || (s.category ?? '').toLowerCase().includes(q)))
    .slice(0, 8)
}

function selectSkill(name: string) {
  createSelectedSkills.value.push(name)
  createSkillSearch.value = ''
  createSkillDropdown.value = []
}

function removeSkill(name: string) {
  createSelectedSkills.value = createSelectedSkills.value.filter((s) => s !== name)
}

function toggleCreateForm() {
  showCreateForm.value = !showCreateForm.value
  if (showCreateForm.value) {
    createName.value = ''
    createSchedule.value = ''
    createPrompt.value = ''
    createDeliver.value = 'local'
    createSelectedSkills.value = []
    createSkillSearch.value = ''
    createSkillDropdown.value = []
    createError.value = ''
    skillsCache.value = null
    loadSkillsCache()
  }
}

async function submitCreate() {
  if (!createSchedule.value.trim()) { createError.value = t('cron_schedule_required_example', 'Schedule required (e.g. 0 9 * * *)'); return }
  if (!createPrompt.value.trim()) { createError.value = t('cron_prompt_required', 'Prompt required'); return }
  createError.value = ''
  try {
    const body: Record<string, unknown> = {
      schedule: createSchedule.value.trim(),
      prompt: createPrompt.value.trim(),
      deliver: createDeliver.value,
    }
    if (createName.value.trim()) body.name = createName.value.trim()
    if (createSelectedSkills.value.length) body.skills = createSelectedSkills.value
    await apiPost('/api/crons/create', body)
    showCreateForm.value = false
    await loadCrons()
  } catch (e: any) {
    createError.value = e.message
  }
}

onMounted(loadCrons)
</script>

<template>
  <div class="panel-view" style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Header -->
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:11px;color:var(--muted)">{{ t('scheduled_jobs') }}</div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="toggleCreateForm">
        + {{ t('new_job') }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" style="padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
      <input
        v-model="createName"
        :placeholder="t('cron_job_name_placeholder', 'Job name (optional)')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <input
        v-model="createSchedule"
        :placeholder="t('cron_schedule_placeholder', 'Schedule')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <textarea
        v-model="createPrompt"
        rows="3"
        :placeholder="t('cron_prompt_placeholder', 'Prompt (must be self-contained)')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;resize:none;font-family:inherit;margin-bottom:6px;box-sizing:border-box"
      />
      <select
        v-model="createDeliver"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      >
        <option value="local">Local (save output only)</option>
        <option value="discord">Discord</option>
        <option value="telegram">Telegram</option>
      </select>
      <!-- Skill picker -->
      <div class="skill-picker-wrap" style="margin-bottom:8px;position:relative">
        <input
          v-model="createSkillSearch"
          :placeholder="t('add_skills_placeholder', 'Add skills (optional)...')"
          style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;box-sizing:border-box"
          autocomplete="off"
          @input="onSkillSearchInput"
          @blur="blurSkillSearch"
        />
        <div v-if="createSkillDropdown.length" class="skill-picker-dropdown">
          <div
            v-for="skill in createSkillDropdown"
            :key="skill.name"
            class="skill-opt"
            @mousedown.prevent="selectSkill(skill.name)"
          >
            {{ skill.name }}{{ skill.category ? ` (${skill.category})` : '' }}
          </div>
        </div>
        <div class="skill-picker-tags">
          <span
            v-for="name in createSelectedSkills"
            :key="name"
            class="skill-tag"
          >
            {{ name }}
            <span class="remove-tag" @click="removeSkill(name)">×</span>
          </span>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitCreate">{{ t('create_job') }}</button>
        <button class="cron-btn" style="flex:1" @click="showCreateForm = false">{{ t('cancel') }}</button>
      </div>
      <div v-if="createError" style="font-size:11px;color:var(--accent);margin-top:6px">{{ createError }}</div>
    </div>

    <!-- Job list -->
    <div class="cron-list" style="flex:1;overflow-y:auto">
      <div v-if="loading" style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>
      <div v-else-if="error" style="padding:12px;color:var(--accent);font-size:12px">{{ error }}</div>
      <div v-else-if="!jobs.length" style="padding:16px;color:var(--muted);font-size:12px">{{ t('cron_no_jobs') }}</div>
      <template v-else>
        <div
          v-for="job in jobs"
          :key="job.id"
          :id="'cron-' + job.id"
          class="cron-item"
        >
          <!-- Job header -->
          <div class="cron-header" style="cursor:pointer" @click="toggleJob(job.id)">
            <span class="cron-name" :title="job.name">{{ job.name }}</span>
            <span :class="['cron-status', getStatusClass(job)]">{{ getStatusLabel(job) }}</span>
          </div>

          <!-- Job body (expanded) -->
          <div :class="['cron-body', { open: expandedJobs.has(job.id) }]">
            <div class="cron-schedule" style="font-size:11px;color:var(--muted);margin-bottom:6px">
              {{ getScheduleDisplay(job) }}
              &nbsp;|&nbsp; {{ t('cron_next') }}: {{ formatDate(job.next_run_at) }}
              &nbsp;|&nbsp; {{ t('cron_last') }}: {{ formatDate(job.last_run_at) }}
            </div>
            <div class="cron-prompt" style="font-size:11px;color:var(--muted);margin-bottom:6px;word-break:break-word">
              {{ (job.prompt ?? '').slice(0, 300) }}{{ (job.prompt ?? '').length > 300 ? '…' : '' }}
            </div>

            <!-- Actions -->
            <div class="cron-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              <button class="cron-btn run" @click.stop="runJob(job.id)">
                ▶ {{ t('cron_run_now') }}
              </button>
              <button v-if="job.state === 'paused'" class="cron-btn" @click.stop="resumeJob(job.id)">
                ▶ {{ t('cron_resume') }}
              </button>
              <button v-else class="cron-btn pause" @click.stop="pauseJob(job.id)">
                ⏸ {{ t('cron_pause') }}
              </button>
              <button class="cron-btn" @click.stop="openEditForm(job)">
                ✎ {{ t('edit') }}
              </button>
              <button class="cron-btn" style="border-color:var(--accent-bg-strong);color:var(--accent-text)" @click.stop="deleteJob(job.id)">
                🗑 {{ t('delete_title') }}
              </button>
            </div>

            <!-- Inline edit form -->
            <div v-if="editingJobId === job.id && editForms[job.id]" style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
              <input
                v-model="editForms[job.id].name"
                :placeholder="t('cron_job_name_placeholder', 'Job name (optional)')"
                style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:5px;box-sizing:border-box"
              />
              <input
                v-model="editForms[job.id].schedule"
                :placeholder="t('cron_schedule_placeholder', 'Schedule expression')"
                style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:5px;box-sizing:border-box"
              />
              <textarea
                v-model="editForms[job.id].prompt"
                rows="3"
                :placeholder="t('cron_prompt_placeholder', 'Prompt')"
                style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;resize:none;font-family:inherit;margin-bottom:5px;box-sizing:border-box"
              />
              <div v-if="editForms[job.id].error" style="font-size:11px;color:var(--accent);margin-bottom:5px">{{ editForms[job.id].error }}</div>
              <div style="display:flex;gap:6px">
                <button class="cron-btn run" style="flex:1" @click.stop="saveEditForm(job.id)">{{ t('save') }}</button>
                <button class="cron-btn" style="flex:1" @click.stop="closeEditForm(job.id)">{{ t('cancel') }}</button>
              </div>
            </div>

            <!-- Last output -->
            <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px" class="cron-last-header">
                <span style="font-size:11px;color:var(--muted)">{{ t('cron_last_output', 'Last output') }}</span>
                <button
                  class="cron-btn"
                  style="padding:1px 8px;font-size:10px"
                  @click.stop="loadCronHistory(job.id)"
                >
                  {{ showHistory.has(job.id) ? t('cron_hide_runs', 'Hide runs') : t('cron_all_runs', 'All runs') }}
                </button>
              </div>
              <div class="cron-last" style="color:var(--muted);font-size:11px;white-space:pre-wrap;max-height:120px;overflow-y:auto">
                {{ jobOutputs[job.id] ?? t('loading') }}
              </div>
              <!-- History -->
              <div v-if="showHistory.has(job.id) && jobHistories[job.id]">
                <div
                  v-for="(run, idx) in jobHistories[job.id]"
                  :key="idx"
                  style="border-top:1px solid var(--border);padding:6px 0"
                >
                  <details>
                    <summary style="font-size:11px;font-weight:600;color:var(--muted);cursor:pointer">{{ run.ts }}</summary>
                    <div style="font-size:11px;color:var(--muted);white-space:pre-wrap;line-height:1.5;margin-top:4px;max-height:200px;overflow-y:auto">{{ run.snippet }}</div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
