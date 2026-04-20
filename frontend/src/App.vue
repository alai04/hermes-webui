<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { readStoredAppearance, applyTheme, applySkin } from '@/utils/theme'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

onMounted(() => {
  // Apply the stored theme and skin immediately on mount (flash prevention
  // is handled by the inline script in index.html, but we re-apply here
  // so the Vue reactive state stays in sync).
  const { theme, skin } = readStoredAppearance()
  applyTheme(theme)
  applySkin(skin)

  // Restore workspace panel state from localStorage
  uiStore.initWorkspacePanelFromStorage()
})
</script>

<template>
  <RouterView />
  <!-- Global toast portal — components Teleport their toasts here -->
  <Teleport to="body">
    <div id="toast-portal" aria-live="polite" aria-atomic="false" />
  </Teleport>
</template>
