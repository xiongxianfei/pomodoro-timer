# Firebase Setup Guide

Practical reference for setting up Firebase in a cross-platform project (Android + Electron/Web). Based on real experience building a production app.

---

## 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → disable Google Analytics (optional)
3. In **Project Settings** → **General**, note your **Project ID** (e.g. `my-project-abc123`)

---

## 2. Enable Authentication

1. Firebase Console → **Authentication** → **Get started**
2. Under **Sign-in method**, enable:
   - **Google** — for Android native sign-in
   - **Email/Password** — for Electron and any platform where OAuth popup doesn't work

> **Important:** Google Sign-In via `signInWithPopup` does NOT work in Electron's `BrowserWindow`. Use email/password for desktop apps.

---

## 3. Create a Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** (you will deploy your own rules)
3. Select a region close to your users (e.g. `asia-east1`)

---

## 4. Register Apps

### Android App

1. Console → **Project Settings** → **Add app** → Android icon
2. Enter package name (e.g. `com.yourapp`)
3. Download `google-services.json` → place at `android/app/google-services.json`
4. **Add to `.gitignore`** — this file contains your API key

### Web / Electron App

1. Console → **Project Settings** → **Add app** → Web icon (`</>`)
2. Give it a nickname (e.g. "Electron")
3. Copy the `firebaseConfig` object — you need these values:
   ```
   apiKey
   authDomain
   projectId
   storageBucket
   messagingSenderId
   appId
   ```
4. Store them in `.env` (never commit `.env` to git):
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

> **Gotcha:** If you have both `.env` and `.env.development`, Vite loads `.env.development` first in dev mode. Delete `.env.development` or it will override your production config.

---

## 5. Android SDK Integration

### `android/app/build.gradle.kts` dependencies

```kotlin
// Firebase BOM (manages versions)
implementation(platform("com.google.firebase:firebase-bom:33.x.x"))
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-firestore-ktx")

// Google Sign-In
implementation("com.google.android.gms:play-services-auth:21.x.x")
```

### `android/build.gradle.kts` (project level)

```kotlin
plugins {
    id("com.google.gms.google-services") version "4.4.x" apply false
}
```

### `android/app/build.gradle.kts` (app level)

```kotlin
plugins {
    id("com.google.gms.google-services")
}
```

### Hilt injection

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {
    @Provides @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides @Singleton
    fun provideFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()
}
```

### Google Sign-In (Android only)

The `oauth_client` entry with `client_type: 3` in `google-services.json` is required. Firebase generates `R.string.default_web_client_id` from it automatically.

```kotlin
val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
    .requestIdToken(context.getString(R.string.default_web_client_id))
    .requestEmail()
    .build()
val client = GoogleSignIn.getClient(context, gso)
// launch client.signInIntent via ActivityResultLauncher
```

### Emulator (Android, dev only)

```kotlin
if (BuildConfig.USE_EMULATOR) {
    auth.useEmulator("10.0.2.2", 9099)
    firestore.useEmulator("10.0.2.2", 8080)
}
```

Add to `AndroidManifest.xml` to allow HTTP to emulator:
```xml
<application android:networkSecurityConfig="@xml/network_security_config" ...>
```

`res/xml/network_security_config.xml`:
```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

---

## 6. JavaScript SDK Integration (Electron / Web)

### Install

```bash
npm install firebase
```

### `firebase/config.ts`

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = getFirestore(app)

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

---

## 7. Firestore Data Model

### Path convention

All user data lives under `users/{uid}/` — never share documents across users.

```
users/{uid}/
  timerState/       ← single doc "timerState"
  sessions/         ← collection
  presets/          ← collection
  tags/             ← collection
  settings/         ← single doc "settings"
  profile/          ← single doc "profile"
```

### Field format contracts (critical for cross-platform)

When Android (enum) and JavaScript (string) write the same field, agree on format upfront:

| Field | Wrong | Correct |
|-------|-------|---------|
| `status` | `"RUNNING"` (Java enum name) | `"running"` (lowercase) |
| `type` | `"SHORT_BREAK"` (Java enum name) | `"shortBreak"` (camelCase) |

