import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { tagDB } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  try {
    const { name, color } = await request.json()
    const tag = tagDB.update(Number(id), session.userId, { name, color })
    if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(tag)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const tag = tagDB.findById(Number(id), session.userId)
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  tagDB.delete(Number(id), session.userId)
  return NextResponse.json({ success: true })
}
