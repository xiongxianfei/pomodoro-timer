# Firebase Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Firebase project with Firestore, Auth, security rules, and emulator suite that both Android and Electron apps share.

**Architecture:** A single Firebase project hosts Firestore (real-time sync + data persistence) and Firebase Auth (Google sign-in). Security rules enforce per-user data isolation. The Firebase emulator suite enables local integration testing for both client apps.

**Tech Stack:** Firebase CLI, Firestore, Firebase Auth, Firebase Emulator Suite

---

## File Structure

```
firebase/
  .firebaserc              # Project alias config
  firebase.json            # Emulator + deploy config
  firestore.rules          # Security rules
  firestore.indexes.json   # Composite indexes for stats queries
  emulator-data/           # Seeded emulator data (gitignored except seed script)
  seed/
    seed-emulator.js       # Seeds built-in presets for test UID
```

---

### Task 1: Install Firebase CLI and Initialize Project

**Files:**
- Create: `firebase/firebase.json`
- Create: `firebase/.firebaserc`

- [ ] **Step 1: Install Firebase CLI globally**

```bash
npm install -g firebase-tools
firebase --version
```

Expected output: `13.x.x` (or later)

- [ ] **Step 2: Log in to Firebase**

```bash
firebase login
```

Follow browser prompt to authenticate with your Google account.

- [ ] **Step 3: Create Firebase project in the console**

Open https://console.firebase.google.com and:
1. Click "Add project"
2. Name it `pomodoro-timer-sync`
3. Disable Google Analytics (not needed)
4. Click "Create project"

Then enable **Google sign-in**:
1. Go to Authentication → Sign-in method
2. Enable "Google" provider
3. Save

- [ ] **Step 4: Initialize Firebase in the project directory**

```bash
cd D:/Data/20260409-pomodoro-timer
mkdir firebase && cd firebase
firebase init
```

Select (using spacebar):
- `Firestore: Configure security rules and indexes files`
- `Emulators: Set up local emulators`

When prompted:
- Use existing project → select `pomodoro-timer-sync`
- Firestore rules file: `firestore.rules`
- Firestore indexes file: `firestore.indexes.json`
- Emulators to set up: **Authentication**, **Firestore**
- Auth emulator port: `9099` (default)
- Firestore emulator port: `8080` (default)
- Download emulators now: Yes

- [ ] **Step 5: Verify firebase.json was created correctly**

```bash
cat firebase/firebase.json
```

Expected content (adjust if different):

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

- [ ] **Step 6: Commit initial Firebase setup**

```bash
cd D:/Data/20260409-pomodoro-timer
git init
git add firebase/
git commit -m "chore: initialize Firebase project config"
```

---

### Task 2: Write Firestore Security Rules

**Files:**
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Write the security rules**

