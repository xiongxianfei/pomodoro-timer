import { create } from 'zustand'
import { User } from 'firebase/auth'
import { signInWithGoogle, signOut, observeAuth } from '@/firebase/auth'

interface AuthStore {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => () => void  // returns unsubscribe
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {
    set({ error: null })
    try {
      await signInWithGoogle()
    } catch (e: any) {
      set({ error: e.message })
    }
  },
  signOut: async () => {
    await signOut()
    set({ user: null })
  },
  initialize: () => {
    return observeAuth((user) => set({ user, loading: false }))
  },
}))
