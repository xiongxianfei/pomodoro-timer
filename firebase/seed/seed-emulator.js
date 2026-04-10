#!/usr/bin/env node
/**
 * Seeds the Firebase emulator with built-in presets for a test user.
 * Run with: FIRESTORE_EMULATOR_HOST=localhost:8080 node seed/seed-emulator.js
 */

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

const { initializeApp } = require('firebase-admin/app');
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
