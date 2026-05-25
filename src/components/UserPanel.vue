<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { AuthSession } from '../../shared/auth-types'
import styles from './UserPanel.module.css'

interface UserPanelProps {
  session: AuthSession
}

const props = defineProps<UserPanelProps>()

const emit = defineEmits<{
  logout: []
}>()

const liveSession = ref<AuthSession>(props.session)
const expiring = ref(false)

let unsubscribeToken: (() => void) | null = null

watch(
  () => props.session,
  (nextSession) => {
    liveSession.value = nextSession
  }
)

onMounted(() => {
  unsubscribeToken = window.authApi.onTokenRefreshed((refreshed: AuthSession) => {
    liveSession.value = refreshed
  })
})

onUnmounted(() => {
  unsubscribeToken?.()
})

function formatExpiry(expiresAt?: number): string {
  if (!expiresAt) return '永不过期'
  const date = new Date(expiresAt)
  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) return `${date.toLocaleString()}（已过期）`
  const hours = Math.floor(remainingMs / 3600000)
  const minutes = Math.floor((remainingMs % 3600000) / 60000)
  return `${date.toLocaleString()}（剩余 ${hours}h ${minutes}m）`
}

async function handleForceExpire(): Promise<void> {
  expiring.value = true
  try {
    const updated = await window.authApi.forceExpire()
    if (updated) {
      liveSession.value = updated
    }
  } finally {
    expiring.value = false
  }
}
</script>

<template>
  <section :class="styles.panel">
    <div :class="styles.providerBadge">GitHub</div>

    <div :class="styles.profile">
      <img
        v-if="liveSession.user.avatar"
        :class="styles.avatar"
        :src="liveSession.user.avatar"
        :alt="liveSession.user.name"
      />
      <div v-else :class="styles.avatarFallback">
        {{ liveSession.user.name.slice(0, 1).toUpperCase() }}
      </div>
      <div>
        <h2 :class="styles.name">{{ liveSession.user.name }}</h2>
        <p :class="styles.email">{{ liveSession.user.email }}</p>
        <p v-if="liveSession.user.login" :class="styles.login">@{{ liveSession.user.login }}</p>
      </div>
    </div>

    <div :class="styles.tokenBlock">
      <h3 :class="styles.tokenTitle">Token 信息</h3>
      <dl :class="styles.tokenList">
        <div>
          <dt>access_token</dt>
          <dd>{{ liveSession.tokens.access_token }}</dd>
        </div>
        <div>
          <dt>refresh_token</dt>
          <dd>
            {{ liveSession.tokens.refresh_token ?? '（GitHub OAuth App 不提供 refresh_token）' }}
          </dd>
        </div>
        <div>
          <dt>access_token 过期</dt>
          <dd>{{ formatExpiry(liveSession.tokens.expires_at) }}</dd>
        </div>
        <div v-if="liveSession.tokens.refresh_token_expires_at">
          <dt>refresh_token 过期</dt>
          <dd>{{ formatExpiry(liveSession.tokens.refresh_token_expires_at) }}</dd>
        </div>
      </dl>
      <p v-if="liveSession.tokens.refresh_token" :class="styles.refreshHint">
        Token 将在过期前 5 分钟自动续期
      </p>
    </div>

    <div :class="styles.actions">
      <button
        type="button"
        :class="styles.expireButton"
        :disabled="expiring || !liveSession.tokens.refresh_token"
        :title="liveSession.tokens.refresh_token ? '模拟 token 过期并触发自动续期' : '当前账号无 refresh_token，无法测试续期'"
        @click="handleForceExpire"
      >
        {{ expiring ? '处理中...' : '模拟过期' }}
      </button>
      <button type="button" :class="styles.logoutButton" @click="emit('logout')">登出</button>
    </div>
  </section>
</template>
