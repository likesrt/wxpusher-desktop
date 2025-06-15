const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onSetSoundEnabled: (cb) => ipcRenderer.on('set-sound-enabled', (event, val) => cb(val)),
  onSetNotificationEnabled: (cb) => ipcRenderer.on('set-notification-enabled', (event, val) => cb(val)),
  settingChanged: (key, value) => ipcRenderer.send('setting-changed', { key, value }),
  getSettings: () => ipcRenderer.invoke('get-settings')
});
