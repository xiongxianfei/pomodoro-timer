import { create } from 'zustand'
import { User } from 'firebase/auth'
import { signInWithGoogle, signInWithEmail, signOut, observeAuth } from '@/firebase/auth'

interface AuthStore {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => () => void
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
  signInWithEmail: async (email, password) => {
    set({ error: null, loading: true })
    try {
      await signInWithEmail(email, password)
    } catch (e: any) {
      set({ error: e.message, loading: false })
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
