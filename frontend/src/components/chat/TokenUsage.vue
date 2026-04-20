<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export interface UsageData {
  input_tokens?: number
  output_tokens?: number
  cache_read_tokens?: number
  cost_usd?: number
  [key: string]: unknown
}

const props = defineProps<{
  usage: UsageData
}>()

const settingsStore = useSettingsStore()

const show = computed(() => settingsStore.showTokenUsage)

const formattedCost = computed(() => {
  if (props.usage.cost_usd == null) return ''
  const cost = props.usage.cost_usd
  if (cost < 0.001) return `<$0.001`
  return `$${cost.toFixed(4)}`
})

function fmt(n: number | undefined): string {
  if (n == null) return '0'
  return n.toLocaleString()
}
</script>

<template>
  <div v-if="show" class="msg-usage">
    <span v-if="usage.input_tokens != null">
      in&nbsp;{{ fmt(usage.input_tokens) }}
    </span>
    <span v-if="usage.output_tokens != null">
      &nbsp;/ out&nbsp;{{ fmt(usage.output_tokens) }}
    </span>
    <span v-if="usage.cache_read_tokens != null && usage.cache_read_tokens > 0">
      &nbsp;/ cache&nbsp;{{ fmt(usage.cache_read_tokens) }}
    </span>
    <span v-if="formattedCost">
      &nbsp;&middot;&nbsp;{{ formattedCost }}
    </span>
  </div>
</template>
