import { ref } from 'vue'
import { apiGet } from './useApi'

export interface Command {
  name: string
  description: string
  category: 'builtin' | 'skill'
}

// Built-in slash commands
const BUILTIN_COMMANDS: Command[] = [
  { name: '/help', description: 'Show available commands', category: 'builtin' },
  { name: '/clear', description: 'Clear conversation messages', category: 'builtin' },
  { name: '/compress', description: 'Manually compress conversation context (usage: /compress [focus topic])', category: 'builtin' },
  { name: '/model', description: 'Switch model (e.g. /model gpt-4o)', category: 'builtin' },
  { name: '/workspace', description: 'Switch workspace by name', category: 'builtin' },
  { name: '/new', description: 'Start a new chat session', category: 'builtin' },
  { name: '/usage', description: 'Toggle token usage display on/off', category: 'builtin' },
  { name: '/theme', description: 'Switch appearance (theme: system/dark/light, skin: default/ares/mono/slate/poseidon/sisyphus/charizard)', category: 'builtin' },
  { name: '/personality', description: 'Switch agent personality', category: 'builtin' },
  { name: '/skills', description: 'List available Hermes skills', category: 'builtin' },
  { name: '/stop', description: 'Stop the current response', category: 'builtin' },
  { name: '/title', description: 'Get or set the session title', category: 'builtin' },
  { name: '/retry', description: 'Resend the last message', category: 'builtin' },
  { name: '/undo', description: 'Remove the last exchange', category: 'builtin' },
  { name: '/status', description: 'Show session info', category: 'builtin' },
  { name: '/voice', description: 'Toggle microphone input', category: 'builtin' },
]

// Lazy-loaded skill commands cache
const skillCommands = ref<Command[]>([])
let skillsFetched = false

async function loadSkillCommands(): Promise<void> {
  if (skillsFetched) return
  skillsFetched = true
  try {
    const data = await apiGet('/api/skills')
    const skills: Array<{ name: string; description?: string }> = data.skills ?? []
    skillCommands.value = skills.map((s) => ({
      name: `/${s.name}`,
      description: s.description ?? '',
      category: 'skill' as const,
    }))
  } catch {
    // Skills load failed — builtin commands still available
  }
}

/**
 * Simple fuzzy match: all characters of the prefix appear in-order in candidate.
 */
function fuzzyMatch(candidate: string, prefix: string): boolean {
  const lower = candidate.toLowerCase()
  const p = prefix.toLowerCase()
  let idx = 0
  for (const ch of p) {
    const found = lower.indexOf(ch, idx)
    if (found === -1) return false
    idx = found + 1
  }
  return true
}

/**
 * Returns commands matching the given prefix string (with or without leading slash).
 * Lazily fetches skill commands on first call.
 */
export async function getMatchingCommands(prefix: string): Promise<Command[]> {
  // Load skill commands in the background (non-blocking first call)
  loadSkillCommands()

  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`
  const allCommands = [...BUILTIN_COMMANDS, ...skillCommands.value]

  return allCommands.filter(
    (cmd) =>
      cmd.name.startsWith(normalized) ||
      fuzzyMatch(cmd.name, normalized)
  )
}

/**
 * Synchronous version using only already-cached commands.
 */
export function getMatchingCommandsSync(prefix: string): Command[] {
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`
  const allCommands = [...BUILTIN_COMMANDS, ...skillCommands.value]
  return allCommands.filter(
    (cmd) =>
      cmd.name.startsWith(normalized) ||
      fuzzyMatch(cmd.name, normalized)
  )
}

/**
 * Composable form — returns reactive state.
 */
export function useCommands() {
  return {
    builtinCommands: BUILTIN_COMMANDS,
    skillCommands,
    getMatchingCommands,
    getMatchingCommandsSync,
    loadSkillCommands,
  }
}
