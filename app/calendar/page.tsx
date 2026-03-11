'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Todo } from '@/lib/db'
import type { Holiday } from '@/lib/db'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function CalendarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = new Date()

  const parseMonthParam = () => {
    const param = searchParams.get('month')
    if (param && /^\d{4}-\d{2}$/.test(param)) {
      const [y, m] = param.split('-').map(Number)
      return { year: y, month: m - 1 }
    }
    return { year: now.getFullYear(), month: now.getMonth() }
  }

  const initial = parseMonthParam()
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [todos, setTodos] = useState<Todo[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [todosRes, holidaysRes] = await Promise.all([
        fetch('/api/todos'),
        fetch(`/api/holidays?year=${year}&month=${month + 1}`),
      ])
      if (todosRes.status === 401) { router.push('/login'); return }
      if (todosRes.ok) setTodos(await todosRes.json())
      if (holidaysRes.ok) setHolidays(await holidaysRes.json())
    } catch (err) {
      console.error('Calendar load error:', err)
    } finally {
      setLoading(false)
    }
  }, [year, month, router])

  useEffect(() => { loadData() }, [loadData])

  // Sync URL when month/year changes
  useEffect(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    router.replace(`/calendar?month=${monthStr}`, { scroll: false })
  }, [year, month, router])

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Build date -> todos map
  const todosByDate: Record<string, Todo[]> = {}
  for (const todo of todos) {
    if (!todo.due_date) continue
    const dateKey = todo.due_date.slice(0, 10)
    const [y, m] = dateKey.split('-').map(Number)
    if (y === year && m === month + 1) {
      if (!todosByDate[dateKey]) todosByDate[dateKey] = []
      todosByDate[dateKey].push(todo)
    }
  }

  // Build date -> holidays map
  const holidayByDate: Record<string, string> = {}
  for (const h of holidays) {
    holidayByDate[h.date] = h.name
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold">📅 Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
              ‹
            </button>
            <span className="font-semibold min-w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
              ›
            </button>
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }} className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
              Today
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-2 ${
              i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-gray-50 min-h-24" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayTodos = todosByDate[dateKey] || []
            const holiday = holidayByDate[dateKey]
            const isToday = dateKey === todayStr
            const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6

            return (
              <div
                key={day}
                className={`bg-white min-h-24 p-1 border-t border-gray-100 ${
                  isToday ? 'ring-2 ring-blue-400 ring-inset' : ''
                } ${isWeekend ? 'bg-gray-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {day}
                </div>
                {holiday && (
                  <div className="text-xs text-red-500 truncate font-medium mb-0.5">
                    🎉 {holiday}
                  </div>
                )}
                {dayTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className={`text-xs truncate rounded px-1 py-0.5 mb-0.5 ${
                      todo.completed
                        ? 'bg-gray-100 text-gray-400 line-through'
                        : todo.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : todo.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                    title={todo.title}
                  >
                    {todo.title}
                  </div>
                ))}
                {dayTodos.length > 3 && (
                  <div className="text-xs text-gray-400">+{dayTodos.length - 3} more</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Completed</span>
          <span className="flex items-center gap-1">🎉 Singapore Holiday</span>
        </div>
      </main>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Loading calendar...</div></div>}>
      <CalendarContent />
    </Suspense>
  )
}
