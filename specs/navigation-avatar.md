# Spec: Navigation Avatar Integration

## Goal
Place the UserAvatar component in the Navigation bar so the signed-in user can see their profile and sign out from any screen.

## Context
- **Plan ref:** docs/plan.md → F2
- **Depends on:** F1 (UserAvatar component — complete)
- **Touches:** `electron/src/renderer/src/components/shared/Navigation.tsx`

## Requirements
- MUST render `UserAvatar` on the right side of the Navigation bar
- MUST keep all existing nav tabs (Timer, History, Stats, Presets) on the left side
- MUST NOT change the tab selection behavior or visual styling
- MUST NOT pass the `user` object as a prop — `UserAvatar` reads from `useAuthStore` internally
- SHOULD maintain the existing nav bar height and alignment (tabs and avatar vertically centered)

## Interface
- **Input:** No new props on `Navigation`
- **Output:** Existing nav tabs (left) + UserAvatar (right) in the same `<nav>` bar
- **Error states:** None — `UserAvatar` returns `null` if `user` is null, which can't happen since `Navigation` is only rendered when authenticated

## Edge Cases
- Window resized to `minWidth` (320px) → tabs and avatar must not overlap or wrap
- All four tab labels visible alongside the avatar at minimum width
- `UserAvatar` dropdown opens → dropdown renders below-right of the nav bar, not clipped by `overflow-hidden` on `<main>`

## Non-Goals
- Does not change the Navigation component's props interface (no new props)
- Does not add responsive breakpoints or a hamburger menu

## Examples
| Screen state | Nav bar renders |
|---|---|
| Timer tab active, user signed in | `[Timer*] [History] [Stats] [Presets]  ···  (avatar)` |
| Stats tab active, dropdown open | `[Timer] [History] [Stats*] [Presets]  ···  (avatar) [dropdown]` |

## Acceptance Criteria
- [ ] All MUST requirements implemented
- [ ] T17 and T18 from `specs/user-avatar.test.md` pass (un-skip and implement)
- [ ] No regressions in existing tests
- [ ] Visual check: tabs left, avatar right, no layout break at 320px

## Gotchas
