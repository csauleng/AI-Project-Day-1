import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { templateDB, todoDB, tagDB } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const template = templateDB.findById(Number(id), session.userId)
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json()
    const { name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes } = body
    const updated = templateDB.update(Number(id), session.userId, {
      name: name ?? template.name,
      description: description ?? null,
      category: category ?? null,
      title_template: title_template ?? template.title_template,
      priority: priority ?? template.priority,
      is_recurring: is_recurring ?? template.is_recurring,
      recurrence_pattern: recurrence_pattern ?? null,
      reminder_minutes: reminder_minutes ?? null,
      subtasks_json: template.subtasks_json,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const template = templateDB.findById(Number(id), session.userId)
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  templateDB.delete(Number(id), session.userId)
  return NextResponse.json({ success: true })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const template = templateDB.findById(Number(id), session.userId)
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json().catch(() => ({}))
    const { due_date, tag_ids } = body

    const todo = todoDB.create({
      user_id: session.userId,
      title: template.title_template,
      priority: template.priority,
      due_date: due_date || null,
      is_recurring: template.is_recurring,
      recurrence_pattern: template.recurrence_pattern,
      reminder_minutes: template.reminder_minutes ?? null,
    })

    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      tagDB.setTodoTags(todo.id, tag_ids)
    }

    const created = todoDB.findById(todo.id, session.userId)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Use template error:', error)
    return NextResponse.json({ error: 'Failed to create todo from template' }, { status: 500 })
  }
}
