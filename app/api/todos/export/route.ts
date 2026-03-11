import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB, tagDB } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const todos = todoDB.findByUserId(session.userId)
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
      'Content-Disposition': `attachment; filename="todos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
