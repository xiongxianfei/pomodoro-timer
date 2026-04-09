# Electron App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop Pomodoro timer (React + TypeScript) that syncs timer state and session history with Firebase in real-time, with system tray support and a compact mini-mode.

**Architecture:** Electron main process manages the system tray, IPC, and window lifecycle. The renderer process is a React + TypeScript SPA using Zustand for state. Firebase JS SDK handles Auth and Firestore sync in the renderer. IndexedDB (via idb) caches sessions locally for offline use.

**Tech Stack:** Electron, React, TypeScript, Vite, electron-vite, Zustand, Firebase JS SDK (v10), idb, Vitest, Playwright, Tailwind CSS

**Prerequisite:** Firebase project configured per `docs/superpowers/plans/2026-04-09-firebase-setup.md`. Firebase emulator running on `localhost:8080` (Firestore) and `localhost:9099` (Auth).

---

## File Structure

```
electron/
  package.json
  tsconfig.json
  electron.vite.config.ts
  .env.development               # Firebase emulator flags
  .env.production                # Production Firebase config
  src/
    main/
      index.ts                   # Electron main process entry
      tray.ts                    # System tray creation and management
      ipc.ts                     # IPC channel handlers
    preload/
      index.ts                   # Contextbridge preload script
    renderer/
      index.html
      src/
        main.tsx                 # React entry point
        App.tsx                  # Root component with routing
        firebase/
          config.ts              # Firebase initialization
          auth.ts                # signInWithGoogle, signOut, observeAuth
          firestore.ts           # All Firestore read/write operations
        types/
          index.ts               # Shared TypeScript types (Preset, TimerState, Session, Tag)
        utils/
          timer.ts               # calculateRemaining, formatTime, totalDurationForState
          export.ts              # exportToCsv, exportToJson
          db.ts                  # IndexedDB via idb: cacheSession, getCachedSessions
        store/
          authStore.ts           # Zustand: user, signIn, signOut
          timerStore.ts          # Zustand: timerState, start, pause, resume, stop
          presetsStore.ts        # Zustand: presets, selectPreset, createPreset, deletePreset
          statsStore.ts          # Zustand: sessions, stats computations
          syncStore.ts           # Zustand: Firestore listeners lifecycle
        hooks/
          useTimer.ts            # useTimer: remaining seconds, tick, expiry
          useFirestoreSync.ts    # Sets up all real-time Firestore listeners
        screens/
          LoginScreen.tsx
          TimerScreen.tsx
          HistoryScreen.tsx
          StatsScreen.tsx
          PresetsScreen.tsx
        components/
          timer/
            TimerDisplay.tsx     # Large countdown circle/text
            TimerControls.tsx    # Start/Pause/Resume/Stop buttons
            PresetChips.tsx      # Preset selector chips
          history/
            SessionCard.tsx
          stats/
            DailyChart.tsx
            StatCard.tsx
          shared/
            TagInput.tsx         # Free-text tag input with autocomplete
            Navigation.tsx       # Sidebar nav
          mini/
            MiniTimer.tsx        # Compact floating timer window
        styles/
          global.css             # Tailwind base + custom properties
  tests/
    unit/
      timer.test.ts              # utils/timer.ts tests
      export.test.ts             # utils/export.ts tests
    e2e/
      app.spec.ts                # Playwright E2E smoke test
```

---

### Task 1: Scaffold Electron Project

**Files:**
- Create: `electron/package.json`
- Create: `electron/tsconfig.json`
- Create: `electron/electron.vite.config.ts`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p D:/Data/20260409-pomodoro-timer/electron
cd D:/Data/20260409-pomodoro-timer/electron
```

Create `electron/package.json`:

```json
{
  "name": "pomodoro-timer",
  "version": "1.0.0",
  "description": "Cross-platform Pomodoro timer",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "idb": "^8.0.0",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@electron-toolkit/tsconfig": "^1.0.1",
    "@playwright/test": "^1.44.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "electron": "^31.0.0",
    "electron-vite": "^2.2.0",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd D:/Data/20260409-pomodoro-timer/electron
npm install
```

Expected: `node_modules` created, no errors.

- [ ] **Step 3: Write tsconfig.json**

`electron/tsconfig.json`:

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["electron.vite.config.*", "src/**/*", "tests/**/*"],
  "compilerOptions": {
    "paths": {
      "@renderer/*": ["src/renderer/src/*"],
      "@/*": ["src/renderer/src/*"]
    }
  }
}
```

- [ ] **Step 4: Write electron.vite.config.ts**

`electron/electron.vite.config.ts`:

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [require('tailwindcss'), require('autoprefixer')],
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  },
})
```

- [ ] **Step 5: Create environment files**

`electron/.env.development`:

```
VITE_USE_EMULATOR=true
VITE_FIREBASE_PROJECT_ID=pomodoro-timer-sync
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=pomodoro-timer-sync.firebaseapp.com
```

`electron/.env.production`:

```
VITE_USE_EMULATOR=false
VITE_FIREBASE_PROJECT_ID=pomodoro-timer-sync
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=pomodoro-timer-sync.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=pomodoro-timer-sync.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

Add to `electron/.gitignore`:

```
node_modules/
out/
dist/
.env.production
```

- [ ] **Step 6: Commit scaffold**

```bash
cd D:/Data/20260409-pomodoro-timer
git add electron/
git commit -m "chore: scaffold Electron app with electron-vite, React, TypeScript, Tailwind"
```

---

### Task 2: Define Shared TypeScript Types

**Files:**
- Create: `electron/src/renderer/src/types/index.ts`

- [ ] **Step 1: Write the types file**

`types/index.ts`:

