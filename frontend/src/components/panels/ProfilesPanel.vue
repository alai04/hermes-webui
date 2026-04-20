<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const sessionStore = useSessionStore()

interface Profile {
  name: string
  model?: string
  provider?: string
  skill_count?: number
  has_env?: boolean
  gateway_running?: boolean
  is_default?: boolean
}

interface ProfilesData {
  profiles: Profile[]
  active: string
}

const profiles = ref<Profile[]>([])
const activeProfile = ref('')
const loading = ref(false)
const error = ref('')
const showCreateForm = ref(false)

// Create form
const formName = ref('')
const formClone = ref(false)
const formBaseUrl = ref('')
const formApiKey = ref('')
const formError = ref('')
const creating = ref(false)

async function loadProfiles() {
  loading.value = true
  error.value = ''
  try {
    const data: ProfilesData = await apiGet('/api/profiles')
    profiles.value = data.profiles ?? []
    activeProfile.value = data.active ?? 'default'
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function switchProfile(name: string) {
  if (sessionStore.busy) {
    alert(t('profiles_busy_switch'))
    return
  }
  try {
    await apiPost('/api/profile/switch', { name })
    activeProfile.value = name
    // Create new session after profile switch
    await sessionStore.newSession()
    await loadProfiles()
  } catch (e: any) {
    alert(e.message)
  }
}

async function deleteProfile(name: string) {
  if (!confirm(`${t('profile_delete_title')}: ${name}?`)) return
  try {
    await apiPost('/api/profile/delete', { name })
    await loadProfiles()
  } catch (e: any) {
    alert(e.message)
  }
}

function toggleCreateForm() {
  showCreateForm.value = !showCreateForm.value
  if (showCreateForm.value) {
    formName.value = ''
    formClone.value = false
    formBaseUrl.value = ''
    formApiKey.value = ''
    formError.value = ''
  }
}

async function submitCreate() {
  const name = formName.value.trim()
  if (!name) { formError.value = t('profile_name_placeholder'); return }
  if (!/^[a-z0-9_-]+$/.test(name)) { formError.value = t('profile_name_rule'); return }
  if (formBaseUrl.value && !/^https?:\/\//.test(formBaseUrl.value)) {
    formError.value = t('profile_base_url_rule'); return
  }
  formError.value = ''
  creating.value = true
  try {
    const body: Record<string, unknown> = { name, clone: formClone.value }
    if (formBaseUrl.value) body.base_url = formBaseUrl.value
    if (formApiKey.value) body.api_key = formApiKey.value
    await apiPost('/api/profile/create', body)
    showCreateForm.value = false
    await loadProfiles()
  } catch (e: any) {
    formError.value = e.message
  } finally {
    creating.value = false
  }
}

onMounted(loadProfiles)
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Header -->
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:11px;color:var(--muted)">{{ t('tab_profiles') }}</div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="toggleCreateForm">
        + {{ t('new_profile') }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" style="padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
      <input
        v-model="formName"
        :placeholder="t('profile_name_placeholder')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-bottom:8px;cursor:pointer">
        <input v-model="formClone" type="checkbox" style="accent-color:var(--accent)" />
        {{ t('profile_clone_label') }}
      </label>
      <input
        v-model="formBaseUrl"
        :placeholder="t('profile_base_url_placeholder')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <input
        v-model="formApiKey"
        type="password"
        :placeholder="t('profile_api_key_placeholder')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" :disabled="creating" @click="submitCreate">{{ t('create') }}</button>
        <button class="cron-btn" style="flex:1" @click="toggleCreateForm">{{ t('cancel') }}</button>
      </div>
      <div v-if="formError" style="font-size:11px;color:var(--accent);margin-top:6px">{{ formError }}</div>
    </div>

    <!-- List -->
    <div style="flex:1;overflow-y:auto;padding:0 12px 12px">
      <div v-if="loading" style="color:var(--muted);font-size:12px;padding:8px 0">{{ t('loading') }}</div>
      <div v-else-if="error" style="color:var(--accent);font-size:12px;padding:8px 0">{{ error }}</div>
      <div v-else-if="!profiles.length" style="color:var(--muted);font-size:12px;padding:16px 0">{{ t('profiles_no_profiles') }}</div>
      <div
        v-for="profile in profiles"
        :key="profile.name"
        class="profile-card"
        style="margin-top:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px"
      >
        <div class="profile-card-header" style="display:flex;align-items:center;gap:8px">
          <div style="min-width:0;flex:1">
            <div :class="['profile-card-name', { 'is-active': profile.name === activeProfile }]" style="font-size:13px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:6px">
              <!-- Gateway dot -->
              <span
                :class="['profile-opt-badge', profile.gateway_running ? 'running' : 'stopped']"
                :title="profile.gateway_running ? t('profile_gateway_running', 'Gateway running') : t('profile_gateway_stopped', 'Gateway stopped')"
                style="width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0"
                :style="{ background: profile.gateway_running ? 'var(--green, #4CAF50)' : 'var(--muted)' }"
              />
              {{ profile.name }}
              <span v-if="profile.is_default" style="opacity:.5;font-weight:400;font-size:11px">{{ t('profile_default_label') }}</span>
              <span v-if="profile.name === activeProfile" style="color:var(--link);font-size:10px;font-weight:600">{{ t('profile_active') }}</span>
            </div>
            <div class="profile-card-meta" style="font-size:11px;color:var(--muted);margin-top:2px">
              <template v-if="profile.model || profile.provider || profile.skill_count || profile.has_env">
                <span v-if="profile.model">{{ profile.model.split('/').pop() }}</span>
                <span v-if="profile.model && (profile.provider || profile.skill_count)" style="margin:0 4px">·</span>
                <span v-if="profile.provider">{{ profile.provider }}</span>
                <span v-if="profile.skill_count" style="margin-left:4px">
                  {{ t('profile_skill_count', { n: profile.skill_count }, `${profile.skill_count} skills`) }}
                </span>
                <span v-if="profile.has_env" style="margin-left:4px">
                  {{ t('profile_api_keys_configured', 'API keys configured') }}
                </span>
              </template>
              <template v-else>{{ t('profile_no_configuration') }}</template>
            </div>
          </div>
          <div class="profile-card-actions" style="display:flex;gap:4px;flex-shrink:0">
            <button
              v-if="profile.name !== activeProfile"
              class="ws-action-btn"
              :title="t('profile_switch_title')"
              @click="switchProfile(profile.name)"
            >
              {{ t('profile_use') }}
            </button>
            <button
              v-if="!profile.is_default"
              class="ws-action-btn danger"
              :title="t('profile_delete_title')"
              @click="deleteProfile(profile.name)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
