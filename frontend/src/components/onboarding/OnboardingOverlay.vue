<template>
  <Teleport to="body">
    <div class="onboarding-overlay" v-if="visible">
      <div class="onboarding-dialog">
        <div class="onboarding-header">
          <span class="onboarding-badge">{{ t('onboarding_badge') }}</span>
          <h2>{{ t('onboarding_title') }}</h2>
          <p>{{ t('onboarding_lead') }}</p>
        </div>

        <!-- Steps indicator -->
        <div class="onboarding-steps">
          <div v-for="(step, idx) in steps" :key="step"
            class="onboarding-step-item"
            :class="{ active: currentStep === idx, done: currentStep > idx }">
            <span class="step-num">{{ idx + 1 }}</span>
            <span class="step-title">{{ stepTitles[step] }}</span>
          </div>
        </div>

        <!-- Step content -->
        <div class="onboarding-body">
          <!-- System check -->
          <div v-if="currentStep === 0" class="onboarding-system-check">
            <div class="check-item" :class="{ ok: systemOk, warn: !systemOk }">
              <strong>Hermes Agent</strong>
              <span>{{ systemOk ? 'Detected' : 'Missing' }}</span>
            </div>
          </div>

          <!-- Provider setup -->
          <div v-if="currentStep === 1" class="onboarding-provider">
            <label>
              <span>Provider</span>
              <select v-model="form.provider">
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label v-if="form.provider !== 'anthropic' && form.provider !== 'openai'">
              <span>API Key</span>
              <input type="password" v-model="form.apiKey" placeholder="Leave blank to keep existing" />
            </label>
            <label v-if="form.provider === 'custom'">
              <span>Base URL</span>
              <input v-model="form.baseUrl" placeholder="https://your-endpoint/v1" />
            </label>
            <label>
              <span>Default Model</span>
              <input v-model="form.model" placeholder="e.g. openai/gpt-4o" />
            </label>
          </div>

          <!-- Workspace -->
          <div v-if="currentStep === 2" class="onboarding-workspace">
            <label>
              <span>Workspace</span>
              <input v-model="form.workspace" placeholder="/home/user/workspace" />
            </label>
          </div>

          <!-- Password -->
          <div v-if="currentStep === 3" class="onboarding-password">
            <label>
              <span>Password (optional)</span>
              <input type="password" v-model="form.password" placeholder="Leave blank to skip" />
            </label>
          </div>

          <!-- Finish -->
          <div v-if="currentStep === 4" class="onboarding-finish">
            <p>You're all set! Click "Open Hermes" to enter the app.</p>
          </div>
        </div>

        <div class="onboarding-footer">
          <button v-if="currentStep > 0" @click="prevStep">{{ t('onboarding_back') }}</button>
          <button @click="skip">{{ t('onboarding_skip') }}</button>
          <button class="primary" @click="nextStep">
            {{ currentStep === 4 ? t('onboarding_open') : t('onboarding_continue') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '@/composables/i18n'
import { setupOnboarding, completeOnboarding } from '@/api'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ complete: [], skip: [] }>()

const steps = ['system', 'provider', 'workspace', 'password', 'finish']
const stepTitles = ['System Check', 'Provider Setup', 'Workspace', 'Password', 'Finish']
const currentStep = ref(0)
const systemOk = ref(true)

const form = ref({
  provider: 'openrouter',
  model: 'openai/gpt-4o',
  workspace: '',
  password: '',
  apiKey: '',
  baseUrl: '',
})

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

async function nextStep() {
  if (currentStep.value === 4) {
    // Finish
    try {
      await setupOnboarding({
        provider: form.value.provider,
        model: form.value.model,
        api_key: form.value.apiKey || undefined,
        base_url: form.value.baseUrl || undefined,
      })
      await completeOnboarding()
      emit('complete')
    } catch (e: any) {
      alert(e.message)
    }
    return
  }
  currentStep.value++
}

async function skip() {
  try {
    await completeOnboarding()
    emit('skip')
  } catch {}
}
</script>
