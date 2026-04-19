import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getSkills, getSkillContent, saveSkill,
  getMemory, writeMemory,
  getWorkspaces, addWorkspace, removeWorkspace, renameWorkspace,
  getProfiles, createProfile, deleteProfile, switchProfile,
} from '@/api'

export const useSidebarStore = defineStore('sidebar', () => {
  // Skills
  const skills = ref<any[]>([])
  const skillsLoading = ref(false)

  async function loadSkills() {
    skillsLoading.value = true
    try {
      const data = await getSkills()
      skills.value = data.skills || []
    } finally {
      skillsLoading.value = false
    }
  }

  async function getSkillFile(name: string, file?: string) {
    return getSkillContent(name, file)
  }

  async function saveSkillData(name: string, content: string, category?: string) {
    await saveSkill(name, content, category)
    await loadSkills()
  }

  // Memory
  const memoryData = ref<{ memory: string; profile: string } | null>(null)
  const memoryLoading = ref(false)

  async function loadMemory() {
    memoryLoading.value = true
    try {
      memoryData.value = await getMemory()
    } finally {
      memoryLoading.value = false
    }
  }

  async function saveMemory(section: string, content: string) {
    await writeMemory(section, content)
    await loadMemory()
  }

  // Workspaces
  const workspaces = ref<{ path: string; name: string }[]>([])
  const lastWorkspace = ref('')

  async function loadWorkspaces() {
    const data = await getWorkspaces()
    workspaces.value = data.workspaces || []
    lastWorkspace.value = data.last || ''
  }

  async function addWs(path: string, name?: string) {
    await addWorkspace(path, name)
    await loadWorkspaces()
  }

  async function removeWs(path: string) {
    await removeWorkspace(path)
    await loadWorkspaces()
  }

  async function renameWs(path: string, name: string) {
    await renameWorkspace(path, name)
    await loadWorkspaces()
  }

  // Profiles
  const profiles = ref<any[]>([])
  const activeProfile = ref('default')

  async function loadProfiles() {
    const data = await getProfiles()
    profiles.value = data.profiles || []
    activeProfile.value = data.active || 'default'
  }

  async function switchToProfile(name: string) {
    await switchProfile(name)
    activeProfile.value = name
  }

  async function addProfile(name: string, cloneFrom?: string, baseUrl?: string, apiKey?: string) {
    await createProfile(name, cloneFrom, baseUrl, apiKey)
    await loadProfiles()
  }

  async function removeProfile(name: string) {
    await deleteProfile(name)
    await loadProfiles()
  }

  return {
    skills, skillsLoading, loadSkills, getSkillFile, saveSkillData,
    memoryData, memoryLoading, loadMemory, saveMemory,
    workspaces, lastWorkspace, loadWorkspaces, addWs, removeWs, renameWs,
    profiles, activeProfile, loadProfiles, switchToProfile, addProfile, removeProfile,
  }
})
