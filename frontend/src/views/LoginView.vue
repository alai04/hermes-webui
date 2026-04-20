<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '@/composables/useApi'

const router = useRouter()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!password.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: password.value }),
    })
    await router.push({ name: 'home' })
  } catch (err: any) {
    if (err?.status === 401) {
      error.value = 'Invalid password'
    } else {
      error.value = 'Connection failed'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Sign in</h1>
      <p class="login-subtitle">Enter your password to continue</p>
      <form @submit.prevent="handleLogin">
        <input
          v-model="password"
          type="password"
          class="login-input"
          placeholder="Password"
          autocomplete="current-password"
          autofocus
          :disabled="loading"
        />
        <p v-if="error" class="login-error" role="alert">{{ error }}</p>
        <button type="submit" class="login-btn" :disabled="loading || !password.trim()">
          {{ loading ? 'Signing in\u2026' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg, #fefcf7);
}

.login-card {
  background: var(--sidebar, #faf7f0);
  border: 1px solid var(--border, #e0d8c8);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--text, #1a1610);
}

.login-subtitle {
  font-size: 0.9rem;
  color: var(--muted, #5c5344);
  margin-bottom: 1.5rem;
}

.login-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--border, #e0d8c8);
  border-radius: 8px;
  background: var(--bg, #fefcf7);
  color: var(--text, #1a1610);
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus {
  border-color: var(--accent, #b8860b);
}

.login-error {
  color: #c0392b;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.login-btn {
  width: 100%;
  padding: 0.6rem 1rem;
  background: var(--accent, #b8860b);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.login-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
