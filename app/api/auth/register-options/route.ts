import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { userDB, authenticatorDB, challengeDB } from '@/lib/db'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'

const RP_NAME = 'Todo App'
const RP_ID = process.env.RP_ID || 'localhost'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    const trimmedUsername = username.trim().toLowerCase()

    let user = userDB.findByUsername(trimmedUsername)
    if (!user) {
      user = userDB.create(trimmedUsername)
    }

    const existingAuthenticators = authenticatorDB.findByUserId(user.id)
    const excludeCredentials = existingAuthenticators.map((auth) => ({
      id: auth.credential_id,
      transports: auth.transports
        ? (auth.transports.split(',') as AuthenticatorTransportFuture[])
        : [],
    }))

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: trimmedUsername,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    challengeDB.set(`reg_${trimmedUsername}`, options.challenge)

    return NextResponse.json({ options, userId: user.id })
  } catch (error) {
    console.error('Registration options error:', error)
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 })
  }
}
