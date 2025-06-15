const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const pkg = require('./package.json');

// 全局变量
let mainWindow = null;
let tray = null;
let allowQuit = false;

// 状态变量
let isSoundEnabled = true;
let isNotificationEnabled = true;
let isAutoLaunch = false;

// 图标路径
const ICON_PATH = path.join(__dirname, 'wxpusher_32x32.ico');

// =========== 应用菜单创建 ===========
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
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => {
            setAutoLaunch(item.checked);
          }
        },
        {
          label: '声音提醒',
          type: 'checkbox',
          checked: true,
          click: (item) => {
            isSoundEnabled = item.checked;
            mainWindow?.webContents.send('toggle-sound', item.checked);
          }
        },
        {
          label: '桌面通知',
          type: 'checkbox',
          checked: true,
          click: (item) => {
            isNotificationEnabled = item.checked;
            mainWindow?.webContents.send('toggle-notification', item.checked);
          }
        },
        { type: 'separator' },
        {
          label: '清除缓存',
          click: async () => {
            const choice = await dialog.showMessageBox(mainWindow, {
              type: 'question',
              buttons: ['确定', '取消'],
              title: '确认',
              message: '确定要清除所有缓存数据吗？这将清除登录状态等信息。'
            });
            if (choice.response === 0) {
              mainWindow?.webContents.session.clearStorageData();
              mainWindow?.reload();
            }
          }
        }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: 'wxpusher官方网站',
          click: () => {
            shell.openExternal('https://wxpusher.zjiecode.com');
          }
        },
        {
          label: 'wxpusher使用文档',
          click: () => {
            shell.openExternal('https://wxpusher.zjiecode.com/docs/');
          }
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
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: `${app.getName()} v${app.getVersion()}`,
              detail: '基于 Electron 的 WxPusher 微信推送桌面客户端\n\n作者:yuyan \n'
            });
          }
        },
        {
          label: '作者',
          click: () => {
            shell.openExternal('https://blog.likesrt.com/archives');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// =========== 主窗口创建 ===========
function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'WxPusher 微信推送',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false
    }
  });

  // 加载页面
  mainWindow.loadFile('index.html');
  
  // 创建菜单
  createMenu();

  // 处理窗口关闭事件
  mainWindow.on('close', (e) => {
    if (!allowQuit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // 处理窗口最小化事件
  mainWindow.on('minimize', (e) => {
    if (process.platform === 'darwin') return; // macOS 不处理
    e.preventDefault();
    mainWindow.hide();
  });

  // 处理新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// =========== 托盘相关 ===========
function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_PATH));
  tray.setToolTip('WxPusher 微信推送');

  tray.on('double-click', showMainWindow);
  updateTrayMenu();
}

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
      click: (item) => {
        setAutoLaunch(item.checked);
      }
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

  tray.setContextMenu(contextMenu);
}

// =========== 工具函数 ===========
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
    openAsHidden: true
  });
  updateTrayMenu();
}

// =========== IPC 通信 ===========
ipcMain.on('login-success', () => {
  mainWindow?.reload();
});

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
app.whenReady().then(() => {
  // 读取开机启动设置
  isAutoLaunch = app.getLoginItemSettings().openAtLogin;
  
  // 创建窗口和托盘
  createMainWindow();
  createTray();
  
  // macOS 激活时重建窗口
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

// 防止多开
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

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
