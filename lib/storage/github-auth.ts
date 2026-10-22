import type { GitHubTokenSource } from './github-provider'

export interface GitHubCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}

/** GitHub refused the refresh token, so only signing in to GitHub again helps. */
export class GitHubAuthExpiredError extends Error {
  constructor() {
    super('GitHub connection expired. Reconnect GitHub to continue (401)')
    this.name = 'GitHubAuthExpiredError'
  }
}

export interface GitHubAuthDeps {
  /** What is saved for this vault now. Another tab may have refreshed since we loaded. */
  load(): Promise<GitHubCredentials | null>
  /** Save the result of a refresh, replacing `consumedRefreshToken` everywhere it is kept. */
  save(next: GitHubCredentials, consumedRefreshToken: string): Promise<void>
  /** Trade a refresh token for new credentials. Throws GitHubAuthExpiredError if refused. */
  exchange(refreshToken: string): Promise<GitHubCredentials>
  /** Runs `fn` while no other tab is refreshing. */
  withLock<T>(fn: () => Promise<T>): Promise<T>
  now?(): number
}

/** Renew a little early so a request never leaves with a token about to lapse. */
const EXPIRY_MARGIN_MS = 5 * 60_000

/**
 * Keeps a GitHub App user token usable. Refresh tokens are single use, so the
 * exchange runs under a lock, saves the new pair before anything else uses it,
 * and checks first whether another tab already refreshed.
 */
export class GitHubAuth implements GitHubTokenSource {
  private inflight: Promise<GitHubCredentials | null> | null = null

  constructor(
    private credentials: GitHubCredentials,
    private deps: GitHubAuthDeps
  ) {}

  private now() {
    return this.deps.now?.() ?? Date.now()
  }

  private isFresh(credentials: GitHubCredentials) {
    return !credentials.expiresAt || credentials.expiresAt - this.now() > EXPIRY_MARGIN_MS
  }

  async getToken(): Promise<string> {
    if (this.isFresh(this.credentials) || !this.credentials.refreshToken) {
      return this.credentials.accessToken
    }
    try {
      const renewed = await this.renew(this.credentials.accessToken)
      return renewed?.accessToken ?? this.credentials.accessToken
    } catch (error) {
      if (error instanceof GitHubAuthExpiredError) throw error
      // A network blip should not stop a token that may still work.
      return this.credentials.accessToken
    }
  }

  async refresh(rejectedToken: string): Promise<string | null> {
    const renewed = await this.renew(rejectedToken)
    return renewed?.accessToken ?? null
  }

  private renew(rejectedToken: string): Promise<GitHubCredentials | null> {
    this.inflight ??= this.deps
      .withLock(() => this.renewLocked(rejectedToken))
      .finally(() => {
        this.inflight = null
      })
    return this.inflight
  }

  private async renewLocked(rejectedToken: string): Promise<GitHubCredentials | null> {
    const saved = (await this.deps.load()) ?? this.credentials
    // Another tab refreshed while we waited for the lock.
    if (saved.accessToken !== rejectedToken && this.isFresh(saved)) {
      this.credentials = saved
      return saved
    }
    if (!saved.refreshToken) return null
    const next = await this.deps.exchange(saved.refreshToken)
    await this.deps.save(next, saved.refreshToken)
    this.credentials = next
    return next
  }
}
