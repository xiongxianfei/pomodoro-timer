# Spec: UserAvatar Component

## Goal
Render a clickable avatar in the nav bar that opens a dropdown showing the signed-in user's profile info and a sign-out button.

## Context
- **Plan ref:** docs/plan.md → F1
- **Depends on:** None (auth store already exists)
- **Touches:** New file `electron/src/renderer/src/components/shared/UserAvatar.tsx`

## Requirements
- MUST render Google profile photo as a 32px circle when `user.photoURL` is non-null
- MUST render a colored circle with the user's initial when `user.photoURL` is null
- MUST derive the initial from `displayName`; if null, fall back to `email` prefix; if both null, show `?`
- MUST toggle a dropdown on avatar click
- MUST close the dropdown when clicking anywhere outside of it
- MUST display `displayName` (or email prefix fallback) and `email` in the dropdown
- MUST include a "Sign out" button that calls `useAuthStore.signOut()`
- MUST NOT break or crash if `signOut()` rejects — the dropdown should remain functional
- SHOULD show the dropdown below-left of the avatar so it doesn't overflow the right edge of the window

## Interface
- **Input:** Firebase `User` object from `useAuthStore`
- **Output:** Avatar circle + dropdown (when open)
- **Error states:** `signOut` failure — dropdown stays open, no crash

## Edge Cases
- `photoURL` is `null` → render initial-based fallback circle
- `displayName` is `null`, `email` is `"alice@gmail.com"` → initial is `A`, dropdown shows `alice` and `alice@gmail.com`
- Both `displayName` and `email` are `null` → initial is `?`, dropdown shows empty strings gracefully
- Rapid click on avatar → toggles open/closed without flicker
- Click sign-out then click avatar again before promise resolves → no double sign-out, no error

## Non-Goals
- Does not edit or update the user's profile
- Does not support multiple accounts or account switching
- Does not display account creation date or any Firestore-derived data

## Examples
| User State | Avatar Renders | Dropdown Shows |
|---|---|---|
| `{photoURL: "https://…", displayName: "Alice", email: "alice@gmail.com"}` | 32px photo circle | "Alice" / "alice@gmail.com" / Sign out |
| `{photoURL: null, displayName: "Bob", email: "bob@test.com"}` | Circle with letter "B" | "Bob" / "bob@test.com" / Sign out |
| `{photoURL: null, displayName: null, email: "carol@test.com"}` | Circle with letter "C" | "carol" / "carol@test.com" / Sign out |
| `{photoURL: null, displayName: null, email: null}` | Circle with "?" | "" / "" / Sign out |

## Acceptance Criteria
- [ ] All MUST requirements implemented
- [ ] All four example states render correctly
- [ ] All edge cases handled
- [ ] Unit tests pass (see F3 in plan)
- [ ] Integrated into Navigation bar (see F2 in plan)

## Gotchas
- 2026-04-13: `vi.mock('@/store/authStore')` without an explicit factory loads the real module, which triggers Firebase initialization and causes `auth/invalid-api-key` in CI. Always use an explicit factory: `vi.mock('@/store/authStore', () => ({ useAuthStore: vi.fn() }))`.
- 2026-04-13: Testing Library event names are camelCase — `fireEvent.mouseDown`, not `fireEvent.mousedown`. The lowercase form silently does nothing.
- 2026-04-13: Vitest does not include jest-dom matchers by default. Use `element.getAttribute('attr')` instead of `expect(el).toHaveAttribute('attr')`, or add `@testing-library/jest-dom` setup.
- 2026-04-13: `user.displayName` can be null even after Google Sign-In (e.g. first-time users before profile sync). The fallback chain (displayName → email prefix → `?`) is required, not optional.
