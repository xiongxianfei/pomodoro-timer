# CLAUDE.md — Pomodoro Timer

Cross-platform Pomodoro timer: native Android app + Electron desktop app, synced via Firebase Firestore in real time.

## Project layout

```
android/        Kotlin + Jetpack Compose app (minSdk 26, targetSdk 34)
electron/       Electron + React + TypeScript desktop app
firebase/       Firestore rules, indexes, emulator config, seed script
docs/           Design spec and implementation plans
```

## Development Workflow
All features follow this pipeline. Do not skip steps.

/plan → /plan-review → /spec → /test-spec → /ci → /implement → /review → /pr → /workflows

- Each phase produces a specific artifact (see docs/ and specs/)
- /implement and /review MUST run in fresh sessions
- Tests come before implementation (TDD)
- Every PR links back to its spec

Commands are in .claude/commands/. Read the relevant command before executing.

---

## Commands

### Electron (run from `electron/`)

```bash
npm run dev          # Start dev server (Vite + Electron hot reload)
npm test             # Vitest unit tests — always run before committing
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright E2E (requires a running dev build)
npm run build        # Production build
```

### Android (run from `android/`)

```bash
# Unit tests (JVM, no device needed)
./gradlew test

# Specific test class
./gradlew test --tests "com.pomodoro.domain.timer.TimerEngineTest"

# Instrumented tests (requires connected device or emulator)
./gradlew connectedAndroidTest

# Specific instrumented test class
./gradlew connectedAndroidTest --tests "com.pomodoro.data.local.SessionDaoTest"

# Debug build (what CI runs)
./gradlew assembleDebug
```

**Test locations:**
- `android/app/src/test/` — JVM unit tests (fast, no device). Currently: `TimerEngineTest`.
- `android/app/src/androidTest/` — instrumented tests (need device/emulator). Currently: `SessionDaoTest`.

CI uses `gradle assembleDebug` (system Gradle, not `gradlew`) with a mock `google-services.json` — no interactive commands.

### Firebase (run from `firebase/`)

```bash
# Security rules tests — starts the emulator automatically, runs all tests, shuts down
npm test

# Start emulator for manual development (Auth :9099, Firestore :8080, UI :4000)
firebase emulators:start

# Seed test data (emulator must already be running)
npm run seed

# Deploy rules + indexes to production
firebase deploy --only firestore
```

**Test location:** `firebase/tests/rules.test.js` — uses `@firebase/rules-unit-testing` + Jest to verify that Firestore security rules allow/deny the correct operations for each subcollection. The emulator is started and stopped automatically by `npm test` via `firebase emulators:exec`.

**Prerequisite:** `firebase-tools` must be installed globally (`npm install -g firebase-tools`) and you must be logged in (`firebase login`).

---

## Architecture decisions

### Sync model

All timer state lives in one Firestore document: `users/{uid}/timerState/timerState`. Every write is a full `set()` with `merge`. Last-write-wins — no conflict resolution. Devices identify themselves via a `deviceId` field on every write; a device ignores its own echoes where needed.

### Timer expiry

**Android:** `LaunchedEffect(remainingSeconds, timerState.status)` detects `remainingSeconds == 0L` and calls `completeSession()` or `stop()` depending on `status`.

**Electron:** `isExpired` / `isBreakExpired` are derived in `useTimer.ts` from `remaining === 0 && status === 'running'` / `'break'`. The `remaining` state is initialized via a **lazy `useState` initializer** that reads the Zustand store synchronously — this is critical. Do NOT revert this to `useState(0)`: that causes a spurious `completeSession()` on every tab switch (issue #2).

### Preset seeding

On first sign-in the three built-in presets are written to Firestore if the collection is empty. Both apps do this independently. Built-in presets have `builtIn: true` and IDs prefixed `preset-` (Android) / `built-in-` (Electron) — do not change these IDs.

---

## Critical cross-platform field format contracts

Firestore is the shared state between Android (Kotlin enums) and Electron (TypeScript strings). Use these formats exactly — mismatches cause silent sync failures.

| Field | Firestore value | Android write | Android read |
|-------|----------------|---------------|--------------|
| `timerState.status` | lowercase string: `"idle"`, `"running"`, `"paused"`, `"break"` | `status.name.lowercase()` | `TimerStatus.valueOf(str.uppercase())` |
| `sessions.type` | camelCase: `"work"`, `"shortBreak"`, `"longBreak"` | explicit `when` map | explicit `when` map |
| `timerState.startedAt` | Firestore Timestamp (second precision) | `Timestamp(instant.epochSecond, 0)` | `.toDate()` → `Instant.ofEpochSecond(seconds)` |

**Never** write Java enum names (`"RUNNING"`, `"SHORT_BREAK"`) directly to Firestore.

---

## Kotlin / Compose conventions

- Use `hiltViewModel()` for all ViewModels in composables — never construct them manually.
- All Firestore access goes through `FirestoreRepository`. ViewModels call the repo; composables call the ViewModel.
- String literals in Kotlin must use straight ASCII quotes (`"`). Do **not** paste smart/curly quotes (`"` `"`) — the Kotlin compiler rejects them (this caused build failure on PR #5).
- Use `coerceIn(0L, totalDuration)` when computing remaining seconds on Android to guard against device clock skew.

---

## TypeScript / React conventions

- Zustand store state is accessed in React via hooks (`useTimerStore(s => s.x)`). Outside React (e.g. lazy initializers, callbacks), use `useTimerStore.getState()` — never import the raw store object.
- Firebase is initialized once in `electron/src/renderer/src/firebase/config.ts`. Import `auth` and `db` from there — don't call `initializeApp` elsewhere.
- Do not create `.env.development` — Vite loads it before `.env` in dev mode and will override your Firebase config with stale values.

---

## Firestore security rules

Every subcollection under `users/{uid}/` needs its own `match` block. The parent `match /users/{uid}` rule does **not** cover subcollections. After editing `firebase/firestore.rules`, deploy with:

```bash
firebase deploy --only firestore:rules
```

Always deploy rules before testing against production — without deployed rules, all Firestore reads and writes are silently blocked.

---

## CI / CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `electron.yml` | PR / push to `main` | `npm test` → `npm run build` |
| `android.yml` | PR / push to `main` | `gradle assembleDebug` with mock `google-services.json`, uploads APK artifact |
| `release.yml` | Push tag `v*` | Multi-platform Electron build + Android release APK |

Firebase secrets are injected via GitHub Actions secrets (see `.github/workflows/electron.yml` for the full list). The Android CI uses a mock `google-services.json` generated inline — never commit the real one.

---

## Git workflow

- All changes go through a feature branch → PR → merge to `main`. Never push directly to `main`.
- Branch naming: `feat/<scope>-<description>`, `fix/<description>`
- PRs reference the GitHub issue they close with `Closes #N` in the commit message or PR body.
- Before opening a PR: run `npm test` in `electron/`, `./gradlew test` in `android/`, and `npm test` in `firebase/`. Instrumented Android tests and the full build are verified by CI.

---

## Secrets — never commit

| File | Contains |
|------|---------|
| `android/app/google-services.json` | Firebase API key + OAuth client IDs |
| `electron/.env` | `VITE_FIREBASE_*` keys |

Both are in `.gitignore`. If either file is accidentally staged, remove it with `git rm --cached` before committing.

## Rules
<important if="user asks to build or implement a feature">
STOP. Do not write code directly. Check if a spec exists in specs/ 
for this feature. If not, run /plan first. Never implement without 
a spec.
</important>