Replace the contents of `firebase/firestore.rules` with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // All user data is private — only the authenticated user can read/write
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /profile {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /settings {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /presets/{presetId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /timerState {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /sessions/{sessionId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        // Sessions are immutable once created — no updates allowed
        allow create: if request.auth != null && request.auth.uid == uid;
        allow update, delete: if false;
      }

      match /tags/{tagId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

- [ ] **Step 2: Start the emulator and verify rules load without errors**

```bash
cd D:/Data/20260409-pomodoro-timer/firebase
firebase emulators:start --only firestore,auth
```

Expected: Emulator UI at http://localhost:4000, no rule parse errors in output.

Press Ctrl+C to stop.

- [ ] **Step 3: Commit security rules**

```bash
git add firebase/firestore.rules
git commit -m "feat: add Firestore security rules — per-user isolation, immutable sessions"
```

---

### Task 3: Define Firestore Composite Indexes

**Files:**
- Modify: `firebase/firestore.indexes.json`

- [ ] **Step 1: Write composite indexes for stats queries**

Replace `firebase/firestore.indexes.json` with:

```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "startedAt", "order": "DESCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "startedAt", "order": "DESCENDING" },
        { "fieldPath": "completed", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectName", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Verify indexes file is valid JSON**

```bash
node -e "require('./firebase/firestore.indexes.json'); console.log('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 3: Commit indexes**

```bash
git add firebase/firestore.indexes.json
git commit -m "feat: add Firestore composite indexes for stats queries"
```

---

### Task 4: Create Emulator Seed Script

**Files:**
- Create: `firebase/seed/seed-emulator.js`

- [ ] **Step 1: Install seed script dependencies**

```bash
cd D:/Data/20260409-pomodoro-timer/firebase
npm init -y
npm install firebase-admin
```

- [ ] **Step 2: Write the seed script**

Create `firebase/seed/seed-emulator.js`:

```javascript
#!/usr/bin/env node
/**
 * Seeds the Firebase emulator with built-in presets for a test user.
 * Run with: FIRESTORE_EMULATOR_HOST=localhost:8080 node seed/seed-emulator.js
 */

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: 'pomodoro-timer-sync' });
const db = getFirestore();

const TEST_UID = 'test-user-001';

const BUILT_IN_PRESETS = [
  {
    id: 'preset-standard',
    name: 'Standard',
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    color: '#E53935',
    icon: 'timer',
    sortOrder: 0,
    builtIn: true,
  },
  {
    id: 'preset-deep-work',
    name: 'Deep Work',
    workDuration: 50,
    shortBreakDuration: 10,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 3,
    color: '#1E88E5',
    icon: 'brain',
    sortOrder: 1,
    builtIn: true,
  },
  {
    id: 'preset-quick-task',
    name: 'Quick Task',
    workDuration: 15,
    shortBreakDuration: 3,
    longBreakDuration: 10,
    sessionsBeforeLongBreak: 4,
    color: '#43A047',
    icon: 'bolt',
    sortOrder: 2,
    builtIn: true,
  },
];

async function seed() {
  const userRef = db.collection('users').doc(TEST_UID);

  // Profile
  await userRef.collection('profile').doc('profile').set({
    displayName: 'Test User',
    email: 'test@example.com',
    photoUrl: '',
    createdAt: FieldValue.serverTimestamp(),
  });

  // Settings
  await userRef.collection('settings').doc('settings').set({
    theme: 'light',
    defaultPresetId: 'preset-standard',
    notificationSound: 'default',
  });

  // Built-in presets
  for (const preset of BUILT_IN_PRESETS) {
    const { id, ...data } = preset;
    await userRef.collection('presets').doc(id).set(data);
  }

  // Initial timer state (idle)
  await userRef.collection('timerState').doc('timerState').set({
    status: 'idle',
    presetId: 'preset-standard',
    startedAt: null,
    pausedAt: null,
    elapsed: 0,
    currentSession: 1,
    totalSessions: 4,
    isBreak: false,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed',
  });

  console.log(`Seeded Firestore emulator for UID: ${TEST_UID}`);
  console.log('  - profile');
  console.log('  - settings');
  console.log('  - 3 built-in presets (Standard, Deep Work, Quick Task)');
  console.log('  - timerState (idle)');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Test the seed script against the running emulator**

In one terminal, start the emulator:

```bash
cd D:/Data/20260409-pomodoro-timer/firebase
firebase emulators:start --only firestore,auth
```

In another terminal:

```bash
cd D:/Data/20260409-pomodoro-timer/firebase
node seed/seed-emulator.js
```

Expected output:
```
Seeded Firestore emulator for UID: test-user-001
  - profile
  - settings
  - 3 built-in presets (Standard, Deep Work, Quick Task)
  - timerState (idle)
```

Open http://localhost:4000 → Firestore → verify `users/test-user-001/` has all subcollections.

- [ ] **Step 4: Add gitignore for emulator data**

Create `firebase/.gitignore`:

```
node_modules/
.firebase/
emulator-data/
```

- [ ] **Step 5: Commit seed script**

```bash
git add firebase/seed/ firebase/.gitignore firebase/package.json firebase/package-lock.json
git commit -m "feat: add emulator seed script with built-in presets"
```

---

### Task 5: Document Emulator Usage

**Files:**
- Create: `firebase/README.md`

- [ ] **Step 1: Write emulator README**

Create `firebase/README.md`:

```markdown
# Firebase Setup

## Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Logged in: `firebase login`

## Running the Emulator (for local development)

```bash
cd firebase
firebase emulators:start
```

Emulator UI: http://localhost:4000
Firestore: localhost:8080
Auth: localhost:9099

## Seeding Test Data

With the emulator running:

```bash
node seed/seed-emulator.js
```

This creates a test user (`test-user-001`) with 3 built-in presets and idle timer state.

## Deploying Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Test UID

For integration tests in both Android and Electron apps, use:
- UID: `test-user-001`
- Connect to emulator at `localhost:8080` (Firestore) and `localhost:9099` (Auth)
```

- [ ] **Step 2: Commit README**

```bash
git add firebase/README.md
git commit -m "docs: add Firebase emulator setup instructions"
```

---

**Firebase setup is complete.** You can now proceed with the Android and Electron app plans in parallel. Both connect to the same Firebase project using the emulator for development and testing.
