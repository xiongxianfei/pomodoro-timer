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
