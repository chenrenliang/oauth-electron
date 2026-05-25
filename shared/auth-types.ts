/** OAuth2 token response from authorization server */
export type OAuthTokens = {
  access_token: string
  refresh_token?: string
  token_type: string
  /** Seconds until access_token expires; omitted when token never expires */
  expires_in?: number
  /** Seconds until refresh_token expires (GitHub App) */
  refresh_token_expires_in?: number
  /** Unix ms timestamp when access_token expires */
  expires_at?: number
  /** Unix ms timestamp when refresh_token expires */
  refresh_token_expires_at?: number
}

/** Authenticated user profile */
export type UserProfile = {
  id: string
  email: string
  name: string
  avatar?: string
  login?: string
}

/** Session persisted after successful OAuth */
export type AuthSession = {
  user: UserProfile
  tokens: OAuthTokens
}

/** OAuth provider mode: login vs register (same flow, different UI hint) */
export type AuthMode = 'login' | 'register'

export type OAuthConfig = {
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  userEmailsUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
}

export const AUTH_IPC = {
  START: 'auth:start',
  LOGOUT: 'auth:logout',
  GET_SESSION: 'auth:get-session',
  SESSION_CHANGED: 'auth:session-changed',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  FORCE_EXPIRE: 'auth:force-expire'
} as const

/** Buffer before expiry to proactively refresh tokens (5 minutes) */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

/** Interval for checking token expiry (1 minute) */
export const TOKEN_CHECK_INTERVAL_MS = 60 * 1000
