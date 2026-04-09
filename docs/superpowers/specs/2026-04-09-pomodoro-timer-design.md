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
| Firebase | Auth, Firestore | Google sign-in, real-time sync, data persistence |

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
- **Standard**: 25 / 5 / 15, 4 sessions
- **Deep Work**: 50 / 10 / 30, 3 sessions
- **Quick Task**: 15 / 3 / 10, 4 sessions

### `timerState` (single document)

```
{
  status: "idle" | "running" | "paused" | "break",
  presetId: string,
  startedAt: timestamp,
  pausedAt: timestamp | null,
  elapsed: number,               // seconds already elapsed (used to reconstruct remaining time: remaining = totalDuration - elapsed - (now - startedAt) when running, or totalDuration - elapsed when paused)
  currentSession: number,        // which session in the cycle (1-indexed)
  totalSessions: number,         // from preset's sessionsBeforeLongBreak
  isBreak: boolean,
  updatedAt: timestamp,
  updatedBy: string              // deviceId
}
```

- Single document — all devices listen via Firestore real-time snapshot listener.
- `updatedBy` tracks which device made the last change.
- Conflict resolution: last-write-wins using `updatedAt`.

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
- Pomodoro cycle: work → short break → work → short break → ... → long break (after N sessions per preset config).
- On work timer completion: auto-create a session record, then start break timer.

### Presets

- 3 built-in presets (Standard, Deep Work, Quick Task) — editable but not deletable.
- Users can create unlimited custom presets with name, durations, color, and icon.
- Presets sync across devices via Firestore.

### Tagging & Projects

- Before starting a timer (or retroactively), user can assign tags and/or a project name.
- Tags are free-text with autocomplete from existing tags.
- Multiple tags per session.
- Project name is a single string per session.

### Statistics & Export

- **Daily view**: sessions completed, total focus time, breakdown by tag/project.
- **Weekly/monthly charts**: bar chart of focus minutes per day, streak counter.
- **Trends**: compare this week vs last week, most productive day/time.
- **Export**: CSV or JSON export of all session data, filterable by date range and tags.

### Notifications

- **Android**: system notification with countdown in notification shade, sound on completion.
- **Electron**: system notification via Electron API, sound on completion.
- Both respect system Do Not Disturb / Focus modes.

## Android App Details

- **Min SDK**: 26 (Android 8.0, ~95% device coverage)
- **UI framework**: Jetpack Compose with Material 3
- **Timer service**: Foreground service with persistent notification showing countdown. Timer survives app being backgrounded or killed by the OS.
- **Navigation**: Bottom nav — Timer, History, Stats (3 tabs)
- **Local cache**: Room database for offline session history
- **DI**: Hilt
- **Future**: Architecture supports home screen widget and Wear OS companion

## Electron App Details

- **Framework**: Electron + Vite + React
- **UI**: Custom lightweight components (not Material UI) matching clean/minimal style
- **State management**: Zustand
- **System tray**: Minimize to tray, tray icon shows timer state (idle/running/break), right-click context menu for quick actions (start, pause, stop)
- **Window modes**: Normal window, always-on-top option, compact mini-mode (small floating timer)
- **Local cache**: IndexedDB for offline session history

## Sync Protocol

1. User performs action (start/pause/stop) on Device A.
2. Device A updates local timer state immediately (optimistic).
3. Device A writes new `timerState` document to Firestore with current timestamp as `updatedAt`.
4. Firestore pushes real-time update to Device B, C, etc.
5. Each receiving device updates its local timer to match the new state.
6. If device is offline: local timer continues independently. On reconnect, Firestore offline persistence replays the write and receives any newer state.

Conflict resolution: last-write-wins. Since this is a single-user app, conflicts are rare and the most recent action is always correct.

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
