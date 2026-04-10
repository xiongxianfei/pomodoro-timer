import type { TimerState, Preset } from '@/types'

/**
 * Returns remaining seconds for the current timer phase.
 * IDLE/PAUSED: totalDuration - elapsed
 * RUNNING: totalDuration - elapsed - (now - startedAt) / 1000
 */
export function calculateRemaining(
  state: TimerState,
  totalDurationSeconds: number,
  now: number = Date.now(),
): number {
  if (state.status === 'running' && state.startedAt !== null) {
    const runningForSeconds = (now - state.startedAt) / 1000
    return Math.max(0, totalDurationSeconds - state.elapsed - runningForSeconds)
  }
  return Math.max(0, totalDurationSeconds - state.elapsed)
}

/** Formats seconds as MM:SS */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Returns total duration in seconds for the current timer phase */
export function totalDurationForState(state: TimerState, preset: Preset): number {
  if (!state.isBreak) return preset.workDuration * 60
  if (state.currentSession >= state.totalSessions) return preset.longBreakDuration * 60
  return preset.shortBreakDuration * 60
}
