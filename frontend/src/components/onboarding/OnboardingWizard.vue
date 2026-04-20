<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores/ui'
import { apiGet, apiPost } from '@/composables/useApi'

const { t } = useI18n()
const uiStore = useUIStore()

const currentStep = ref(0) // 0-4
const loading = ref(false)
const error = ref('')

// Step data
const onboardingStatus = ref<Record<string, unknown>>({})
const providerChoice = ref('anthropic')
const apiKey = ref('')
const baseUrl = ref('')
const workspacePath = ref('')
const defaultModel = ref('')
const models = ref<{id:string;label:string}[]>([])
const password = ref('')

const steps = computed(() => [
  { title: t('onboarding_step_system_title'), desc: t('onboarding_step_system_desc') },
  { title: t('onboarding_step_setup_title'), desc: t('onboarding_step_setup_desc') },
  { title: t('onboarding_step_workspace_title'), desc: t('onboarding_step_workspace_desc') },
  { title: t('onboarding_step_password_title'), desc: t('onboarding_step_password_desc') },
  { title: t('onboarding_step_finish_title'), desc: t('onboarding_step_finish_desc') },
])

async function loadStatus() {
  loading.value = true
  try {
    onboardingStatus.value = await apiGet('/api/onboarding/status')
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function loadModels() {
  try {
    const data = await apiGet('/api/models')
    const list: {id:string;label:string}[] = []
    if (Array.isArray(data)) {
      data.forEach((m: {id:string;label:string}) => list.push(m))
    } else if (data.groups) {
      for (const g of data.groups) {
        for (const m of g.models) list.push(m)
      }
    }
    models.value = list
    if (list.length && !defaultModel.value) defaultModel.value = list[0].id
  } catch { /* ignore */ }
}

async function next() {
  error.value = ''
  loading.value = true
  try {
    if (currentStep.value === 1) {
      // Provider setup
      await apiPost('/api/onboarding/setup', {
        provider: providerChoice.value,
        api_key: apiKey.value || undefined,
        base_url: baseUrl.value || undefined,
      })
    } else if (currentStep.value === 2) {
      // Workspace + model
      if (!workspacePath.value && !defaultModel.value) {
        // allow skipping
      } else {
        await apiPost('/api/settings', {
          workspace: workspacePath.value || undefined,
          default_model: defaultModel.value || undefined,
        })
      }
    } else if (currentStep.value === 3) {
      // Password (optional)
      if (password.value) {
        await apiPost('/api/settings', { _set_password: password.value })
      }
    } else if (currentStep.value === 4) {
      // Complete
      await apiPost('/api/onboarding/complete', {})
      uiStore.onboardingOpen = false
      return
    }
    currentStep.value++
    if (currentStep.value === 2) await loadModels()
  } catch (e: unknown) {
    error.value = String((e as Error)?.message || t('error_prefix'))
  } finally {
    loading.value = false
  }
}

function prev() {
  if (currentStep.value > 0) currentStep.value--
}

function skip() {
  uiStore.onboardingOpen = false
}

onMounted(async () => {
  await loadStatus()
  await loadModels()
})
</script>

<template>
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-shell">
        <!-- Sidebar -->
        <div class="onboarding-sidebar">
          <div class="onboarding-badge">{{ t('onboarding_badge') }}</div>
          <h2>{{ t('onboarding_title') }}</h2>
          <p style="font-size:13px;color:var(--muted);line-height:1.5">{{ t('onboarding_lead') }}</p>
          <!-- Step list -->
          <div class="onboarding-steps">
            <div
              v-for="(step, idx) in steps"
              :key="idx"
              class="onboarding-step"
              :class="{ active: idx === currentStep, done: idx < currentStep }"
            >
              <span class="step-dot">{{ idx < currentStep ? '✓' : idx + 1 }}</span>
              <span>{{ step.title }}</span>
            </div>
          </div>
        </div>

        <!-- Main content -->
        <div class="onboarding-main">
          <!-- Step 0: System check -->
          <div v-if="currentStep === 0" class="onboarding-body">
            <h3>{{ steps[0].title }}</h3>
            <p style="color:var(--muted);font-size:13px">{{ steps[0].desc }}</p>
            <div v-if="loading" style="color:var(--muted)">{{ t('loading') }}</div>
            <div v-else class="check-list">
              <div class="check-item">
                <span class="check-icon" :class="onboardingStatus.agent_ok ? 'ok' : 'warn'">
                  {{ onboardingStatus.agent_ok ? '✓' : '!' }}
                </span>
                <span>{{ t('onboarding_check_agent') }}: {{ onboardingStatus.agent_ok ? t('onboarding_check_agent_ready') : t('onboarding_check_agent_missing') }}</span>
              </div>
              <div class="check-item">
                <span class="check-icon" :class="onboardingStatus.provider_ok ? 'ok' : 'warn'">
                  {{ onboardingStatus.provider_ok ? '✓' : '!' }}
                </span>
                <span>{{ t('onboarding_check_provider') }}: {{ onboardingStatus.provider_ok ? t('onboarding_check_provider_ready') : t('onboarding_check_provider_pending') }}</span>
              </div>
              <div class="check-item">
                <span class="check-icon" :class="onboardingStatus.password_enabled ? 'ok' : 'neutral'">
                  {{ onboardingStatus.password_enabled ? '✓' : '–' }}
                </span>
                <span>{{ t('onboarding_check_password') }}: {{ onboardingStatus.password_enabled ? t('onboarding_check_password_enabled') : t('onboarding_check_password_disabled') }}</span>
              </div>
            </div>
          </div>

          <!-- Step 1: Provider setup -->
          <div v-if="currentStep === 1" class="onboarding-body">
            <h3>{{ steps[1].title }}</h3>
            <div class="settings-field">
              <label>{{ t('onboarding_provider_label') }}</label>
              <select v-model="providerChoice" class="settings-input">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom / OpenAI-compatible</option>
              </select>
            </div>
            <div class="settings-field">
              <label>{{ t('onboarding_api_key_label') }}</label>
              <input v-model="apiKey" type="password" class="settings-input" :placeholder="t('onboarding_api_key_placeholder')" />
            </div>
            <div v-if="providerChoice === 'custom'" class="settings-field">
              <label>{{ t('onboarding_base_url_label') }}</label>
              <input v-model="baseUrl" class="settings-input" :placeholder="t('onboarding_base_url_placeholder')" />
            </div>
          </div>

          <!-- Step 2: Workspace + model -->
          <div v-if="currentStep === 2" class="onboarding-body">
            <h3>{{ steps[2].title }}</h3>
            <div class="settings-field">
              <label>{{ t('onboarding_workspace_label') }}</label>
              <input v-model="workspacePath" class="settings-input" :placeholder="t('onboarding_workspace_placeholder')" />
            </div>
            <div class="settings-field">
              <label>{{ t('onboarding_model_label') }}</label>
              <select v-model="defaultModel" class="settings-input">
                <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
              </select>
            </div>
          </div>

          <!-- Step 3: Password -->
          <div v-if="currentStep === 3" class="onboarding-body">
            <h3>{{ steps[3].title }}</h3>
            <p style="font-size:13px;color:var(--muted)">{{ t('onboarding_notice_password_recommended') }}</p>
            <div class="settings-field">
              <label>{{ t('onboarding_password_label') }}</label>
              <input v-model="password" type="password" class="settings-input" :placeholder="t('onboarding_password_placeholder')" />
            </div>
          </div>

          <!-- Step 4: Finish -->
          <div v-if="currentStep === 4" class="onboarding-body">
            <h3>{{ steps[4].title }}</h3>
            <p style="font-size:13px;color:var(--muted)">{{ t('onboarding_notice_finish') }}</p>
          </div>

          <div v-if="error" style="color:var(--accent);font-size:12px;margin-top:8px">{{ error }}</div>

          <!-- Actions -->
          <div class="onboarding-actions">
            <button v-if="currentStep > 0" class="sm-btn" @click="prev">{{ t('onboarding_back') }}</button>
            <button class="sm-btn" style="margin-right:auto;opacity:.7" @click="skip">{{ t('onboarding_skip') }}</button>
            <button class="sm-btn primary" :disabled="loading" @click="next">
              {{ currentStep === 4 ? t('onboarding_open') : t('onboarding_continue') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboarding-card {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 16px;
  width: min(780px, 95vw);
  max-height: 85vh;
  overflow: hidden;
}
.onboarding-shell { display: flex; height: 100%; }
.onboarding-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface2, rgba(255,255,255,.03));
  border-right: 1px solid var(--border);
  padding: 24px 20px;
}
.onboarding-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--accent);
  margin-bottom: 12px;
  font-weight: 700;
}
.onboarding-sidebar h2 { font-size: 16px; margin: 0 0 8px; }
.onboarding-steps { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.onboarding-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}
.onboarding-step.active { color: var(--text); font-weight: 500; }
.onboarding-step.done { color: var(--muted); }
.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--surface3, rgba(255,255,255,.08));
  border: 1px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}
.onboarding-step.active .step-dot {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}
.onboarding-step.done .step-dot {
  background: transparent;
  border-color: var(--muted);
}
.onboarding-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}
.onboarding-body { flex: 1; }
.onboarding-body h3 { margin: 0 0 12px; font-size: 16px; }
.onboarding-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.check-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.check-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.check-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.check-icon.ok { background: rgba(74,222,128,.15); color: #4ade80; }
.check-icon.warn { background: rgba(251,191,36,.15); color: #fbbf24; }
.check-icon.neutral { background: rgba(255,255,255,.06); color: var(--muted); }
.settings-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.settings-field > label { font-size: 12px; color: var(--muted); }
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
</style>
