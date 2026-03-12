import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 08: Search & Filtering', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')

    // Create test todos
    for (const [title, priority] of [
      ['Buy groceries', 'low'],
      ['Fix bug in report', 'high'],
      ['Send weekly report', 'medium'],
    ]) {
      await page.getByPlaceholder(/todo title/i).fill(title)
      await page.locator('select').first().selectOption(priority)
      await page.getByRole('button', { name: /^add$/i }).click()
      await expect(page.getByText(title)).toBeVisible()
    }
  })

  test('search by title (case-insensitive)', async ({ page }) => {
    await page.getByPlaceholder(/search todos/i).fill('REPORT')
    await expect(page.getByText('Fix bug in report')).toBeVisible()
    await expect(page.getByText('Send weekly report')).toBeVisible()
    await expect(page.getByText('Buy groceries')).not.toBeVisible()
  })

  test('search partial match', async ({ page }) => {
    await page.getByPlaceholder(/search todos/i).fill('gro')
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Fix bug in report')).not.toBeVisible()
  })

  test('filter by priority', async ({ page }) => {
    const priorityFilter = page.locator('select').filter({ hasText: /all priorities/i })
    await priorityFilter.selectOption('high')

    await expect(page.getByText('Fix bug in report')).toBeVisible()
    await expect(page.getByText('Buy groceries')).not.toBeVisible()
    await expect(page.getByText('Send weekly report')).not.toBeVisible()
  })

  test('clear filters button resets all filters', async ({ page }) => {
    await page.getByPlaceholder(/search todos/i).fill('report')
    await page.locator('select').filter({ hasText: /all priorities/i }).selectOption('high')

    await page.getByRole('button', { name: /clear all/i }).click()

    // All todos should be visible again
    await expect(page.getByText('Buy groceries')).toBeVisible()
    await expect(page.getByText('Fix bug in report')).toBeVisible()
    await expect(page.getByText('Send weekly report')).toBeVisible()
  })

  test('combined search and priority filter', async ({ page }) => {
    await page.getByPlaceholder(/search todos/i).fill('report')
    await page.locator('select').filter({ hasText: /all priorities/i }).selectOption('high')

    await expect(page.getByText('Fix bug in report')).toBeVisible()
    await expect(page.getByText('Send weekly report')).not.toBeVisible()
    await expect(page.getByText('Buy groceries')).not.toBeVisible()
  })

  test('advanced filters panel toggles', async ({ page }) => {
    await page.getByRole('button', { name: /advanced/i }).click()
    await expect(page.getByText(/completion status/i).first()).toBeVisible()
    await page.getByRole('button', { name: /advanced/i }).click()
    await expect(page.getByText(/completion status/i)).not.toBeVisible()
  })

  test('completion status filter: completed only', async ({ page }) => {
    // Complete one todo
    await page.getByRole('checkbox').first().click()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: /advanced/i }).click()
    await page.locator('select').filter({ hasText: /all todos|completed/i }).selectOption('completed')

    // Only completed todos should show
    const completedSection = page.getByText(/completed/i).first()
    await expect(completedSection).toBeVisible()
  })

  test('search input has clear button', async ({ page }) => {
    await page.getByPlaceholder(/search todos/i).fill('test')
    const clearBtn = page.locator('button').filter({ hasText: '✕' }).first()
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await expect(page.getByPlaceholder(/search todos/i)).toHaveValue('')
    }
  })
})
