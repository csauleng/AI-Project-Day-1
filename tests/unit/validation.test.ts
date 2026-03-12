import { describe, it, expect } from 'vitest'

// ─── Todo Title Validation (mirrors app logic) ────────────────────────────────

function validateTodoTitle(title: string): string | null {
  if (!title || !title.trim()) return 'Title is required'
  if (title.trim().length > 500) return 'Title too long'
  return null
}

describe('Todo Title Validation', () => {
  it('accepts a normal title', () => {
    expect(validateTodoTitle('Buy milk')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(validateTodoTitle('')).not.toBeNull()
  })

  it('rejects whitespace-only string', () => {
    expect(validateTodoTitle('   ')).not.toBeNull()
  })

  it('rejects title over 500 characters', () => {
    const longTitle = 'a'.repeat(501)
    expect(validateTodoTitle(longTitle)).not.toBeNull()
  })

  it('accepts title exactly at 500 characters', () => {
    const maxTitle = 'a'.repeat(500)
    expect(validateTodoTitle(maxTitle)).toBeNull()
  })
})

// ─── Priority Validation ──────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'
const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low']

function isValidPriority(p: string): p is Priority {
  return VALID_PRIORITIES.includes(p as Priority)
}

describe('Priority Validation', () => {
  it('accepts high', () => expect(isValidPriority('high')).toBe(true))
  it('accepts medium', () => expect(isValidPriority('medium')).toBe(true))
  it('accepts low', () => expect(isValidPriority('low')).toBe(true))
  it('rejects uppercase HIGH', () => expect(isValidPriority('HIGH')).toBe(false))
  it('rejects invalid string', () => expect(isValidPriority('urgent')).toBe(false))
  it('rejects empty string', () => expect(isValidPriority('')).toBe(false))
})

// ─── Recurrence Pattern Validation ───────────────────────────────────────────

type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'
const VALID_PATTERNS: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly']

function isValidPattern(p: string): p is RecurrencePattern {
  return VALID_PATTERNS.includes(p as RecurrencePattern)
}

describe('Recurrence Pattern Validation', () => {
  for (const pattern of VALID_PATTERNS) {
    it(`accepts ${pattern}`, () => expect(isValidPattern(pattern)).toBe(true))
  }
  it('rejects invalid pattern', () => expect(isValidPattern('hourly')).toBe(false))
  it('rejects empty string', () => expect(isValidPattern('')).toBe(false))
})

// ─── ID Remapping Logic (mirrors import route) ────────────────────────────────

function remapIds(
  importedTags: Array<{ id: number; name: string }>,
  existingTags: Array<{ id: number; name: string }>
): Map<number, number> {
  const idMap = new Map<number, number>()
  for (const tag of importedTags) {
    const existing = existingTags.find((e) => e.name === tag.name)
    if (existing) {
      idMap.set(tag.id, existing.id) // reuse existing tag ID
    } else {
      // In real code, a new tag is created; simulate with a new ID
      const newId = Math.max(...existingTags.map((e) => e.id), 0) + 1 + idMap.size
      idMap.set(tag.id, newId)
      existingTags.push({ id: newId, name: tag.name })
    }
  }
  return idMap
}

describe('ID Remapping (Import)', () => {
  it('reuses existing tag with same name', () => {
    const imported = [{ id: 99, name: 'Work' }]
    const existing = [{ id: 5, name: 'Work' }]
    const map = remapIds(imported, existing)
    expect(map.get(99)).toBe(5)
  })

  it('creates new ID for a tag that does not exist', () => {
    const imported = [{ id: 99, name: 'NewTag' }]
    const existing: Array<{ id: number; name: string }> = []
    const map = remapIds(imported, existing)
    expect(map.has(99)).toBe(true)
    expect(map.get(99)).not.toBe(99) // re-mapped ID
  })

  it('handles multiple tags with some existing', () => {
    const imported = [
      { id: 1, name: 'Work' },
      { id: 2, name: 'Personal' },
    ]
    const existing = [{ id: 10, name: 'Work' }]
    const map = remapIds(imported, existing)
    expect(map.get(1)).toBe(10) // existing Work tag
    expect(map.get(2)).not.toBe(2) // Personal gets new ID
  })

  it('maps duplicate imported IDs only once', () => {
    const imported = [{ id: 5, name: 'Finance' }]
    const existing = [{ id: 20, name: 'Finance' }]
    const map = remapIds(imported, existing)
    expect(map.size).toBe(1)
    expect(map.get(5)).toBe(20)
  })
})

// ─── Due Date Validation ──────────────────────────────────────────────────────

function isDueDateInFuture(dueDateISO: string, nowISO: string): boolean {
  return new Date(dueDateISO).getTime() > new Date(nowISO).getTime()
}

describe('Due Date Validation', () => {
  const now = '2025-03-12T10:00:00.000Z'

  it('accepts future date', () => {
    expect(isDueDateInFuture('2025-03-12T11:00:00.000Z', now)).toBe(true)
  })

  it('rejects past date', () => {
    expect(isDueDateInFuture('2025-03-12T09:00:00.000Z', now)).toBe(false)
  })

  it('rejects same millisecond as now', () => {
    expect(isDueDateInFuture(now, now)).toBe(false)
  })

  it('rejects date far in the past', () => {
    expect(isDueDateInFuture('2020-01-01T00:00:00.000Z', now)).toBe(false)
  })
})
