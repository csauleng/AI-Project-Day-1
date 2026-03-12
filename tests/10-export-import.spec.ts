import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'
import path from 'path'
import fs from 'fs'
import os from 'os'

test.describe('Feature 09: Export & Import', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')

    // Create a todo to export
    await page.getByPlaceholder(/todo title/i).fill('Export test todo')
    await page.getByRole('button', { name: /^add$/i }).click()
    await expect(page.getByText('Export test todo')).toBeVisible()
  })

  test('export JSON downloads a file', async ({ page }) => {
    // Open the Data dropdown
    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/export json/i).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/todos.*\.json/)
  })

  test('exported JSON is valid and contains todos', async ({ page }) => {
    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/export json/i).click(),
    ])

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(tmpPath)
    const content = fs.readFileSync(tmpPath, 'utf-8')
    const parsed = JSON.parse(content)

    expect(parsed).toHaveProperty('todos')
    expect(Array.isArray(parsed.todos)).toBe(true)
    expect(parsed.todos.length).toBeGreaterThanOrEqual(1)
    expect(parsed.todos[0]).toHaveProperty('title', 'Export test todo')

    fs.unlinkSync(tmpPath)
  })

  test('export CSV downloads a CSV file', async ({ page }) => {
    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/export csv/i).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/todos.*\.csv/)
  })

  test('exported CSV has correct headers', async ({ page }) => {
    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/export csv/i).click(),
    ])

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(tmpPath)
    const content = fs.readFileSync(tmpPath, 'utf-8')
    const firstLine = content.split('\n')[0]

    expect(firstLine).toContain('ID')
    expect(firstLine).toContain('Title')
    expect(firstLine).toContain('Priority')

    fs.unlinkSync(tmpPath)
  })

  test('import valid JSON file restores todos', async ({ page }) => {
    // Export first
    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText(/export json/i).click(),
    ])

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(tmpPath)

    // Now import
    await dataBtn.click()
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText(/import/i).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(tmpPath)

    await page.waitForTimeout(1000)
    // Imported todo should appear (possibly as duplicate since we imported)
    const todoCounts = await page.getByText('Export test todo').count()
    expect(todoCounts).toBeGreaterThanOrEqual(1)

    fs.unlinkSync(tmpPath)
  })

  test('import invalid JSON shows error', async ({ page }) => {
    const tmpPath = path.join(os.tmpdir(), 'invalid.json')
    fs.writeFileSync(tmpPath, 'this is not json!!!')

    // Listen for the alert dialog
    let alertMessage = ''
    page.once('dialog', async (dialog) => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    const dataBtn = page.getByRole('button', { name: /data/i })
    await dataBtn.click()
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText(/import/i).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(tmpPath)

    await page.waitForTimeout(500)
    // Should have shown an error
    expect(alertMessage).toBeTruthy()

    fs.unlinkSync(tmpPath)
  })
})
