import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { holidayDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const month = parseInt(searchParams.get('month') || '0', 10)

  const holidays = month
    ? holidayDB.findByMonth(year, month)
    : holidayDB.findByYear(year)

  return NextResponse.json(holidays)
}
