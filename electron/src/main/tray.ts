import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'

export function createTray(mainWindow: BrowserWindow): Tray {
  // Use a built-in system icon for simplicity
  const icon = nativeImage.createEmpty()
  const tray = new Tray(icon)

  tray.setToolTip('Pomodoro Timer')

  function updateMenu(status: string = 'idle') {
    const statusLabel = status === 'idle' ? 'Idle' : status === 'running' ? 'Running' : 'Paused'
    const contextMenu = Menu.buildFromTemplate([
      { label: `Pomodoro Timer — ${statusLabel}`, enabled: false },
      { type: 'separator' },
      { label: 'Show', click: () => mainWindow.show() },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ])
    tray.setContextMenu(contextMenu)
  }

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })

  updateMenu()
  return tray
}
