# Pomodoro Timer — Cross-Platform Design Spec

## Overview

A personal Pomodoro timer with real-time sync across Android phone, tablet, and laptop. Native Android app (Kotlin + Jetpack Compose) and Electron desktop app (React + TypeScript), backed by Firebase for authentication and real-time data sync.

## Goals

- Seamless timer sync: start on one device, see it counting on all others
- Full session history and detailed statistics across all devices
- Multiple configurable timer presets for different work styles
- Per-project/tag tracking with exportable data
- Clean, minimal visual design
- Future-ready architecture for Android widgets and Wear OS

## Architecture

```
┌─────────────┐     ┌─────────────┐
│  Android App │     │ Electron App│
│  (Kotlin +   │     │ (React +    │
│   Jetpack    │     │  TypeScript)│
│   Compose)   │     │             │
└──────┬───────┘     └──────┬──────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │   Firebase   │
         │ ─────────── │
         │ Auth (Google)│
         │ Firestore    │
         │ (real-time)  │
         └─────────────┘
```

### Components

| Component | Tech Stack | Responsibilities |
|-----------|-----------|-----------------|
| Android app | Kotlin, Jetpack Compose, Firebase Android SDK, Hilt, Room | Native mobile timer, notifications, foreground service |
| Electron app | React, TypeScript, Electron, Vite, Zustand, Firebase JS SDK | Desktop timer, system tray, mini-mode |
| Firebase | Auth, Firestore | Google sign-in, email/password sign-in, real-time sync, data persistence |

## Data Model (Firestore)

All data lives under `users/{uid}/`:

### `profile` (single document)

```
{
  displayName: string,
  email: string,
  photoUrl: string,
  createdAt: timestamp
}
```

### `settings` (single document)

```
{
  theme: "light",
  defaultPresetId: string,
  notificationSound: "default" | "chime" | "bell" | "none"
}
```

### `presets/{presetId}` (collection)

```
{
  name: string,
  workDuration: number,          // minutes
  shortBreakDuration: number,    // minutes
  longBreakDuration: number,     // minutes
  sessionsBeforeLongBreak: number,
  color: string,                 // hex color
  icon: string,                  // icon identifier
  sortOrder: number,
  builtIn: boolean               // true for default presets
}
```

Built-in defaults (editable, not deletable):

| ID | Name | Work | Short Break | Long Break | Sessions |
|----|------|------|-------------|------------|----------|
| `preset-standard` | Standard | 25 min | 5 min | 15 min | 4 |
| `preset-deep-work` | Deep Work | 50 min | 10 min | 30 min | 3 |
| `preset-quick-task` | Quick Task | 15 min | 3 min | 10 min | 4 |

When a new user first signs in, the app seeds these presets to Firestore if the presets collection is empty.

### `timerState` (single document)

```
{
  status: "idle" | "running" | "paused" | "break",
  presetId: string,
  startedAt: timestamp | null,
  pausedAt: timestamp | null,
  elapsed: number,               // seconds already elapsed before the current startedAt
  currentSession: number,        // which session in the cycle (1-indexed)
  totalSessions: number,         // from preset's sessionsBeforeLongBreak
  isBreak: boolean,
  updatedAt: timestamp,
  updatedBy: string              // deviceId
}
```

**Remaining time formula:**
- `idle` or `paused`: `totalDuration - elapsed`
- `running` or `break`: `totalDuration - elapsed - (now - startedAt)`

**Important format constraints (cross-platform compatibility):**
- `status` must be written as **lowercase** (`"idle"`, `"running"`, `"paused"`, `"break"`). Android reads with `.uppercase()` before mapping to its enum.
- When `stop()` is called, `isBreak` must be reset to `false` — otherwise the timer displays the break duration instead of the work duration after stopping.
- `presetId` reflects the currently selected preset. When the user changes the preset (even while idle), `presetId` is written to Firestore so all devices sync to the same selected preset.

Single document — all devices listen via Firestore real-time snapshot listener. Conflict resolution: last-write-wins using `updatedAt`.

### `sessions/{sessionId}` (collection)

```
{
  presetId: string,
  tags: string[],
  projectName: string,
  startedAt: timestamp,
  endedAt: timestamp,
  duration: number,              // actual minutes
  type: "work" | "shortBreak" | "longBreak",
  completed: boolean
}
```

**Important format constraint:** `type` must be written as **camelCase** (`"work"`, `"shortBreak"`, `"longBreak"`). Android maps its enum values to these strings explicitly.

Sessions are immutable once written. Created when a timer phase completes.

### `tags/{tagId}` (collection)

```
{
  name: string,
  color: string,
  totalSessions: number,
  totalMinutes: number
}
```

Denormalized counters updated via Firestore `increment()` on session completion. Avoids expensive aggregation queries for stats.

## Core Features

### Timer Engine

- Both clients run a local countdown timer that ticks independently of the network.
- On state changes (start, pause, resume, stop, complete), the client writes to `timerState` in Firestore.
- Other devices receive the update via real-time listener and sync their local timer to match.
- Offline: local timer keeps running. On reconnect, reconcile with Firestore — latest `updatedAt` wins.

