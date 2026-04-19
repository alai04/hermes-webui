<template>
  <div class="panel-view" id="panelProfiles">
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:11px;color:var(--muted)">{{ t('tab_profiles') }}</div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px" @click="showForm = !showForm">
        + {{ t('new_profile') }}
      </button>
    </div>

    <div v-if="showForm" class="profile-create-form">
      <input v-model="form.name" placeholder="Profile name (lowercase, a-z 0-9 hyphens)" />
      <input v-model="form.baseUrl" placeholder="Base URL (optional)" />
      <input v-model="form.apiKey" type="password" placeholder="API key (optional)" />
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitCreate">{{ t('create') }}</button>
        <button class="cron-btn" style="flex:1" @click="showForm = false">{{ t('cancel') }}</button>
      </div>
      <div v-if="formError" class="form-error">{{ formError }}</div>
    </div>

    <div style="flex:1;overflow-y:auto;padding:0 12px 12px">
      <div v-if="!profiles.length" style="color:var(--muted);font-size:12px">{{ t('profiles_no_profiles') }}</div>
      <div v-for="p in profiles" :key="p.name" class="profile-item" :class="{ active: p.name === activeProfile }">
        <div class="profile-info">
          <span class="profile-name">{{ p.name }}</span>
          <span v-if="p.name === activeProfile" class="profile-badge">{{ t('profile_active') }}</span>
        </div>
        <div class="profile-actions">
          <button v-if="p.name !== activeProfile" class="profile-use-btn" @click="$emit('switch-profile', p.name)">{{ t('view') }}</button>
          <button class="profile-delete-btn" @click="handleDelete(p.name)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { t } from '@/composables/i18n'

const sidebarStore = useSidebarStore()
const showForm = ref(false)
const form = ref({ name: '', baseUrl: '', apiKey: '' })
const formError = ref('')

const profiles = sidebarStore.profiles
const activeProfile = sidebarStore.activeProfile

async function submitCreate() {
  formError.value = ''
  if (!form.value.name) { formError.value = t('name_required'); return }
  try {
    await sidebarStore.addProfile(form.value.name, undefined, form.value.baseUrl || undefined, form.value.apiKey || undefined)
    showForm.value = false
    form.value = { name: '', baseUrl: '', apiKey: '' }
  } catch (e: any) {
    formError.value = e.message
  }
}

async function handleDelete(name: string) {
  if (confirm(`Delete profile "${name}"?`)) {
    await sidebarStore.removeProfile(name)
  }
}

defineEmits<{ 'switch-profile': [name: string] }>()

onMounted(() => { sidebarStore.loadProfiles() })
</script>
