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
