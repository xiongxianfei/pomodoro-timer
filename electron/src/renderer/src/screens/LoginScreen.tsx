import { useAuthStore } from '@/store/authStore'

export function LoginScreen() {
  const { signIn, loading, error } = useAuthStore()

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 px-8">
      <h1 className="text-4xl font-light tracking-tight">Pomodoro Timer</h1>
      <p className="text-gray-500">Sign in to sync across all your devices</p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={signIn}
        disabled={loading}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  )
}
