<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { useUIStore } from '@/stores/ui'
import { useSessionStore } from '@/stores/session'
import { apiPost } from '@/composables/useApi'
import { applyTheme, applySkin, SKINS } from '@/utils/theme'
import AppDialog from '@/components/shared/AppDialog.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()
const sessionStore = useSessionStore()

const activeTab = ref<'conversation' | 'appearance' | 'preferences' | 'system'>('conversation')
const saving = ref(false)
const saveMsg = ref('')

// Local editable copy of settings
const local = reactive({
  botName: settingsStore.botName,
  sendKey: settingsStore.sendKey,
  theme: settingsStore.theme,
  skin: settingsStore.skin,
  language: settingsStore.language,
  showTokenUsage: settingsStore.showTokenUsage,
  bubbleLayout: settingsStore.bubbleLayout,
  showCliSessions: settingsStore.showCliSessions,
  syncInsights: settingsStore.syncInsights,
  checkForUpdates: settingsStore.checkForUpdates,
  soundEnabled: settingsStore.soundEnabled,
  notificationsEnabled: settingsStore.notificationsEnabled,
})
const newPassword = ref('')

// Import JSON state
const importFileRef = ref<HTMLInputElement | null>(null)

// Confirm dialog for clear/disable-auth
const showDisableAuthConfirm = ref(false)

function close() { uiStore.toggleSettings() }

function pickTheme(theme: string) {
  local.theme = theme
  applyTheme(theme)
}

function pickSkin(skin: string) {
  local.skin = skin
  applySkin(skin)
}

async function save() {
  saving.value = true
  saveMsg.value = ''
  try {
    const payload: Record<string, unknown> = {
      bot_name: local.botName,
      send_key: local.sendKey,
      theme: local.theme,
      skin: local.skin,
      language: local.language,
      show_token_usage: local.showTokenUsage,
      bubble_layout: local.bubbleLayout,
      show_cli_sessions: local.showCliSessions,
      sync_insights: local.syncInsights,
      check_for_updates: local.checkForUpdates,
      sound_enabled: local.soundEnabled,
      notifications_enabled: local.notificationsEnabled,
    }
    if (newPassword.value) payload._set_password = newPassword.value
    await settingsStore.saveSettings(payload)
    saveMsg.value = t('settings_saved')
    newPassword.value = ''
  } catch (e: unknown) {
    saveMsg.value = t('settings_save_failed') + String((e as Error)?.message || '')
  } finally {
    saving.value = false
  }
}

async function signOut() {
  try {
    await apiPost('/api/auth/logout', {})
    window.location.href = '/login'
  } catch (e: unknown) {
    saveMsg.value = t('sign_out_failed') + String((e as Error)?.message || '')
  }
}

async function disableAuth() {
  try {
    await apiPost('/api/settings', { _set_password: '' })
    saveMsg.value = t('auth_disabled')
    showDisableAuthConfirm.value = false
  } catch (e: unknown) {
    saveMsg.value = t('disable_auth_failed') + String((e as Error)?.message || '')
  }
}

function downloadMarkdown() {
  const session = sessionStore.currentSession
  if (!session) return
  const msgs = sessionStore.messages as Array<{role: string; content: string}>
  const md = msgs.map(m => `**${m.role}**: ${m.content}`).join('\n\n---\n\n')
  const blob = new Blob([md], { type: 'text/markdown' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `hermes-${session.session_id}.md`; a.click()
  URL.revokeObjectURL(a.href)
}

function exportJSON() {
  const session = sessionStore.currentSession
  if (!session) return
  const url = `/api/session/export?session_id=${encodeURIComponent(session.session_id)}`
  const a = document.createElement('a'); a.href = url
  a.download = `hermes-${session.session_id}.json`; a.click()
}

function importJSON() { importFileRef.value?.click() }

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const res = await apiPost('/api/session/import', data)
    if (res.session) {
      await sessionStore.loadSession(res.session.session_id)
      await sessionStore.fetchSessions()
      close()
    }
  } catch (e: unknown) {
    saveMsg.value = t('import_failed') + String((e as Error)?.message || t('import_invalid_json'))
  }
}

