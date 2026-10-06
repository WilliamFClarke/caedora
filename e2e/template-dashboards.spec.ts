import { expect, test } from '@playwright/test'
import { createBrowserVault } from './helpers'

const TEMPLATES = [
  { name: 'Fitness planner', dashboard: 'fitness/dashboard.md', stat: 'Sessions logged', card: 'Sessions by type' },
  { name: 'Reading system', dashboard: 'reading/dashboard.md', stat: 'Books finished', card: 'Yearly reading goal' },
  { name: 'Daily journal', dashboard: 'journal/dashboard.md', stat: 'Average mood', card: 'Decisions to revisit' },
  { name: 'Project hub', dashboard: 'projects/dashboard.md', stat: 'Active projects', card: 'Upcoming milestones' },
  { name: 'Job search tracker', dashboard: 'career/job-search/dashboard.md', stat: 'Applications sent', card: 'Pipeline' },
  { name: 'Personal CRM', dashboard: 'people/dashboard.md', stat: 'Open follow-ups', card: 'People by circle' },
  { name: 'Home operations', dashboard: 'home/dashboard.md', stat: 'Next check due', card: 'Spending by area' },
  { name: 'Travel planner', dashboard: 'travel/dashboard.md', stat: 'Next trip', card: 'Where the money goes' },
  { name: 'Investment tracker', dashboard: 'finance/investments/dashboard.md', stat: 'Portfolio value', card: 'Value by asset class' },
  { name: 'UK student loan tracker', dashboard: 'finance/uk-student-loan/dashboard.md', stat: 'Balance at last statement', card: 'Balance by statement' },
]

for (const template of TEMPLATES) {
  test(`${template.name} template opens on a working dashboard`, async ({ page }) => {
    await createBrowserVault(page, template.name)

    await page.getByRole('button', { name: 'Templates' }).first().click()
    await page.getByRole('button', { name: `Import ${template.name}` }).first().click()
    await expect(page.getByText(`from ${template.name}`)).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Escape')

    await page.goto(`/vault/${template.dashboard}`)
    const dashboard = page.getByTestId('dashboard-view')
    await expect(dashboard.getByText(template.stat, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(dashboard.getByText(template.card, { exact: true }).first()).toBeVisible()
    await expect(dashboard.locator('[data-slot="dashboard-stat"]').first()).toBeVisible()
    await expect(dashboard.locator('[data-slot="dashboard-error"]')).toHaveCount(0)
  })
}
