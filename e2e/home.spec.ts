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
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible()
  })

  test('navigates to connect page', async ({ page }) => {
    await page.getByRole('link', { name: /Get Started.*Local/i }).click()
    await expect(page).toHaveURL('/connect')
  })
})

test.describe('Setup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connect')
  })

  test('displays setup vault heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Set up your vault' })).toBeVisible()
  })

  test('shows the three setup steps', async ({ page }) => {
    await expect(page.getByText('Create your vault folder')).toBeVisible()
    await expect(page.getByText('Add some notes')).toBeVisible()
    await expect(page.getByText('Connect your AI via MCP')).toBeVisible()
  })

  test('shows MCP config snippet', async ({ page }) => {
    await expect(page.getByText('personal-md-mcp')).toBeVisible()
  })

  test('shows optional GitHub backup section', async ({ page }) => {
    await expect(page.getByText('Optional: back up to GitHub')).toBeVisible()
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
