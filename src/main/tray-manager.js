const { Tray, Menu, nativeImage } = require('electron');

class TrayManager {
  constructor(appConfig, windowManager, settingsManager) {
    this.tray = null;
    this.appConfig = appConfig;
    this.windowManager = windowManager;
    this.settingsManager = settingsManager;
  }

  createTray() {
    // 创建托盘图标
    const icon = nativeImage.createFromPath(this.appConfig.ICON_PATH);
    this.tray = new Tray(icon);
    this.tray.setToolTip(this.appConfig.APP_NAME);

    // 托盘单击和双击事件都打开主界面
    this.tray.on('click', () => this.windowManager.showMainWindow());
    this.tray.on('double-click', () => this.windowManager.showMainWindow());

    // 更新托盘菜单
    this.updateTrayMenu();
  }

  updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主界面',
        click: () => this.windowManager.showMainWindow()
      },
      { type: 'separator' },
      {
        label: '开机启动',
        type: 'checkbox',
        checked: this.settingsManager.isAutoLaunch,
        click: (item) => this.settingsManager.setAutoLaunch(item.checked)
      },
      {
        label: '声音提醒',
        type: 'checkbox',
        checked: this.settingsManager.isSoundEnabled,
        click: (item) => {
          this.settingsManager.isSoundEnabled = item.checked;
          this.windowManager.getMainWindow()?.webContents.send('toggle-sound', item.checked);
        }
      },
      {
        label: '桌面通知',
        type: 'checkbox',
        checked: this.settingsManager.isNotificationEnabled,
        click: (item) => {
          this.settingsManager.isNotificationEnabled = item.checked;
          this.windowManager.getMainWindow()?.webContents.send('toggle-notification', item.checked);
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.windowManager.setAllowQuit(true);
          require('electron').app.quit();
        }
      }
    ]);

    this.tray?.setContextMenu(contextMenu);
  }

  getTray() {
    return this.tray;
  }
}

module.exports = TrayManager;