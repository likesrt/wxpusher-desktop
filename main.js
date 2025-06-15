const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } = require('electron');
const path = require('path');

// =========== 全局变量 ===========
let mainWindow = null;
let tray = null;
let allowQuit = false;

// 状态变量
let isSoundEnabled = true;
let isNotificationEnabled = true;
let isAutoLaunch = false;

// 常量定义
const APP_NAME = 'WxPusher 微信推送';
const ICON_PATH = path.join(__dirname, 'wxpusher_32x32.ico');
const ICON_PATH_256 = path.join(__dirname, 'wxpusher_256x256.ico');

// =========== 窗口创建 ===========
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  // 加载主页面
  mainWindow.loadFile('index.html');

  // 处理窗口关闭事件
  mainWindow.on('close', (e) => {
    if (!allowQuit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // 处理窗口最小化事件
  mainWindow.on('minimize', (e) => {
    if (process.platform === 'darwin') return;
    e.preventDefault();
    mainWindow.hide();
  });

  // 处理新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// =========== 托盘创建 ===========
function createTray() {
  // 创建托盘图标
  const icon = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);

  // 托盘双击事件
  tray.on('double-click', showMainWindow);

  // 更新托盘菜单
  updateTrayMenu();
}

// =========== 菜单创建 ===========
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            allowQuit = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '设置',
      submenu: [
        {
          label: '开机启动',
          type: 'checkbox',
          checked: isAutoLaunch,
          click: (item) => setAutoLaunch(item.checked)
        },
        {
          label: '声音提醒',
          type: 'checkbox',
          checked: isSoundEnabled,
          click: (item) => {
            isSoundEnabled = item.checked;
            mainWindow?.webContents.send('toggle-sound', item.checked);
          }
        },
        {
          label: '桌面通知',
          type: 'checkbox',
          checked: isNotificationEnabled,
          click: (item) => {
            isNotificationEnabled = item.checked;
            mainWindow?.webContents.send('toggle-notification', item.checked);
          }
        },
        { type: 'separator' },
        {
          label: '清除缓存',
          click: clearAppCache
        }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
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
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        { type: 'separator' },
        {
          label: '关于',
          click: showAboutDialog
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// =========== 托盘菜单更新 ===========
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: showMainWindow
    },
    { type: 'separator' },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: isAutoLaunch,
      click: (item) => setAutoLaunch(item.checked)
    },
    {
      label: '声音提醒',
      type: 'checkbox',
      checked: isSoundEnabled,
      click: (item) => {
        isSoundEnabled = item.checked;
        mainWindow?.webContents.send('toggle-sound', item.checked);
      }
    },
    {
      label: '桌面通知',
      type: 'checkbox',
      checked: isNotificationEnabled,
      click: (item) => {
        isNotificationEnabled = item.checked;
        mainWindow?.webContents.send('toggle-notification', item.checked);
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        allowQuit = true;
        app.quit();
      }
    }
  ]);

  tray?.setContextMenu(contextMenu);
}

// =========== 功能函数 ===========
function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setAutoLaunch(enable) {
  isAutoLaunch = enable;
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    path: app.getPath('exe')
  });
  updateTrayMenu();
}

async function clearAppCache() {
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

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于',
    message: `${APP_NAME} v${app.getVersion()}`,
    detail: '基于 Electron 的 WxPusher 微信推送客户端\n\n' +
      '© 2024 WxPusher. All rights reserved.',
    buttons: ['确定']
  });
}

// =========== IPC 通信 ===========
ipcMain.on('setting-changed', (event, { key, value }) => {
  switch (key) {
    case 'soundEnabled':
      isSoundEnabled = value;
      break;
    case 'notificationEnabled':
      isNotificationEnabled = value;
      break;
  }
  updateTrayMenu();
});

// =========== 应用生命周期 ===========
// 单例应用检查
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // 处理第二个实例
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 应用就绪
  app.whenReady().then(() => {
    // 读取开机启动设置
    isAutoLaunch = app.getLoginItemSettings().openAtLogin;
    
    // 创建窗口和托盘
    createMainWindow();
    createTray();
    createMenu();

    // macOS 激活处理
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });

    // 首次启动时如果是开机启动，则隐藏窗口
    if (process.argv.includes('--hidden')) {
      mainWindow?.hide();
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
  allowQuit = true;
});

// =========== 错误处理 ===========
// 开发环境下的错误处理
if (process.env.NODE_ENV === 'development') {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
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
