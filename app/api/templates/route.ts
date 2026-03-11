import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { templateDB } from '@/lib/db'
import type { Priority, RecurrencePattern } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const templates = templateDB.findByUserId(session.userId)
  return NextResponse.json(templates)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, description, category, title_template, priority, is_recurring, recurrence_pattern, reminder_minutes, subtasks_json } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }
    if (!title_template || !title_template.trim()) {
      return NextResponse.json({ error: 'Title template is required' }, { status: 400 })
    }

    const template = templateDB.create({
      user_id: session.userId,
      name: name.trim(),
      description: description || null,
      category: category || null,
      title_template: title_template.trim(),
      priority: (priority as Priority) || 'medium',
      is_recurring: is_recurring ? 1 : 0,
      recurrence_pattern: (recurrence_pattern as RecurrencePattern) || null,
      reminder_minutes: reminder_minutes || null,
      subtasks_json: subtasks_json || null,
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