```typescript
export type TimerStatus = 'idle' | 'running' | 'paused' | 'break'
export type SessionType = 'work' | 'shortBreak' | 'longBreak'
export type NotificationSound = 'default' | 'chime' | 'bell' | 'none'

export interface Preset {
  id: string
  name: string
  workDuration: number           // minutes
  shortBreakDuration: number     // minutes
  longBreakDuration: number      // minutes
  sessionsBeforeLongBreak: number
  color: string                  // hex, e.g. "#E53935"
  icon: string
  sortOrder: number
  builtIn: boolean
}

export interface TimerState {
  status: TimerStatus
  presetId: string
  startedAt: number | null       // Unix ms
  pausedAt: number | null        // Unix ms
  elapsed: number                // seconds already elapsed
  currentSession: number         // 1-indexed
  totalSessions: number
  isBreak: boolean
  updatedAt: number              // Unix ms
  updatedBy: string              // deviceId
}

export interface Session {
  id: string
  presetId: string
  tags: string[]
  projectName: string
  startedAt: number              // Unix ms
  endedAt: number                // Unix ms
  duration: number               // actual minutes
  type: SessionType
  completed: boolean
}

export interface Tag {
  id: string
  name: string
  color: string
  totalSessions: number
  totalMinutes: number
}

export interface UserSettings {
  theme: 'light'
  defaultPresetId: string
  notificationSound: NotificationSound
}

export interface DailyStats {
  date: string                   // YYYY-MM-DD
  sessions: number
  minutes: number
}

export interface StatsData {
  todaySessions: number
  todayMinutes: number
  weekSessions: number
  weekMinutes: number
  streakDays: number
  daily: DailyStats[]
  byTag: Record<string, number>  // tag name → total minutes
  byProject: Record<string, number>
}

export const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  presetId: '',
  startedAt: null,
  pausedAt: null,
  elapsed: 0,
  currentSession: 1,
  totalSessions: 4,
  isBreak: false,
  updatedAt: 0,
  updatedBy: '',
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/src/renderer/src/types/
git commit -m "feat: add shared TypeScript types for Electron app"
```

---

### Task 3: Implement Timer Utilities (TDD)

**Files:**
- Create: `electron/src/renderer/src/utils/timer.ts`
- Create: `electron/tests/unit/timer.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/timer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateRemaining, formatTime, totalDurationForState } from '@/utils/timer'
import type { TimerState, Preset } from '@/types'

const baseState: TimerState = {
  status: 'idle',
  presetId: 'p1',
  startedAt: null,
  pausedAt: null,
  elapsed: 0,
  currentSession: 1,
  totalSessions: 4,
  isBreak: false,
  updatedAt: 0,
  updatedBy: 'device1',
}

const basePreset: Preset = {
  id: 'p1',
  name: 'Standard',
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  color: '#E53935',
  icon: 'timer',
  sortOrder: 0,
  builtIn: true,
}

describe('calculateRemaining', () => {
  it('returns totalDuration when idle', () => {
    const result = calculateRemaining({ ...baseState, status: 'idle', elapsed: 0 }, 1500)
    expect(result).toBe(1500)
  })

  it('returns totalDuration minus elapsed when paused', () => {
    const result = calculateRemaining({ ...baseState, status: 'paused', elapsed: 300 }, 1500)
    expect(result).toBe(1200)
  })

  it('accounts for time since startedAt when running', () => {
    const startedAt = Date.now() - 120_000 // 120 seconds ago
    const state: TimerState = { ...baseState, status: 'running', startedAt, elapsed: 60 }
    const result = calculateRemaining(state, 1500, Date.now())
    // elapsed=60, running for 120s → total used=180 → remaining≈1320
    expect(result).toBeCloseTo(1320, -1)
  })

  it('returns 0 when time has expired', () => {
    const startedAt = Date.now() - 2000_000
    const state: TimerState = { ...baseState, status: 'running', startedAt, elapsed: 0 }
    expect(calculateRemaining(state, 1500, Date.now())).toBe(0)
  })
})

describe('formatTime', () => {
  it('formats seconds as MM:SS', () => {
    expect(formatTime(1500)).toBe('25:00')
    expect(formatTime(90)).toBe('01:30')
    expect(formatTime(0)).toBe('00:00')
  })
})

describe('totalDurationForState', () => {
  it('returns work duration when not a break', () => {
    expect(totalDurationForState({ ...baseState, isBreak: false }, basePreset)).toBe(25 * 60)
  })

  it('returns long break when on final session', () => {
    const state = { ...baseState, isBreak: true, currentSession: 4, totalSessions: 4 }
    expect(totalDurationForState(state, basePreset)).toBe(15 * 60)
  })

  it('returns short break otherwise', () => {
    const state = { ...baseState, isBreak: true, currentSession: 2, totalSessions: 4 }
    expect(totalDurationForState(state, basePreset)).toBe(5 * 60)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd D:/Data/20260409-pomodoro-timer/electron
npm test -- tests/unit/timer.test.ts
```

Expected: FAILED — `Cannot find module '@/utils/timer'`

- [ ] **Step 3: Implement timer utilities**

`utils/timer.ts`:

