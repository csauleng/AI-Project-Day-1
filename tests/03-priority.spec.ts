import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 02: Priority System', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  for (const priority of ['high', 'medium', 'low'] as const) {
    test(`create todo with ${priority} priority`, async ({ page }) => {
      const title = `${priority} priority todo`
      await page.getByPlaceholder(/todo title/i).fill(title)
      await page.locator('select').first().selectOption(priority)
      await page.getByRole('button', { name: /^add$/i }).click()

      await expect(page.getByText(title)).toBeVisible()
      await expect(
        page.getByText(priority.charAt(0).toUpperCase() + priority.slice(1)).first()
      ).toBeVisible()
    })
  }

  test('filter by high priority shows only high priority todos', async ({ page }) => {
    // Create todos with different priorities
    for (const [title, priority] of [
      ['High task', 'high'],
      ['Medium task', 'medium'],
      ['Low task', 'low'],
    ]) {
      await page.getByPlaceholder(/todo title/i).fill(title)
      await page.locator('select').first().selectOption(priority)
      await page.getByRole('button', { name: /^add$/i }).click()
      await expect(page.getByText(title)).toBeVisible()
    }

    // Apply high priority filter
    const priorityFilter = page.locator('select').filter({ hasText: /all priorities/i })
    await priorityFilter.selectOption('high')

    await expect(page.getByText('High task')).toBeVisible()
    await expect(page.getByText('Medium task')).not.toBeVisible()
    await expect(page.getByText('Low task')).not.toBeVisible()
  })

  test('edit priority on existing todo', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Priority edit test')
    await page.locator('select').first().selectOption('low')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Low').first()).toBeVisible()

    await page.getByRole('button', { name: /edit/i }).first().click()
    // Find priority select in modal
    await page.locator('select').filter({ hasText: /medium|low|high/i }).first().selectOption('high')
    await page.getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('High').first()).toBeVisible()
  })

  test('high priority todos sort before low priority', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Low first added')
    await page.locator('select').first().selectOption('low')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Low first added')).toBeVisible()

    await page.getByPlaceholder(/todo title/i).fill('High added after')
    await page.locator('select').first().selectOption('high')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('High added after')).toBeVisible()

    // High should appear before Low in the rendered order
    const allTitles = await page.locator('[class*="rounded-xl border"] span').allTextContents()
    const lowIdx = allTitles.findIndex((t) => t.includes('Low first added'))
    const highIdx = allTitles.findIndex((t) => t.includes('High added after'))
    expect(highIdx).toBeLessThan(lowIdx)
  })
})
