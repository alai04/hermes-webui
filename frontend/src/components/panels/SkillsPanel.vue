<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPost } from '@/composables/useApi'
import { renderMarkdown } from '@/utils/markdown'

const { t } = useI18n()

interface Skill {
  name: string
  category?: string
  description?: string
}

const skills = ref<Skill[]>([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const showCreateForm = ref(false)
const editingSkillName = ref<string | null>(null)

// Form state
const formName = ref('')
const formCategory = ref('')
const formContent = ref('')
const formError = ref('')

// Viewer
const viewerContent = ref<string | null>(null)
const viewerSkillName = ref<string | null>(null)
const viewerLoading = ref(false)
const activeSkill = ref<string | null>(null)

const filteredSkills = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return skills.value
  return skills.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q)
  )
})

const groupedSkills = computed(() => {
  const groups: Record<string, Skill[]> = {}
  for (const s of filteredSkills.value) {
    const cat = s.category || '(general)'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(s)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
})

async function loadSkills() {
  loading.value = true
  error.value = ''
  try {
    const data = await apiGet('/api/skills')
    skills.value = data.skills ?? []
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function openSkill(name: string) {
  activeSkill.value = name
  viewerSkillName.value = name
  viewerLoading.value = true
  viewerContent.value = null
  try {
    const data = await apiGet('/api/skills/content', { name })
    viewerContent.value = data.content ?? ''
  } catch (e: any) {
    viewerContent.value = `Error: ${e.message}`
  } finally {
    viewerLoading.value = false
  }
}

async function deleteSkill(name: string) {
  if (!confirm(t('delete_confirm', { name }))) return
  try {
    await apiPost('/api/skills/delete', { name })
    if (activeSkill.value === name) {
      activeSkill.value = null
      viewerContent.value = null
      viewerSkillName.value = null
    }
    await loadSkills()
  } catch (e: any) {
    alert(e.message)
  }
}

function toggleCreateForm(prefillName?: string, prefillCategory?: string, prefillContent?: string) {
  if (showCreateForm.value && !prefillName) {
    showCreateForm.value = false
    editingSkillName.value = null
    return
  }
  formName.value = prefillName ?? ''
  formCategory.value = prefillCategory ?? ''
  formContent.value = prefillContent ?? ''
  formError.value = ''
  editingSkillName.value = prefillName ?? null
  showCreateForm.value = true
}

async function submitSave() {
  const name = formName.value.trim().toLowerCase().replace(/\s+/g, '-')
  const category = formCategory.value.trim()
  const content = formContent.value
  formError.value = ''
  if (!name) { formError.value = t('skill_name_required'); return }
  if (!content.trim()) { formError.value = t('content_required', 'Content is required'); return }
  try {
    await apiPost('/api/skills/save', { name, category: category || undefined, content })
    showCreateForm.value = false
    editingSkillName.value = null
    await loadSkills()
  } catch (e: any) {
    formError.value = e.message
  }
}

function closeViewer() {
  viewerContent.value = null
  viewerSkillName.value = null
  activeSkill.value = null
}

onMounted(loadSkills)
</script>

<template>
  <div class="panel-view" style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <!-- Header -->
    <div class="sidebar-section" style="padding-bottom:4px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div class="skills-search" style="flex:1;padding:0">
        <input
          v-model="searchQuery"
          :placeholder="t('search_skills')"
          style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;box-sizing:border-box"
        />
      </div>
      <button class="cron-btn run" style="padding:3px 8px;font-size:10px;flex-shrink:0;margin-left:6px" @click="toggleCreateForm()">
        + {{ t('new_skill') }}
      </button>
    </div>

    <!-- Create/Edit form -->
    <div v-if="showCreateForm" style="padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0">
      <input
        v-model="formName"
        :placeholder="t('skill_name_placeholder', 'Skill name (e.g. my-skill)')"
        :disabled="!!editingSkillName"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <input
        v-model="formCategory"
        :placeholder="t('skill_category_placeholder', 'Category (optional, e.g. devops)')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;margin-bottom:6px;box-sizing:border-box"
      />
      <textarea
        v-model="formContent"
        rows="6"
        :placeholder="t('skill_content_placeholder', 'SKILL.md content (YAML frontmatter + markdown body)')"
        style="width:100%;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:5px 8px;font-size:12px;outline:none;resize:vertical;font-family:'SF Mono',ui-monospace,monospace;margin-bottom:6px;box-sizing:border-box"
      />
      <div style="display:flex;gap:6px">
        <button class="cron-btn run" style="flex:1" @click="submitSave">{{ t('save_skill') }}</button>
        <button class="cron-btn" style="flex:1" @click="toggleCreateForm()">{{ t('cancel') }}</button>
      </div>
      <div v-if="formError" style="font-size:11px;color:var(--accent);margin-top:6px">{{ formError }}</div>
    </div>

    <!-- Skill viewer -->
    <div v-if="viewerSkillName !== null" style="flex:1;overflow-y:auto;padding:8px 12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--text)">{{ viewerSkillName }}</span>
        <div style="display:flex;gap:6px">
          <button
            class="cron-btn run"
            style="padding:2px 8px;font-size:10px"
            @click="toggleCreateForm(viewerSkillName!, skills.find(s=>s.name===viewerSkillName)?.category, viewerContent ?? '')"
          >
            ✎ {{ t('edit') }}
          </button>
          <button class="cron-btn" style="padding:2px 8px;font-size:10px" @click="closeViewer">✕</button>
        </div>
      </div>
      <div v-if="viewerLoading" style="color:var(--muted);font-size:12px">{{ t('loading') }}</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else class="preview-area" style="font-size:13px;line-height:1.6" v-html="renderMarkdown(viewerContent ?? '')" />
    </div>

    <!-- Skill list -->
    <div v-else class="skills-list" style="flex:1;overflow-y:auto">
      <div v-if="loading" style="padding:12px;color:var(--muted);font-size:12px">{{ t('loading') }}</div>
      <div v-else-if="error" style="padding:12px;color:var(--accent);font-size:12px">{{ error }}</div>
      <div v-else-if="!filteredSkills.length" style="padding:12px;color:var(--muted);font-size:12px">{{ t('skills_no_match') }}</div>
      <template v-else>
        <div v-for="[cat, items] in groupedSkills" :key="cat" class="skills-category">
          <div class="skills-cat-header" style="padding:6px 12px;font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:4px">
            📁 {{ cat }}
            <span style="opacity:.5">({{ items.length }})</span>
          </div>
          <div
            v-for="skill in items.sort((a, b) => a.name.localeCompare(b.name))"
            :key="skill.name"
            :class="['skill-item', { active: activeSkill === skill.name }]"
            style="padding:6px 12px;cursor:pointer;display:flex;align-items:flex-start;justify-content:space-between;gap:8px"
            @click="openSkill(skill.name)"
          >
            <div style="min-width:0;flex:1">
              <span class="skill-name" style="font-size:12px;font-weight:500;color:var(--text);display:block">{{ skill.name }}</span>
              <span v-if="skill.description" class="skill-desc" style="font-size:11px;color:var(--muted);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ skill.description }}</span>
            </div>
            <button
              class="cron-btn"
              style="padding:1px 6px;font-size:10px;flex-shrink:0;opacity:.6"
              @click.stop="deleteSkill(skill.name)"
            >
              🗑
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
