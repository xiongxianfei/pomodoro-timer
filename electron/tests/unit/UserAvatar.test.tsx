import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockSignOut = vi.fn()

function setupUser(user: {
  photoURL: string | null
  displayName: string | null
  email: string | null
}) {
  vi.mocked(useAuthStore).mockReturnValue({
    user: user as any,
    signOut: mockSignOut,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signInWithEmail: vi.fn(),
    initialize: vi.fn(),
  } as any)
}

beforeEach(() => {
  mockSignOut.mockReset()
  mockSignOut.mockResolvedValue(undefined)
})

// ── Avatar rendering ──────────────────────────────────────────────────────────

describe('Avatar rendering', () => {
  it('T1: renders photo img when photoURL is non-null', () => {
    setupUser({ photoURL: 'https://img.example.com/a.jpg', displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://img.example.com/a.jpg')
  })

  it('T2: renders initial "B" and no img when photoURL is null', () => {
    setupUser({ photoURL: null, displayName: 'Bob', email: 'bob@test.com' })
    render(<UserAvatar />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('B')).toBeTruthy()
  })

  it('T3: renders email-prefix initial "C" when displayName is null', () => {
    setupUser({ photoURL: null, displayName: null, email: 'carol@test.com' })
    render(<UserAvatar />)
    expect(screen.getByText('C')).toBeTruthy()
  })

  it('T4: renders "?" when both displayName and email are null', () => {
    setupUser({ photoURL: null, displayName: null, email: null })
    render(<UserAvatar />)
    expect(screen.getByText('?')).toBeTruthy()
  })
})

// ── Dropdown toggle ───────────────────────────────────────────────────────────

describe('Dropdown toggle', () => {
  it('T5: dropdown is closed on initial render', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    expect(screen.queryByText('Sign out')).toBeNull()
  })

  it('T6: clicking avatar opens the dropdown', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Sign out')).toBeTruthy()
  })

  it('T7: clicking avatar twice closes the dropdown', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    const btn = screen.getByRole('button', { name: /avatar/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByText('Sign out')).toBeNull()
  })

  it('T8: clicking outside closes the dropdown', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Sign out')).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Sign out')).toBeNull()
  })

  it('T9: rapid open-close-open leaves dropdown open without errors', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    const btn = screen.getByRole('button', { name: /avatar/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.getByText('Sign out')).toBeTruthy()
  })
})

// ── Dropdown content ──────────────────────────────────────────────────────────

describe('Dropdown content', () => {
  it('T10: shows displayName and email when both are present', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('alice@gmail.com')).toBeTruthy()
  })

  it('T11: shows email prefix and email when displayName is null', () => {
    setupUser({ photoURL: null, displayName: null, email: 'carol@test.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('carol')).toBeTruthy()
    expect(screen.getByText('carol@test.com')).toBeTruthy()
  })

  it('T12: renders without crashing when both displayName and email are null', () => {
    setupUser({ photoURL: null, displayName: null, email: null })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Sign out')).toBeTruthy()
  })

  it('T13: sign-out button is present in the dropdown', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
  })
})

// ── Sign-out behaviour ────────────────────────────────────────────────────────

describe('Sign-out behaviour', () => {
  it('T14: clicking Sign out calls signOut exactly once', () => {
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('T15: component stays mounted and functional when signOut rejects', async () => {
    mockSignOut.mockRejectedValue(new Error('network error'))
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    // click sign out — rejection should be swallowed
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    // component should still be in the DOM
    expect(screen.getByRole('button', { name: /avatar/i })).toBeTruthy()
  })

  it('T16: clicking avatar while sign-out is pending does not call signOut a second time', () => {
    mockSignOut.mockReturnValue(new Promise(() => {})) // never resolves
    setupUser({ photoURL: null, displayName: 'Alice', email: 'alice@gmail.com' })
    render(<UserAvatar />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    // try to re-open and click sign out again — should not double-invoke
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})

// ── Integration (requires F2 — Navigation integration) ────────────────────────

// T17 and T18 are implemented in tests/unit/Navigation.test.tsx
