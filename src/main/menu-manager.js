const { Menu, shell, dialog, app } = require('electron');

class MenuManager {
  constructor(windowManager, settingsManager) {
    this.windowManager = windowManager;
    this.settingsManager = settingsManager;
  }

  createMenu() {
    const template = [
      {
        label: '设置',
        submenu: [
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
            label: '刷新',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.windowManager.getMainWindow()?.reload()
          },
          {
            label: '最小化',
            role: 'minimize'
          },
          { type: 'separator' },
          {
            label: '清除缓存',
            click: () => this.clearAppCache()
          },
          { type: 'separator' },
          {
            label: '退出',
            click: () => {
              this.windowManager.setAllowQuit(true);
              app.quit();
            }
          }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: 'WxPusher 官网',
            click: () => shell.openExternal('https://wxpusher.zjiecode.com')
          },
          {
            label: 'WxPusher 文档',
            click: () => shell.openExternal('https://wxpusher.zjiecode.com/docs/')
          },
          { type: 'separator' },
          {
            label: '开发者工具',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => this.windowManager.getMainWindow()?.webContents.toggleDevTools()
          },
          { type: 'separator' },
          {
            label: '关于',
            click: () => this.showAboutDialog()
          },
          {
            label: '项目地址',
            click: () => shell.openExternal('https://github.com/likesrt/wxpusher-desktop')
          },
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  async clearAppCache() {
    const mainWindow = this.windowManager.getMainWindow();
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['确定', '取消'],
      defaultId: 1,
      title: '确认清除缓存',
      message: '确定要清除所有缓存数据吗？',
      detail: '这将清除登录状态等信息，应用将需要重新登录。'
    });

    if (choice.response === 0) {
      await mainWindow?.webContents.session.clearStorageData({
        storages: ['localStorage', 'cookies']
      });
      mainWindow?.reload();
    }
  }

  showAboutDialog() {
    const mainWindow = this.windowManager.getMainWindow();
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '关于',
      message: `${this.settingsManager.appConfig.APP_NAME} v${app.getVersion()}`,
      detail: '基于 Electron 的 WxPusher 微信推送客户端\n\n',
      buttons: ['确定']
    });
  }
}

module.exports = MenuManager;