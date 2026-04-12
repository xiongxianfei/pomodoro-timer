import { create } from 'zustand'
import { Preset } from '@/types'
import { writePreset } from '@/firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'built-in-standard',
    name: 'Standard',
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    color: '#E53935',
    icon: 'timer',
    sortOrder: 0,
    builtIn: true,
  },
  {
    id: 'built-in-deep-work',
    name: 'Deep Work',
    workDuration: 50,
    shortBreakDuration: 10,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 2,
    color: '#1E88E5',
    icon: 'timer',
    sortOrder: 1,
    builtIn: true,
  },
  {
    id: 'built-in-quick-task',
    name: 'Quick Task',
    workDuration: 15,
    shortBreakDuration: 3,
    longBreakDuration: 10,
    sessionsBeforeLongBreak: 4,
    color: '#43A047',
    icon: 'timer',
    sortOrder: 2,
    builtIn: true,
  },
]

interface PresetsStore {
  presets: Preset[]
  setPresets: (presets: Preset[]) => void
  createPreset: (data: Omit<Preset, 'id' | 'builtIn'>) => Promise<void>
  updatePreset: (preset: Preset) => Promise<void>
}

export const usePresetsStore = create<PresetsStore>((set, get) => ({
  presets: BUILT_IN_PRESETS,

  setPresets: (presets) => set({ presets }),

  createPreset: async (data) => {
    const preset: Preset = { ...data, id: uuidv4(), builtIn: false }
    await writePreset(preset)
    // Firestore subscription will update the local state
  },

  updatePreset: async (preset) => {
    await writePreset(preset)
  },
}))
