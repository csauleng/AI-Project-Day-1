import { test, expect } from '@playwright/test'
import { setupVirtualAuthenticator, uniqueUser } from './helpers'

test.describe('Feature 11: Authentication (WebAuthn)', () => {
  test('register new user with passkey', async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()

    await page.goto('/login')
    await expect(page.getByText('Todo App')).toBeVisible()

    // Switch to Register tab
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()

    // Should redirect to home after successful registration
    await page.waitForURL('/', { timeout: 10000 })
    await expect(page).toHaveURL('/')
  })

  test('login with existing passkey', async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()

    // Register first
    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/', { timeout: 10000 })

    // Logout
    await page.getByRole('button', { name: /logout/i }).click()
    await page.waitForURL('/login', { timeout: 5000 })

    // Login
    await page.getByRole('button', { name: /^login$/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /^login$/i }).last().click()
    await page.waitForURL('/', { timeout: 10000 })
    await expect(page).toHaveURL('/')
  })

  test('logout clears session', async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()

    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')

    await page.getByRole('button', { name: /logout/i }).click()
    await expect(page).toHaveURL('/login')
  })

  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    // Clear cookies to ensure unauthenticated
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('login page redirects already-authenticated user to home', async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    const username = uniqueUser()

    await page.goto('/login')
    await page.getByRole('button', { name: /register/i }).first().click()
    await page.getByPlaceholder(/username/i).fill(username)
    await page.getByRole('button', { name: /register/i }).last().click()
    await page.waitForURL('/')

    // Navigate back to login — should redirect to home
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })

  test('empty username shows validation error', async ({ page, context }) => {
    await setupVirtualAuthenticator(context, page)
    await page.goto('/login')
    await page.getByRole('button', { name: /^login$/i }).last().click()
    await expect(page.getByText(/username is required/i)).toBeVisible()
  })
})
