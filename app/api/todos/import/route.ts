import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB, subtaskDB, tagDB } from '@/lib/db'
import type { Priority, RecurrencePattern } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    if (!body || !Array.isArray(body.todos)) {
      return NextResponse.json({ error: 'Invalid import format' }, { status: 400 })
    }

    const { todos, tags: importedTags } = body
    const tagIdMap = new Map<number, number>()

    // Import tags first
    if (Array.isArray(importedTags)) {
      for (const tag of importedTags) {
        if (!tag.name) continue
        try {
          const created = tagDB.create(session.userId, tag.name, tag.color || '#3B82F6')
          tagIdMap.set(tag.id, created.id)
        } catch {
          // Tag might already exist; find it
          const existing = tagDB.findByUserId(session.userId).find((t) => t.name === tag.name)
          if (existing) tagIdMap.set(tag.id, existing.id)
        }
      }
    }

    let importedCount = 0
    for (const todo of todos) {
      if (!todo.title) continue

      const created = todoDB.create({
        user_id: session.userId,
        title: todo.title,
        priority: (todo.priority as Priority) || 'medium',
        due_date: todo.due_date || null,
        is_recurring: todo.is_recurring ? 1 : 0,
        recurrence_pattern: (todo.recurrence_pattern as RecurrencePattern) || null,
        reminder_minutes: todo.reminder_minutes || null,
      })

      // Restore completion state
      if (todo.completed) {
        todoDB.update(created.id, session.userId, { completed: 1 })
      }

      // Import subtasks
      if (Array.isArray(todo.subtasks)) {
        for (const subtask of todo.subtasks) {
          if (!subtask.title) continue
          const createdSubtask = subtaskDB.create(created.id, subtask.title)
          if (subtask.completed) {
            subtaskDB.update(createdSubtask.id, created.id, { completed: 1 })
          }
        }
      }

      // Restore tags using remapped IDs
      const todoTagIds: number[] = []
      if (Array.isArray(todo.tags)) {
        for (const tag of todo.tags) {
          const newId = tagIdMap.get(tag.id)
          if (newId) todoTagIds.push(newId)
        }
      }
      if (todoTagIds.length > 0) {
        tagDB.setTodoTags(created.id, todoTagIds)
      }

      importedCount++
    }

    return NextResponse.json({ success: true, imported: importedCount })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Failed to import todos' }, { status: 500 })
  }
}
