import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB, tagDB } from '@/lib/db'
import { calculateNextDueDate } from '@/lib/timezone'
import type { Priority, RecurrencePattern } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const todo = todoDB.findById(Number(id), session.userId)
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(todo)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const todoId = Number(id)

  try {
    const body = await request.json()
    const { title, completed, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes, tag_ids } = body

    const existing = todoDB.findById(todoId, session.userId)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Handle recurring todo completion: create next instance
    if (completed === 1 && existing.completed === 0 && existing.is_recurring && existing.due_date) {
      const nextDueDate = calculateNextDueDate(
        existing.due_date,
        (existing.recurrence_pattern as RecurrencePattern) || 'daily'
      )

      const nextTodo = todoDB.create({
        user_id: session.userId,
        title: existing.title,
        priority: existing.priority,
        due_date: nextDueDate,
        is_recurring: 1,
        recurrence_pattern: existing.recurrence_pattern,
        reminder_minutes: existing.reminder_minutes ?? null,
      })

      // Copy tags to next instance
      if (existing.tags && existing.tags.length > 0) {
        tagDB.setTodoTags(nextTodo.id, existing.tags.map((t) => t.id))
      }
    }

    const updateData: Parameters<typeof todoDB.update>[2] = {}
    if (title !== undefined) updateData.title = title.trim()
    if (completed !== undefined) updateData.completed = completed
    if (priority !== undefined) updateData.priority = priority as Priority
    if ('due_date' in body) updateData.due_date = due_date ?? null
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring ? 1 : 0
    if ('recurrence_pattern' in body) updateData.recurrence_pattern = recurrence_pattern ?? null
    if ('reminder_minutes' in body) updateData.reminder_minutes = reminder_minutes ?? null

    todoDB.update(todoId, session.userId, updateData)

    if (Array.isArray(tag_ids)) {
      tagDB.setTodoTags(todoId, tag_ids)
    }

    const updated = todoDB.findById(todoId, session.userId)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update todo error:', error)
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const todo = todoDB.findById(Number(id), session.userId)
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  todoDB.delete(Number(id), session.userId)
  return NextResponse.json({ success: true })
}

// Subtask endpoints as nested routes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const todoId = Number(id)

  try {
    const body = await request.json()
    const { action, subtask_id, subtask_title, subtask_completed } = body

    const todo = todoDB.findById(todoId, session.userId)
    if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'add_subtask') {
      if (!subtask_title || !subtask_title.trim()) {
        return NextResponse.json({ error: 'Subtask title required' }, { status: 400 })
      }
      const subtask = subtaskDB.create(todoId, subtask_title.trim())
      return NextResponse.json(subtask, { status: 201 })
    }

    if (action === 'update_subtask') {
      const subtask = subtaskDB.update(subtask_id, todoId, {
        title: subtask_title,
        completed: subtask_completed,
      })
      return NextResponse.json(subtask)
    }

    if (action === 'delete_subtask') {
      subtaskDB.delete(subtask_id, todoId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Todo PATCH error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
