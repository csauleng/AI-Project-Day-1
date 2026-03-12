import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB, tagDB } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const format = request.nextUrl.searchParams.get('format') ?? 'json'
  const todos = todoDB.findByUserId(session.userId)
  const dateStr = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const header = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder (minutes),Created At'
    const rows = todos.map((todo) => {
      const cols = [
        todo.id,
        `"${String(todo.title).replace(/"/g, '""')}"`,
        todo.completed ? 'true' : 'false',
        todo.due_date ?? '',
        todo.priority ?? '',
        todo.is_recurring ? 'true' : 'false',
        todo.recurrence_pattern ?? '',
        todo.reminder_minutes ?? '',
        todo.created_at ?? '',
      ]
      return cols.join(',')
    })
    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${dateStr}.csv"`,
      },
    })
  }

  const tags = tagDB.findByUserId(session.userId)
  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    tags,
    todos: todos.map((todo) => ({
      ...todo,
      subtasks: subtaskDB.findByTodoId(todo.id),
      tags: tagDB.findByTodoId(todo.id),
    })),
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-export-${dateStr}.json"`,
    },
  })
}
