import { useEffect } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { useAuthStore } from '@/store/authStore'

/** Starts Firestore real-time listeners when user is authenticated. Cleans up on sign-out. */
export function useFirestoreSync() {
  const user = useAuthStore((s) => s.user)
  const startSync = useSyncStore((s) => s.start)

  useEffect(() => {
    if (!user) return
    const cleanup = startSync()
    return cleanup
  }, [user?.uid])
}
