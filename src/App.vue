<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { AuthMode, AuthSession } from '../shared/auth-types'
import AuthPanel from './components/AuthPanel.vue'
import UserPanel from './components/UserPanel.vue'
import styles from './App.module.css'

const session = ref<AuthSession | null>(null)
const loading = ref(true)
const authLoading = ref(false)
const error = ref<string | null>(null)

let unsubscribeSession: (() => void) | null = null

onMounted(async () => {
  if (!window.authApi) {
    error.value = 'Preload 未加载，请重启应用'
    loading.value = false
    return
  }

  session.value = await window.authApi.getSession()
  loading.value = false

  unsubscribeSession = window.authApi.onSessionChanged((nextSession: AuthSession | null) => {
    session.value = nextSession
    authLoading.value = false
  })
})

onUnmounted(() => {
  unsubscribeSession?.()
})

async function handleAuth(mode: AuthMode): Promise<void> {
  error.value = null
  authLoading.value = true
  try {
    session.value = await window.authApi.startAuth(mode)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '授权失败'
  } finally {
    authLoading.value = false
  }
}

async function handleLogout(): Promise<void> {
  error.value = null
  await window.authApi.logout()
  session.value = null
}
</script>

<template>
  <div v-if="loading" :class="styles.page">
    <p :class="styles.hint">加载中...</p>
  </div>

  <div v-else :class="styles.page">
    <header :class="styles.header">
      <h1 :class="styles.title">Electron OAuth2 Demo</h1>
      <p :class="styles.subtitle">GitHub OAuth2 · 自动 refresh_token 续期</p>
    </header>

    <main :class="styles.main">
      <UserPanel v-if="session" :session="session" @logout="handleLogout" />
      <AuthPanel v-else :loading="authLoading" @auth="handleAuth" />
      <p v-if="error" :class="styles.error">{{ error }}</p>
    </main>
  </div>
</template>
