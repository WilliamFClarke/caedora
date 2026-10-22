import { expect, test, type Page } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'

const PLAN = `---
type: Note
title: ISA plan
description: How the ISA is run.
---

# ISA plan

Keep VWRP above its floor.
`

const HOUR = 60 * 60 * 1000

function vault(validToken: string) {
  const github = new FakeGitHub('will', 'trading', { 'plan.md': PLAN })
  github.requireToken = validToken
  return github
}

async function refreshEndpoint(page: Page, reply: (call: number) => { status: number; json: unknown }) {
  const calls: string[] = []
  await page.route('**/api/github/refresh', (route) => {
    calls.push(route.request().postDataJSON().refreshToken)
    return route.fulfill(reply(calls.length))
  })
  return calls
}

test.describe('GitHub App token refresh', () => {
  test('renews a token that has expired and keeps working after a reload', async ({ page }) => {
    const refreshCalls = await refreshEndpoint(page, () => ({
      status: 200,
      json: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: Date.now() + 8 * HOUR },
    }))

    await openGitHubVault(page, vault('new-access'), 'plan.md', {
      githubAuth: 'app',
      githubPat: 'old-access',
      githubRefreshToken: 'old-refresh',
      githubTokenExpiresAt: Date.now() - HOUR,
    })
    await expect(page.getByRole('heading', { name: 'ISA plan', level: 1 })).toBeVisible()

    // The new pair was saved, so a reload uses it instead of the spent token.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'ISA plan', level: 1 })).toBeVisible()
    expect(refreshCalls).toEqual(['old-refresh'])
  })

  test('renews and retries when GitHub rejects a token that looked valid', async ({ page }) => {
    const refreshCalls = await refreshEndpoint(page, () => ({
      status: 200,
      json: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresAt: Date.now() + 8 * HOUR },
    }))

    await openGitHubVault(page, vault('new-access'), 'plan.md', {
      githubAuth: 'app',
      githubPat: 'revoked-access',
      githubRefreshToken: 'old-refresh',
      githubTokenExpiresAt: Date.now() + 4 * HOUR,
    })
    await expect(page.getByRole('heading', { name: 'ISA plan', level: 1 })).toBeVisible()
    expect(refreshCalls).toEqual(['old-refresh'])
  })

  test('asks to reconnect when GitHub refuses the refresh token', async ({ page }) => {
    await refreshEndpoint(page, () => ({
      status: 401,
      json: { error: 'The refresh token passed is incorrect or expired.', permanent: true },
    }))

    await openGitHubVault(page, vault('never-issued'), 'plan.md', {
      githubAuth: 'app',
      githubPat: 'old-access',
      githubRefreshToken: 'spent-refresh',
      githubTokenExpiresAt: Date.now() - HOUR,
    })
    await expect(page.getByText(/GitHub connection expired/)).toBeVisible()

    await page.getByRole('button', { name: 'Reconnect GitHub' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
