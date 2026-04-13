# Changelog

## [v1.1.1] - 2026-04-13

### Bug Fixes

- **Release workflow: Electron binaries now attached to GitHub Release** — `npm run build` was called instead of `npm run dist`, so electron-builder never ran and no installable binaries (`.exe`, `.dmg`, `.AppImage`) were produced. A missing `publish` job meant artifacts were never uploaded to the release page even if they had been built.

---

## [v1.1.0] - 2026-04-13

### Features

- **Account menu (Electron)** — A user avatar now appears in the top-right corner of the navigation bar. Clicking it opens a dropdown showing your Google profile photo (or a coloured initial if no photo), display name, email, and a Sign out button. Specs: [user-avatar](specs/user-avatar.md), [navigation-avatar](specs/navigation-avatar.md)

### Bug Fixes

- **Electron: Google Sign-In no longer blocked** — `signInWithPopup` was silently blocked because all new windows were denied. Firebase auth popup windows are now allowed through so the OAuth flow can complete.
- **Electron: cache/quota-database errors on launch** — `userData` path was constructed using Windows-only `os.homedir()` calls and left directory creation to Chromium, causing a race condition. Now uses `app.getPath('appData')` (cross-platform) and pre-creates the directory.

### Internal

- Scoped CI workflow for account-menu tests — fires only when `UserAvatar`, `Navigation`, or `authStore` files change, running 25 targeted tests instead of the full suite.

---

## [v1.0.1] - 2026-04-12

### Bug Fixes

- Fixed `./gradlew: Permission denied` on Linux CI (execute bit not set in git)
- Firebase emulator now requires JDK 21; bumped workflow from JDK 17
- Removed accidentally committed `electron/.env.development` (overrode real `.env` in dev mode)

---

## [v1.0.0] - 2026-04-12

### Features

- **Android app** — Native Kotlin + Jetpack Compose Pomodoro timer with Google Sign-In, foreground service, Firestore real-time sync, and a preset editor for custom timer configurations
- **Electron desktop app** — React + TypeScript desktop app with Google Sign-In, timer, session history, stats, CSV export, and real-time sync
- **Firebase backend** — Firestore security rules locking every subcollection to its owner; 18 automated rules tests

### Internal

- GitHub Actions CI for Electron (test + build), Android (unit test + APK), and Firebase (rules tests)
- Release workflow building multi-platform Electron binaries and Android APK on `v*` tags

---

## [v0.1.0] - 2026-04-12

Initial release — Android APK (unsigned, sideload only).
