import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoDB } from '@/lib/db'
import { getSingaporeNow } from '@/lib/timezone'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const now = getSingaporeNow().toISOString()
  const dueReminders = todoDB.findDueReminders(now)

  // Filter to only this user's todos
  const userReminders = dueReminders.filter((todo) => todo.user_id === session.userId)

  return NextResponse.json({ reminders: userReminders })
}
