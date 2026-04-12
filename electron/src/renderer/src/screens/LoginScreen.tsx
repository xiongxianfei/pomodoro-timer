import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export function LoginScreen() {
  const { signIn, signInWithEmail, loading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'choose' | 'email'>('choose')

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 px-8 max-w-sm mx-auto">
      <h1 className="text-4xl font-light tracking-tight">Pomodoro Timer</h1>
      <p className="text-gray-500 text-center">Sign in to sync across all your devices</p>

      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 px-4 py-2 rounded-lg w-full">
          {error}
        </p>
      )}

      {mode === 'choose' && (
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={signIn}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>
          <button
            onClick={() => setMode('email')}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            Sign in with Email
          </button>
        </div>
      )}

      {mode === 'email' && (
        <div className="flex flex-col gap-3 w-full">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signInWithEmail(email, password)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={() => signInWithEmail(email, password)}
            disabled={loading || !email || !password}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            onClick={() => setMode('choose')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
