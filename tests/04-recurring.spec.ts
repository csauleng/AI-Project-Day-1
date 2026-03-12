import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 03: Recurring Todos', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  async function showAdvanced(page: import('@playwright/test').Page) {
    const btn = page.getByRole('button', { name: /advanced options/i })
    if (await btn.isVisible()) await btn.click()
  }

  test('create weekly recurring todo', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Weekly standup')
    await showAdvanced(page)

    // Set a valid future due date (2 days from now)
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    await page.getByLabel(/repeat/i).check()
    await page.locator('select').filter({ hasText: /weekly|daily|monthly|yearly/i }).selectOption('weekly')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText('Weekly standup')).toBeVisible()
    // Should show recurring badge
    await expect(page.getByText(/weekly/i).first()).toBeVisible()
  })

  test('create daily recurring todo', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Daily exercise')
    await showAdvanced(page)

    const future = new Date(Date.now() + 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    await page.getByLabel(/repeat/i).check()
    await page.locator('select').filter({ hasText: /weekly|daily|monthly|yearly/i }).selectOption('daily')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText('Daily exercise')).toBeVisible()
    await expect(page.getByText(/daily/i).first()).toBeVisible()
  })

  test('completing recurring todo creates next instance', async ({ page }) => {
    const title = 'Recurring task to complete'
    await page.getByPlaceholder(/todo title/i).fill(title)
    await showAdvanced(page)

    const future = new Date(Date.now() + 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    await page.getByLabel(/repeat/i).check()
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText(title)).toBeVisible()

    // Complete the todo
    await page.getByRole('checkbox').first().click()

    // The original should now be in completed section
    // AND a new instance should appear in pending
    await page.waitForTimeout(500)
    const instances = page.getByText(title)
    const count = await instances.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('recurring todo shows recurrence badge', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Badge check')
    await showAdvanced(page)

    const future = new Date(Date.now() + 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    await page.getByLabel(/repeat/i).check()
    await page.locator('select').filter({ hasText: /weekly|daily|monthly|yearly/i }).selectOption('monthly')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText(/monthly/i).first()).toBeVisible()
  })
})
