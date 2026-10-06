import { expect, test } from '@playwright/test'
import { createBrowserVault } from './helpers'

const TEMPLATES = [
  { name: 'Fitness planner', dashboard: 'fitness/dashboard.md', stat: 'VO2 max', card: 'Strength, best lift (kg)' },
  { name: 'Reading system', dashboard: 'reading/dashboard.md', stat: 'Books this year', card: 'Reading goal this year' },
  { name: 'Daily journal', dashboard: 'journal/dashboard.md', stat: 'Mood (out of 10)', card: 'Wheel of life' },
  { name: 'Project hub', dashboard: 'projects/dashboard.md', stat: 'Velocity (points)', card: 'Points completed per sprint' },
  { name: 'Career and job search', dashboard: 'career/dashboard.md', stat: 'Base salary', card: 'Salary and bonus' },
  { name: 'Personal CRM', dashboard: 'people/dashboard.md', stat: 'Catch ups this year', card: 'Catch ups per month' },
  { name: 'Home operations', dashboard: 'home/dashboard.md', stat: 'Upgrades save each year', card: 'Energy cost per month' },
  { name: 'Travel planner', dashboard: 'travel/dashboard.md', stat: 'Nights away this year', card: 'Nights away per year' },
  { name: 'Freelance and side business', dashboard: 'business/dashboard.md', stat: 'Revenue this tax year', card: 'Revenue per month' },
  { name: 'Investment tracker', dashboard: 'finance/investments/dashboard.md', stat: 'Portfolio value', card: 'Value by asset class' },
  { name: 'UK student loan tracker', dashboard: 'finance/uk-student-loan/dashboard.md', stat: 'Repaid since 2021', card: 'Loan paid off' },
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
