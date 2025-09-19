const { ipcMain } = require('electron');

class IpcHandler {
  constructor(settingsManager, trayManager) {
    this.settingsManager = settingsManager;
    this.trayManager = trayManager;
    this.setupListeners();
  }

  setupListeners() {
    ipcMain.on('setting-changed', (event, { key, value }) => {
      switch (key) {
        case 'soundEnabled':
          this.settingsManager.isSoundEnabled = value;
          break;
        case 'notificationEnabled':
          this.settingsManager.isNotificationEnabled = value;
          break;
      }
      this.trayManager.updateTrayMenu();
    });
  }
}

module.exports = IpcHandler;