```typescript
import type { TimerState, Preset } from '@/types'

/**
 * Returns remaining seconds for the current timer phase.
 * IDLE/PAUSED: totalDuration - elapsed
 * RUNNING: totalDuration - elapsed - (now - startedAt) / 1000
 */
export function calculateRemaining(
  state: TimerState,
  totalDurationSeconds: number,
  now: number = Date.now(),
): number {
  if (state.status === 'running' && state.startedAt !== null) {
    const runningForSeconds = (now - state.startedAt) / 1000
    return Math.max(0, totalDurationSeconds - state.elapsed - runningForSeconds)
  }
  return Math.max(0, totalDurationSeconds - state.elapsed)
}

/** Formats seconds as MM:SS */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Returns total duration in seconds for the current timer phase */
export function totalDurationForState(state: TimerState, preset: Preset): number {
  if (!state.isBreak) return preset.workDuration * 60
  if (state.currentSession >= state.totalSessions) return preset.longBreakDuration * 60
  return preset.shortBreakDuration * 60
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/timer.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add electron/src/renderer/src/utils/timer.ts electron/tests/unit/timer.test.ts
git commit -m "feat: implement timer utilities with full unit test coverage"
```

---

### Task 4: Implement Export Utilities (TDD)

**Files:**
- Create: `electron/src/renderer/src/utils/export.ts`
- Create: `electron/tests/unit/export.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/export.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { exportToCsv, exportToJson } from '@/utils/export'
import type { Session } from '@/types'

const sessions: Session[] = [
  {
    id: 's1',
    presetId: 'preset-standard',
    tags: ['work', 'focus'],
    projectName: 'My Project',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_001_500_000,
    duration: 25,
    type: 'work',
    completed: true,
  },
]

describe('exportToCsv', () => {
  it('produces CSV with header and one data row', () => {
    const csv = exportToCsv(sessions)
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('id,type,presetId,projectName,tags,startedAt,endedAt,duration,completed')
    expect(lines[1]).toContain('s1')
    expect(lines[1]).toContain('work;focus')
    expect(lines[1]).toContain('25')
  })

  it('returns only header for empty sessions', () => {
    const csv = exportToCsv([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
  })
})

describe('exportToJson', () => {
  it('produces valid JSON array', () => {
    const json = exportToJson(sessions)
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('s1')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/export.test.ts
```

Expected: FAILED — `Cannot find module '@/utils/export'`

- [ ] **Step 3: Implement export utilities**

`utils/export.ts`:

```typescript
import type { Session } from '@/types'

const CSV_HEADER = 'id,type,presetId,projectName,tags,startedAt,endedAt,duration,completed'

export function exportToCsv(sessions: Session[]): string {
  const rows = sessions.map((s) =>
    [
      s.id,
      s.type,
      s.presetId,
      `"${s.projectName.replace(/"/g, '""')}"`,
      s.tags.join(';'),
      new Date(s.startedAt).toISOString(),
      new Date(s.endedAt).toISOString(),
      s.duration,
      s.completed,
    ].join(',')
  )
  return [CSV_HEADER, ...rows].join('\n')
}

