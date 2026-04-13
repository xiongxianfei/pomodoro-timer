import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

function getInitial(displayName: string | null, email: string | null): string {
  if (displayName) return displayName[0].toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}

function getDisplayName(displayName: string | null, email: string | null): string {
  if (displayName) return displayName
  if (email) return email.split('@')[0]
  return ''
}

export function UserAvatar() {
  const { user, signOut } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMousedown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMousedown)
    return () => document.removeEventListener('mousedown', handleMousedown)
  }, [])

  if (!user) return null

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      // swallow — do not crash the component
    } finally {
      setSigningOut(false)
    }
  }

  const initial = getInitial(user.displayName, user.email)
  const displayName = getDisplayName(user.displayName, user.email)

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="avatar"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-red-500 text-white text-sm font-medium"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-2">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{user.email ?? ''}</p>
          </div>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
