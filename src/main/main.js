const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

let mainWindow;
let tray;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/wxpusher.ico')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 处理窗口关闭事件
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 开发时打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// 创建系统托盘
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/wxpusher.ico'));
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => mainWindow.show()
    },
    { type: 'separator' },
    {
      label: '设置',
      submenu: [
        {
          label: '开机启动',
          type: 'checkbox',
          checked: app.getLoginItemSettings().openAtLogin,
          click: (item) => {
            app.setLoginItemSettings({ openAtLogin: item.checked });
            store.set('autoStart', item.checked);
          }
        },
        {
          label: '后台运行',
          type: 'checkbox',
          checked: store.get('backgroundRun', true),
          click: (item) => {
            store.set('backgroundRun', item.checked);
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('WxPusher Desktop');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// 显示系统通知
function showNotification(title, body) {
  if (!mainWindow.isVisible()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../assets/wxpusher.ico')
    });
    notification.show();
    
    notification.on('click', () => {
      mainWindow.show();
    });
  }
}

// 应用初始化
app.whenReady().then(() => {
  createWindow();
  createTray();

  // 注册IPC通信事件
  ipcMain.on('show-notification', (event, { title, body }) => {
    showNotification(title, body);
  });
});

// 处理窗口激活
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
