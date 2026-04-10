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
cd firebase
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
