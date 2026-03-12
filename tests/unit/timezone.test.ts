import { describe, it, expect } from 'vitest'
import {
  getSingaporeNow,
  calculateNextDueDate,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from '../../lib/timezone'

describe('Singapore Timezone Utilities', () => {
  describe('getSingaporeNow', () => {
    it('returns a Date object', () => {
      const result = getSingaporeNow()
      expect(result).toBeInstanceOf(Date)
    })

    it('is close to the actual current time (within 1 second)', () => {
      const before = Date.now()
      const sgNow = getSingaporeNow()
      const after = Date.now()
      expect(sgNow.getTime()).toBeGreaterThanOrEqual(before - 1000)
      expect(sgNow.getTime()).toBeLessThanOrEqual(after + 1000)
    })
  })

  describe('addDays', () => {
    it('adds days correctly', () => {
      const base = new Date('2025-01-01T00:00:00Z')
      const result = addDays(base, 5)
      expect(result.getUTCDate()).toBe(6)
    })

    it('handles month boundary', () => {
      const base = new Date('2025-01-29T00:00:00Z')
      const result = addDays(base, 3)
      expect(result.getUTCMonth()).toBe(1) // February
      expect(result.getUTCDate()).toBe(1)
    })

    it('does not mutate the original date', () => {
      const base = new Date('2025-01-01T00:00:00Z')
      const originalTime = base.getTime()
      addDays(base, 7)
      expect(base.getTime()).toBe(originalTime)
    })
  })

  describe('addWeeks', () => {
    it('adds 7 days per week', () => {
      const base = new Date('2025-01-01T00:00:00Z')
      const result = addWeeks(base, 2)
      expect(result.getUTCDate()).toBe(15) // Jan 1 + 14 days
    })
  })

  describe('addMonths', () => {
    it('adds months correctly', () => {
      const base = new Date('2025-01-15T00:00:00Z')
      const result = addMonths(base, 3)
      expect(result.getUTCMonth()).toBe(3) // April (0-indexed)
      expect(result.getUTCDate()).toBe(15)
    })

    it('handles December → January rollover', () => {
      const base = new Date('2025-12-15T00:00:00Z')
      const result = addMonths(base, 1)
      expect(result.getUTCFullYear()).toBe(2026)
      expect(result.getUTCMonth()).toBe(0) // January
    })
  })

  describe('addYears', () => {
    it('adds years correctly', () => {
      const base = new Date('2025-06-15T00:00:00Z')
      const result = addYears(base, 2)
      expect(result.getUTCFullYear()).toBe(2027)
    })

    it('handles leap year', () => {
      const base = new Date('2024-02-29T00:00:00Z')
      const result = addYears(base, 1)
      // Feb 29 + 1 year → Feb 28 or Mar 1 depending on JS behavior
      expect(result.getUTCFullYear()).toBe(2025)
    })
  })

  describe('calculateNextDueDate', () => {
    const baseDateISO = '2025-03-12T10:00:00.000Z'

    it('calculates next daily due date', () => {
      const next = calculateNextDueDate(baseDateISO, 'daily')
      const nextDate = new Date(next)
      const baseDate = new Date(baseDateISO)
      const diffMs = nextDate.getTime() - baseDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(1)
    })

    it('calculates next weekly due date', () => {
      const next = calculateNextDueDate(baseDateISO, 'weekly')
      const nextDate = new Date(next)
      const baseDate = new Date(baseDateISO)
      const diffMs = nextDate.getTime() - baseDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(7)
    })

    it('calculates next monthly due date', () => {
      const next = calculateNextDueDate(baseDateISO, 'monthly')
      const nextDate = new Date(next)
      const baseDate = new Date(baseDateISO)
      expect(nextDate.getUTCMonth()).toBe((baseDate.getUTCMonth() + 1) % 12)
      expect(nextDate.getUTCDate()).toBe(baseDate.getUTCDate())
    })

    it('calculates next yearly due date', () => {
      const next = calculateNextDueDate(baseDateISO, 'yearly')
      const nextDate = new Date(next)
      const baseDate = new Date(baseDateISO)
      expect(nextDate.getUTCFullYear()).toBe(baseDate.getUTCFullYear() + 1)
      expect(nextDate.getUTCMonth()).toBe(baseDate.getUTCMonth())
    })

    it('returns a valid ISO string', () => {
      const next = calculateNextDueDate(baseDateISO, 'daily')
      expect(() => new Date(next)).not.toThrow()
      expect(new Date(next).toISOString()).toBe(next)
    })
  })
})
