import type { I18nOptions } from 'vue-i18n'
import en from './locales/en'

export const i18nOptions: I18nOptions = {
  legacy: false,          // use Composition API mode
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
}
