import { type Page, type BrowserContext, expect } from '@playwright/test'

// ─── Virtual Authenticator ────────────────────────────────────────────────────

export async function setupVirtualAuthenticator(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable', { enableUI: false })
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  })
  return { cdp, authenticatorId }
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export async function registerUser(page: Page, context: BrowserContext, username: string) {
  await setupVirtualAuthenticator(context, page)
  await page.goto('/login')
  await page.getByRole('tab', { name: /register/i }).click()
  await page.getByPlaceholder(/username/i).fill(username)
  await page.getByRole('button', { name: /register/i }).click()
  await page.waitForURL('/', { timeout: 10000 })
}

export async function loginUser(page: Page, context: BrowserContext, username: string) {
  await setupVirtualAuthenticator(context, page)
  await page.goto('/login')
  await page.getByRole('tab', { name: /login/i }).click()
  await page.getByPlaceholder(/username/i).fill(username)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('/', { timeout: 10000 })
}

// ─── Todo Helpers ─────────────────────────────────────────────────────────────

export async function createTodo(
  page: Page,
  options: {
    title: string
    priority?: 'High' | 'Medium' | 'Low'
    dueDate?: string // 'YYYY-MM-DDTHH:MM'
  }
) {
  await page.getByPlaceholder(/todo title/i).fill(options.title)

  if (options.priority) {
    await page.getByRole('combobox', { name: /priority/i }).selectOption(options.priority.toLowerCase())
  }

  if (options.dueDate) {
    await page.getByLabel(/due date/i).fill(options.dueDate)
  }

  await page.getByRole('button', { name: /^add$/i }).click()
  // Wait for the todo to appear
  await expect(page.getByText(options.title).first()).toBeVisible({ timeout: 5000 })
}

// ─── Subtask Helpers ──────────────────────────────────────────────────────────

export async function addSubtask(page: Page, todoTitle: string, subtaskTitle: string) {
  // Expand the todo's subtask panel
  const todoCard = page.locator('[data-testid="todo-card"]', { hasText: todoTitle }).first()
  const expandBtn = todoCard.locator('button', { hasText: /▶|▼/ })
  await expandBtn.click()

  // Type into the subtask input within that card
  const subtaskInput = todoCard.getByPlaceholder(/add subtask/i)
  await subtaskInput.fill(subtaskTitle)
  await subtaskInput.press('Enter')

  await expect(todoCard.getByText(subtaskTitle)).toBeVisible({ timeout: 3000 })
}

// ─── Tag Helpers ──────────────────────────────────────────────────────────────

export async function createTag(page: Page, name: string, color = '#3B82F6') {
  await page.getByRole('button', { name: /manage tags/i }).click()
  await page.getByPlaceholder(/tag name/i).fill(name)
  // Color is already defaulted, but can be set if needed
  await page.getByRole('button', { name: /create tag/i }).click()
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 3000 })
}

// ─── Unique Username Factory ──────────────────────────────────────────────────

let counter = Date.now()
export function uniqueUser(): string {
  return `testuser_${counter++}`
}
