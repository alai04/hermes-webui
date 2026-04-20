<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  path: string
  sessionId: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

interface Segment {
  label: string
  path: string
  clickable: boolean
}

const segments = computed<Segment[]>(() => {
  const result: Segment[] = [{ label: '~', path: '.', clickable: true }]
  if (!props.path || props.path === '.') return result

  const parts = props.path.split('/').filter(Boolean)
  let accumulated = ''
  for (let i = 0; i < parts.length; i++) {
    accumulated += (accumulated ? '/' : '') + parts[i]
    result.push({
      label: parts[i],
      path: accumulated,
      clickable: i < parts.length - 1,
    })
  }
  return result
})

function navigate(seg: Segment) {
  if (!seg.clickable) return
  emit('navigate', seg.path)
}
</script>

<template>
  <div
    id="breadcrumbBar"
    style="display:flex;align-items:center;gap:0;flex:1;overflow:hidden;font-size:12px;min-width:0"
  >
    <template v-for="(seg, idx) in segments" :key="seg.path">
      <span
        v-if="idx > 0"
        class="breadcrumb-sep"
        style="color:var(--muted);margin:0 1px;flex-shrink:0"
      >/</span>
      <span
        :class="[seg.clickable ? 'breadcrumb-seg breadcrumb-link' : 'breadcrumb-seg breadcrumb-current']"
        :style="{
          cursor: seg.clickable ? 'pointer' : 'default',
          color: seg.clickable ? 'var(--link, var(--accent))' : 'var(--text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '120px',
          flexShrink: idx === segments.length - 1 ? 1 : 0,
        }"
        :title="seg.path"
        @click="navigate(seg)"
      >{{ seg.label }}</span>
    </template>
  </div>
</template>
