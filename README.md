# Pomodoro Timer

A cross-platform Pomodoro timer with real-time sync across Android and desktop. Start a session on your phone, see it counting on your laptop — instantly.

## Apps

| Platform | Stack |
|----------|-------|
| Android | Kotlin, Jetpack Compose, Hilt, Room, Firebase |
| Desktop (Windows / macOS / Linux) | Electron, React, TypeScript, Vite, Zustand, Firebase |

Both apps share the same Firestore data model and sync in real time.

## Features

- **Real-time sync** — timer state propagates to all signed-in devices within seconds
- **Three built-in presets** — Standard (25/5/15 min), Deep Work (50/10/30 min), Quick Task (15/3/10 min)
- **Custom presets** — create unlimited presets with custom durations, colors, and icons
- **Session history** — browse past sessions across all devices
- **Statistics** — daily and weekly focus time, streak counter, breakdown by tag and project
- **CSV export** — export all session data for external analysis
- **Tag and project tracking** — label sessions for detailed stats
- **System tray** (desktop) — minimize to tray with quick-access context menu
- **Foreground service** (Android) — timer survives backgrounding and OS kills

## Getting Started

### Prerequisites

- [Firebase project](https://console.firebase.google.com/) with Firestore and Authentication enabled
- Android Studio (for the Android app)
- Node.js 18+ (for the desktop app)

### Firebase Setup

1. Clone the repository
2. Deploy Firestore rules and indexes:
   ```bash
   cd firebase
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```

### Android App

1. Download your `google-services.json` from the Firebase console and place it at `android/app/google-services.json`
2. Open the `android/` folder in Android Studio
3. Build and run on a device or emulator

### Desktop App

1. Copy the environment template and fill in your Firebase config:
   ```bash
   cd electron
   cp .env.example .env
   # edit .env with your Firebase project values
   ```
2. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
3. Build a distributable:
   ```bash
   npm run build
   ```

### Local Development with Emulator

```bash
cd firebase
firebase emulators:start
```

Set `VITE_USE_EMULATOR=true` in `electron/.env` to point the desktop app at the local emulator.

## Project Structure

```
.
├── android/        # Android app (Kotlin + Jetpack Compose)
├── electron/       # Desktop app (Electron + React + TypeScript)
├── firebase/       # Firestore rules, indexes, emulator config
└── docs/           # Design spec and implementation plans
```

## Architecture

```
┌─────────────┐     ┌─────────────┐
│  Android App │     │ Desktop App  │
└──────┬───────┘     └──────┬──────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │   Firebase   │
         │  Firestore   │
         └─────────────┘
```

All timer state is written to a single Firestore document (`users/{uid}/timerState`) and broadcast to all listeners in real time. Last-write-wins conflict resolution.

## Authentication

- **Android** — Google Sign-In or email/password
- **Desktop** — email/password (Google OAuth popup is blocked in Electron's BrowserWindow)

## License

MIT — see [LICENSE](LICENSE)
