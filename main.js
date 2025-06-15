const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

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

// =========== 主窗口创建 ===========
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'WxPusher 微信推送',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  // 捕获 window.open 并自定义新窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    createChildWindow(url);
    return { action: 'deny' }; // 阻止默认弹窗
  });

  mainWindow.on('close', (e) => {
    if (!allowQuit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// =========== 弹窗/二级页面 ===========
function createChildWindow(url) {
  const child = new BrowserWindow({
    parent: mainWindow,
    width: 800,
    height: 600,
    icon: ICON_PATH,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  child.setMenuBarVisibility(false);
  child.loadURL(url);
}

// =========== 托盘相关 ===========
function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_PATH));
  tray.setToolTip('WxPusher 微信推送');

  tray.on('double-click', showMainWindow);
  updateTrayMenu();
}

function updateTrayMenu() {
  const menu = Menu.buildFromTemplate([
    { label: '显示主界面', click: showMainWindow },
    { type: 'separator' },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: isAutoLaunch,
      click: (item) => {
        isAutoLaunch = item.checked;
        setAutoLaunch(isAutoLaunch);
        updateTrayMenu();
      }
    },
    {
      label: '声音提醒',
      type: 'checkbox',
      checked: isSoundEnabled,
      click: (item) => {
        isSoundEnabled = item.checked;
        mainWindow?.webContents.send('set-sound-enabled', isSoundEnabled);
        updateTrayMenu();
      }
    },
    {
      label: '桌面通知',
      type: 'checkbox',
      checked: isNotificationEnabled,
      click: (item) => {
        isNotificationEnabled = item.checked;
        mainWindow?.webContents.send('set-notification-enabled', isNotificationEnabled);
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: '退出', click: () => {
        allowQuit = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function setAutoLaunch(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: false
  });
}

// =========== 渲染进程通信 ===========
ipcMain.on('setting-changed', (event, { key, value }) => {
  if (key === 'soundEnabled') {
    isSoundEnabled = !!value;
    updateTrayMenu();
  }
  if (key === 'notificationEnabled') {
    isNotificationEnabled = !!value;
    updateTrayMenu();
  }
});

ipcMain.handle('get-settings', () => ({
  soundEnabled: isSoundEnabled,
  notificationEnabled: isNotificationEnabled
}));

// =========== 应用生命周期 ===========
app.whenReady().then(() => {
  isAutoLaunch = app.getLoginItemSettings().openAtLogin;
  createMainWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // 不退出，保持托盘驻留
});

app.on('activate', showMainWindow);

