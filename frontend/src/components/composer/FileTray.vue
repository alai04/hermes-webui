<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  files: File[]
}>()

const emit = defineEmits<{
  (e: 'remove', index: number): void
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

function getObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}

const previews = computed(() => {
  return props.files.map((f) => ({
    file: f,
    isImg: isImage(f),
    src: isImage(f) ? getObjectUrl(f) : '',
  }))
})
</script>

<template>
  <div
    class="attach-tray file-tray"
    :class="{ 'has-files': files.length > 0 }"
  >
    <div
      v-for="(item, idx) in previews"
      :key="idx"
      class="attach-chip"
    >
      <img
        v-if="item.isImg"
        :src="item.src"
        class="attach-thumb"
        :alt="item.file.name"
      />
      <span v-else class="attach-chip-icon" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
      </span>
      <span class="attach-chip-name" :title="item.file.name">
        {{ item.file.name.length > 20 ? item.file.name.slice(0, 18) + '\u2026' : item.file.name }}
      </span>
      <span class="attach-chip-size">{{ formatSize(item.file.size) }}</span>
      <button
        class="attach-chip-remove"
        :title="`Remove ${item.file.name}`"
        @click="emit('remove', idx)"
        type="button"
        aria-label="Remove file"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.attach-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--hover-bg, rgba(255,255,255,0.06));
  border: 1px solid var(--border2, rgba(255,255,255,0.1));
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text);
  max-width: 180px;
}
.attach-thumb {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.attach-chip-icon {
  display: inline-flex;
  align-items: center;
  color: var(--muted);
  flex-shrink: 0;
}
.attach-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.attach-chip-size {
  color: var(--muted);
  flex-shrink: 0;
  font-size: 10px;
}
.attach-chip-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 1px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.12s;
}
.attach-chip-remove:hover {
  color: var(--error, #ef5350);
}
</style>
