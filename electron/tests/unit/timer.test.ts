import { describe, it, expect } from 'vitest'
import { calculateRemaining, formatTime, totalDurationForState } from '@/utils/timer'
import type { TimerState, Preset } from '@/types'

const baseState: TimerState = {
  status: 'idle',
  presetId: 'p1',
  startedAt: null,
  pausedAt: null,
  elapsed: 0,
  currentSession: 1,
  totalSessions: 4,
  isBreak: false,
  updatedAt: 0,
  updatedBy: 'device1',
}

const basePreset: Preset = {
  id: 'p1',
  name: 'Standard',
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  color: '#E53935',
  icon: 'timer',
  sortOrder: 0,
  builtIn: true,
}

describe('calculateRemaining', () => {
  it('returns totalDuration when idle', () => {
    const result = calculateRemaining({ ...baseState, status: 'idle', elapsed: 0 }, 1500)
    expect(result).toBe(1500)
  })

  it('returns totalDuration minus elapsed when paused', () => {
    const result = calculateRemaining({ ...baseState, status: 'paused', elapsed: 300 }, 1500)
    expect(result).toBe(1200)
  })

  it('accounts for time since startedAt when running', () => {
    const startedAt = Date.now() - 120_000 // 120 seconds ago
    const state: TimerState = { ...baseState, status: 'running', startedAt, elapsed: 60 }
    const result = calculateRemaining(state, 1500, Date.now())
    // elapsed=60, running for 120s → total used=180 → remaining≈1320
    expect(result).toBeCloseTo(1320, -1)
  })

  it('returns 0 when time has expired', () => {
    const startedAt = Date.now() - 2000_000
    const state: TimerState = { ...baseState, status: 'running', startedAt, elapsed: 0 }
    expect(calculateRemaining(state, 1500, Date.now())).toBe(0)
  })
})

describe('formatTime', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatTime(1500)).toBe('25:00')
    expect(formatTime(90)).toBe('01:30')
    expect(formatTime(0)).toBe('00:00')
  })
})

describe('totalDurationForState', () => {
  it('returns work duration when not a break', () => {
    expect(totalDurationForState({ ...baseState, isBreak: false }, basePreset)).toBe(25 * 60)
  })

  it('returns long break when on final session', () => {
    const state = { ...baseState, isBreak: true, currentSession: 4, totalSessions: 4 }
    expect(totalDurationForState(state, basePreset)).toBe(15 * 60)
  })

  it('returns short break otherwise', () => {
    const state = { ...baseState, isBreak: true, currentSession: 2, totalSessions: 4 }
    expect(totalDurationForState(state, basePreset)).toBe(5 * 60)
  })
})
