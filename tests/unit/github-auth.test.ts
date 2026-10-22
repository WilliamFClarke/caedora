import { expect, test } from '@playwright/test'
import { GitHubAuth, GitHubAuthExpiredError, type GitHubCredentials } from '@/lib/storage/github-auth'

const NOW = 1_000_000_000_000
const HOUR = 60 * 60 * 1000

function setup(initial: GitHubCredentials, saved: GitHubCredentials | null = initial) {
  const calls: string[] = []
  const stored = { current: saved }
  const auth = new GitHubAuth(initial, {
    load: async () => stored.current,
    save: async (next) => {
      stored.current = next
    },
    exchange: async (refreshToken) => {
      calls.push(refreshToken)
      return { accessToken: `access-${calls.length}`, refreshToken: `refresh-${calls.length}`, expiresAt: NOW + 8 * HOUR }
    },
    withLock: (fn) => fn(),
    now: () => NOW,
  })
  return { auth, calls, stored }
}

test('uses a token that is not near expiry without refreshing', async () => {
  const { auth, calls } = setup({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW + HOUR })
  expect(await auth.getToken()).toBe('a')
  expect(calls).toEqual([])
})

test('refreshes a token that is close to expiring and saves the new pair', async () => {
  const { auth, calls, stored } = setup({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW + 60_000 })
  expect(await auth.getToken()).toBe('access-1')
  expect(calls).toEqual(['r'])
  expect(stored.current?.refreshToken).toBe('refresh-1')
})

test('concurrent callers share one refresh', async () => {
  const { auth, calls } = setup({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW - HOUR })
  const tokens = await Promise.all([auth.getToken(), auth.getToken(), auth.refresh('a')])
  expect(tokens).toEqual(['access-1', 'access-1', 'access-1'])
  expect(calls).toEqual(['r'])
})

test('adopts a pair another tab saved instead of spending the old refresh token', async () => {
  const { auth, calls } = setup(
    { accessToken: 'a', refreshToken: 'r', expiresAt: NOW - HOUR },
    { accessToken: 'tab-2', refreshToken: 'r2', expiresAt: NOW + 8 * HOUR }
  )
  expect(await auth.getToken()).toBe('tab-2')
  expect(calls).toEqual([])
})

test('a refresh after a 401 spends the saved refresh token, not a stale copy', async () => {
  const { auth, calls } = setup(
    { accessToken: 'a', refreshToken: 'stale', expiresAt: NOW + HOUR },
    { accessToken: 'a', refreshToken: 'saved', expiresAt: NOW + HOUR }
  )
  expect(await auth.refresh('a')).toBe('access-1')
  expect(calls).toEqual(['saved'])
})

test('returns null when there is no refresh token to spend', async () => {
  const { auth } = setup({ accessToken: 'a' })
  expect(await auth.refresh('a')).toBeNull()
})

test('a refused refresh token surfaces as an expired connection', async () => {
  const auth = new GitHubAuth(
    { accessToken: 'a', refreshToken: 'r', expiresAt: NOW - HOUR },
    {
      load: async () => null,
      save: async () => {},
      exchange: async () => {
        throw new GitHubAuthExpiredError()
      },
      withLock: (fn) => fn(),
      now: () => NOW,
    }
  )
  await expect(auth.getToken()).rejects.toBeInstanceOf(GitHubAuthExpiredError)
})

test('a network failure falls back to the current token', async () => {
  const auth = new GitHubAuth(
    { accessToken: 'a', refreshToken: 'r', expiresAt: NOW - HOUR },
    {
      load: async () => null,
      save: async () => {},
      exchange: async () => {
        throw new Error('offline')
      },
      withLock: (fn) => fn(),
      now: () => NOW,
    }
  )
  expect(await auth.getToken()).toBe('a')
})
