import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useFirestoreSync } from '@/hooks/useFirestoreSync'
import { LoginScreen } from '@/screens/LoginScreen'
import { TimerScreen } from '@/screens/TimerScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { StatsScreen } from '@/screens/StatsScreen'
import { PresetsScreen } from '@/screens/PresetsScreen'
import { Navigation } from '@/components/shared/Navigation'
import '@/styles/global.css'

type Screen = 'timer' | 'history' | 'stats' | 'presets'

export function App() {
  const { user, loading, initialize } = useAuthStore()
  const [screen, setScreen] = useState<Screen>('timer')

  useEffect(() => {
    const unsub = initialize()
    return unsub
  }, [])

  useFirestoreSync()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading…
      </div>
    )
  }

  if (!user) return <LoginScreen />

  const screens: Record<Screen, JSX.Element> = {
    timer: <TimerScreen />,
    history: <HistoryScreen />,
    stats: <StatsScreen />,
    presets: <PresetsScreen />,
  }

  return (
    <div className="flex flex-col h-screen">
      <Navigation current={screen} onChange={setScreen} />
      <main className="flex-1 overflow-hidden">{screens[screen]}</main>
    </div>
  )
}
