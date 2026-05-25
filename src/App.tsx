import { memo, useCallback, useEffect, useState } from 'react'
import type { AuthMode, AuthSession } from '../../shared/auth-types'
import { AuthPanel } from './components/AuthPanel'
import { UserPanel } from './components/UserPanel'
import styles from './App.module.css'

function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.authApi) {
      setError('Preload 未加载，请重启应用')
      setLoading(false)
      return
    }

    void window.authApi.getSession().then((stored) => {
      setSession(stored)
      setLoading(false)
    })

    const unsubscribe = window.authApi.onSessionChanged((nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return unsubscribe
  }, [])

  const handleAuth = useCallback(async (mode: AuthMode) => {
    setError(null)
    setAuthLoading(true)
    try {
      const nextSession = await window.authApi.startAuth(mode)
      setSession(nextSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败')
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    setError(null)
    await window.authApi.logout()
    setSession(null)
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>加载中...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Electron OAuth2 Demo</h1>
        <p className={styles.subtitle}>GitHub OAuth2 · 自动 refresh_token 续期</p>
      </header>

      <main className={styles.main}>
        {session ? (
          <UserPanel session={session} onLogout={handleLogout} />
        ) : (
          <AuthPanel onAuth={handleAuth} loading={authLoading} />
        )}

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  )
}

export default memo(App)
