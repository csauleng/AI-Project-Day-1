import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
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
    const user = userDB.findByUsername(trimmedUsername)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const expectedChallenge = challengeDB.get(`auth_${trimmedUsername}`)
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 })
    }

    const credentialId = response.id || response.rawId
    const authenticator = authenticatorDB.findByCredentialId(credentialId)
    if (!authenticator || authenticator.user_id !== user.id) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 })
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: authenticator.credential_id,
        publicKey: isoBase64URL.toBuffer(authenticator.public_key),
        counter: authenticator.counter ?? 0,
        transports: authenticator.transports
          ? (authenticator.transports.split(',') as import('@simplewebauthn/types').AuthenticatorTransportFuture[])
          : [],
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    challengeDB.delete(`auth_${trimmedUsername}`)
    authenticatorDB.updateCounter(authenticator.credential_id, verification.authenticationInfo.newCounter ?? 0)

    const token = await createSession({ userId: user.id, username: user.username })
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login verify error:', error)
    return NextResponse.json({ error: 'Login verification failed' }, { status: 500 })
  }
}
