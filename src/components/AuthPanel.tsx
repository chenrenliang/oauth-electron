import { memo } from 'react'
import type { AuthMode } from '../../../shared/auth-types'
import styles from './AuthPanel.module.css'

interface AuthPanelProps {
  onAuth: (mode: AuthMode) => void
  loading: boolean
}

function AuthPanelComponent({ onAuth, loading }: AuthPanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>欢迎使用</h2>
      <p className={styles.description}>
        点击下方按钮将打开 OAuth2 授权弹窗。授权成功后弹窗自动关闭，并显示用户信息。
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={loading}
          onClick={() => onAuth('login')}
        >
          {loading ? '授权中...' : '登录'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={loading}
          onClick={() => onAuth('register')}
        >
          注册
        </button>
      </div>
    </section>
  )
}

export const AuthPanel = memo(AuthPanelComponent)
