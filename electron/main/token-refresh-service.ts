import { BrowserWindow } from 'electron'
import type { AuthSession, OAuthConfig } from '../../shared/auth-types'
import { AUTH_IPC, TOKEN_CHECK_INTERVAL_MS, TOKEN_REFRESH_BUFFER_MS } from '../../shared/auth-types'
import { refreshGitHubToken } from './github-oauth-client'
import { getSession, saveSession, clearSession as clearStoredSession } from './auth-store'

type HttpRequestFn = (
  url: string,
  options?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{ status: number; body: string }>

let refreshTimer: ReturnType<typeof setInterval> | null = null
let isRefreshing = false
let httpRequestFn: HttpRequestFn | null = null
let oauthConfig: OAuthConfig | null = null

function notifySessionChanged(session: AuthSession | null): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(AUTH_IPC.SESSION_CHANGED, session)
    if (session) {
      win.webContents.send(AUTH_IPC.TOKEN_REFRESHED, session)
    }
  }
}

/**
 * Returns true if access_token should be refreshed soon.
 */
function shouldRefresh(tokens: AuthSession['tokens']): boolean {
  if (!tokens.refresh_token || !tokens.expires_at) {
    return false
  }
  return tokens.expires_at - Date.now() <= TOKEN_REFRESH_BUFFER_MS
}

/**
 * Refresh access_token using refresh_token grant.
 */
export async function refreshAccessToken(
  config: OAuthConfig,
  httpRequest: HttpRequestFn
): Promise<AuthSession | null> {
  const session = getSession()
  if (!session?.tokens.refresh_token) {
    return session
  }

  if (isRefreshing) {
    return session
  }

  isRefreshing = true
  try {
    const newTokens = await refreshGitHubToken(config, session.tokens.refresh_token, httpRequest)
    const updated: AuthSession = {
      ...session,
      tokens: {
        ...newTokens,
        // GitHub rotates refresh_token; keep new one from response
        refresh_token: newTokens.refresh_token ?? session.tokens.refresh_token
      }
    }
    saveSession(updated)
    notifySessionChanged(updated)
    return updated
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('bad_refresh_token') || message.includes('refresh_token')) {
      clearStoredSession()
      notifySessionChanged(null)
      return null
    }
    throw err
  } finally {
    isRefreshing = false
  }
}

/**
 * Start periodic token expiry check and auto-refresh.
 */
export function startTokenRefreshService(
  config: OAuthConfig,
  httpRequest: HttpRequestFn
): void {
  stopTokenRefreshService()
  httpRequestFn = httpRequest
  oauthConfig = config

  void tickRefresh()

  refreshTimer = setInterval(() => {
    void tickRefresh()
  }, TOKEN_CHECK_INTERVAL_MS)
}

/**
 * Stop the token refresh scheduler.
 */
export function stopTokenRefreshService(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

async function tickRefresh(): Promise<void> {
  if (!oauthConfig || !httpRequestFn) return

  const session = getSession()
  if (!session) return

  if (shouldRefresh(session.tokens)) {
    await refreshAccessToken(oauthConfig, httpRequestFn)
  }
}

/**
 * Force access_token to expire immediately, then trigger refresh if possible.
 */
export async function forceExpireAccessToken(): Promise<AuthSession | null> {
  const session = getSession()
  if (!session) return null

  const expired: AuthSession = {
    ...session,
    tokens: {
      ...session.tokens,
      expires_at: Date.now() - 1000,
      expires_in: 0
    }
  }
  saveSession(expired)
  notifySessionChanged(expired)

  if (oauthConfig && httpRequestFn && expired.tokens.refresh_token) {
    return refreshAccessToken(oauthConfig, httpRequestFn)
  }

  return expired
}
