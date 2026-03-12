import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 01: Todo CRUD Operations', () => {
  let username: string

  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  test('create todo with title only', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('My first todo')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('My first todo').first()).toBeVisible()
  })

  test('create todo with priority', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('High priority task')
    await page.locator('select').first().selectOption('high')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('High priority task')).toBeVisible()
    await expect(page.getByText('High').first()).toBeVisible()
  })

  test('cannot create todo with empty title', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /^add$/i })
    await addBtn.click()
    // Form should not submit — no new todo without title
    await expect(page.getByText(/pending/i).first()).toBeVisible()
    const todos = page.locator('[class*="rounded-xl border"]')
    await expect(todos).toHaveCount(0)
  })

  test('completed todo moves to completed section', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Finish this task')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Finish this task')).toBeVisible()

    // Click the checkbox to complete
    await page.getByRole('checkbox').first().click()

    // Should appear in Completed section
    await expect(page.getByText(/completed/i).first()).toBeVisible()
    await expect(page.getByText('Finish this task')).toBeVisible()
  })

  test('edit todo title', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Original title')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Original title')).toBeVisible()

    await page.getByRole('button', { name: /edit/i }).first().click()
    await page.getByRole('textbox').first().fill('Updated title')
    await page.getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('Updated title')).toBeVisible()
    await expect(page.getByText('Original title')).not.toBeVisible()
  })

  test('delete todo', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Delete me')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Delete me')).toBeVisible()

    // Handle confirm dialog
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /del/i }).first().click()

    await expect(page.getByText('Delete me')).not.toBeVisible()
  })

  test('todos are displayed in sections: pending and completed', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Section test todo')
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText(/pending/i).first()).toBeVisible()
    await expect(page.getByText('Section test todo')).toBeVisible()
  })

  test('past due date validation warning', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Past due test')

    // Need to show advanced options to see date field
    const advancedToggle = page.getByRole('button', { name: /advanced options/i })
    if (await advancedToggle.isVisible()) await advancedToggle.click()

    // Set a past date
    const pastDate = '2020-01-01T10:00'
    const dateInput = page.locator('input[type="datetime-local"]').first()
    await dateInput.fill(pastDate)

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('future')
      dialog.accept()
    })
    await page.getByRole('button', { name: /^add$/i }).click()
  })
})
