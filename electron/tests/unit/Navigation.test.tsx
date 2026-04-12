import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navigation } from '@/components/shared/Navigation'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockSignOut = vi.fn()
const mockOnChange = vi.fn()

function setupAuth() {
  vi.mocked(useAuthStore).mockReturnValue({
    user: { photoURL: null, displayName: 'Alice', email: 'alice@test.com' } as any,
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
  mockOnChange.mockReset()
  setupAuth()
})

// ── Navigation structure ──────────────────────────────────────────────────────

describe('Navigation structure', () => {
  it('T1: renders UserAvatar inside the nav bar', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    // UserAvatar renders an avatar button
    expect(screen.getByRole('button', { name: /avatar/i })).toBeTruthy()
  })

  it('T2: renders all four tab buttons', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    expect(screen.getByRole('button', { name: 'Timer' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'History' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stats' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Presets' })).toBeTruthy()
  })

  it('T3: avatar button appears after all tab buttons in DOM order', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    const allButtons = screen.getAllByRole('button')
    const tabLabels = ['Timer', 'History', 'Stats', 'Presets']
    const tabButtons = allButtons.filter((b) => tabLabels.includes(b.textContent ?? ''))
    const avatarButton = screen.getByRole('button', { name: /avatar/i })
    // Avatar must come after all tabs in the DOM
    const lastTabIndex = Math.max(...tabButtons.map((b) => allButtons.indexOf(b)))
    const avatarIndex = allButtons.indexOf(avatarButton)
    expect(avatarIndex).toBeGreaterThan(lastTabIndex)
  })

  it('T4: Navigation renders correctly with only current and onChange props', () => {
    // TypeScript enforces no extra props at compile time; runtime test verifies
    // the component works without a user prop being passed
    render(<Navigation current="timer" onChange={mockOnChange} />)
    expect(screen.getByRole('button', { name: 'Timer' })).toBeTruthy()
  })
})

// ── Tab behaviour unchanged ───────────────────────────────────────────────────

describe('Tab behaviour unchanged', () => {
  it('T5: clicking a tab calls onChange with the correct screen id', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(mockOnChange).toHaveBeenCalledWith('history')
  })

  it('T6: active tab has active styling; inactive tabs do not', () => {
    render(<Navigation current="stats" onChange={mockOnChange} />)
    const statsBtn = screen.getByRole('button', { name: 'Stats' })
    const timerBtn = screen.getByRole('button', { name: 'Timer' })
    expect(statsBtn.className).toContain('text-red-600')
    expect(timerBtn.className).not.toContain('text-red-600')
  })

  it('T7: opening the avatar dropdown does not prevent tab clicks', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    // Open avatar dropdown
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Sign out')).toBeTruthy()
    // Tab is still clickable
    fireEvent.click(screen.getByRole('button', { name: 'Presets' }))
    expect(mockOnChange).toHaveBeenCalledWith('presets')
  })
})

// ── Integration (T17 & T18 promoted from user-avatar.test.md) ─────────────────

describe('Integration with UserAvatar', () => {
  it('T17: clicking avatar inside Navigation opens the dropdown', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    expect(screen.getByText('Sign out')).toBeTruthy()
  })

  it('T18: clicking Sign out inside Navigation calls useAuthStore.signOut', () => {
    render(<Navigation current="timer" onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('button', { name: /avatar/i }))
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})
