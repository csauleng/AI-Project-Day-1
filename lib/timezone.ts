const SINGAPORE_TZ = 'Asia/Singapore'

export function getSingaporeNow(): Date {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: SINGAPORE_TZ }))
}

export function formatSingaporeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: SINGAPORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function toSingaporeISO(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

export function getSingaporeTimestamp(): string {
  return getSingaporeNow().toISOString()
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

export function calculateNextDueDate(
  currentDueDate: string,
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  const date = new Date(currentDueDate)
  let next: Date
  switch (pattern) {
    case 'daily':
      next = addDays(date, 1)
      break
    case 'weekly':
      next = addWeeks(date, 1)
      break
    case 'monthly':
      next = addMonths(date, 1)
      break
    case 'yearly':
      next = addYears(date, 1)
      break
  }
  return next.toISOString()
}
