import { useEffect, useState } from 'react'
import { useTimerStore } from '@/store/timerStore'
import { usePresetsStore } from '@/store/presetsStore'
import { calculateRemaining, totalDurationForState, formatTime } from '@/utils/timer'

export function useTimer() {
  const timerState = useTimerStore((s) => s.timerState)
  const selectedPreset = useTimerStore((s) => s.selectedPreset)
  const presets = usePresetsStore((s) => s.presets)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const preset = selectedPreset ?? presets[0]
    if (!preset) { setRemaining(0); return }

    const totalDuration = totalDurationForState(timerState, preset)

    function tick() {
      setRemaining(calculateRemaining(timerState, totalDuration, Date.now()))
    }

    tick()

    if (timerState.status !== 'running' && timerState.status !== 'break') return

    const interval = setInterval(tick, 500)

    return () => clearInterval(interval)
  }, [timerState, selectedPreset, presets])

  const preset = selectedPreset ?? presets[0]
  const totalDuration = preset ? totalDurationForState(timerState, preset) : 1500
  const isExpired = remaining === 0 && timerState.status === 'running'

  return {
    remaining,
    formatted: formatTime(remaining),
    totalDuration,
    isExpired,
    progress: totalDuration > 0 ? 1 - remaining / totalDuration : 0,
  }
}
