<template>
  <div class="topbar">
    <button class="mobile-hamburger" @click="$emit('toggle-mobile')" title="Menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div style="flex:1;min-width:0;overflow:hidden">
      <div class="topbar-title">{{ sessionTitle }}</div>
      <div class="topbar-meta">{{ sessionMeta }}</div>
    </div>
    <div class="topbar-chips">
      <button class="chip" @click="$emit('toggle-workspace-panel')" :class="{ active: workspacePanelOpen }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="workspace-toggle-label">Files</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sessionTitle: string
  sessionMeta: string
  workspacePanelOpen: boolean
}>()
defineEmits<{
  'toggle-mobile': []
  'toggle-workspace-panel': []
  'show-settings': []
}>()
</script>
