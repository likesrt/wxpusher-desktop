const { app, BrowserWindow } = require('electron');

// 导入模块
const AppConfig = require('../utils/app-config');
const WindowManager = require('./window-manager');
const TrayManager = require('./tray-manager');
const MenuManager = require('./menu-manager');
const SettingsManager = require('./settings-manager');
const IpcHandler = require('./ipc-handler');

// =========== 全局变量 ===========
let appConfig;
let windowManager;
let trayManager;
let menuManager;
let settingsManager;
let ipcHandler;

// 设置应用 ID
app.setAppUserModelId('WxPusher-Desktop');

// =========== 应用生命周期 ===========
// 单例应用检查
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // 处理第二个实例
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const mainWindow = windowManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 应用就绪
  app.whenReady().then(() => {
    // 初始化配置和管理器
    appConfig = new AppConfig();
    settingsManager = new SettingsManager(appConfig);
    windowManager = new WindowManager(appConfig);
    trayManager = new TrayManager(appConfig, windowManager, settingsManager);
    menuManager = new MenuManager(windowManager, settingsManager);
    ipcHandler = new IpcHandler(settingsManager, trayManager);

    // 初始化设置
    settingsManager.init();
    
    // 创建窗口、托盘和菜单
    windowManager.createMainWindow();
    trayManager.createTray();
    menuManager.createMenu();

    // macOS 激活处理
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });

    // 首次启动时如果是开机启动，则隐藏窗口
    if (process.argv.includes('--hidden')) {
      windowManager.getMainWindow()?.hide();
    }
  });
}

// 所有窗口关闭时的处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前的清理
app.on('before-quit', () => {
  windowManager?.setAllowQuit(true);
});

// =========== 错误处理 ===========
// 开发环境下的错误处理
if (process.env.NODE_ENV === 'development') {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      '错误',
      `发生未捕获的错误:\n${error.message}\n\n${error.stack}`
    );
  });
}

// 生产环境下的错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});