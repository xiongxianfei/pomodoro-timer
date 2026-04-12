const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing')
const { readFileSync } = require('fs')
const { resolve } = require('path')

const PROJECT_ID = 'pomodoro-test'
const RULES_PATH = resolve(__dirname, '../firestore.rules')

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

// Helper: return a Firestore instance scoped to a given uid (or unauthenticated)
function db(uid) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore()
}

// ─── timerState ────────────────────────────────────────────────────────────

describe('timerState', () => {
  test('owner can read their own timerState', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .collection('users').doc('alice')
        .collection('timerState').doc('timerState')
        .set({ status: 'idle' })
    })
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('timerState').doc('timerState').get()
    )
  })

  test('owner can write their own timerState', async () => {
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('timerState').doc('timerState').set({ status: 'running' })
    )
  })

  test('other user cannot read timerState', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .collection('users').doc('alice')
        .collection('timerState').doc('timerState')
        .set({ status: 'idle' })
    })
    await assertFails(
      db('bob').collection('users').doc('alice').collection('timerState').doc('timerState').get()
    )
  })

  test('unauthenticated user cannot read timerState', async () => {
    await assertFails(
      db(null).collection('users').doc('alice').collection('timerState').doc('timerState').get()
    )
  })
})

// ─── presets ───────────────────────────────────────────────────────────────

describe('presets', () => {
  test('owner can create a preset', async () => {
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('presets').doc('p1').set({ name: 'My preset' })
    )
  })

  test('owner can update a preset', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').collection('presets').doc('p1').set({ name: 'Old' })
    })
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('presets').doc('p1').update({ name: 'New' })
    )
  })

  test('owner can delete a preset', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').collection('presets').doc('p1').set({ name: 'X' })
    })
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('presets').doc('p1').delete()
    )
  })

  test('other user cannot read presets', async () => {
    await assertFails(
      db('bob').collection('users').doc('alice').collection('presets').get()
    )
  })

  test('unauthenticated user cannot read presets', async () => {
    await assertFails(
      db(null).collection('users').doc('alice').collection('presets').get()
    )
  })
})

// ─── sessions ──────────────────────────────────────────────────────────────

describe('sessions', () => {
  test('owner can create a session', async () => {
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('sessions').doc('s1').set({ type: 'work' })
    )
  })

  test('owner cannot update a session (immutable)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').collection('sessions').doc('s1').set({ type: 'work' })
    })
    await assertFails(
      db('alice').collection('users').doc('alice').collection('sessions').doc('s1').update({ type: 'shortBreak' })
    )
  })

  test('owner cannot delete a session (immutable)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').collection('sessions').doc('s1').set({ type: 'work' })
    })
    await assertFails(
      db('alice').collection('users').doc('alice').collection('sessions').doc('s1').delete()
    )
  })

  test('owner can read their sessions', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('users').doc('alice').collection('sessions').doc('s1').set({ type: 'work' })
    })
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('sessions').doc('s1').get()
    )
  })

  test('other user cannot read sessions', async () => {
    await assertFails(
      db('bob').collection('users').doc('alice').collection('sessions').get()
    )
  })
})

// ─── tags ──────────────────────────────────────────────────────────────────

describe('tags', () => {
  test('owner can read and write their tags', async () => {
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('tags').doc('work').set({ name: 'work' })
    )
    await assertSucceeds(
      db('alice').collection('users').doc('alice').collection('tags').doc('work').get()
    )
  })

  test('other user cannot read tags', async () => {
    await assertFails(
      db('bob').collection('users').doc('alice').collection('tags').get()
    )
  })
})

// ─── cross-user data isolation ─────────────────────────────────────────────

describe('cross-user isolation', () => {
  test('user cannot write to another user document', async () => {
    await assertFails(
      db('bob').collection('users').doc('alice').set({ displayName: 'Hacked' })
    )
  })

  test('user can write to their own user document', async () => {
    await assertSucceeds(
      db('alice').collection('users').doc('alice').set({ displayName: 'Alice' })
    )
  })
})
