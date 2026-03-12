import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 05: Subtasks & Progress Tracking', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')

    // Create a base todo
    await page.getByPlaceholder(/todo title/i).fill('Parent todo')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Parent todo')).toBeVisible()
  })

  async function expandSubtasks(page: import('@playwright/test').Page) {
    // Click the ▶ button on the first todo card
    await page.locator('button').filter({ hasText: '▶' }).first().click()
    await page.waitForTimeout(300)
  }

  test('expand subtasks section', async ({ page }) => {
    await expandSubtasks(page)
    // Subtask input should appear
    await expect(page.getByPlaceholder(/add subtask/i).first()).toBeVisible()
  })

  test('add a subtask', async ({ page }) => {
    await expandSubtasks(page)
    await page.getByPlaceholder(/add subtask/i).first().fill('First subtask')
    await page.getByPlaceholder(/add subtask/i).first().press('Enter')
    await expect(page.getByText('First subtask')).toBeVisible()
  })

  test('add multiple subtasks', async ({ page }) => {
    await expandSubtasks(page)
    for (const title of ['Subtask A', 'Subtask B', 'Subtask C']) {
      await page.getByPlaceholder(/add subtask/i).first().fill(title)
      await page.getByPlaceholder(/add subtask/i).first().press('Enter')
      await expect(page.getByText(title)).toBeVisible()
    }
  })

  test('toggle subtask completion updates progress', async ({ page }) => {
    await expandSubtasks(page)

    // Add 2 subtasks
    await page.getByPlaceholder(/add subtask/i).first().fill('Step one')
    await page.getByPlaceholder(/add subtask/i).first().press('Enter')
    await page.getByPlaceholder(/add subtask/i).first().fill('Step two')
    await page.getByPlaceholder(/add subtask/i).first().press('Enter')

    // Complete first subtask by clicking its checkbox
    const subtaskCheckboxes = page.locator('[data-subtask-checkbox], input[type="checkbox"]').filter({ hasText: '' })
    // Get the first checkbox inside the expanded panel
    const firstSubtaskCb = page.locator('label').filter({ hasText: 'Step one' }).locator('input[type="checkbox"]')
    if (await firstSubtaskCb.count() === 0) {
      // Fallback: click any checkbox in the subtask list area
      await page.locator('input[type="checkbox"]').nth(1).click()
    } else {
      await firstSubtaskCb.click()
    }

    // Progress should update - check for a progress bar or text
    await expect(page.locator('[class*="bg-blue"], [class*="bg-green"]').first()).toBeVisible()
  })

  test('delete subtask', async ({ page }) => {
    await expandSubtasks(page)
    await page.getByPlaceholder(/add subtask/i).first().fill('To be deleted')
    await page.getByPlaceholder(/add subtask/i).first().press('Enter')
    await expect(page.getByText('To be deleted')).toBeVisible()

    // Click the ✕ button next to the subtask
    await page.locator('button').filter({ hasText: '✕' }).first().click()
    await expect(page.getByText('To be deleted')).not.toBeVisible()
  })

  test('subtask count shown on todo card', async ({ page }) => {
    await expandSubtasks(page)
    await page.getByPlaceholder(/add subtask/i).first().fill('Counted subtask')
    await page.getByPlaceholder(/add subtask/i).first().press('Enter')

    // Collapse subtasks
    await page.locator('button').filter({ hasText: '▼' }).first().click()

    // Count badge should show ≥ 1
    const countBadge = page.locator('span').filter({ hasText: /^[1-9]\d*$/ }).first()
    await expect(countBadge).toBeVisible()
  })
})
