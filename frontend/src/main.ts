import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import router from './router'
import App from './App.vue'
import { i18nOptions } from './i18n'
import '@/assets/style.css'

const pinia = createPinia()
const i18n = createI18n(i18nOptions)

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
