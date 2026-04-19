// API client - all backend calls go through here

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  // Strip leading slash so URL resolves relative to location.href (supports subpath mounts)
  const rel = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(rel, location.href)

  const res = await fetch(url.href, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })

  if (!res.ok) {
    const text = await res.text()
    try {
      const j = JSON.parse(text)
      throw new ApiError(res.status, j.error || j.message || text)
    } catch (e: any) {
      if (e instanceof SyntaxError) throw new ApiError(res.status, text)
      throw e
    }
  }

  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text() as unknown as Promise<T>
}

export default apiFetch

// ── Auth ────────────────────────────────────────────────────────────────────
export async function login(password: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function logout() {
  return apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export async function getAuthStatus() {
  return apiFetch<{ auth_enabled: boolean; logged_in: boolean }>('/api/auth/status')
}

// ── Sessions ────────────────────────────────────────────────────────────────
export interface SessionSummary {
  session_id: string
  title: string
  workspace: string
  model: string
  message_count: number
  created_at: number
  updated_at: number
  pinned: boolean
  archived: boolean
  project_id: string | null
  profile: string | null
  personality: string | null
  is_cli_session: boolean
}

export interface SessionFull extends SessionSummary {
  messages: any[]
  tool_calls: any[]
  active_stream_id: string | null
  pending_user_message: string | null
  pending_attachments: any[] | null
  pending_started_at: number | null
}

export async function getSession(sessionId: string) {
  return apiFetch<{ session: SessionFull }>(
    `/api/session?session_id=${encodeURIComponent(sessionId)}`
  )
}

export async function getSessions() {
  return apiFetch<{ sessions: SessionSummary[]; cli_count: number }>('/api/sessions')
}

export async function searchSessions(q: string, content = true, depth = 5) {
  return apiFetch<{ sessions: any[]; query: string; count: number }>(
    `/api/sessions/search?q=${encodeURIComponent(q)}&content=${content ? 1 : 0}&depth=${depth}`
  )
}

export async function createNewSession(workspace?: string, model?: string) {
  const body: any = {}
  if (workspace) body.workspace = workspace
  if (model) body.model = model
  return apiFetch<{ session: SessionFull }>('/api/session/new', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function renameSession(sessionId: string, title: string) {
  return apiFetch<{ session: SessionSummary }>('/api/session/rename', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, title }),
  })
}

export async function updateSession(sessionId: string, workspace?: string, model?: string) {
  const body: any = { session_id: sessionId }
  if (workspace) body.workspace = workspace
  if (model) body.model = model
  return apiFetch<{ session: SessionFull }>('/api/session/update', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteSession(sessionId: string) {
  return apiFetch<{ ok: boolean }>('/api/session/delete', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
}

export async function clearSession(sessionId: string) {
  return apiFetch<{ ok: boolean; session: SessionSummary }>('/api/session/clear', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
}

export async function truncateSession(sessionId: string, keepCount: number) {
  return apiFetch<{ ok: boolean; session: SessionFull }>('/api/session/truncate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, keep_count: keepCount }),
  })
}

export async function exportSession(sessionId: string): Promise<Blob> {
  const rel = `/api/session/export?session_id=${encodeURIComponent(sessionId)}`
  const url = new URL(rel, location.href)
  const res = await fetch(url.href, { credentials: 'include' })
  return res.blob()
}

export async function importSession(data: any) {
  return apiFetch<{ ok: boolean; session: SessionFull }>('/api/session/import', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function pinSession(sessionId: string, pinned = true) {
  return apiFetch<{ ok: boolean; session: SessionSummary }>('/api/session/pin', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, pinned }),
  })
}

export async function archiveSession(sessionId: string, archived = true) {
  return apiFetch<{ ok: boolean; session: SessionSummary }>('/api/session/archive', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, archived }),
  })
}

export async function moveSession(sessionId: string, projectId: string | null) {
  return apiFetch<{ ok: boolean; session: SessionSummary }>('/api/session/move', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, project_id: projectId }),
  })
}

export async function cleanupZeroMessageSessions() {
  return apiFetch<{ ok: boolean; cleaned: number }>('/api/sessions/cleanup', {
    method: 'POST',
  })
}

