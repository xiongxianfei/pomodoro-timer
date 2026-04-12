import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc'

// Use Electron's resolved appData path for cross-platform correctness, then
// pre-create the directory so Chromium never hits a race writing the cache/quota db.
const userDataPath = path.join(app.getPath('appData'), 'PomodoroTimer')
fs.mkdirSync(userDataPath, { recursive: true })
app.setPath('userData', userDataPath)

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
    // Firebase signInWithPopup opens /__/auth/handler which then redirects through
    // Google OAuth and communicates the result back via window.opener.postMessage.
    // Allow those windows as real BrowserWindows so the flow can complete.
    if (url.includes('/__/auth/') || url.startsWith('https://accounts.google.com')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      }
    }
    // All other external links open in the system browser.
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
