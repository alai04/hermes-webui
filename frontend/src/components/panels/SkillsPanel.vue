<template>
  <div class="panel-view" id="panelSkills">
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between">
      <div class="skills-search" style="flex:1;padding:0">
        <input :placeholder="t('search_skills')" v-model="searchQuery" />
      </div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px;flex-shrink:0;margin-left:6px" @click="showForm = !showForm">
        + {{ t('new_skill') }}
      </button>
    </div>

    <div v-if="showForm" class="skill-create-form">
      <input v-model="form.name" placeholder="Skill name (e.g. my-skill)" />
      <input v-model="form.category" placeholder="Category (optional, e.g. devops)" />
      <textarea v-model="form.content" rows="6" placeholder="SKILL.md content (YAML frontmatter + markdown body)"></textarea>
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitSave">{{ t('save_skill') }}</button>
        <button class="cron-btn" style="flex:1" @click="showForm = false">{{ t('cancel') }}</button>
      </div>
      <div v-if="formError" class="form-error">{{ formError }}</div>
    </div>

    <div class="skills-list" v-if="!skillsLoading">
      <template v-for="(items, cat) in groupedSkills" :key="cat">
        <div class="skills-category">
          <div class="skills-cat-header">{{ cat }} ({{ items.length }})</div>
          <div v-for="skill in items" :key="skill.name" class="skill-item" @click="openSkill(skill.name)">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-desc">{{ skill.description }}</span>
          </div>
        </div>
      </template>
      <div v-if="!Object.keys(groupedSkills).length" style="padding:12px;color:var(--muted);font-size:12px">
        {{ t('skills_no_match') }}
      </div>
    </div>
    <div v-else style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { t } from '@/composables/i18n'

const sidebarStore = useSidebarStore()
const searchQuery = ref('')
const showForm = ref(false)
const form = ref({ name: '', category: '', content: '' })
const formError = ref('')

const skills = sidebarStore.skills
const skillsLoading = sidebarStore.skillsLoading

const groupedSkills = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const filtered = q
    ? skills.value.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      )
    : skills.value

  const cats: Record<string, typeof skills.value> = {}
  for (const s of filtered) {
    const cat = s.category || '(general)'
    if (!cats[cat]) cats[cat] = []
    cats[cat].push(s)
  }
  return Object.fromEntries(Object.entries(cats).sort())
})

async function openSkill(name: string) {
  try {
    const data = await sidebarStore.getSkillFile(name)
    // Could emit an event to show in workspace panel
    console.log('Skill content:', data)
  } catch (e: any) {
    console.error('Failed to load skill:', e.message)
  }
}

async function submitSave() {
  formError.value = ''
  const name = form.value.name.trim().toLowerCase().replace(/\s+/g, '-')
  if (!name) { formError.value = t('skill_name_required'); return }
  if (!form.value.content.trim()) { formError.value = t('content_required'); return }
  try {
    await sidebarStore.saveSkillData(name, form.value.content, form.value.category || undefined)
    showForm.value = false
    form.value = { name: '', category: '', content: '' }
  } catch (e: any) {
    formError.value = e.message
  }
}

onMounted(() => { sidebarStore.loadSkills() })
</script>
