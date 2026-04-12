import { create } from 'zustand'
import { TimerState, Preset, DEFAULT_TIMER_STATE } from '@/types'
import { writeTimerState, writeSession } from '@/firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { usePresetsStore } from './presetsStore'

// Generate a stable device ID for this installation
function getDeviceId(): string {
  const key = 'pomodoro_device_id'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = uuidv4()
  localStorage.setItem(key, id)
  return id
}

const DEVICE_ID = getDeviceId()

interface TimerStore {
  timerState: TimerState
  selectedPreset: Preset | null
  setTimerState: (state: TimerState) => void
  setSelectedPreset: (preset: Preset) => void  // internal: local state only
  changePreset: (preset: Preset) => Promise<void>  // user action: also writes to Firestore
  start: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  completeSession: (tags?: string[], projectName?: string) => Promise<void>
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timerState: DEFAULT_TIMER_STATE,
  selectedPreset: null,

  setTimerState: (state) => set({ timerState: state }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),

  changePreset: async (preset) => {
    set({ selectedPreset: preset })
    const newState = { ...get().timerState, presetId: preset.id }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  start: async () => {
    const { timerState } = get()
    const selectedPreset = get().selectedPreset ?? usePresetsStore.getState().presets[0]
    if (!selectedPreset) return
    const newState: TimerState = {
      ...timerState,
      status: 'running',
      presetId: selectedPreset.id,
      startedAt: Date.now(),
      elapsed: 0,
      totalSessions: selectedPreset.sessionsBeforeLongBreak,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  pause: async () => {
    const { timerState, selectedPreset } = get()
    if (!selectedPreset || timerState.status !== 'running') return
    const runningForSec = timerState.startedAt ? (Date.now() - timerState.startedAt) / 1000 : 0
    const elapsed = timerState.elapsed + runningForSec
    const newState: TimerState = {
      ...timerState,
      status: 'paused',
      pausedAt: Date.now(),
      elapsed,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  resume: async () => {
    const { timerState } = get()
    const newState: TimerState = {
      ...timerState,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  stop: async () => {
    const { timerState } = get()
    const newState: TimerState = {
      ...timerState,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      elapsed: 0,
      isBreak: false,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  completeSession: async (tags = [], projectName = '') => {
    const { timerState, selectedPreset } = get()
    if (!selectedPreset) return
    const session = {
      id: uuidv4(),
      presetId: selectedPreset.id,
      tags,
      projectName,
      startedAt: timerState.startedAt ?? Date.now(),
      endedAt: Date.now(),
      duration: selectedPreset.workDuration,
      type: 'work' as const,
      completed: true,
    }
    const nextSession =
      timerState.currentSession >= timerState.totalSessions ? 1 : timerState.currentSession + 1
    const breakState: TimerState = {
      ...timerState,
      status: 'break',
      isBreak: true,
      currentSession: nextSession,
      elapsed: 0,
      startedAt: Date.now(),
    }
    set({ timerState: breakState })
    await Promise.all([
      writeSession(session),
      writeTimerState(breakState, DEVICE_ID),
    ])
  },
}))