export function exportToJson(sessions: Session[]): string {
  return JSON.stringify(sessions, null, 2)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/export.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add electron/src/renderer/src/utils/export.ts electron/tests/unit/export.test.ts
git commit -m "feat: implement CSV and JSON export utilities with tests"
```

---

### Task 5: Initialize Firebase

**Files:**
- Create: `electron/src/renderer/src/firebase/config.ts`
- Create: `electron/src/renderer/src/firebase/auth.ts`
- Create: `electron/src/renderer/src/firebase/firestore.ts`

- [ ] **Step 1: Write Firebase config**

`firebase/config.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

- [ ] **Step 2: Write auth helpers**

`firebase/auth.ts`:

```typescript
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from './config'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
```

- [ ] **Step 3: Write Firestore helpers**

`firebase/firestore.ts`:

```typescript
import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type { TimerState, Session, Preset, Tag } from '@/types'
import { getCurrentUser } from './auth'

function uid(): string {
  const user = getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user.uid
}

function userRef() {
  return doc(db, 'users', uid())
}

// --- Timer State ---

export function subscribeToTimerState(
  callback: (state: TimerState | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(userRef(), 'timerState', 'timerState'),
    (snap: DocumentSnapshot) => {
      if (!snap.exists()) { callback(null); return }
      const d = snap.data()!
      callback({
        status: d.status ?? 'idle',
        presetId: d.presetId ?? '',
        startedAt: d.startedAt ? (d.startedAt as Timestamp).toMillis() : null,
        pausedAt: d.pausedAt ? (d.pausedAt as Timestamp).toMillis() : null,
        elapsed: d.elapsed ?? 0,
        currentSession: d.currentSession ?? 1,
        totalSessions: d.totalSessions ?? 4,
        isBreak: d.isBreak ?? false,
        updatedAt: d.updatedAt ? (d.updatedAt as Timestamp).toMillis() : 0,
        updatedBy: d.updatedBy ?? '',
      })
    }
  )
}

export async function writeTimerState(state: Omit<TimerState, 'updatedAt'>, deviceId: string): Promise<void> {
  await setDoc(doc(userRef(), 'timerState', 'timerState'), {
    ...state,
    startedAt: state.startedAt ? Timestamp.fromMillis(state.startedAt) : null,
    pausedAt: state.pausedAt ? Timestamp.fromMillis(state.pausedAt) : null,
    updatedAt: serverTimestamp(),
    updatedBy: deviceId,
  })
}

// --- Sessions ---

export async function writeSession(session: Session): Promise<void> {
  await setDoc(doc(userRef(), 'sessions', session.id), {
    ...session,
    startedAt: Timestamp.fromMillis(session.startedAt),
    endedAt: Timestamp.fromMillis(session.endedAt),
  })
  // Update denormalized tag counters for completed work sessions
  if (session.completed && session.type === 'work') {
    for (const tagName of session.tags) {
      const tagId = tagName.toLowerCase().replace(/\s+/g, '-')
      await setDoc(
        doc(userRef(), 'tags', tagId),
        {
          name: tagName,
          color: '#888888',
          totalSessions: increment(1),
          totalMinutes: increment(session.duration),
        },
        { merge: true }
      )
    }
  }
}

export function subscribeToRecentSessions(
  limitCount: number,
  callback: (sessions: Session[]) => void
): Unsubscribe {
  const q = query(
    collection(userRef(), 'sessions'),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  )
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const sessions: Session[] = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        presetId: data.presetId ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        projectName: data.projectName ?? '',
        startedAt: (data.startedAt as Timestamp).toMillis(),
        endedAt: (data.endedAt as Timestamp).toMillis(),
        duration: data.duration ?? 0,
        type: data.type ?? 'work',
        completed: data.completed ?? false,
      }
    })
    callback(sessions)
  })
}

// --- Presets ---

export function subscribeToPresets(callback: (presets: Preset[]) => void): Unsubscribe {
  const q = query(collection(userRef(), 'presets'), orderBy('sortOrder'))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const presets: Preset[] = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
      workDuration: d.data().workDuration ?? 25,
      shortBreakDuration: d.data().shortBreakDuration ?? 5,
      longBreakDuration: d.data().longBreakDuration ?? 15,
      sessionsBeforeLongBreak: d.data().sessionsBeforeLongBreak ?? 4,
      color: d.data().color ?? '#E53935',
      icon: d.data().icon ?? 'timer',
      sortOrder: d.data().sortOrder ?? 0,
      builtIn: d.data().builtIn ?? false,
    }))
    callback(presets)
  })
}

export async function writePreset(preset: Preset): Promise<void> {
  const { id, ...data } = preset
  await setDoc(doc(userRef(), 'presets', id), data)
}

// --- Tags ---

export function subscribeToTags(callback: (tags: Tag[]) => void): Unsubscribe {
  const q = query(collection(userRef(), 'tags'), orderBy('name'))
  return onSnapshot(q, (snap: QuerySnapshot) => {
    const tags: Tag[] = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name ?? '',
      color: d.data().color ?? '#888888',
      totalSessions: d.data().totalSessions ?? 0,
      totalMinutes: d.data().totalMinutes ?? 0,
    }))
    callback(tags)
  })
}
```

- [ ] **Step 4: Build renderer to verify TypeScript compiles**

```bash
cd D:/Data/20260409-pomodoro-timer/electron
npm run build
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add electron/src/renderer/src/firebase/
git commit -m "feat: initialize Firebase SDK with Auth and Firestore helpers"
```

---

### Task 6: Implement Zustand Stores

**Files:**
- Create: `electron/src/renderer/src/store/authStore.ts`
- Create: `electron/src/renderer/src/store/timerStore.ts`
- Create: `electron/src/renderer/src/store/presetsStore.ts`
- Create: `electron/src/renderer/src/store/statsStore.ts`
- Create: `electron/src/renderer/src/store/syncStore.ts`

- [ ] **Step 1: Write authStore**

`store/authStore.ts`:

```typescript
import { create } from 'zustand'
import { User } from 'firebase/auth'
import { signInWithGoogle, signOut, observeAuth } from '@/firebase/auth'

interface AuthStore {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => () => void  // returns unsubscribe
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {
    set({ error: null })
    try {
      await signInWithGoogle()
    } catch (e: any) {
      set({ error: e.message })
    }
  },
  signOut: async () => {
    await signOut()
    set({ user: null })
  },
  initialize: () => {
    return observeAuth((user) => set({ user, loading: false }))
  },
}))
```

- [ ] **Step 2: Write timerStore**

`store/timerStore.ts`:

```typescript
import { create } from 'zustand'
import { TimerState, Preset, DEFAULT_TIMER_STATE } from '@/types'
import { writeTimerState, writeSession } from '@/firebase/firestore'
import { totalDurationForState } from '@/utils/timer'
import { v4 as uuidv4 } from 'uuid'

// Generate a stable device ID for this installation
function getDeviceId(): string {
  const key = 'pomodoro_device_id'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = uuidv4()
  localStorage.setItem(key, id)
  return id
}

const DEVICE_ID = getDeviceId()

interface TimerStore {
  timerState: TimerState
  selectedPreset: Preset | null
  setTimerState: (state: TimerState) => void
  setSelectedPreset: (preset: Preset) => void
  start: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  completeSession: (tags?: string[], projectName?: string) => Promise<void>
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timerState: DEFAULT_TIMER_STATE,
  selectedPreset: null,

  setTimerState: (state) => set({ timerState: state }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),

  start: async () => {
    const { timerState, selectedPreset } = get()
    if (!selectedPreset) return
    const newState: TimerState = {
      ...timerState,
      status: 'running',
      presetId: selectedPreset.id,
      startedAt: Date.now(),
      elapsed: 0,
      totalSessions: selectedPreset.sessionsBeforeLongBreak,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  pause: async () => {
    const { timerState, selectedPreset } = get()
    if (!selectedPreset || timerState.status !== 'running') return
    const totalDuration = totalDurationForState(timerState, selectedPreset)
    const runningForSec = timerState.startedAt ? (Date.now() - timerState.startedAt) / 1000 : 0
    const elapsed = timerState.elapsed + runningForSec
    const newState: TimerState = {
      ...timerState,
      status: 'paused',
      pausedAt: Date.now(),
      elapsed,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  resume: async () => {
    const { timerState } = get()
    const newState: TimerState = {
      ...timerState,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  stop: async () => {
    const { timerState } = get()
    const newState: TimerState = {
      ...timerState,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      elapsed: 0,
    }
    set({ timerState: newState })
    await writeTimerState(newState, DEVICE_ID)
  },

  completeSession: async (tags = [], projectName = '') => {
    const { timerState, selectedPreset } = get()
    if (!selectedPreset) return
    const session = {
      id: uuidv4(),
      presetId: selectedPreset.id,
      tags,
      projectName,
      startedAt: timerState.startedAt ?? Date.now(),
      endedAt: Date.now(),
      duration: selectedPreset.workDuration,
      type: 'work' as const,
      completed: true,
    }
    const nextSession =
      timerState.currentSession >= timerState.totalSessions ? 1 : timerState.currentSession + 1
    const breakState: TimerState = {
      ...timerState,
      status: 'break',
      isBreak: true,
      currentSession: nextSession,
      elapsed: 0,
      startedAt: Date.now(),
    }
    set({ timerState: breakState })
    await Promise.all([
      writeSession(session),
      writeTimerState(breakState, DEVICE_ID),
    ])
  },
}))
```

- [ ] **Step 3: Write presetsStore**

`store/presetsStore.ts`:

```typescript
import { create } from 'zustand'
import { Preset } from '@/types'
import { writePreset } from '@/firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

interface PresetsStore {
  presets: Preset[]
  setPresets: (presets: Preset[]) => void
  createPreset: (data: Omit<Preset, 'id' | 'builtIn'>) => Promise<void>
  updatePreset: (preset: Preset) => Promise<void>
}

export const usePresetsStore = create<PresetsStore>((set, get) => ({
  presets: [],

  setPresets: (presets) => set({ presets }),

  createPreset: async (data) => {
    const preset: Preset = { ...data, id: uuidv4(), builtIn: false }
    await writePreset(preset)
    // Firestore subscription will update the local state
  },

  updatePreset: async (preset) => {
    await writePreset(preset)
  },
}))
```

- [ ] **Step 4: Write statsStore**

`store/statsStore.ts`:

```typescript
import { create } from 'zustand'
import { Session, StatsData, DailyStats } from '@/types'

function computeStats(sessions: Session[]): StatsData {
  const workSessions = sessions.filter((s) => s.type === 'work' && s.completed)
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10)

  const todaySessions = workSessions.filter((s) => toDateStr(s.startedAt) === todayStr)
  const weekSessions = workSessions.filter((s) => s.startedAt >= weekStart.getTime())

  const daily: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const day = workSessions.filter((s) => toDateStr(s.startedAt) === dateStr)
    return { date: dateStr, sessions: day.length, minutes: day.reduce((a, s) => a + s.duration, 0) }
  })

  let streak = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    const has = workSessions.some((s) => toDateStr(s.startedAt) === dateStr)
    if (!has) break
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  const byTag: Record<string, number> = {}
  workSessions.forEach((s) =>
    s.tags.forEach((t) => { byTag[t] = (byTag[t] ?? 0) + s.duration })
  )

  const byProject: Record<string, number> = {}
  workSessions
    .filter((s) => s.projectName)
    .forEach((s) => { byProject[s.projectName] = (byProject[s.projectName] ?? 0) + s.duration })

  return {
    todaySessions: todaySessions.length,
    todayMinutes: todaySessions.reduce((a, s) => a + s.duration, 0),
    weekSessions: weekSessions.length,
    weekMinutes: weekSessions.reduce((a, s) => a + s.duration, 0),
    streakDays: streak,
    daily,
    byTag,
    byProject,
  }
}

interface StatsStore {
  sessions: Session[]
  stats: StatsData
  setSessions: (sessions: Session[]) => void
}

const emptyStats: StatsData = {
  todaySessions: 0, todayMinutes: 0,
  weekSessions: 0, weekMinutes: 0,
  streakDays: 0, daily: [], byTag: {}, byProject: {},
}

export const useStatsStore = create<StatsStore>((set) => ({
  sessions: [],
  stats: emptyStats,
  setSessions: (sessions) => set({ sessions, stats: computeStats(sessions) }),
}))
```

- [ ] **Step 5: Write syncStore**

`store/syncStore.ts`:

```typescript
import { create } from 'zustand'
import {
  subscribeToTimerState,
  subscribeToRecentSessions,
  subscribeToPresets,
  subscribeToTags,
} from '@/firebase/firestore'
import { useTimerStore } from './timerStore'
import { usePresetsStore } from './presetsStore'
import { useStatsStore } from './statsStore'

interface SyncStore {
  active: boolean
  start: () => () => void   // returns cleanup function
}

export const useSyncStore = create<SyncStore>(() => ({
  active: false,
  start: () => {
    const unsubs = [
      subscribeToTimerState((state) => {
        if (state) useTimerStore.getState().setTimerState(state)
      }),
      subscribeToRecentSessions(500, (sessions) => {
        useStatsStore.getState().setSessions(sessions)
      }),
      subscribeToPresets((presets) => {
        usePresetsStore.getState().setPresets(presets)
        // Set default selected preset if none selected
        const timerStore = useTimerStore.getState()
        if (!timerStore.selectedPreset && presets.length > 0) {
          timerStore.setSelectedPreset(presets[0])
        }
      }),
      subscribeToTags(() => {}), // tags used for autocomplete via presetsStore
    ]
    return () => unsubs.forEach((u) => u())
  },
}))
```

- [ ] **Step 6: Install uuid**

```bash
npm install uuid
npm install -D @types/uuid
```

- [ ] **Step 7: Build to verify TypeScript**

```bash
npm run build
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 8: Commit**

```bash
git add electron/src/renderer/src/store/ electron/package.json electron/package-lock.json
git commit -m "feat: implement Zustand stores for auth, timer, presets, stats, and sync"
```

---

### Task 7: Implement useTimer Hook

**Files:**
- Create: `electron/src/renderer/src/hooks/useTimer.ts`
- Create: `electron/src/renderer/src/hooks/useFirestoreSync.ts`

- [ ] **Step 1: Write useTimer hook**

`hooks/useTimer.ts`:

```typescript
import { useEffect, useState } from 'react'
import { useTimerStore } from '@/store/timerStore'
import { usePresetsStore } from '@/store/presetsStore'
import { calculateRemaining, totalDurationForState, formatTime } from '@/utils/timer'

export function useTimer() {
  const timerState = useTimerStore((s) => s.timerState)
  const selectedPreset = useTimerStore((s) => s.selectedPreset)
  const presets = usePresetsStore((s) => s.presets)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const preset = selectedPreset ?? presets[0]
    if (!preset) { setRemaining(0); return }

    const totalDuration = totalDurationForState(timerState, preset)

    function tick() {
      setRemaining(calculateRemaining(timerState, totalDuration, Date.now()))
    }

    tick()

    if (timerState.status !== 'running' && timerState.status !== 'break') return

    const interval = setInterval(tick, 500)

    return () => clearInterval(interval)
  }, [timerState, selectedPreset, presets])

  const preset = selectedPreset ?? presets[0]
  const totalDuration = preset ? totalDurationForState(timerState, preset) : 1500
  const isExpired = remaining === 0 && timerState.status === 'running'

  return {
    remaining,
    formatted: formatTime(remaining),
    totalDuration,
    isExpired,
    progress: totalDuration > 0 ? 1 - remaining / totalDuration : 0,
  }
}
```

- [ ] **Step 2: Write useFirestoreSync hook**

`hooks/useFirestoreSync.ts`:

```typescript
import { useEffect } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { useAuthStore } from '@/store/authStore'