**Android write:** `state.status.name.lowercase()`  
**Android read:** `TimerStatus.valueOf(str.uppercase())`

### Timestamps

- Write with `FieldValue.serverTimestamp()` / `serverTimestamp()` for `updatedAt`
- Read back with `doc.getTimestamp("field")` (Android) or `(field as Timestamp).toMillis()` (JS)
- Android: `Timestamp(instant.epochSecond, 0)` drops sub-second precision — use second-level math

### Real-time listeners

**Android:**
```kotlin
fun observeTimerState(): Flow<TimerState?> = callbackFlow {
    val listener = db.collection("users").document(uid)
        .collection("timerState").document("timerState")
        .addSnapshotListener { snapshot, error ->
            if (error != null) {
                // Close cleanly on PERMISSION_DENIED (user signed out)
                if (error.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) close()
                else close(error)
                return@addSnapshotListener
            }
            trySend(snapshot?.toObject())
        }
    awaitClose { listener.remove() }
}
```

**JavaScript:**
```typescript
const unsub = onSnapshot(doc(db, 'users', uid, 'timerState', 'timerState'), (snap) => {
  if (snap.exists()) callback(snap.data() as TimerState)
})
// call unsub() to clean up
```

> **Gotcha:** After sign-out, Firestore fires all listeners with `PERMISSION_DENIED`. Handle this explicitly or your app will crash.

---

## 8. Security Rules

`firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read, write: if isOwner(uid);
    }
    match /users/{uid}/timerState/{docId} {
      allow read, write: if isOwner(uid);
    }
    match /users/{uid}/sessions/{sessionId} {
      allow read, create: if isOwner(uid);
      allow update, delete: if false;  // sessions are immutable
    }
    match /users/{uid}/presets/{presetId} {
      allow read, write: if isOwner(uid);
    }
    // ... add a match block for every subcollection
  }
}
```

> **Critical:** The parent `match /users/{uid}` rule does NOT cover subcollections. Each subcollection needs its own rule.

---

## 9. Composite Indexes

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "presetId", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Firestore will show you the exact index needed in the error message when a query fails — copy the URL from the error log to create it automatically.

---

## 10. Local Emulator

### Install and configure

```bash
npm install -g firebase-tools
firebase login
firebase init emulators  # select Auth and Firestore
```

`firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

`.firebaserc`:
```json
{
  "projects": { "default": "your-project-id" }
}
```

### Start

```bash
firebase emulators:start
```

UI available at http://localhost:4000 — create test users and inspect documents here.

### Seed data

Create `firebase/seed.js` and run with `node seed.js` while the emulator is running.

---

## 11. Deploy to Production

**Always deploy rules before testing the real app — without this, all reads and writes are blocked.**

```bash
cd firebase
firebase deploy --only firestore          # rules + indexes
firebase deploy --only firestore:rules    # rules only
firebase deploy --only firestore:indexes  # indexes only
```

---

## 12. Common Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| All Firestore reads/writes fail silently | Rules never deployed to production | `firebase deploy --only firestore` |
| `PERMISSION_DENIED` crash on sign-out | Firestore fires listeners after sign-out | Handle `PERMISSION_DENIED` by closing the flow/unsubscribing |
| `R.string.default_web_client_id` not found | `google-services.json` missing `oauth_client` with `client_type: 3` | Add the OAuth 2.0 client ID from Firebase Console → Authentication → Google provider |
| Cleartext HTTP error on Android emulator | Android 9+ blocks HTTP by default | Add `network_security_config.xml` allowing `10.0.2.2` |
| Auth emulator error in Electron | `.env.development` overrides `.env` in Vite dev mode | Delete `.env.development` |
| Google OAuth popup fails in Electron | `signInWithPopup` blocked by Electron's BrowserWindow | Use email/password or open system browser via `shell.openExternal` |
| Timer shows wrong remaining time between devices | Device clocks differ; client timestamp used as `startedAt` | Clamp remaining to `[0, totalDuration]`; consider `serverTimestamp()` for `startedAt` |
| Firestore listener fires with `null` for server timestamp | Pending write — SDK hasn't confirmed yet | Treat `null` startedAt as "just now"; update once confirmed |
