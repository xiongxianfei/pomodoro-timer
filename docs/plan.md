# Plan: Electron Account Menu

## Overview
Add a user avatar dropdown in the top-right corner of the Navigation bar showing the signed-in user's photo, name, and email, with a sign-out button. The auth store (`useAuthStore`) and `signOut` already exist — this is purely a UI feature wiring into existing state.

## Features

### F1: UserAvatar component
- **Scope:** New component `components/shared/UserAvatar.tsx`. Renders Google profile photo (fallback: first letter of displayName) as a 32px circle. Click toggles a dropdown showing displayName, email, and a "Sign out" button. Clicking outside closes the dropdown.
- **Dependencies:** None
- **Risk:** Low. Relies on `user.photoURL`, `user.displayName`, `user.email` from Firebase `User` object — all populated by Google sign-in.
- **Size:** S

### F2: Integrate into Navigation bar
- **Scope:** Add `UserAvatar` to the right side of the existing `<nav>` bar in `Navigation.tsx`. Pass the `user` object from `useAuthStore`. Navigation becomes a flex row: nav tabs (left) + avatar (right).
- **Dependencies:** F1
- **Risk:** Low. Only layout change — add `justify-between` and wrap tabs in a div.
- **Size:** S

### F3: Unit test
- **Scope:** Test `UserAvatar` renders name/email, calls `signOut` on button click, shows fallback initial when no photo. Uses `@testing-library/react`.
- **Dependencies:** F1
- **Risk:** Low.
- **Size:** S

## Build Order
F1 → F2 (F3 can parallel with F2)

## Architecture Decisions
- No new store or route needed — `useAuthStore` already exposes `user` and `signOut`.
- Dropdown is local `useState` inside `UserAvatar` — no global state for open/close.
- Photo fallback is a colored circle with the first letter of `displayName`, not a generic icon.

## Non-Goals
- **Account deletion / data wipe** — not requested; would require Firestore cleanup logic.
- **Profile editing** — name/email come from Google; no local profile fields.
- **Multi-account switching** — single Google account only.
