import { create } from 'zustand'
import { Preset } from '@/types'
import { writePreset } from '@/firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

interface PresetsStore {
  presets: Preset[]
  setPresets: (presets: Preset[]) => void
  createPreset: (data: Omit<Preset, 'id' | 'builtIn'>) => Promise<void>
  updatePreset: (preset: Preset) => Promise<void>
}

export const usePresetsStore = create<PresetsStore>((set, get) => ({
  presets: [],

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
