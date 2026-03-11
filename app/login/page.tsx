'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const optRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!optRes.ok) {
        const data = await optRes.json()
        setError(data.error || 'Failed to get registration options')
        return
      }
      const { options } = await optRes.json()

      const credential = await startRegistration({ optionsJSON: options })

      const verRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, response: credential }),
      })
      if (!verRes.ok) {
        const data = await verRes.json()
        setError(data.error || 'Registration failed')
        return
      }
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('cancelled') ? 'Registration cancelled.' : `Registration error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      const optRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (!optRes.ok) {
        const data = await optRes.json()
        setError(data.error || 'Failed to get login options')
        return
      }
      const { options } = await optRes.json()

      const credential = await startAuthentication({ optionsJSON: options })

      const verRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, response: credential }),
      })
      if (!verRes.ok) {
        const data = await verRes.json()
        setError(data.error || 'Login failed')
        return
      }
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('cancelled') ? 'Authentication cancelled.' : `Login error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (mode === 'register') {
      handleRegister()
    } else {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">Todo App</h1>
          <p className="text-gray-500 text-sm mt-1">Passwordless authentication with passkeys</p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'login'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError('') }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'register'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="username"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Please wait...'
              : mode === 'register'
              ? '🔑 Register with Passkey'
              : '🔑 Login with Passkey'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Uses WebAuthn / Passkeys for secure passwordless authentication</p>
          <p className="mt-1">Works with fingerprint, Face ID, or security keys</p>
        </div>
      </div>
    </div>
  )
}
