import type { OAuthConfig, OAuthTokens } from '../../shared/auth-types'

/** Raw token response from GitHub */
export type GitHubTokenResponse = {
  access_token: string
  token_type: string
  scope?: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
  error?: string
  error_description?: string
}

/** Raw user object from GitHub API */
export type GitHubUserResponse = {
  id: number
  login: string
  name: string | null
  avatar_url: string
  email: string | null
}

export type GitHubEmailResponse = {
  email: string
  primary: boolean
  verified: boolean
}[]

/**
 * Normalize GitHub token response into app OAuthTokens with expiry timestamps.
 */
export function normalizeGitHubTokens(raw: GitHubTokenResponse): OAuthTokens {
  const now = Date.now()
  const tokens: OAuthTokens = {
    access_token: raw.access_token,
    token_type: raw.token_type,
    refresh_token: raw.refresh_token
  }

  if (raw.expires_in !== undefined) {
    tokens.expires_in = raw.expires_in
    tokens.expires_at = now + raw.expires_in * 1000
  }

  if (raw.refresh_token_expires_in !== undefined) {
    tokens.refresh_token_expires_in = raw.refresh_token_expires_in
    tokens.refresh_token_expires_at = now + raw.refresh_token_expires_in * 1000
  }

  return tokens
}

/**
 * Build GitHub authorization URL.
 */
export function buildGitHubAuthorizationUrl(config: OAuthConfig, state: string): string {
  const url = new URL(config.authorizationUrl)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  return url.toString()
}

/**
 * Exchange authorization code for GitHub tokens.
 */
export async function exchangeGitHubCode(
  config: OAuthConfig,
  code: string,
  httpRequest: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; body: string }>
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri
  }).toString()

  const response = await httpRequest(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  })

  const raw = JSON.parse(response.body) as GitHubTokenResponse

  if (response.status < 200 || response.status >= 300 || raw.error) {
    throw new Error(raw.error_description ?? raw.error ?? `GitHub token exchange failed: ${response.body}`)
  }

  return normalizeGitHubTokens(raw)
}

/**
 * Refresh GitHub user access token using refresh_token grant.
 */
export async function refreshGitHubToken(
  config: OAuthConfig,
  refreshToken: string,
  httpRequest: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; body: string }>
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  }).toString()

  const response = await httpRequest(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  })

  const raw = JSON.parse(response.body) as GitHubTokenResponse

  if (response.status < 200 || response.status >= 300 || raw.error) {
    throw new Error(raw.error_description ?? raw.error ?? `GitHub token refresh failed: ${response.body}`)
  }

  return normalizeGitHubTokens(raw)
}
