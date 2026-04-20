import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '@/composables/useApi'
import { applyTheme, applySkin } from '@/utils/theme'

export interface SettingsState {
  botName: string
  theme: string
  skin: string
  sendKey: string
  language: string
  showTokenUsage: boolean
  bubbleLayout: boolean
  showCliSessions: boolean
  syncInsights: boolean
  checkForUpdates: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const botName = ref<string>('Hermes')
  const theme = ref<string>('dark')
  const skin = ref<string>('default')
  const sendKey = ref<string>('Enter')
  const language = ref<string>('en')
  const showTokenUsage = ref<boolean>(false)
  const bubbleLayout = ref<boolean>(false)
  const showCliSessions = ref<boolean>(false)
  const syncInsights = ref<boolean>(false)
  const checkForUpdates = ref<boolean>(true)
  const soundEnabled = ref<boolean>(false)
  const notificationsEnabled = ref<boolean>(false)

  function _applyToDOM(t: string, s: string) {
    applyTheme(t)
    applySkin(s)
  }

  async function loadSettings(): Promise<void> {
    const data = await apiGet('/api/settings')
    if (data.bot_name !== undefined) botName.value = data.bot_name
    if (data.theme !== undefined) theme.value = data.theme
    if (data.skin !== undefined) skin.value = data.skin
    if (data.send_key !== undefined) sendKey.value = data.send_key
    if (data.language !== undefined) language.value = data.language
    if (data.show_token_usage !== undefined) showTokenUsage.value = data.show_token_usage
    if (data.bubble_layout !== undefined) bubbleLayout.value = data.bubble_layout
    if (data.show_cli_sessions !== undefined) showCliSessions.value = data.show_cli_sessions
    if (data.sync_insights !== undefined) syncInsights.value = data.sync_insights
    if (data.check_for_updates !== undefined) checkForUpdates.value = data.check_for_updates
    if (data.sound_enabled !== undefined) soundEnabled.value = data.sound_enabled
    if (data.notifications_enabled !== undefined) notificationsEnabled.value = data.notifications_enabled
    _applyToDOM(theme.value, skin.value)
  }

  async function saveSettings(partial: Partial<{
    bot_name: string
    theme: string
    skin: string
    send_key: string
    language: string
    show_token_usage: boolean
    bubble_layout: boolean
    show_cli_sessions: boolean
    sync_insights: boolean
    check_for_updates: boolean
    sound_enabled: boolean
    notifications_enabled: boolean
    _set_password?: string
  }>): Promise<any> {
    const result = await apiPost('/api/settings', partial)
    // Re-apply any appearance changes reflected in the response
    if (result.theme !== undefined) {
      theme.value = result.theme
      applyTheme(result.theme)
    }
    if (result.skin !== undefined) {
      skin.value = result.skin
      applySkin(result.skin)
    }
    if (result.bot_name !== undefined) botName.value = result.bot_name
    if (result.send_key !== undefined) sendKey.value = result.send_key
    if (result.language !== undefined) language.value = result.language
    if (result.show_token_usage !== undefined) showTokenUsage.value = result.show_token_usage
    if (result.bubble_layout !== undefined) bubbleLayout.value = result.bubble_layout
    if (result.show_cli_sessions !== undefined) showCliSessions.value = result.show_cli_sessions
    if (result.sync_insights !== undefined) syncInsights.value = result.sync_insights
    if (result.check_for_updates !== undefined) checkForUpdates.value = result.check_for_updates
    if (result.sound_enabled !== undefined) soundEnabled.value = result.sound_enabled
    if (result.notifications_enabled !== undefined) notificationsEnabled.value = result.notifications_enabled
    return result
  }

  return {
    botName,
    theme,
    skin,
    sendKey,
    language,
    showTokenUsage,
    bubbleLayout,
    showCliSessions,
    syncInsights,
    checkForUpdates,
    soundEnabled,
    notificationsEnabled,
    loadSettings,
    saveSettings,
  }
})