/** Starts Firestore real-time listeners when user is authenticated. Cleans up on sign-out. */
export function useFirestoreSync() {
  const user = useAuthStore((s) => s.user)
  const startSync = useSyncStore((s) => s.start)

  useEffect(() => {
    if (!user) return
    const cleanup = startSync()
    return cleanup
  }, [user?.uid])
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add electron/src/renderer/src/hooks/
git commit -m "feat: implement useTimer and useFirestoreSync hooks"
```

---

### Task 8: Implement React Screens

**Files:**
- Create: `electron/src/renderer/src/screens/LoginScreen.tsx`
- Create: `electron/src/renderer/src/screens/TimerScreen.tsx`
- Create: `electron/src/renderer/src/screens/HistoryScreen.tsx`
- Create: `electron/src/renderer/src/screens/StatsScreen.tsx`
- Create: `electron/src/renderer/src/screens/PresetsScreen.tsx`
- Create: `electron/src/renderer/src/components/shared/Navigation.tsx`
- Create: `electron/src/renderer/src/App.tsx`
- Create: `electron/src/renderer/src/main.tsx`
- Create: `electron/src/renderer/index.html`

- [ ] **Step 1: Set up global styles**

Create `electron/src/renderer/src/styles/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #e53935;
  --color-break: #1e88e5;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: white;
  color: #212121;
  -webkit-font-smoothing: antialiased;
}
```

Create `electron/tailwind.config.js`:

```js
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 2: Write LoginScreen**

