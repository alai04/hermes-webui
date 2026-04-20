/**
 * Theme and skin utilities — ported from static/boot.js.
 * Handles flash-free theme application and skin CSS variables.
 */

export interface SkinDef {
  id: string
  label: string
  accent: string
  gold: string
  blue: string
}

export const SKINS: SkinDef[] = [
  { id: 'default',   label: 'Default',   accent: '#B8860B', gold: '#8B6508', blue: '#0288A8' },
  { id: 'ares',      label: 'Ares',      accent: '#C0392B', gold: '#922B21', blue: '#1A5276' },
  { id: 'mono',      label: 'Mono',      accent: '#888888', gold: '#555555', blue: '#444444' },
  { id: 'slate',     label: 'Slate',     accent: '#5B7FA6', gold: '#3D5A80', blue: '#2E86AB' },
  { id: 'poseidon',  label: 'Poseidon',  accent: '#1E8BC3', gold: '#1A6898', blue: '#117A65' },
  { id: 'sisyphus',  label: 'Sisyphus',  accent: '#E67E22', gold: '#CA6F1E', blue: '#2874A6' },
  { id: 'charizard', label: 'Charizard', accent: '#E74C3C', gold: '#C0392B', blue: '#F39C12' },
]

const VALID_THEMES = new Set(['light', 'dark', 'system'])
const VALID_SKINS = new Set(SKINS.map((s) => s.id))

// Legacy theme name migration (matches boot.js inline script)
const LEGACY_THEME_MAP: Record<string, [string, string]> = {
  slate:     ['dark', 'slate'],
  solarized: ['dark', 'poseidon'],
  monokai:   ['dark', 'sisyphus'],
  nord:      ['dark', 'slate'],
  oled:      ['dark', 'default'],
}

/**
 * Normalise a raw theme/skin pair (handling legacy names).
 * Returns a guaranteed-valid { theme, skin } pair.
 */
export function normalizeAppearance(
  rawTheme: string,
  rawSkin: string
): { theme: string; skin: string } {
  const t = (rawTheme ?? '').toLowerCase()
  const s = (rawSkin ?? '').toLowerCase()

  const legacy = LEGACY_THEME_MAP[t]
  if (legacy) {
    return { theme: legacy[0], skin: legacy[1] }
  }
  return {
    theme: VALID_THEMES.has(t) ? t : 'dark',
    skin:  VALID_SKINS.has(s)  ? s : 'default',
  }
}

/**
 * Apply the given theme to the document root.
 * Resolves 'system' via matchMedia.
 * Persists choice to localStorage.
 */
export function applyTheme(theme: string): void {
  const { theme: normalizedTheme } = normalizeAppearance(theme, '')

  try {
    localStorage.setItem('hermes-theme', normalizedTheme)
  } catch {
    // Storage unavailable — continue
  }

  let effective = normalizedTheme
  if (effective === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  if (effective === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

/**
 * Apply the given skin by setting a data attribute on the document root.
 * Persists choice to localStorage.
 */
export function applySkin(skin: string): void {
  const { skin: normalizedSkin } = normalizeAppearance('dark', skin)

  try {
    localStorage.setItem('hermes-skin', normalizedSkin)
  } catch {
    // Storage unavailable — continue
  }

  if (normalizedSkin === 'default') {
    delete document.documentElement.dataset.skin
  } else {
    document.documentElement.dataset.skin = normalizedSkin
  }
}

/**
 * Read current appearance from localStorage (for SSR/initial mount).
 */
export function readStoredAppearance(): { theme: string; skin: string } {
  try {
    const rawTheme = localStorage.getItem('hermes-theme') ?? 'dark'
    const rawSkin  = localStorage.getItem('hermes-skin')  ?? 'default'
    return normalizeAppearance(rawTheme, rawSkin)
  } catch {
    return { theme: 'dark', skin: 'default' }
  }
}
