import { describe, it, expect } from 'vitest'

// Progress calculation logic (mirrors the UI logic in app/page.tsx)
function calcProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

function calcProgressColor(pct: number): 'green' | 'blue' {
  return pct === 100 ? 'green' : 'blue'
}

describe('Progress Calculation', () => {
  describe('calcProgress', () => {
    it('returns 0 when no subtasks', () => {
      expect(calcProgress(0, 0)).toBe(0)
    })

    it('returns 0 when none completed', () => {
      expect(calcProgress(0, 5)).toBe(0)
    })

    it('returns 100 when all completed', () => {
      expect(calcProgress(5, 5)).toBe(100)
    })

    it('returns 50 for half completed', () => {
      expect(calcProgress(2, 4)).toBe(50)
    })

    it('rounds to nearest integer', () => {
      expect(calcProgress(1, 3)).toBe(33)
      expect(calcProgress(2, 3)).toBe(67)
    })

    it('handles single subtask completed', () => {
      expect(calcProgress(1, 1)).toBe(100)
    })

    it('handles single subtask not completed', () => {
      expect(calcProgress(0, 1)).toBe(0)
    })
  })

  describe('calcProgressColor', () => {
    it('returns green at 100%', () => {
      expect(calcProgressColor(100)).toBe('green')
    })

    it('returns blue below 100%', () => {
      expect(calcProgressColor(99)).toBe('blue')
      expect(calcProgressColor(50)).toBe('blue')
      expect(calcProgressColor(0)).toBe('blue')
    })
  })
})

// Priority sort order logic (mirrors app/page.tsx byPriDate)
type Priority = 'high' | 'medium' | 'low'

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function sortByPriority(
  a: { priority: Priority; due_date: string | null },
  b: { priority: Priority; due_date: string | null }
): number {
  if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  }
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1
  return 0
}

describe('Priority Sort Logic', () => {
  it('high sorts before medium', () => {
    const a = { priority: 'high' as Priority, due_date: null }
    const b = { priority: 'medium' as Priority, due_date: null }
    expect(sortByPriority(a, b)).toBeLessThan(0)
  })

  it('medium sorts before low', () => {
    const a = { priority: 'medium' as Priority, due_date: null }
    const b = { priority: 'low' as Priority, due_date: null }
    expect(sortByPriority(a, b)).toBeLessThan(0)
  })

  it('same priority: earlier due date sorts first', () => {
    const a = { priority: 'medium' as Priority, due_date: '2025-01-01T10:00:00Z' }
    const b = { priority: 'medium' as Priority, due_date: '2025-06-01T10:00:00Z' }
    expect(sortByPriority(a, b)).toBeLessThan(0)
  })

  it('same priority: item with due date sorts before item without', () => {
    const a = { priority: 'low' as Priority, due_date: '2025-01-01T10:00:00Z' }
    const b = { priority: 'low' as Priority, due_date: null }
    expect(sortByPriority(a, b)).toBeLessThan(0)
  })

  it('two identical items return 0', () => {
    const a = { priority: 'high' as Priority, due_date: null }
    const b = { priority: 'high' as Priority, due_date: null }
    expect(sortByPriority(a, b)).toBe(0)
  })

  it('sorts an array correctly: high > medium > low', () => {
    const todos = [
      { priority: 'low' as Priority, due_date: null, title: 'Low' },
      { priority: 'high' as Priority, due_date: null, title: 'High' },
      { priority: 'medium' as Priority, due_date: null, title: 'Medium' },
    ]
    todos.sort(sortByPriority)
    expect(todos.map((t) => t.title)).toEqual(['High', 'Medium', 'Low'])
  })
})

// Reminder timing label mapping (mirrors REMINDER_OPTIONS in app/page.tsx)
const REMINDER_OPTIONS = [
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hr before' },
  { value: 120, label: '2 hrs before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
]

function getReminderLabel(minutes: number): string | undefined {
  return REMINDER_OPTIONS.find((opt) => opt.value === minutes)?.label
}

describe('Reminder Options', () => {
  it('has exactly 7 timing options', () => {
    expect(REMINDER_OPTIONS).toHaveLength(7)
  })

  it('maps 15 minutes correctly', () => {
    expect(getReminderLabel(15)).toBe('15 min before')
  })

  it('maps 1 hour (60 min) correctly', () => {
    expect(getReminderLabel(60)).toBe('1 hr before')
  })

  it('maps 1 week (10080 min) correctly', () => {
    expect(getReminderLabel(10080)).toBe('1 week before')
  })

  it('returns undefined for unknown value', () => {
    expect(getReminderLabel(999)).toBeUndefined()
  })
})
