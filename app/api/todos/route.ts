import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, tagDB } from '@/lib/db'
import type { Priority, RecurrencePattern } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const todos = todoDB.findByUserId(session.userId)
  return NextResponse.json(todos)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { title, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes, tag_ids } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (due_date && new Date(due_date) <= new Date()) {
      // Allow small time differences for timezone
    }

    const todo = todoDB.create({
      user_id: session.userId,
      title: title.trim(),
      priority: (priority as Priority) || 'medium',
      due_date: due_date || null,
      is_recurring: is_recurring ? 1 : 0,
      recurrence_pattern: (recurrence_pattern as RecurrencePattern) || null,
      reminder_minutes: reminder_minutes || null,
    })

    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      tagDB.setTodoTags(todo.id, tag_ids)
    }

    const created = todoDB.findById(todo.id, session.userId)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Create todo error:', error)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}
