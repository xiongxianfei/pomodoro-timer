# Tests: UserAvatar Component

## Ref
- Spec: specs/user-avatar.md

## Unit Tests

### Avatar rendering
| ID | Input | Expected | Covers |
|----|-------|----------|--------|
| T1 | `{photoURL: "https://img.example.com/a.jpg", displayName: "Alice", email: "alice@gmail.com"}` | `<img>` with `src="https://img.example.com/a.jpg"` is rendered | MUST render photo when photoURL non-null |
| T2 | `{photoURL: null, displayName: "Bob", email: "bob@test.com"}` | No `<img>`; circle with text "B" is rendered | MUST render initial fallback when photoURL null |
| T3 | `{photoURL: null, displayName: null, email: "carol@test.com"}` | Circle with text "C" is rendered | MUST fall back to email prefix for initial |
| T4 | `{photoURL: null, displayName: null, email: null}` | Circle with text "?" is rendered | MUST show "?" when both displayName and email are null |

### Dropdown toggle
| ID | Scenario | Expected | Covers |
|----|----------|----------|--------|
| T5 | Render component; dropdown not yet clicked | Dropdown content (`displayName`, `email`, sign-out button) not visible | Dropdown starts closed |
| T6 | Click avatar once | Dropdown becomes visible | MUST toggle open on click |
| T7 | Click avatar once, then click avatar again | Dropdown closes | MUST toggle closed on second click |
| T8 | Click avatar to open; click outside the component | Dropdown closes | MUST close on outside click |
| T9 | Rapid: click avatar open, click avatar closed, click avatar open | Dropdown is open at end, no errors | Rapid toggle edge case |

### Dropdown content
| ID | Input | Expected | Covers |
|----|-------|----------|--------|
| T10 | `{displayName: "Alice", email: "alice@gmail.com"}` — dropdown open | Renders text "Alice" and text "alice@gmail.com" | MUST display displayName and email |
| T11 | `{displayName: null, email: "carol@test.com"}` — dropdown open | Renders text "carol" and text "carol@test.com" | MUST display email-prefix fallback |
| T12 | `{displayName: null, email: null}` — dropdown open | Renders sign-out button without crashing | MUST handle both-null gracefully |
| T13 | Any user — dropdown open | Button with label "Sign out" is present | MUST include sign-out button |

### Sign-out behaviour
| ID | Scenario | Expected | Covers |
|----|----------|----------|--------|
| T14 | Click "Sign out" — `signOut` resolves successfully | `useAuthStore.signOut` called exactly once | MUST call signOut on click |
| T15 | Click "Sign out" — `signOut` rejects with an error | No crash; component still mounted and functional | MUST NOT break on signOut rejection |
| T16 | Click "Sign out", then immediately click avatar before promise resolves | `signOut` not called a second time; no error thrown | No double sign-out edge case |

## Integration Tests

| ID | Flow | Expected | Covers |
|----|------|----------|--------|
| T17 | `UserAvatar` rendered inside `Navigation`; click avatar | Dropdown appears within the nav bar without layout overflow | F2 integration — component in context |
| T18 | `Navigation` renders with authenticated user; dropdown open; click sign out | `useAuthStore.signOut` called; component does not crash | Sign-out flow end-to-end |

## What NOT to Test
- Exact pixel size or colour of the avatar circle (visual regression, not unit test)
- Dropdown CSS positioning (below-left is a SHOULD, not verifiable in jsdom)
- Internal implementation of `useAuthStore.signOut` — it has its own tests
- Firebase `signInWithPopup` or any auth flow (not part of this component)

## Coverage Map
| Requirement | Tests |
|-------------|-------|
| MUST render photo when photoURL non-null | T1 |
| MUST render initial fallback when photoURL null | T2 |
| MUST derive initial from displayName; email prefix fallback; "?" | T3, T4 |
| MUST toggle dropdown on avatar click | T6, T7 |
| MUST close dropdown on outside click | T8 |
| MUST display displayName (or fallback) and email in dropdown | T10, T11, T12 |
| MUST include "Sign out" button calling useAuthStore.signOut | T13, T14 |
| MUST NOT break if signOut rejects | T15 |
| Edge: rapid click toggle | T9 |
| Edge: no double sign-out during pending promise | T16 |
| Integration: rendered inside Navigation | T17, T18 |
