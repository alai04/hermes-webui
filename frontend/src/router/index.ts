import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  // Skip guard for the login page itself to avoid redirect loops
  if (to.name === 'login') return true

  try {
    const res = await fetch('/api/auth/status', { credentials: 'include' })
    if (!res.ok) return true // If auth check fails, allow navigation
    const data: { auth_enabled: boolean; logged_in: boolean } = await res.json()
    if (data.auth_enabled && !data.logged_in) {
      return { name: 'login' }
    }
  } catch {
    // Network error — allow navigation, the app will show an appropriate state
  }
  return true
})

export default router
