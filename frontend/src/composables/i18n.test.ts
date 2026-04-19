import { describe, it, expect } from 'vitest'
import { t, setLocale, getLocale, getAllLocales } from '@/composables/i18n'

describe('i18n', () => {
  it('returns English by default', () => {
    expect(getLocale()).toBe('en')
  })

  it('translates basic strings', () => {
    expect(t('copy')).toBe('Copy')
    expect(t('loading')).toBe('Loading...')
  })

  it('supports function translations', () => {
    expect(t('n_messages', 3)).toBe('3 messages')
    expect(t('n_messages', 1)).toBe('1 messages')
  })

  it('switches locale', () => {
    setLocale('zh')
    expect(t('copy')).toBe('复制')
    setLocale('en')
    expect(t('copy')).toBe('Copy')
  })

  it('returns all locales', () => {
    const locales = getAllLocales()
    expect(locales.length).toBeGreaterThanOrEqual(2)
    expect(locales.find(l => l.code === 'en')).toBeDefined()
    expect(locales.find(l => l.code === 'zh')).toBeDefined()
  })
})
