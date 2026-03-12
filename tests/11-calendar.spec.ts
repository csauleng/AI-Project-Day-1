import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 10: Calendar View', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  test('navigate to calendar view', async ({ page }) => {
    await page.getByRole('button', { name: /calendar/i }).click()
    await expect(page).toHaveURL('/calendar')
    await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()
  })

  test('calendar displays current month', async ({ page }) => {
    await page.goto('/calendar')
    const now = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore', month: 'long', year: 'numeric' })
    await expect(page.getByText(now).first()).toBeVisible()
  })

  test('navigate to previous month', async ({ page }) => {
    await page.goto('/calendar')
    const prevBtn = page.getByRole('button', { name: /◀|prev/i })
    await prevBtn.click()
    // URL should contain a month param
    await expect(page).toHaveURL(/\?month=/)
  })

  test('navigate to next month', async ({ page }) => {
    await page.goto('/calendar')
    const nextBtn = page.getByRole('button', { name: /▶|next/i })
    await nextBtn.click()
    await expect(page).toHaveURL(/\?month=/)
  })

  test('Today button returns to current month', async ({ page }) => {
    await page.goto('/calendar?month=2024-01')
    await page.getByRole('button', { name: /today/i }).click()
    // Should no longer have the old month in URL
    const url = page.url()
    expect(url).not.toContain('2024-01')
  })

  test('day headers show Sun through Sat', async ({ page }) => {
    await page.goto('/calendar')
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await expect(page.getByText(day).first()).toBeVisible()
    }
  })

  test('todo with due date appears on calendar', async ({ page }) => {
    // Go home and create a todo with a specific due date
    await page.goto('/')

    // Get current Singapore date + 2 days
    const target = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const dateStr = target.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    const dayNum = parseInt(
      target.toLocaleString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric' })
    )

    await page.getByPlaceholder(/todo title/i).fill('Calendar todo')
    await page.locator('input[type="datetime-local"]').first().fill(dateStr)
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Calendar todo')).toBeVisible()

    // Navigate to calendar
    await page.getByRole('button', { name: /calendar/i }).click()
    await expect(page).toHaveURL('/calendar')

    // The day cell with the todo should show the todo title or a count badge
    await expect(page.getByText('Calendar todo').first()).toBeVisible()
  })

  test('URL state management with month param', async ({ page }) => {
    await page.goto('/calendar?month=2025-06')
    await expect(page.getByText(/june 2025/i).first()).toBeVisible()
  })
})
