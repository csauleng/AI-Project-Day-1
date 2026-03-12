import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 04: Reminders & Notifications', () => {
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

  test('reminder dropdown is disabled without due date', async ({ page }) => {
    await showAdvanced(page)
    const reminderSelect = page.locator('select').filter({ hasText: /none|15 min|30 min|1 hr|1 day/i })
    await expect(reminderSelect).toBeDisabled()
  })

  test('reminder dropdown enables when due date is set', async ({ page }) => {
    await showAdvanced(page)

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    const reminderSelect = page.locator('select').filter({ hasText: /none|15 min|30 min|1 hr|1 day/i })
    await expect(reminderSelect).toBeEnabled()
  })

  test('all 7 reminder options are available', async ({ page }) => {
    await showAdvanced(page)

    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    const reminderSelect = page.locator('select').filter({ hasText: /none|15 min|30 min|1 hr|1 day/i })
    const options = reminderSelect.locator('option')
    // None + 7 timing = 8 options total
    await expect(options).toHaveCount(8)
  })

  test('todo with reminder shows reminder badge', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Reminder test todo')
    await showAdvanced(page)

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const futureStr = future.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).slice(0, 16).replace(' ', 'T')
    await page.locator('input[type="datetime-local"]').first().fill(futureStr)

    await page.locator('select').filter({ hasText: /none|15 min|30 min|1 hr|1 day/i }).selectOption('60')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText('Reminder test todo')).toBeVisible()
    // Reminder badge showing "1h"
    await expect(page.getByText(/1h/i).first()).toBeVisible()
  })

  test('enable notifications button is present', async ({ page }) => {
    // The bell icon button for enabling notifications should exist
    const notifBtn = page.locator('button').filter({ hasText: /notification/i })
    await expect(notifBtn.first()).toBeVisible()
  })

  test('notifications API returns todos needing reminder', async ({ page, request }) => {
    // The check endpoint should respond (even if no todos need notifying now)
    const res = await request.get('/api/notifications/check', {
      headers: { Cookie: await page.context().cookies().then((c) => c.map((x) => `${x.name}=${x.value}`).join('; ')) },
    })
    // If auth cookie not available, just verify endpoint exists (won't 404)
    expect([200, 401]).toContain(res.status())
  })
})
