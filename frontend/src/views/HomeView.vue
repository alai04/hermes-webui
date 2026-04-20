<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSessionStore } from '@/stores/session'
import { useUIStore } from '@/stores/ui'
import { useGatewaySSE } from '@/composables/useGatewaySSE'
import AppLayout from '@/components/layout/AppLayout.vue'
import Toast from '@/components/shared/Toast.vue'

// Lazy-load heavy panels
const SettingsPanel = defineAsyncComponent(() => import('@/components/settings/SettingsPanel.vue'))
const OnboardingWizard = defineAsyncComponent(() => import('@/components/onboarding/OnboardingWizard.vue'))

const settingsStore = useSettingsStore()
const sessionStore = useSessionStore()
const uiStore = useUIStore()
const { startGatewaySSE } = useGatewaySSE()

onMounted(async () => {
  // Load settings (applies theme/skin to DOM)
  try {
    await settingsStore.loadSettings()
  } catch {
    // Settings load failed — defaults remain in place
  }

  // Load sessions list
  try {
    await sessionStore.fetchSessions()
  } catch {
    // Sessions load failed — empty list shown
  }

  // Restore last active session from localStorage
  const storedId = sessionStore.getStoredSessionId()
  if (storedId) {
    try {
      await sessionStore.loadSession(storedId)
    } catch {
      // Stored session no longer exists — start fresh
    }
  }

  // Start gateway SSE if CLI sessions are enabled
  if (settingsStore.showCliSessions) {
    startGatewaySSE()
  }
})
</script>

<template>
  <AppLayout>
    <!-- Main chat area slot — placeholder until ChatView is built -->
    <div class="messages">
      <div class="empty-state" v-if="!sessionStore.currentSession">
        <div class="empty-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="80" height="80" aria-label="Hermes caduceus">
            <defs>
              <linearGradient id="hermes-gold-home" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#F5C542;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#D4961C;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="30" y="10" width="4" height="46" rx="2" fill="url(#hermes-gold-home)" />
            <path d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20" fill="#F5C542" opacity="0.9" />
            <path d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24" fill="#D4961C" opacity="0.8" />
            <path d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20" fill="#F5C542" opacity="0.9" />
            <path d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24" fill="#D4961C" opacity="0.8" />
            <path d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42" fill="none" stroke="#F5C542" stroke-width="2.5" stroke-linecap="round" />
            <path d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42" fill="none" stroke="#D4961C" stroke-width="2.5" stroke-linecap="round" />
            <circle cx="32" cy="10" r="4" fill="#F5C542" />
            <circle cx="32" cy="10" r="2" fill="#FFF8E1" opacity="0.7" />
          </svg>
        </div>
        <h2>What can I help with?</h2>
        <p>Ask anything, run commands, explore files, or manage your scheduled tasks.</p>
      </div>
    </div>
  </AppLayout>

  <!-- Settings panel (lazy) -->
  <Suspense v-if="uiStore.settingsOpen">
    <SettingsPanel />
  </Suspense>

  <!-- Onboarding wizard (lazy) -->
  <Suspense v-if="uiStore.onboardingOpen">
    <OnboardingWizard />
  </Suspense>

  <!-- Global toast notifications -->
  <Toast />
</template>