// ── Chat ────────────────────────────────────────────────────────────────────
export async function startChat(
  sessionId: string,
  message: string,
  attachments?: string[],
  workspace?: string,
  model?: string
) {
  const body: any = { session_id: sessionId, message }
  if (attachments?.length) body.attachments = attachments
  if (workspace) body.workspace = workspace
  if (model) body.model = model
  return apiFetch<{ stream_id: string; session_id: string }>('/api/chat/start', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function createSSEStream(streamId: string): EventSource {
  const url = new URL(
    `api/chat/stream?stream_id=${encodeURIComponent(streamId)}`,
    location.href
  )
  return new EventSource(url.href, { withCredentials: true })
}

export async function cancelStream(streamId: string) {
  return apiFetch<{ ok: boolean; cancelled: boolean }>(
    `/api/chat/cancel?stream_id=${encodeURIComponent(streamId)}`
  )
}

export async function checkStreamStatus(streamId: string) {
  return apiFetch<{ active: boolean; stream_id: string }>(
    `/api/chat/stream/status?stream_id=${encodeURIComponent(streamId)}`
  )
}

export async function sendSyncChat(
  sessionId: string,
  message: string,
  attachments?: string[],
  workspace?: string,
  model?: string
) {
  const body: any = { session_id: sessionId, message }
  if (attachments?.length) body.attachments = attachments
  if (workspace) body.workspace = workspace
  if (model) body.model = model
  return apiFetch<{ answer: string; status: string; session: any; result: any }>(
    '/api/chat',
    { method: 'POST', body: JSON.stringify(body) }
  )
}

// ── Models ──────────────────────────────────────────────────────────────────
export async function getModels() {
  return apiFetch<{ groups: any[]; active_provider: string; default_model: string }>(
    '/api/models'
  )
}

export async function getLiveModels(provider: string) {
  return apiFetch<{ provider: string; models: any[]; count: number }>(
    `/api/models/live?provider=${encodeURIComponent(provider)}`
  )
}

// ── Settings ────────────────────────────────────────────────────────────────
export async function getSettings() {
  return apiFetch<any>('/api/settings')
}

export async function updateSettings(data: any) {
  return apiFetch<any>('/api/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ── Onboarding ──────────────────────────────────────────────────────────────
export async function getOnboardingStatus() {
  return apiFetch<{ completed: boolean }>('/api/onboarding/status')
}

export async function setupOnboarding(data: any) {
  return apiFetch<any>('/api/onboarding/setup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function completeOnboarding() {
  return apiFetch<{ ok: boolean }>('/api/onboarding/complete', { method: 'POST', body: '{}' })
}

// ── Workspaces ──────────────────────────────────────────────────────────────
export async function getWorkspaces() {
  return apiFetch<{ workspaces: { path: string; name: string }[]; last: string }>(
    '/api/workspaces'
  )
}

export async function addWorkspace(path: string, name?: string) {
  const body: any = { path }
  if (name) body.name = name
  return apiFetch<{ ok: boolean; workspaces: any[] }>('/api/workspaces/add', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function removeWorkspace(path: string) {
  return apiFetch<{ ok: boolean; workspaces: any[] }>('/api/workspaces/remove', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export async function renameWorkspace(path: string, name: string) {
  return apiFetch<{ ok: boolean; workspaces: any[] }>('/api/workspaces/rename', {
    method: 'POST',
    body: JSON.stringify({ path, name }),
  })
}

// ── Projects ────────────────────────────────────────────────────────────────
export async function getProjects() {
  return apiFetch<{ projects: { project_id: string; name: string; color: string; created_at: number }[] }>(
    '/api/projects'
  )
}

export async function createProject(name: string, color?: string) {
  const body: any = { name }
  if (color) body.color = color
  return apiFetch<{ ok: boolean; project: any }>('/api/projects/create', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function renameProject(projectId: string, name: string, color?: string) {
  const body: any = { project_id: projectId, name }
  if (color) body.color = color
  return apiFetch<{ ok: boolean; project: any }>('/api/projects/rename', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteProject(projectId: string) {
  return apiFetch<{ ok: boolean }>('/api/projects/delete', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  })
}

// ── Files ───────────────────────────────────────────────────────────────────
export async function listFiles(sessionId: string, path = '.') {
  return apiFetch<{ entries: { name: string; type: string; size: number; mtime: number }[]; path: string }>(
    `/api/list?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`
  )
}

export async function readFile(sessionId: string, path: string) {
  return apiFetch<{ content: string; path: string; size: number; mime: string }>(
    `/api/file?session_id=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`
  )
}

export function getRawFileUrl(sessionId: string, path: string, download = false) {
  const params = new URLSearchParams({
    session_id: sessionId,
    path,
  })
  if (download) params.set('download', '1')
  return `api/file/raw?${params.toString()}`
}

export async function deleteFile(sessionId: string, path: string) {
  return apiFetch<{ ok: boolean; path: string }>('/api/file/delete', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, path }),
  })
}

export async function saveFile(sessionId: string, path: string, content: string) {
  return apiFetch<{ ok: boolean; path: string; size: number }>('/api/file/save', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, path, content }),
  })
}

export async function createFile(sessionId: string, path: string, content = '') {
  return apiFetch<{ ok: boolean; path: string }>('/api/file/create', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, path, content }),
  })
}

export async function renameFile(sessionId: string, path: string, newName: string) {
  return apiFetch<{ ok: boolean; old_path: string; new_path: string }>('/api/file/rename', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, path, new_name: newName }),
  })
}

