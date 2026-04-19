import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSettings, updateSettings } from '@/api'

export interface SettingsState {
  bot_name: string
  language: string
  theme: string
  skin: string
  show_token_usage: boolean
  bubble_layout: boolean
  show_cli_sessions: boolean
  sync_to_insights: boolean
  check_for_updates: boolean
  send_key: string
  notification_sound: boolean
  browser_notifications: boolean
  [key: string]: any
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SettingsState>({
    bot_name: 'Hermes',
    language: 'en',
    theme: 'dark',
    skin: 'default',
    show_token_usage: false,
    bubble_layout: false,
    show_cli_sessions: false,
    sync_to_insights: false,
    check_for_updates: true,
    send_key: 'enter',
    notification_sound: true,
    browser_notifications: false,
  })

  const isLoaded = ref(false)
  const hasUnsavedChanges = ref(false)
  const pendingChanges = ref<Partial<SettingsState>>({})

  async function loadSettings() {
    try {
      const data = await getSettings()
      settings.value = { ...settings.value, ...data }
      isLoaded.value = true
      pendingChanges.value = {}
      hasUnsavedChanges.value = false
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  function updateField<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    pendingChanges.value[key] = value
    hasUnsavedChanges.value = true
  }

  async function saveSettings() {
    if (!hasUnsavedChanges.value) return
    try {
      const data = await updateSettings(pendingChanges.value)
      settings.value = { ...settings.value, ...data }
      pendingChanges.value = {}
      hasUnsavedChanges.value = false

      // Persist theme and skin
      if (pendingChanges.value.theme) {
        localStorage.setItem('hermes-theme', pendingChanges.value.theme as string)
      }
      if (pendingChanges.value.skin) {
        localStorage.setItem('hermes-skin', pendingChanges.value.skin as string)
      }
    } catch (e) {
      console.warn('Failed to save settings:', e)
      throw e
    }
  }

  function discardChanges() {
    pendingChanges.value = {}
    hasUnsavedChanges.value = false
  }

  function getEffectiveValue<K extends keyof SettingsState>(key: K): SettingsState[K] {
    return (pendingChanges.value[key] !== undefined
      ? pendingChanges.value[key]
      : settings.value[key]) as SettingsState[K]
  }

  // Watch for theme changes
  watch(() => getEffectiveValue('theme'), (newTheme) => {
    if (newTheme) {
      localStorage.setItem('hermes-theme', newTheme as string)
      applyTheme(newTheme as string)
    }
  })

  watch(() => getEffectiveValue('skin'), (newSkin) => {
    if (newSkin) {
      localStorage.setItem('hermes-skin', newSkin as string)
      applySkin(newSkin as string)
    }
  })

  return {
    settings,
    isLoaded,
    hasUnsavedChanges,
    pendingChanges,
    loadSettings,
    updateField,
    saveSettings,
    discardChanges,
    getEffectiveValue,
  }
})

function applyTheme(name: string) {
  const isDark = name === 'dark' || (name === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)

  // Update Prism.js theme
  const link = document.getElementById('prism-theme') as HTMLLinkElement | null
  if (link) {
    link.href = isDark
      ? 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css'
      : 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css'
  }
}

function applySkin(name: string) {
  if (name === 'default') {
    delete document.documentElement.dataset.skin
  } else {
    document.documentElement.dataset.skin = name
  }
}

// Initialize theme from localStorage on module load
;(function initTheme() {
  const theme = localStorage.getItem('hermes-theme') || 'dark'
  const skin = localStorage.getItem('hermes-skin') || 'default'
  applyTheme(theme)
  applySkin(skin)
})()
