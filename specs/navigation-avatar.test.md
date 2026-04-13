# Tests: Navigation Avatar Integration

## Ref
- Spec: specs/navigation-avatar.md
- Inherits: T17, T18 from specs/user-avatar.test.md (promoted from `it.todo`)

## Unit Tests

### Navigation structure
| ID | Scenario | Expected | Covers |
|----|----------|----------|--------|
| T1 | Render `Navigation` with authenticated user | `UserAvatar` is present in the DOM | MUST render UserAvatar |
| T2 | Render `Navigation` with authenticated user | All four tab buttons (Timer, History, Stats, Presets) are present | MUST keep all nav tabs |
| T3 | Render `Navigation`; inspect `<nav>` element | `UserAvatar` container is after (right of) the tabs container in DOM order | MUST render avatar on right side |
| T4 | Render `Navigation`; check `Navigation` component signature | Component accepts `{ current, onChange }` only — no `user` prop | MUST NOT pass user as prop |

### Tab behaviour unchanged
| ID | Scenario | Expected | Covers |
|----|----------|----------|--------|
| T5 | Render with `current="timer"`; click "History" tab | `onChange` called with `"history"` | MUST NOT change tab selection behaviour |
| T6 | Render with `current="stats"` | "Stats" button has active styling; others do not | MUST NOT change tab visual styling |
| T7 | Render `Navigation`; click avatar, open dropdown | All four tab buttons still clickable and call `onChange` correctly | Avatar presence must not break tabs |

## Integration Tests (T17 & T18 from user-avatar.test.md)

| ID | Flow | Expected | Covers |
|----|------|----------|--------|
| T17 | Render `Navigation` with authenticated user; click avatar button | Dropdown appears (shows "Sign out") | F1+F2 integration — avatar inside nav |
| T18 | Render `Navigation`; open dropdown; click "Sign out" | `useAuthStore.signOut` is called; no crash | Sign-out flow end-to-end inside nav |

## What NOT to Test
- Exact CSS positioning of avatar (right-alignment is a SHOULD; not assertable in jsdom)
- Pixel-level layout at 320px (visual-only edge case; not assertable in jsdom)
- Dropdown clipping by `<main>` overflow (CSS behaviour; not assertable in jsdom)
- Internal `UserAvatar` behaviour — covered by F1 tests (T1–T16)

## Coverage Map
| Requirement | Tests |
|-------------|-------|
| MUST render UserAvatar on the right side | T1, T3 |
| MUST keep all existing nav tabs on the left | T2, T3 |
| MUST NOT change tab selection behaviour | T5, T7 |
| MUST NOT change tab visual styling | T6 |
| MUST NOT pass user as a prop | T4 |
| Edge: dropdown does not break tab behaviour | T7 |
| Integration: avatar + nav, click opens dropdown | T17 |
| Integration: sign-out flow end-to-end in nav | T18 |

> **Note on untestable SHOULD:** "tabs and avatar vertically centered" is a CSS layout property.
> It cannot be asserted in jsdom. Cover it with a manual visual check at PR review time.
