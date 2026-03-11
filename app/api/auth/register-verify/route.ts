import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { userDB, authenticatorDB, challengeDB } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'

const RP_ID = process.env.RP_ID || 'localhost'
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { username, response } = await request.json()
    if (!username || !response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const trimmedUsername = username.trim().toLowerCase()
    const expectedChallenge = challengeDB.get(`reg_${trimmedUsername}`)
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 })
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    challengeDB.delete(`reg_${trimmedUsername}`)

    const { credential } = verification.registrationInfo
    const user = userDB.findByUsername(trimmedUsername)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    authenticatorDB.create({
      user_id: user.id,
      credential_id: credential.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter ?? 0,
      device_type: verification.registrationInfo.credentialDeviceType,
      backed_up: verification.registrationInfo.credentialBackedUp ? 1 : 0,
      transports: response.response.transports?.join(',') ?? '',
    })

    const token = await createSession({ userId: user.id, username: user.username })
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Registration verify error:', error)
    return NextResponse.json({ error: 'Registration verification failed' }, { status: 500 })
  }
}
