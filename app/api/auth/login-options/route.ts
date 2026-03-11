import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { userDB, authenticatorDB, challengeDB } from '@/lib/db'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types'

const RP_ID = process.env.RP_ID || 'localhost'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const trimmedUsername = username.trim().toLowerCase()
    const user = userDB.findByUsername(trimmedUsername)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const authenticators = authenticatorDB.findByUserId(user.id)
    if (authenticators.length === 0) {
      return NextResponse.json({ error: 'No credentials registered' }, { status: 400 })
    }

    const allowCredentials = authenticators.map((auth) => ({
      id: auth.credential_id,
      transports: auth.transports
        ? (auth.transports.split(',') as AuthenticatorTransportFuture[])
        : [],
    }))

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    })

    challengeDB.set(`auth_${trimmedUsername}`, options.challenge)

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Login options error:', error)
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 })
  }
}
