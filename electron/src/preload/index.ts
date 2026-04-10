import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  setAlwaysOnTop: (value: boolean) => ipcRenderer.send('set-always-on-top', value),
  openMiniMode: () => ipcRenderer.send('open-mini-mode'),
  closeMiniMode: () => ipcRenderer.send('close-mini-mode'),
  onTimerStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('timer-state-update', (_event, state) => callback(state))
    return () => ipcRenderer.removeAllListeners('timer-state-update')
  },
})
