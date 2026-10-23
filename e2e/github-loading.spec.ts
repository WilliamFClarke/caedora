import { expect, test } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'

const NOTE = `---
type: Note
title: ISA plan
description: How the ISA is run.
---

# ISA plan

Keep VWRP above its floor.
`

test.describe('GitHub vault loading', () => {
  test('shows a spinner while the repository loads, then the note', async ({ page }) => {
    const github = new FakeGitHub('will', 'trading', { 'plan.md': NOTE })
    const release = github.hold()

    const opening = openGitHubVault(page, github, 'plan.md')

    await expect(page.getByRole('status').filter({ hasText: 'Loading your notes' })).toBeVisible({
      timeout: 15_000,
    })
    release()
    await opening
    await expect(page.getByRole('heading', { name: 'ISA plan', level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('status').filter({ hasText: 'Loading your notes' })).toBeHidden()
  })
})