**Pomodoro cycle:**
1. User presses Start → `status: "running"`, `isBreak: false`
2. Work timer reaches zero → session record is written, `status: "break"`, `isBreak: true`, `startedAt: now` — break **auto-starts** (no user action needed)
3. Break timer reaches zero → `status: "idle"`, `isBreak: false` — user presses Start for the next session
4. After `sessionsBeforeLongBreak` work sessions, the break uses `longBreakDuration` instead of `shortBreakDuration`

**Stop behavior:** Always resets to `status: "idle"`, `elapsed: 0`, `startedAt: null`, `isBreak: false`. Pressing Stop during a break or during work always returns to the full work timer display.

### Preset Selection Sync

When a user selects a preset on one device, `presetId` is written to `timerState` in Firestore. All other devices observe this change, look up the matching preset by ID, and update their locally selected preset to match.

### Presets

- 3 built-in presets (Standard, Deep Work, Quick Task) — editable but not deletable.
- Users can create unlimited custom presets with name, durations, color, and icon.
- Presets sync across devices via Firestore.
- On first sign-in, built-in presets are seeded to Firestore if none exist.

### Tagging & Projects

- Before starting a timer (or retroactively), user can assign tags and/or a project name.
- Tags are free-text with autocomplete from existing tags.
- Multiple tags per session.
- Project name is a single string per session.

### Statistics & Export

- **Daily view**: sessions completed, total focus time, breakdown by tag/project.
- **Weekly/monthly charts**: bar chart of focus minutes per day, streak counter.
- **Trends**: compare this week vs last week, most productive day/time.
- **Export**: CSV or JSON export of all session data, filterable by date range and tags. On Android, saved to the Downloads folder via `MediaStore.Downloads` (API 29+) without requiring storage permissions. "Share via…" is also available.

### Notifications

- **Android**: system notification with countdown in notification shade, sound on completion.
- **Electron**: system notification via Electron API, sound on completion.
- Both respect system Do Not Disturb / Focus modes.

## Authentication

Both apps support **email/password sign-in** via Firebase Auth.

Android additionally supports **Google Sign-In** (using the device's Google account via `GoogleSignInClient`).

**Google Sign-In via popup is not supported in Electron.** Electron's `BrowserWindow` blocks the OAuth popup flow (`signInWithPopup`). Email/password is the supported sign-in method for Electron.

## Android App Details

- **Min SDK**: 26 (Android 8.0, ~95% device coverage)
- **UI framework**: Jetpack Compose with Material 3
- **Timer service**: Foreground service with persistent notification showing countdown. Timer survives app being backgrounded or killed by the OS.
- **Navigation**: Bottom nav — Timer, History, Stats, Profile (4 tabs). Uses `saveState`/`restoreState` on navigation to preserve ViewModel state across tab switches (prevents preset reset on tab change).
- **Local cache**: Room database for offline session history
- **DI**: Hilt
- **Session expiry detection**: `LaunchedEffect(remainingSeconds, status)` in `TimerScreen` — calls `completeSession()` when work reaches zero, `stop()` when break reaches zero.
- **Future**: Architecture supports home screen widget and Wear OS companion

## Electron App Details

- **Framework**: Electron + Vite + React
- **UI**: Custom lightweight components (not Material UI) matching clean/minimal style
- **State management**: Zustand
- **User data path**: `%APPDATA%\PomodoroTimer` (set explicitly via `app.setPath('userData', ...)` before `app.whenReady()` to avoid Windows cache permission errors)
- **System tray**: Minimize to tray, tray icon shows timer state (idle/running/break), right-click context menu for quick actions (start, pause, stop)
- **Window modes**: Normal window, always-on-top option, compact mini-mode (small floating timer)
- **Local cache**: IndexedDB for offline session history
- **Session expiry detection**: `isExpired` (status=running, remaining=0) and `isBreakExpired` (status=break, remaining=0) flags in `useTimer` hook, handled via `useEffect` in `TimerScreen`.

## Sync Protocol

1. User performs action (start/pause/stop/preset change) on Device A.
2. Device A updates local timer state immediately (optimistic).
3. Device A writes new `timerState` document to Firestore with current timestamp as `updatedAt`.
4. Firestore pushes real-time update to Device B, C, etc.
5. Each receiving device updates its local timer and selected preset to match the new state (using `presetId` to look up the preset object).
6. If device is offline: local timer continues independently. On reconnect, Firestore offline persistence replays the write and receives any newer state.

Conflict resolution: last-write-wins. Since this is a single-user app, conflicts are rare and the most recent action is always correct.

## Firebase Deployment

Firestore security rules and indexes must be deployed to the production Firebase project before the apps can read/write data:

```bash
cd firebase
firebase deploy --only firestore
```

Without this, all Firestore reads and writes are blocked by default deny-all rules, and the apps will appear to work locally but sync will silently fail.

## Testing Strategy

- **Android**: Unit tests (JUnit) for timer logic, Compose UI tests, Firebase emulator for integration tests.
- **Electron**: Vitest for unit tests, Playwright for E2E tests, Firebase emulator for integration tests.
- **Cross-platform**: Both apps tested against the same Firebase emulator instance to verify sync compatibility.

## Visual Style

- Clean and minimal, light theme
- Simple typography, generous whitespace
- Large, centered timer display as the focal point
- Subtle color accents from preset colors
- No visual clutter — controls appear on interaction

## Out of Scope (for initial release)

- Wear OS companion app
- Android home screen widget
- Team/collaborative features
- iOS app
- Dark theme (light only for v1)
