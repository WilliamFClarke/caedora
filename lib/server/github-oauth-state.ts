export const GITHUB_STATE_COOKIE = 'caedora_github_state'

export interface GithubOAuthState {
  nonce: string
  mode: 'open'
  repo?: string
  owner?: string
}

export function encodeGithubOAuthState(state: GithubOAuthState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url')
}

export function decodeGithubOAuthState(value: string | undefined): GithubOAuthState | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as GithubOAuthState
    if (!parsed.nonce || parsed.mode !== 'open') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