`screens/LoginScreen.tsx`:

```tsx
import { useAuthStore } from '@/store/authStore'

export function LoginScreen() {
  const { signIn, loading, error } = useAuthStore()

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 px-8">
      <h1 className="text-4xl font-light tracking-tight">Pomodoro Timer</h1>
      <p className="text-gray-500">Sign in to sync across all your devices</p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={signIn}
        disabled={loading}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Write TimerScreen**

`screens/TimerScreen.tsx`:

```tsx
import { useEffect } from 'react'
import { useTimerStore } from '@/store/timerStore'
import { usePresetsStore } from '@/store/presetsStore'
import { useTimer } from '@/hooks/useTimer'

export function TimerScreen() {
  const { start, pause, resume, stop, completeSession, timerState, setSelectedPreset, selectedPreset } =
    useTimerStore()
  const presets = usePresetsStore((s) => s.presets)
  const { formatted, isExpired } = useTimer()

  // Auto-complete session when timer expires
  useEffect(() => {
    if (isExpired && !timerState.isBreak) {
      completeSession()
      new Notification('Pomodoro complete!', { body: 'Time for a break.' })
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==') // minimal chime
        audio.play().catch(() => {})
    }
  }, [isExpired])

  const { status, isBreak, currentSession, totalSessions } = timerState

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      {selectedPreset && (
        <span className="text-sm text-gray-400 uppercase tracking-widest">{selectedPreset.name}</span>
      )}

      <div className="text-8xl font-extralight tracking-wider tabular-nums">{formatted}</div>

      <p className="text-gray-400 text-sm">
        {isBreak ? 'Break' : `Session ${currentSession} of ${totalSessions}`}
      </p>

      <div className="flex gap-3">
        {status === 'idle' && (
          <button
            onClick={start}
            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Start
          </button>
        )}
        {(status === 'running' || status === 'break') && (
          <>
            <button
              onClick={stop}
              className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={pause}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Pause
            </button>
          </>
        )}
        {status === 'paused' && (
          <>
            <button
              onClick={stop}
              className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={resume}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Resume
            </button>
          </>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                selectedPreset?.id === p.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write HistoryScreen**

`screens/HistoryScreen.tsx`:

```tsx
import { useStatsStore } from '@/store/statsStore'

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryScreen() {
  const sessions = useStatsStore((s) => s.sessions)

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No sessions yet. Start your first Pomodoro!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-6 overflow-y-auto h-full">
      <h2 className="text-xl font-medium">History</h2>
      {sessions.map((s) => (
        <div key={s.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-medium capitalize">{s.type.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-gray-400 ml-2 text-sm">· {s.duration} min</span>
            </div>
            <span className="text-gray-400 text-sm">{formatDate(s.startedAt)}</span>
          </div>
          {s.projectName && <p className="text-sm text-gray-500 mt-1">Project: {s.projectName}</p>}
          {s.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {s.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write StatsScreen**

`screens/StatsScreen.tsx`:

```tsx
import { useStatsStore } from '@/store/statsStore'
import { exportToCsv, exportToJson } from '@/utils/export'

export function StatsScreen() {
  const { stats, sessions } = useStatsStore()

  function handleExport(format: 'csv' | 'json') {
    const content = format === 'csv' ? exportToCsv(sessions) : exportToJson(sessions)
    const type = format === 'csv' ? 'text/csv' : 'application/json'
    const ext = format === 'csv' ? 'csv' : 'json'
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pomodoro_sessions_${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <h2 className="text-xl font-medium">Statistics</h2>

      {/* Today & streak */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Today', value: `${stats.todaySessions} sessions` },
          { label: 'Focus time today', value: `${stats.todayMinutes} min` },
          { label: 'Streak', value: `${stats.streakDays} day${stats.streakDays !== 1 ? 's' : ''}` },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-light mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* This week */}
      <div className="border border-gray-100 rounded-xl p-4">
        <p className="text-sm font-medium mb-3">Last 7 Days</p>
        <div className="space-y-2">
          {stats.daily.map((d) => (
            <div key={d.date} className="flex justify-between text-sm">
              <span className="text-gray-500">{d.date}</span>
              <span>{d.sessions} sessions · {d.minutes} min</span>
            </div>
          ))}
        </div>
      </div>

      {/* By tag */}
      {Object.keys(stats.byTag).length > 0 && (
        <div className="border border-gray-100 rounded-xl p-4">
          <p className="text-sm font-medium mb-3">By Tag (minutes)</p>
          <div className="space-y-2">
            {Object.entries(stats.byTag)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, minutes]) => (
                <div key={tag} className="flex justify-between text-sm">
                  <span>{tag}</span>
                  <span className="text-gray-500">{minutes} min</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex gap-3">
        <button
          onClick={() => handleExport('csv')}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={() => handleExport('json')}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write PresetsScreen**

`screens/PresetsScreen.tsx`:

```tsx
import { useState } from 'react'
import { usePresetsStore } from '@/store/presetsStore'

export function PresetsScreen() {
  const { presets, createPreset, updatePreset } = usePresetsStore()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15,
    sessionsBeforeLongBreak: 4, color: '#E53935', icon: 'timer', sortOrder: 0,
  })

  async function handleCreate() {
    if (!form.name.trim()) return
    await createPreset(form)
    setCreating(false)
    setForm({ name: '', workDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, sessionsBeforeLongBreak: 4, color: '#E53935', icon: 'timer', sortOrder: 0 })
  }

  return (
    <div className="flex flex-col gap-4 p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">Presets</h2>
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          {creating ? 'Cancel' : '+ New Preset'}
        </button>
      </div>

      {creating && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <input
            placeholder="Preset name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-3">
            {(['workDuration', 'shortBreakDuration', 'longBreakDuration'] as const).map((field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 block mb-1">
                  {field === 'workDuration' ? 'Work' : field === 'shortBreakDuration' ? 'Short Break' : 'Long Break'} (min)
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Create Preset
          </button>
        </div>
      )}

      <div className="space-y-3">
        {presets.map((p) => (
          <div key={p.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-medium">{p.name}</span>
                {p.builtIn && <span className="ml-2 text-xs text-gray-400">built-in</span>}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {p.workDuration}m work · {p.shortBreakDuration}m short · {p.longBreakDuration}m long · {p.sessionsBeforeLongBreak} sessions
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write Navigation component**

`components/shared/Navigation.tsx`:

```tsx
type Screen = 'timer' | 'history' | 'stats' | 'presets'

interface Props {
  current: Screen
  onChange: (screen: Screen) => void
}

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
  { id: 'presets', label: 'Presets' },
]

export function Navigation({ current, onChange }: Props) {
  return (
    <nav className="flex border-b border-gray-100">
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 py-3 text-sm transition-colors ${
            current === id
              ? 'text-red-600 border-b-2 border-red-600 font-medium'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 8: Write App.tsx**

`App.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useFirestoreSync } from '@/hooks/useFirestoreSync'
import { LoginScreen } from '@/screens/LoginScreen'
import { TimerScreen } from '@/screens/TimerScreen'
import { HistoryScreen } from '@/screens/HistoryScreen'
import { StatsScreen } from '@/screens/StatsScreen'
import { PresetsScreen } from '@/screens/PresetsScreen'
import { Navigation } from '@/components/shared/Navigation'
import '@/styles/global.css'

type Screen = 'timer' | 'history' | 'stats' | 'presets'

export function App() {
  const { user, loading, initialize } = useAuthStore()
  const [screen, setScreen] = useState<Screen>('timer')

  useEffect(() => {
    const unsub = initialize()
    return unsub
  }, [])

  useFirestoreSync()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading…
      </div>
    )
  }

  if (!user) return <LoginScreen />

  const screens: Record<Screen, JSX.Element> = {
    timer: <TimerScreen />,
    history: <HistoryScreen />,
    stats: <StatsScreen />,
    presets: <PresetsScreen />,
  }

  return (
    <div className="flex flex-col h-screen">
      <Navigation current={screen} onChange={setScreen} />
      <main className="flex-1 overflow-hidden">{screens[screen]}</main>
    </div>
  )
}
```

- [ ] **Step 9: Write main.tsx and index.html**

`main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`electron/src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pomodoro Timer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Build to verify**

```bash
npm run build
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 11: Commit all screens**

```bash
git add electron/src/renderer/
git commit -m "feat: implement all React screens — Login, Timer, History, Stats, Presets"
```

---

### Task 9: Implement Electron Main Process

**Files:**
- Create: `electron/src/main/index.ts`
- Create: `electron/src/main/tray.ts`
- Create: `electron/src/main/ipc.ts`
- Create: `electron/src/preload/index.ts`

- [ ] **Step 1: Write preload script**

`preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('set-always-on-top', value),
  openMiniMode: () => ipcRenderer.send('open-mini-mode'),
  closeMiniMode: () => ipcRenderer.send('close-mini-mode'),
  onTimerStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('timer-state-update', (_event, state) => callback(state))
    return () => ipcRenderer.removeAllListeners('timer-state-update')
  },
})
```

- [ ] **Step 2: Write tray.ts**

`main/tray.ts`:

```typescript
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'path'

export function createTray(mainWindow: BrowserWindow): Tray {
  // Use a built-in system icon for simplicity
  const icon = nativeImage.createEmpty()
  const tray = new Tray(icon)

  tray.setToolTip('Pomodoro Timer')

  function updateMenu(status: string = 'idle') {
    const statusLabel = status === 'idle' ? 'Idle' : status === 'running' ? 'Running' : 'Paused'
    const contextMenu = Menu.buildFromTemplate([
      { label: `Pomodoro Timer — ${statusLabel}`, enabled: false },
      { type: 'separator' },
      { label: 'Show', click: () => mainWindow.show() },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ])
    tray.setContextMenu(contextMenu)
  }

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })

  updateMenu()
  return tray
}
```

- [ ] **Step 3: Write ipc.ts**

`main/ipc.ts`:

```typescript
import { ipcMain, BrowserWindow } from 'electron'

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.on('set-always-on-top', (_event, value: boolean) => {
    mainWindow.setAlwaysOnTop(value)
  })

  ipcMain.on('open-mini-mode', () => {
    mainWindow.setSize(240, 120)
    mainWindow.setResizable(false)
    mainWindow.setAlwaysOnTop(true)
  })

  ipcMain.on('close-mini-mode', () => {
    mainWindow.setSize(400, 600)
    mainWindow.setResizable(true)
    mainWindow.setAlwaysOnTop(false)
  })
}
```

- [ ] **Step 4: Write main/index.ts**

`main/index.ts`:

```typescript
import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 320,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  return mainWindow
}

app.whenReady().then(() => {
  const win = createWindow()
  createTray(win)
  registerIpcHandlers(win)
})

app.on('before-quit', () => {
  mainWindow?.removeAllListeners('close')
  mainWindow = null
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow) mainWindow.show()
})
```

- [ ] **Step 5: Build and launch in dev mode**

```bash
npm run dev
```

Expected: Electron window opens, showing login screen or timer (if already authenticated).

- [ ] **Step 6: Commit main process**

```bash
git add electron/src/main/ electron/src/preload/
git commit -m "feat: implement Electron main process with tray, mini-mode, and IPC"
```

---

### Task 10: E2E Smoke Test with Playwright

**Files:**
- Create: `electron/tests/e2e/app.spec.ts`
- Create: `electron/playwright.config.ts`

- [ ] **Step 1: Write Playwright config**

`electron/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
})
```

- [ ] **Step 2: Write E2E smoke test**

`tests/e2e/app.spec.ts`:

```typescript
import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test('app launches and shows login screen when not authenticated', async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    env: { ...process.env, VITE_USE_EMULATOR: 'true' },
  })

  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // Should see login screen when not signed in
  const signInButton = await window.getByText('Sign in with Google')
  await expect(signInButton).toBeVisible()

  await app.close()
})
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install --with-deps chromium
```

- [ ] **Step 4: Build and run E2E test**

```bash
npm run build
npm run test:e2e
```

Expected: Test passes — app launches and shows sign-in button.

- [ ] **Step 5: Commit**

```bash
git add electron/tests/e2e/ electron/playwright.config.ts
git commit -m "test: add Playwright E2E smoke test for app launch"
```

---

### Task 11: Run All Tests and Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
cd D:/Data/20260409-pomodoro-timer/electron
npm test
```

