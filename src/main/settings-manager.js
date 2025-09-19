const { app } = require('electron');

class SettingsManager {
  constructor(appConfig) {
    this.appConfig = appConfig;
    this.isSoundEnabled = true;
    this.isNotificationEnabled = true;
    this.isAutoLaunch = false;
  }

  init() {
    // 读取开机启动设置
    this.isAutoLaunch = app.getLoginItemSettings().openAtLogin;
  }

  setAutoLaunch(enable) {
    this.isAutoLaunch = enable;
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      path: app.getPath('exe')
    });
  }

  updateTrayMenu(trayManager) {
    trayManager.updateTrayMenu();
  }
}

module.exports = SettingsManager;