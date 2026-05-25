import { memo, useEffect, useState } from 'react'
import type { AuthSession } from '../../../shared/auth-types'
import styles from './UserPanel.module.css'

interface UserPanelProps {
  session: AuthSession
  onLogout: () => void
}

function formatExpiry(expiresAt?: number): string {
  if (!expiresAt) return '永不过期'
  const date = new Date(expiresAt)
  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) return `${date.toLocaleString()}（已过期）`
  const hours = Math.floor(remainingMs / 3600000)
  const minutes = Math.floor((remainingMs % 3600000) / 60000)
  return `${date.toLocaleString()}（剩余 ${hours}h ${minutes}m）`
}

function UserPanelComponent({ session, onLogout }: UserPanelProps) {
  const { user, tokens } = session
  const [liveSession, setLiveSession] = useState(session)

  useEffect(() => {
    setLiveSession(session)
  }, [session])

  useEffect(() => {
    const unsubscribe = window.authApi.onTokenRefreshed((refreshed) => {
      setLiveSession(refreshed)
    })
    return unsubscribe
  }, [])

  const liveTokens = liveSession.tokens

  return (
    <section className={styles.panel}>
      <div className={styles.providerBadge}>GitHub</div>

      <div className={styles.profile}>
        {user.avatar ? (
          <img className={styles.avatar} src={user.avatar} alt={user.name} />
        ) : (
          <div className={styles.avatarFallback}>{user.name.slice(0, 1).toUpperCase()}</div>
        )}
        <div>
          <h2 className={styles.name}>{user.name}</h2>
          <p className={styles.email}>{user.email}</p>
          {user.login && <p className={styles.login}>@{user.login}</p>}
        </div>
      </div>

      <div className={styles.tokenBlock}>
        <h3 className={styles.tokenTitle}>Token 信息</h3>
        <dl className={styles.tokenList}>
          <div>
            <dt>access_token</dt>
            <dd>{liveTokens.access_token}</dd>
          </div>
          <div>
            <dt>refresh_token</dt>
            <dd>{liveTokens.refresh_token ?? '（GitHub OAuth App 不提供 refresh_token）'}</dd>
          </div>
          <div>
            <dt>access_token 过期</dt>
            <dd>{formatExpiry(liveTokens.expires_at)}</dd>
          </div>
          {liveTokens.refresh_token_expires_at && (
            <div>
              <dt>refresh_token 过期</dt>
              <dd>{formatExpiry(liveTokens.refresh_token_expires_at)}</dd>
            </div>
          )}
        </dl>
        {liveTokens.refresh_token && (
          <p className={styles.refreshHint}>Token 将在过期前 5 分钟自动续期</p>
        )}
      </div>

      <button type="button" className={styles.logoutButton} onClick={onLogout}>
        登出
      </button>
    </section>
  )
}

export const UserPanel = memo(UserPanelComponent)
