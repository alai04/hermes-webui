<template>
  <Teleport to="body">
    <div class="settings-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="settings-panel">
        <div class="settings-header">
          <h2>{{ t('settings_title') }}</h2>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="settings-body">
          <!-- Bot Name -->
          <div class="setting-row">
            <label>{{ t('settings_label_bot_name') }}</label>
            <input v-model="form.bot_name" />
            <p class="setting-desc">{{ t('settings_desc_bot_name') }}</p>
          </div>

          <!-- Language -->
          <div class="setting-row">
            <label>{{ t('settings_label_language') }}</label>
            <select v-model="form.language">
              <option v-for="locale in locales" :key="locale.code" :value="locale.code">{{ locale.label }}</option>
            </select>
          </div>

          <!-- Theme -->
          <div class="setting-row">
            <label>{{ t('settings_label_theme') }}</label>
            <div class="theme-picker">
              <button v-for="theme in ['system', 'dark', 'light']" :key="theme"
                class="theme-pick-btn"
                :class="{ active: form.theme === theme }"
                @click="form.theme = theme">
                {{ theme }}
              </button>
            </div>
          </div>

          <!-- Skin -->
          <div class="setting-row">
            <label>{{ t('settings_label_skin') }}</label>
            <div class="skin-picker">
              <button v-for="skin in ['default', 'ares', 'mono', 'slate', 'poseidon', 'sisyphus', 'charizard']" :key="skin"
                class="skin-pick-btn"
                :class="{ active: form.skin === skin }"
                @click="form.skin = skin">
                {{ skin }}
              </button>
            </div>
          </div>

          <!-- Send Key -->
          <div class="setting-row">
            <label>{{ t('settings_label_send_key') }}</label>
            <select v-model="form.send_key">
              <option value="enter">Enter</option>
              <option value="ctrl+enter">Ctrl+Enter</option>
            </select>
          </div>

          <!-- Token Usage -->
          <div class="setting-row">
            <label><input type="checkbox" v-model="form.show_token_usage" /> {{ t('settings_label_token_usage') }}</label>
            <p class="setting-desc">{{ t('settings_desc_token_usage') }}</p>
          </div>

          <!-- Bubble Layout -->
          <div class="setting-row">
            <label><input type="checkbox" v-model="form.bubble_layout" /> {{ t('settings_label_bubble_layout') }}</label>
            <p class="setting-desc">{{ t('settings_desc_bubble_layout') }}</p>
          </div>

          <!-- CLI Sessions -->
          <div class="setting-row">
            <label><input type="checkbox" v-model="form.show_cli_sessions" /> {{ t('settings_label_cli_sessions') }}</label>
            <p class="setting-desc">{{ t('settings_desc_cli_sessions') }}</p>
          </div>

          <!-- Check Updates -->
          <div class="setting-row">
            <label><input type="checkbox" v-model="form.check_for_updates" /> {{ t('settings_label_check_updates') }}</label>
            <p class="setting-desc">{{ t('settings_desc_check_updates') }}</p>
          </div>

          <!-- Password -->
          <div class="setting-row">
            <label>{{ t('settings_label_password') }}</label>
            <input type="password" v-model="form._set_password" :placeholder="t('password_placeholder')" />
            <p class="setting-desc">{{ t('settings_desc_password') }}</p>
          </div>
        </div>
        <div class="settings-footer">
          <div v-if="hasUnsaved" class="unsaved-notice">{{ t('settings_unsaved_changes') }}</div>
          <button class="save-btn" @click="handleSave">{{ t('settings_save_btn') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { t, getAllLocales } from '@/composables/i18n'

defineProps<{ visible: boolean }>()
defineEmits<{ close: [] }>()

const settingsStore = useSettingsStore()
const locales = getAllLocales()

const form = ref({
  bot_name: '',
  language: 'en',
  theme: 'dark',
  skin: 'default',
  send_key: 'enter',
  show_token_usage: false,
  bubble_layout: false,
  show_cli_sessions: false,
  check_for_updates: true,
  _set_password: '',
})

const hasUnsaved = computed(() => settingsStore.hasUnsavedChanges)

// Initialize form from settings store
watch(() => settingsStore.isLoaded, (loaded) => {
  if (loaded) {
    const s = settingsStore.settings
    form.value = {
      bot_name: s.bot_name || 'Hermes',
      language: s.language || 'en',
      theme: s.theme || 'dark',
      skin: s.skin || 'default',
      send_key: s.send_key || 'enter',
      show_token_usage: s.show_token_usage || false,
      bubble_layout: s.bubble_layout || false,
      show_cli_sessions: s.show_cli_sessions || false,
      check_for_updates: s.check_for_updates !== false,
      _set_password: '',
    }
  }
}, { immediate: true })

async function handleSave() {
  try {
    await settingsStore.saveSettings()
    for (const [key, value] of Object.entries(form.value)) {
      if (key !== '_set_password' || value) {
        settingsStore.updateField(key as any, value)
      }
    }
    await settingsStore.saveSettings()
  } catch (e: any) {
    alert(t('settings_save_failed') + e.message)
  }
}
</script>
