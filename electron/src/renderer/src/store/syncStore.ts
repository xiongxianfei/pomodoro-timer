import { create } from 'zustand'
import {
  subscribeToTimerState,
  subscribeToRecentSessions,
  subscribeToPresets,
  subscribeToTags,
} from '@/firebase/firestore'
import { useTimerStore } from './timerStore'
import { usePresetsStore } from './presetsStore'
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
        if (state) useTimerStore.getState().setTimerState(state)
      }),
      subscribeToRecentSessions(500, (sessions) => {
        useStatsStore.getState().setSessions(sessions)
      }),
      subscribeToPresets((presets) => {
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
