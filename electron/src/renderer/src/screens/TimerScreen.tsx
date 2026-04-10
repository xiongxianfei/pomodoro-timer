import { useEffect } from 'react'
import { useTimerStore } from '@/store/timerStore'
import { usePresetsStore } from '@/store/presetsStore'
import { useTimer } from '@/hooks/useTimer'

export function TimerScreen() {
  const { start, pause, resume, stop, completeSession, timerState, setSelectedPreset, selectedPreset } =
    useTimerStore()
  const presets = usePresetsStore((s) => s.presets)
  const { formatted, isExpired } = useTimer()

  useEffect(() => {
    if (isExpired && !timerState.isBreak) {
      completeSession()
      new Notification('Pomodoro complete!', { body: 'Time for a break.' })
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==')
      audio.play().catch(() => {})
    }
  }, [isExpired])

  const { status, isBreak, currentSession, totalSessions } = timerState

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      {selectedPreset && (
        <span className="text-sm text-gray-400 uppercase tracking-widest">{selectedPreset.name}</span>
      )}

      <div className="text-8xl font-extralight tracking-wider tabular-nums">{formatted}</div>

      <p className="text-gray-400 text-sm">
        {isBreak ? 'Break' : `Session ${currentSession} of ${totalSessions}`}
      </p>

      <div className="flex gap-3">
        {status === 'idle' && (
          <button
            onClick={start}
            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Start
          </button>
        )}
        {(status === 'running' || status === 'break') && (
          <>
            <button
              onClick={stop}
              className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={pause}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Pause
            </button>
          </>
        )}
        {status === 'paused' && (
          <>
            <button
              onClick={stop}
              className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={resume}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Resume
            </button>
          </>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                selectedPreset?.id === p.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