Expected: All unit tests pass (timer.test.ts, export.test.ts).

- [ ] **Step 2: Run E2E test**

```bash
npm run test:e2e
```

Expected: E2E test passes.

- [ ] **Step 3: Build production bundle**

```bash
npm run build
```

Expected: `out/` directory created with main, preload, and renderer bundles.

- [ ] **Step 4: Manual smoke test checklist**

With Firebase emulator running (`firebase emulators:start` in `firebase/` directory):

- [ ] App opens to Login screen
- [ ] Google sign-in (via emulator) authenticates successfully
- [ ] Timer screen shows preset chips (Standard, Deep Work, Quick Task)
- [ ] Start button begins countdown
- [ ] Pause/Resume works correctly
- [ ] Stop resets timer
- [ ] History tab shows sessions after completing one
- [ ] Stats tab shows correct counts
- [ ] Export CSV downloads a file
- [ ] Presets tab shows 3 built-in presets
- [ ] Creating a new preset appears in the list
- [ ] System tray icon appears (right-click shows menu)
- [ ] Minimize to tray hides the window

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Electron Pomodoro app v1.0"
```

---

**Electron app is complete.** You now have all three components ready for deployment:

1. `firebase/` — Firebase config, security rules, emulator setup
2. `android/` — Native Android app (Kotlin + Jetpack Compose)
3. `electron/` — Desktop app (Electron + React + TypeScript)

All three share the same Firestore data model and sync in real-time.
