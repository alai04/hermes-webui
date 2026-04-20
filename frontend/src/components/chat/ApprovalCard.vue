<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStreamingStore } from '@/stores/streaming'

const { t } = useI18n()
const streamingStore = useStreamingStore()

const responding = ref(false)

async function respond(choice: 'once' | 'session' | 'always' | 'deny') {
  const approval = streamingStore.pendingApproval
  const sessionId = streamingStore.pendingSessionId
  if (!approval || !sessionId || responding.value) return

  responding.value = true
  try {
    await fetch('/api/approval/respond', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        choice,
        approval_id: approval.approval_id ?? approval.id,
      }),
    })
    // Clear the pending approval optimistically
    streamingStore.pendingApproval = null
  } catch (err) {
    console.error('[ApprovalCard] respond error:', err)
  } finally {
    responding.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!streamingStore.pendingApproval) return
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    respond('once')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="streamingStore.pendingApproval"
    class="approval-card visible"
    role="alertdialog"
    aria-labelledby="approvalHeadingVue"
    aria-describedby="approvalDescVue"
  >
    <div class="approval-inner">
      <div class="approval-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span id="approvalHeadingVue">{{ t('approval_heading') }}</span>
      </div>
      <div class="approval-desc" id="approvalDescVue">
        {{ (streamingStore.pendingApproval as Record<string, unknown>).description as string
          ?? t('approval_desc_prefix') }}
      </div>
      <div
        v-if="(streamingStore.pendingApproval as Record<string, unknown>).command || (streamingStore.pendingApproval as Record<string, unknown>).pattern"
        class="approval-cmd"
      >
        {{ (streamingStore.pendingApproval as Record<string, unknown>).command
          ?? (streamingStore.pendingApproval as Record<string, unknown>).pattern }}
      </div>
      <div class="approval-btns">
        <button
          class="approval-btn once"
          :disabled="responding"
          :title="t('approval_btn_once_title')"
          @click="respond('once')"
        >
          <span class="approval-btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <span class="approval-btn-label">{{ t('approval_btn_once') }}</span>
          <kbd class="approval-kbd">&#8629;</kbd>
        </button>
        <button
          class="approval-btn session"
          :disabled="responding"
          :title="t('approval_btn_session_title')"
          @click="respond('session')"
        >
          <span class="approval-btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <span class="approval-btn-label">{{ t('approval_btn_session') }}</span>
        </button>
        <button
          class="approval-btn always"
          :disabled="responding"
          :title="t('approval_btn_always_title')"
          @click="respond('always')"
        >
          <span class="approval-btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
          <span class="approval-btn-label">{{ t('approval_btn_always') }}</span>
        </button>
        <button
          class="approval-btn deny"
          :disabled="responding"
          :title="t('approval_btn_deny_title')"
          @click="respond('deny')"
        >
          <span class="approval-btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
          <span class="approval-btn-label">{{ t('approval_btn_deny') }}</span>
        </button>
      </div>
      <div v-if="responding" class="approval-responding">{{ t('approval_responding') }}</div>
    </div>
  </div>
</template>
