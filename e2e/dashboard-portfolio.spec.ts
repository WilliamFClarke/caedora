import { expect, test, type Page } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'
import { PORTFOLIO_FILES } from '../tests/fixtures/portfolio'

function vault() {
  return new FakeGitHub('will', 'trading-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    ...PORTFOLIO_FILES,
  })
}

const card = (page: Page, name: string) =>
  page.getByTestId('dashboard-view').locator('[data-slot^="dashboard-"]').filter({ hasText: name })

test.beforeEach(async ({ page }) => {
  await openGitHubVault(page, vault(), 'isa/portfolio.md')
  await expect(page.getByRole('heading', { name: 'Portfolio' })).toBeVisible()
  await expect(card(page, 'Change this month')).toBeVisible({ timeout: 15_000 })
})

test('stats show change since a month ago, this year, the drop from the peak and a share', async ({ page }) => {
  await expect(card(page, 'Change this month')).toContainText('-£200')
  await expect(card(page, 'Change this year')).toContainText('80%')
  await expect(card(page, 'Drop from peak')).toContainText('-10%')
  await expect(card(page, 'Funds share')).toContainText('50%')
})

test('a chart draws two labelled measures with a reference line', async ({ page }) => {
  const chart = card(page, 'Value against paid in')
  await expect(chart.getByText('Value', { exact: true })).toBeVisible()
  await expect(chart.getByText('Paid in', { exact: true })).toBeVisible()
  await expect(chart.getByText('Goal', { exact: true })).toBeVisible()
})

test('bars are coloured by gain and loss, with the highlighted holding picked out', async ({ page }) => {
  const chart = card(page, 'Profit or loss by holding')
  await expect(chart.getByText('Noise', { exact: true })).toBeVisible()
  // Bars have no text of their own, so their colours are read from the drawing.
  await expect
    .poll(() => chart.locator('.recharts-bar-rectangle path').evaluateAll((bars) => bars.map((bar) => bar.getAttribute('fill'))))
    .toEqual(['var(--gain)', 'var(--gain)', 'var(--loss)', 'var(--highlight)'])
})

test('a treemap and a waterfall show the holdings', async ({ page }) => {
  const treemap = card(page, 'Holdings map')
  await expect(treemap.getByRole('img', { name: 'VWRP: £900' })).toBeVisible()
  await expect(treemap.getByRole('img', { name: 'AMD: £180' })).toBeVisible()
  await expect(treemap.getByText('Fund', { exact: true })).toBeVisible()

  const waterfall = card(page, 'Where the profit came from')
  await expect(waterfall.getByText('Total', { exact: true })).toBeVisible()
  await expect(waterfall.locator('.recharts-bar-rectangle')).toHaveCount(5)
})

test('progress shows its target and a joined table highlights holdings over their cap', async ({ page }) => {
  await expect(card(page, 'Paid in this year')).toContainText('Target £15,000')

  const table = card(page, 'Against target')
  await expect(table.getByRole('columnheader', { name: 'Target weight' })).toBeVisible()
  await expect(table.getByRole('row', { name: /GOOGL/ })).toHaveAttribute('data-highlighted', 'true')
  await expect(table.getByRole('row', { name: /VWRP/ })).not.toHaveAttribute('data-highlighted')
  await expect(table.getByRole('cell', { name: '-£30' })).toHaveAttribute('data-tone', 'loss')
  await expect(table.getByRole('cell', { name: '£150' })).toHaveAttribute('data-tone', 'gain')
})
