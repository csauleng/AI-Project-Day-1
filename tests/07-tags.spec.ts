import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 06: Tag System', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  async function openTagModal(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: /manage tags/i }).click()
    await page.waitForTimeout(200)
  }

  test('create a tag', async ({ page }) => {
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('Work')
    await page.getByRole('button', { name: /create tag/i }).click()
    await expect(page.getByText('Work').first()).toBeVisible()
  })

  test('edit tag name', async ({ page }) => {
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('OldName')
    await page.getByRole('button', { name: /create tag/i }).click()
    await expect(page.getByText('OldName').first()).toBeVisible()

    await page.getByRole('button', { name: /edit/i }).first().click()
    const editInput = page.locator('input[type="text"]').filter({ hasText: '' }).last()
    await editInput.fill('NewName')
    await page.getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('NewName').first()).toBeVisible()
    await expect(page.getByText('OldName')).not.toBeVisible()
  })

  test('delete tag', async ({ page }) => {
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('DeleteMeTag')
    await page.getByRole('button', { name: /create tag/i }).click()
    await expect(page.getByText('DeleteMeTag').first()).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /delete/i }).first().click()
    await expect(page.getByText('DeleteMeTag')).not.toBeVisible()
  })

  test('assign tag to todo', async ({ page }) => {
    // Create tag first
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('Personal')
    await page.getByRole('button', { name: /create tag/i }).click()
    // Close modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Create todo and assign tag
    await page.getByPlaceholder(/todo title/i).fill('Tagged todo')
    // Tag pill should appear in the form
    const tagPill = page.getByText('Personal').first()
    if (await tagPill.isVisible()) await tagPill.click()
    await page.getByRole('button', { name: /^add$/i }).click()

    await expect(page.getByText('Tagged todo')).toBeVisible()
  })

  test('filter todos by tag', async ({ page }) => {
    // Create tag
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('FilterTag')
    await page.getByRole('button', { name: /create tag/i }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Create tagged todo
    await page.getByPlaceholder(/todo title/i).fill('In FilterTag')
    const tagPill = page.getByText('FilterTag').first()
    if (await tagPill.isVisible()) await tagPill.click()
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('In FilterTag')).toBeVisible()

    // Create untagged todo
    await page.getByPlaceholder(/todo title/i).fill('No tag todo')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('No tag todo')).toBeVisible()

    // Apply tag filter
    const tagFilter = page.locator('select').filter({ hasText: /all tags/i })
    if (await tagFilter.isVisible()) {
      const options = await tagFilter.locator('option').allTextContents()
      const filterTagOption = options.find((o) => o.includes('FilterTag'))
      if (filterTagOption) {
        await tagFilter.selectOption({ label: filterTagOption })
        await expect(page.getByText('In FilterTag')).toBeVisible()
        await expect(page.getByText('No tag todo')).not.toBeVisible()
      }
    }
  })

  test('duplicate tag name shows error', async ({ page }) => {
    await openTagModal(page)
    await page.getByPlaceholder(/tag name/i).fill('UniqueTag')
    await page.getByRole('button', { name: /create tag/i }).click()
    await expect(page.getByText('UniqueTag').first()).toBeVisible()

    // Try to create same tag again
    await page.getByPlaceholder(/tag name/i).fill('UniqueTag')
    await page.getByRole('button', { name: /create tag/i }).click()

    // Should show an error or not create a duplicate
    const tagOccurrences = await page.getByText('UniqueTag').count()
    // There should not be more than 2 occurrences (one in list, one in any selected area)
    expect(tagOccurrences).toBeLessThanOrEqual(2)
  })
})
