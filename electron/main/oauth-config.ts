import type { OAuthConfig } from '../../shared/auth-types'

/**
 * Build GitHub OAuth config from environment variables.
 */
export function buildGitHubOAuthConfig(): OAuthConfig {
  return {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailsUrl: 'https://api.github.com/user/emails',
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    redirectUri: process.env.GITHUB_REDIRECT_URI ?? 'http://127.0.0.1:38473/callback',
    scope: 'read:user user:email'
  }
}

/**
 * Validate that required GitHub OAuth credentials are configured.
 */
export function assertOAuthConfig(config: OAuthConfig): void {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      'GitHub OAuth 未配置：请在 .env 中设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET'
    )
  }
}
