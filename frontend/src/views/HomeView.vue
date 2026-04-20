<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useSessionStore } from '@/stores/session'
import { useUIStore } from '@/stores/ui'
import { useGatewaySSE } from '@/composables/useGatewaySSE'
import AppLayout from '@/components/layout/AppLayout.vue'
import Toast from '@/components/shared/Toast.vue'
import Composer from '@/components/composer/Composer.vue'
import MessageList from '@/components/chat/MessageList.vue'

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
    <!-- Main chat area -->
    <div class="messages">
      <MessageList />
    </div>
    <!-- Composer input -->
    <Composer />
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
