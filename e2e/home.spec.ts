import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your life')
  })

  test('shows navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'How it works' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'MCP' })).toBeVisible()
  })

  test('has a theme toggle button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible()
  })

  test('has a Get Started CTA', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Get Started Free' })).toBeVisible()
  })

  test('navigates to connect page', async ({ page }) => {
    await page.getByRole('link', { name: 'Get Started Free' }).click()
    await expect(page).toHaveURL('/connect')
  })
})

test.describe('Connect Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connect')
  })

  test('displays connect vault heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connect your vault' })).toBeVisible()
  })

  test('shows GitHub connect option', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Continue with GitHub/i })).toBeVisible()
  })

  test('shows coming soon options', async ({ page }) => {
    await expect(page.getByText('GitLab')).toBeVisible()
    await expect(page.getByText('Local Git')).toBeVisible()
  })

  test('navigates back to home', async ({ page }) => {
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('Vault Page', () => {
  test('displays vault heading', async ({ page }) => {
    await page.goto('/vault')
    await expect(page.getByRole('heading', { name: 'Your vault' })).toBeVisible()
  })

  test('shows sidebar folders', async ({ page }) => {
    await page.goto('/vault')
    await expect(page.getByRole('link', { name: /Daily/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Health/ })).toBeVisible()
  })
})
