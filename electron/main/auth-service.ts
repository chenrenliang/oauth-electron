import { randomBytes } from 'node:crypto'
import { BrowserWindow, net } from 'electron'
import type { AuthMode, AuthSession, OAuthConfig, OAuthTokens, UserProfile } from '../../shared/auth-types'
import { clearSession, getSession, saveSession } from './auth-store'
import {
  buildGitHubAuthorizationUrl,
  exchangeGitHubCode,
  type GitHubEmailResponse,
  type GitHubUserResponse
} from './github-oauth-client'
import { assertOAuthConfig, buildGitHubOAuthConfig } from './oauth-config'

type PendingAuth = {
  state: string
  resolve: (session: AuthSession) => void
  reject: (error: Error) => void
}

let authWindow: BrowserWindow | null = null
let pendingAuth: PendingAuth | null = null

/**
 * Perform HTTP request via Electron net module (main process).
 */
export async function httpRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: options.method ?? 'GET',
      url
    })

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        request.setHeader(key, value)
      }
    }

    request.on('response', (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          body: Buffer.concat(chunks).toString('utf8')
        })
      })
      response.on('error', reject)
    })

    request.on('error', reject)

    if (options.body) {
      request.write(options.body)
    }

    request.end()
  })
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T
}

async function fetchGitHubUserProfile(config: OAuthConfig, accessToken: string): Promise<UserProfile> {
  const response = await httpRequest(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'electron-oauth-react'
    }
  })

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`GitHub user info request failed: ${response.body}`)
  }

  const githubUser = parseJson<GitHubUserResponse>(response.body)
  let email = githubUser.email ?? ''

  if (!email) {
    const emailResponse = await httpRequest(config.userEmailsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'electron-oauth-react'
      }
    })

    if (emailResponse.status >= 200 && emailResponse.status < 300) {
      const emails = parseJson<GitHubEmailResponse>(emailResponse.body)
      email = emails.find((item) => item.primary)?.email ?? emails[0]?.email ?? ''
    }
  }

  return {
    id: String(githubUser.id),
    email: email || `${githubUser.login}@users.noreply.github.com`,
    name: githubUser.name ?? githubUser.login,
    avatar: githubUser.avatar_url,
    login: githubUser.login
  }
}

function closeAuthWindow(): void {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close()
  }
  authWindow = null
}

async function handleRedirect(url: string, config: OAuthConfig): Promise<void> {
  if (!pendingAuth) return

  const parsed = new URL(url)
  const redirectBase = config.redirectUri.replace(/\/$/, '')
  const callbackBase = (parsed.origin + parsed.pathname).replace(/\/$/, '')

  if (callbackBase !== redirectBase) return

  const error = parsed.searchParams.get('error')
  if (error) {
    pendingAuth.reject(new Error(parsed.searchParams.get('error_description') ?? error))
    pendingAuth = null
    closeAuthWindow()
    return
  }

  const code = parsed.searchParams.get('code')
  const state = parsed.searchParams.get('state')

  if (!code || !state || state !== pendingAuth.state) {
    pendingAuth.reject(new Error('Invalid OAuth callback parameters'))
    pendingAuth = null
    closeAuthWindow()
    return
  }

  const { resolve, reject } = pendingAuth
  pendingAuth = null
  closeAuthWindow()

  try {
    const tokens = await exchangeGitHubCode(config, code, httpRequest)
    const user = await fetchGitHubUserProfile(config, tokens.access_token)
    const session: AuthSession = { user, tokens }
    saveSession(session)
    resolve(session)
  } catch (err) {
    reject(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Open GitHub OAuth authorization popup and return session on success.
 */
export function startOAuthFlow(
  _mode: AuthMode,
  config: OAuthConfig = buildGitHubOAuthConfig()
): Promise<AuthSession> {
  assertOAuthConfig(config)

  if (pendingAuth) {
    return Promise.reject(new Error('Authorization already in progress'))
  }

  const state = randomBytes(16).toString('hex')
  const authUrl = buildGitHubAuthorizationUrl(config, state)

  return new Promise<AuthSession>((resolve, reject) => {
    pendingAuth = { state, resolve, reject }

    authWindow = new BrowserWindow({
      width: 520,
      height: 720,
      parent: BrowserWindow.getFocusedWindow() ?? undefined,
      modal: true,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    authWindow.once('ready-to-show', () => {
      authWindow?.show()
    })

    authWindow.webContents.on('will-redirect', (_event, navigationUrl) => {
      void handleRedirect(navigationUrl, config)
    })

    authWindow.webContents.on('will-navigate', (_event, navigationUrl) => {
      void handleRedirect(navigationUrl, config)
    })

    authWindow.on('closed', () => {
      authWindow = null
      if (pendingAuth) {
        pendingAuth.reject(new Error('Authorization window closed'))
        pendingAuth = null
      }
    })

    void authWindow.loadURL(authUrl)
  })
}

export { clearSession, getSession }
