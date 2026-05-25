<script setup lang="ts">
import type { AuthMode } from '../../shared/auth-types'
import styles from './AuthPanel.module.css'

interface AuthPanelProps {
  loading: boolean
}

defineProps<AuthPanelProps>()

const emit = defineEmits<{
  auth: [mode: AuthMode]
}>()
</script>

<template>
  <section :class="styles.panel">
    <h2 :class="styles.heading">欢迎使用</h2>
    <p :class="styles.description">
      点击下方按钮将打开 OAuth2 授权弹窗。授权成功后弹窗自动关闭，并显示用户信息。
    </p>
    <div :class="styles.actions">
      <button
        type="button"
        :class="styles.primaryButton"
        :disabled="loading"
        @click="emit('auth', 'login')"
      >
        {{ loading ? '授权中...' : '登录' }}
      </button>
      <button
        type="button"
        :class="styles.secondaryButton"
        :disabled="loading"
        @click="emit('auth', 'register')"
      >
        注册
      </button>
    </div>
  </section>
</template>