async function clearConversation() {
  const session = sessionStore.currentSession
  if (!session) return
  if (!window.confirm(t('clear_conversation_message'))) return
  try {
    await apiPost('/api/session/clear', { session_id: session.session_id })
    await sessionStore.loadSession(session.session_id)
  } catch (e: unknown) {
    saveMsg.value = t('clear_failed') + String((e as Error)?.message || '')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="settings-overlay" @click.self="close">
    <div class="settings-panel">
      <!-- Header -->
      <div class="settings-header">
        <div class="settings-heading">
          <div class="settings-kicker">Hermes WebUI</div>
          <h3 style="margin:0;font-size:18px">Control Center</h3>
          <div class="settings-subtitle">Preferences, conversation tools, and system controls.</div>
        </div>
        <button class="panel-icon-btn" :title="t('cancel')" @click="close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="settings-body">
        <div class="settings-shell">
          <!-- Tabs -->
          <div class="settings-tabs" role="tablist">
            <button
              v-for="tab in (['conversation','appearance','preferences','system'] as const)"
              :key="tab"
              class="settings-tab"
              :class="{ active: activeTab === tab }"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab"
              @click="activeTab = tab"
            >
              <span class="settings-tab-title" style="text-transform:capitalize">{{ tab }}</span>
            </button>
          </div>

          <div class="settings-main">
            <!-- Conversation tab -->
            <div v-if="activeTab === 'conversation'" class="settings-pane active">
              <div class="settings-section-head">
                <div class="settings-section-title">{{ t('tab_chat') }}</div>
                <div class="settings-section-meta">
                  <template v-if="sessionStore.currentSession">
                    {{ sessionStore.currentSession.title }} · {{ sessionStore.currentSession.message_count }} msg(s)
                  </template>
                  <template v-else>{{ t('active_conversation_none') }}</template>
                </div>
              </div>
              <div class="hermes-action-grid">
                <button class="settings-action-btn" :disabled="!sessionStore.currentSession" @click="downloadMarkdown">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {{ t('transcript') }}
                </button>
                <button class="settings-action-btn" :disabled="!sessionStore.currentSession" @click="exportJSON">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>
                  JSON
                </button>
                <button class="settings-action-btn" @click="importJSON">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {{ t('import') }}
                </button>
                <button class="settings-action-btn danger" :disabled="!sessionStore.currentSession" @click="clearConversation">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  {{ t('clear') }}
                </button>
              </div>
              <input ref="importFileRef" type="file" accept=".json" style="display:none" @change="onImportFile" />
            </div>

            <!-- Appearance tab -->
            <div v-if="activeTab === 'appearance'" class="settings-pane active">
              <div class="settings-section-head">
                <div class="settings-section-title">{{ t('settings_label_theme') }}</div>
              </div>
              <!-- Theme picker -->
              <div class="settings-field">
                <label>{{ t('settings_label_theme') }}</label>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px">
                  <button
                    v-for="th in ['light','dark','system']"
                    :key="th"
                    class="theme-pick-btn"
                    :style="`border:1px solid ${local.theme===th?'var(--accent)':'var(--border2)'};border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;background:none`"
                    @click="pickTheme(th)"
                  >
                    <div style="height:40px;border-radius:6px;background:var(--surface);border:1px solid var(--border2);margin-bottom:6px"/>
                    <span style="font-size:12px;font-weight:500;color:var(--text);text-transform:capitalize">{{ th }}</span>
                  </button>
                </div>
              </div>
              <!-- Skin picker -->
              <div class="settings-field" style="margin-top:16px">
                <label>{{ t('settings_label_skin') }}</label>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px">
                  <button
                    v-for="skin in SKINS"
                    :key="skin.id"
                    class="skin-pick-btn"
                    :style="`border:1px solid ${local.skin===skin.id?'var(--accent)':'var(--border2)'};border-radius:8px;padding:8px 4px;text-align:center;cursor:pointer;background:none`"
                    @click="pickSkin(skin.id)"
                  >
                    <div style="display:flex;gap:3px;justify-content:center;margin-bottom:4px">
                      <span :style="`display:inline-block;width:10px;height:10px;border-radius:50%;background:${skin.accent}`"/>
                      <span :style="`display:inline-block;width:10px;height:10px;border-radius:50%;background:${skin.gold}`"/>
                      <span :style="`display:inline-block;width:10px;height:10px;border-radius:50%;background:${skin.blue}`"/>
                    </div>
                    <span style="font-size:11px;color:var(--text)">{{ skin.label }}</span>
                  </button>
                </div>
              </div>
              <!-- Bot name -->
              <div class="settings-field" style="margin-top:16px">
                <label>{{ t('settings_label_bot_name') }}</label>
                <input v-model="local.botName" class="settings-input" :placeholder="t('settings_label_bot_name')" />
              </div>
            </div>

            <!-- Preferences tab -->
            <div v-if="activeTab === 'preferences'" class="settings-pane active">
              <!-- Send key -->
              <div class="settings-field">
                <label>{{ t('settings_label_send_key') }}</label>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                    <input type="radio" v-model="local.sendKey" value="enter" /> Enter
                  </label>
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                    <input type="radio" v-model="local.sendKey" value="ctrl+enter" /> Ctrl+Enter
                  </label>
                </div>
              </div>
              <!-- Language -->
              <div class="settings-field">
                <label>{{ t('settings_label_language') }}</label>
                <select v-model="local.language" class="settings-input">
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                </select>
              </div>
              <!-- Toggles -->
              <div v-for="(key, label) in {showTokenUsage: 'settings_label_token_usage', bubbleLayout: 'settings_label_bubble_layout', showCliSessions: 'settings_label_cli_sessions', checkForUpdates: 'settings_label_check_updates', soundEnabled: 'settings_label_sound', notificationsEnabled: 'settings_label_notifications'}" :key="key" class="settings-field settings-toggle-row">
                <label>{{ t(label) }}</label>
                <input type="checkbox" v-model="(local as Record<string, unknown>)[key]" style="accent-color:var(--accent)" />
              </div>
            </div>

            <!-- System tab -->
            <div v-if="activeTab === 'system'" class="settings-pane active">
              <!-- Password -->
              <div class="settings-field">
                <label>{{ t('settings_label_password') }}</label>
                <input v-model="newPassword" type="password" class="settings-input" :placeholder="t('password_placeholder')" autocomplete="new-password" />
                <div class="settings-field-desc">{{ t('settings_desc_password', 'Leave blank to keep current setting.') }}</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                <button class="sm-btn" @click="showDisableAuthConfirm = true">{{ t('disable_auth') }}</button>
                <button class="sm-btn" @click="signOut">{{ t('sign_out') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="settings-footer">
        <span v-if="saveMsg" :class="saveMsg.includes('failed') ? 'text-danger' : 'text-success'" style="font-size:12px">{{ saveMsg }}</span>
        <button class="sm-btn primary" :disabled="saving" @click="save">
          {{ saving ? t('loading') : t('settings_save_btn') }}
        </button>
      </div>
    </div>

    <!-- Disable auth confirm -->
    <AppDialog
      v-if="showDisableAuthConfirm"
      :show="showDisableAuthConfirm"
      :title="t('disable_auth_confirm_title')"
      :message="t('disable_auth_confirm_message')"
      :confirm-label="t('disable_auth')"
      :cancel-label="t('cancel')"
      @confirm="disableAuth"
      @cancel="showDisableAuthConfirm = false"
    />
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-panel {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 16px;
  width: min(860px, 95vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.settings-kicker {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--accent);
  margin-bottom: 4px;
}
.settings-subtitle {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.settings-body {
  flex: 1;
  overflow: hidden;
}
.settings-shell {
  display: flex;
  height: 100%;
}
.settings-tabs {
  width: 140px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.settings-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  border-radius: 0;
  transition: all .12s;
}
.settings-tab.active {
  color: var(--text);
  background: var(--surface2, rgba(255,255,255,.05));
  font-weight: 500;
}
.settings-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.settings-pane { display: flex; flex-direction: column; gap: 12px; }
.settings-section-head { margin-bottom: 4px; }
.settings-section-title { font-size: 14px; font-weight: 600; color: var(--text); }
.settings-section-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
.settings-field { display: flex; flex-direction: column; gap: 4px; }
.settings-field > label { font-size: 12px; color: var(--muted); }
.settings-field-desc { font-size: 11px; color: var(--muted); opacity: .7; }
.settings-toggle-row { flex-direction: row; align-items: center; justify-content: space-between; }
.settings-input {
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border2);
  border-radius: 6px;
  color: var(--text);
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.hermes-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.settings-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 12px;
  background: var(--surface2, rgba(255,255,255,.05));
  border: 1px solid var(--border2);
  border-radius: 8px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: background .12s;
}
.settings-action-btn:hover { background: var(--surface3, rgba(255,255,255,.1)); }
.settings-action-btn.danger { color: var(--accent); }
.settings-action-btn:disabled { opacity: .4; cursor: default; }
.settings-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sm-btn {
  padding: 6px 14px;
  background: var(--surface2, rgba(255,255,255,.07));
  border: 1px solid var(--border2);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}
.sm-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 600;
}
.sm-btn:disabled { opacity: .4; cursor: default; }
.text-danger { color: var(--accent); }
.text-success { color: #4ade80; }
</style>
