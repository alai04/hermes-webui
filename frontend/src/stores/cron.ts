import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getCrons, createCron, updateCron, deleteCron, runCron, pauseCron, resumeCron, getCronOutput
} from '@/api'

export const useCronStore = defineStore('cron', () => {
  const jobs = ref<any[]>([])
  const isLoading = ref(false)

  async function loadCrons() {
    isLoading.value = true
    try {
      const data = await getCrons()
      jobs.value = data.jobs || []
    } finally {
      isLoading.value = false
    }
  }

  async function createJob(data: { schedule: string; prompt: string; name?: string; deliver?: string; skills?: string[] }) {
    await createCron(data)
    await loadCrons()
  }

  async function updateJob(jobId: string, data: { schedule: string; prompt: string; name?: string }) {
    await updateCron(jobId, data)
    await loadCrons()
  }

  async function removeJob(jobId: string) {
    await deleteCron(jobId)
    await loadCrons()
  }

  async function runNow(jobId: string) {
    await runCron(jobId)
  }

  async function togglePause(jobId: string, paused: boolean) {
    if (paused) await pauseCron(jobId)
    else await resumeCron(jobId)
    await loadCrons()
  }

  async function getOutput(jobId: string, limit = 1) {
    return getCronOutput(jobId, limit)
  }

  return {
    jobs,
    isLoading,
    loadCrons,
    createJob,
    updateJob,
    removeJob,
    runNow,
    togglePause,
    getOutput,
  }
})