export async function createDir(sessionId: string, path: string) {
  return apiFetch<{ ok: boolean; path: string }>('/api/file/create-dir', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, path }),
  })
}

// ── Cron ────────────────────────────────────────────────────────────────────
export async function getCrons() {
  return apiFetch<{ jobs: any[] }>('/api/crons')
}

export async function createCron(data: { schedule: string; prompt: string; name?: string; deliver?: string; skills?: string[] }) {
  return apiFetch<{ ok: boolean; job: any }>('/api/crons/create', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCron(jobId: string, data: { schedule: string; prompt: string; name?: string }) {
  return apiFetch<{ ok: boolean; job: any }>('/api/crons/update', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId, ...data }),
  })
}

export async function deleteCron(jobId: string) {
  return apiFetch<{ ok: boolean }>('/api/crons/delete', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

export async function runCron(jobId: string) {
  return apiFetch<{ ok: boolean }>('/api/crons/run', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

export async function pauseCron(jobId: string) {
  return apiFetch<{ ok: boolean }>('/api/crons/pause', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

export async function resumeCron(jobId: string) {
  return apiFetch<{ ok: boolean }>('/api/crons/resume', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId }),
  })
}

export async function getCronOutput(jobId: string, limit = 1) {
  return apiFetch<{ outputs: { filename: string; content: string }[] }>(
    `/api/crons/output?job_id=${encodeURIComponent(jobId)}&limit=${limit}`
  )
}

// ── Skills ──────────────────────────────────────────────────────────────────
export async function getSkills() {
  return apiFetch<{ skills: { name: string; description: string; category: string }[] }>(
    '/api/skills'
  )
}

export async function getSkillContent(name: string, file?: string) {
  const params = new URLSearchParams({ name })
  if (file) params.set('file', file)
  return apiFetch<{ content: string; linked_files?: Record<string, string[]> }>(
    `/api/skills/content?${params.toString()}`
  )
}

export async function saveSkill(name: string, content: string, category?: string) {
  return apiFetch<{ ok: boolean }>('/api/skills/save', {
    method: 'POST',
    body: JSON.stringify({ name, content, category }),
  })
}

// ── Memory ──────────────────────────────────────────────────────────────────
export async function getMemory() {
  return apiFetch<{ memory: string; profile: string }>('/api/memory')
}

export async function writeMemory(section: string, content: string) {
  return apiFetch<{ ok: boolean }>('/api/memory/write', {
    method: 'POST',
    body: JSON.stringify({ section, content }),
  })
}

// ── Profiles ────────────────────────────────────────────────────────────────
export async function getProfiles() {
  return apiFetch<{ profiles: any[]; active: string }>('/api/profiles')
}

export async function switchProfile(name: string) {
  return apiFetch<{ ok: boolean; profile: any }>('/api/profiles/switch', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function createProfile(name: string, cloneFrom?: string, baseUrl?: string, apiKey?: string) {
  const body: any = { name }
  if (cloneFrom) body.clone_from = cloneFrom
  if (baseUrl) body.base_url = baseUrl
  if (apiKey) body.api_key = apiKey
  return apiFetch<{ ok: boolean; profile: any }>('/api/profiles/create', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteProfile(name: string) {
  return apiFetch<{ ok: boolean }>('/api/profiles/delete', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

// ── Personalities ───────────────────────────────────────────────────────────
export async function getPersonalities() {
  return apiFetch<{ personalities: { name: string; description: string }[] }>('/api/personalities')
}

export async function setPersonality(sessionId: string, name: string) {
  return apiFetch<{ ok: boolean }>('/api/personality/set', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, name }),
  })
}

// ── Misc ────────────────────────────────────────────────────────────────────
export async function getGitInfo(sessionId: string) {
  return apiFetch<{ git: { is_git: boolean; branch?: string; dirty?: number; behind?: number; ahead?: number } }>(
    `/api/git-info?session_id=${encodeURIComponent(sessionId)}`
  )
}

export async function getUpdateCheck() {
  return apiFetch<any>('/api/updates/check')
}

export async function getHealthCheck() {
  return apiFetch<{ ok: boolean; version: string }>('/api/health')
}

// ── Upload & Transcription ──────────────────────────────────────────────────
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('api/upload', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      const j = JSON.parse(text)
      throw new Error(j.error || text)
    } catch {
      throw new Error(text)
    }
  }
  const data = await res.json()
  return data.path
}

export async function transcribeAudio(file: File): Promise<{ transcript: string }> {
  const form = new FormData()
  form.append('file', new File([file], 'voice-input.webm', { type: file.type }))
  const res = await fetch('api/transcribe', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Transcription failed')
  }
  return res.json()
}
