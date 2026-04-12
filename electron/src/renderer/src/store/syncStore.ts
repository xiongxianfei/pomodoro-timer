import { create } from 'zustand'
import {
  subscribeToTimerState,
  subscribeToRecentSessions,
  subscribeToPresets,
  subscribeToTags,
  writePreset,
} from '@/firebase/firestore'
import { useTimerStore } from './timerStore'
import { usePresetsStore, BUILT_IN_PRESETS } from './presetsStore'
import { useStatsStore } from './statsStore'

interface SyncStore {
  active: boolean
  start: () => () => void   // returns cleanup function
}

export const useSyncStore = create<SyncStore>(() => ({
  active: false,
  start: () => {
    const unsubs = [
      subscribeToTimerState((state) => {
        if (state) {
          useTimerStore.getState().setTimerState(state)
          // Sync selected preset from remote presetId
          if (state.presetId) {
            const presets = usePresetsStore.getState().presets
            const match = presets.find((p) => p.id === state.presetId)
            if (match) useTimerStore.getState().setSelectedPreset(match)
          }
        }
      }),
      subscribeToRecentSessions(500, (sessions) => {
        useStatsStore.getState().setSessions(sessions)
      }),
      subscribeToPresets((presets) => {
        if (presets.length === 0) {
          // Seed built-in presets for new users (runs once, Firestore listener fires again with data)
          Promise.all(BUILT_IN_PRESETS.map(writePreset)).catch(() => {})
          return
        }
        usePresetsStore.getState().setPresets(presets)
        // Set default selected preset if none selected
        const timerStore = useTimerStore.getState()
        if (!timerStore.selectedPreset && presets.length > 0) {
          timerStore.setSelectedPreset(presets[0])
        }
      }),
      subscribeToTags(() => {}), // tags used for autocomplete via presetsStore
    ]
    return () => unsubs.forEach((u) => u())
  },
}))
