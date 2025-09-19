const { BrowserWindow, shell } = require('electron');
const path = require('path');

class WindowManager {
  constructor(appConfig) {
    this.mainWindow = null;
    this.allowQuit = false;
    this.appConfig = appConfig;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      title: this.appConfig.APP_NAME,
      icon: this.appConfig.ICON_PATH,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        spellcheck: false
      }
    });

    // 加载主页面
    this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    // 处理窗口关闭事件
    this.mainWindow.on('close', (e) => {
      if (!this.allowQuit) {
        e.preventDefault();
        this.mainWindow.hide();
      }
    });

    // 处理窗口最小化事件
    this.mainWindow.on('minimize', (e) => {
      if (process.platform === 'darwin') return;
      e.preventDefault();
      this.mainWindow.hide();
    });

    // 处理新窗口打开
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 开发环境下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    return this.mainWindow;
  }

  showMainWindow() {
    if (!this.mainWindow) {
      this.createMainWindow();
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  getMainWindow() {
    return this.mainWindow;
  }

  setAllowQuit(allow) {
    this.allowQuit = allow;
  }
}

module.exports = WindowManager;