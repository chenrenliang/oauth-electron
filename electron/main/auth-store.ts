import Store from 'electron-store'
import type { AuthSession } from '../../shared/auth-types'

const store = new Store<{ session: AuthSession | null }>({
  name: 'auth-session',
  defaults: { session: null }
})

/** Get persisted auth session */
export function getSession(): AuthSession | null {
  return store.get('session')
}

/** Persist auth session */
export function saveSession(session: AuthSession): void {
  store.set('session', session)
}

/** Clear session (logout) */
export function clearSession(): void {
  store.set('session', null)
}
