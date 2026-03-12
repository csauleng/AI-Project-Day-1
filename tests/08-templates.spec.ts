import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 07: Template System', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')
  })

  test('save a template from todo form', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('Weekly Review')
    await page.locator('select').first().selectOption('high')

    // Save as template button appears when title is filled
    const saveTemplateBtn = page.getByRole('button', { name: /save as template/i })
    await expect(saveTemplateBtn).toBeVisible()
    await saveTemplateBtn.click()

    await page.getByPlaceholder(/template name/i).fill('My Weekly Review')
    await page.getByRole('button', { name: /save template/i }).click()

    // Template should now be available
    await page.getByRole('button', { name: /templates/i }).click()
    await expect(page.getByText('My Weekly Review')).toBeVisible()
  })

  test('create todo from template using Use button', async ({ page }) => {
    // Create template first via form
    await page.getByPlaceholder(/todo title/i).fill('Daily Standup')
    await page.locator('select').first().selectOption('medium')
    await page.getByRole('button', { name: /save as template/i }).click()
    await page.getByPlaceholder(/template name/i).fill('Standup Template')
    await page.getByRole('button', { name: /save template/i }).click()

    // Open Templates modal and use it
    await page.getByRole('button', { name: /templates/i }).click()
    await expect(page.getByText('Standup Template')).toBeVisible()
    await page.getByRole('button', { name: /^use$/i }).first().click()

    // A new todo should be created with the template's title
    await expect(page.getByText('Daily Standup')).toBeVisible()
  })

  test('delete template', async ({ page }) => {
    // Create template
    await page.getByPlaceholder(/todo title/i).fill('Template To Delete')
    await page.getByRole('button', { name: /save as template/i }).click()
    await page.getByPlaceholder(/template name/i).fill('DeleteMe Template')
    await page.getByRole('button', { name: /save template/i }).click()

    // Open templates and delete
    await page.getByRole('button', { name: /templates/i }).click()
    await expect(page.getByText('DeleteMe Template')).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /delete/i }).first().click()

    await expect(page.getByText('DeleteMe Template')).not.toBeVisible()
  })

  test('use template dropdown on main form', async ({ page }) => {
    // Create template
    await page.getByPlaceholder(/todo title/i).fill('Template Form Test')
    await page.getByRole('button', { name: /save as template/i }).click()
    await page.getByPlaceholder(/template name/i).fill('Form Template')
    await page.getByRole('button', { name: /save template/i }).click()

    // Use template via dropdown on form
    const templateDropdown = page.locator('select').filter({ hasText: /use template/i })
    await expect(templateDropdown).toBeVisible()
    await templateDropdown.selectOption({ label: /Form Template/i })

    // Title should be pre-filled
    await expect(page.getByPlaceholder(/todo title/i)).toHaveValue('Template Form Test')
  })

  test('template preserves priority setting', async ({ page }) => {
    await page.getByPlaceholder(/todo title/i).fill('High Priority Template')
    await page.locator('select').first().selectOption('high')
    await page.getByRole('button', { name: /save as template/i }).click()
    await page.getByPlaceholder(/template name/i).fill('HP Template')
    await page.getByRole('button', { name: /save template/i }).click()

    // Open template modal, check template shows High priority
    await page.getByRole('button', { name: /templates/i }).click()
    await expect(page.getByText('HP Template')).toBeVisible()
    // Template preview should show High priority badge
    await expect(page.getByText(/high/i).first()).toBeVisible()
  })
})
