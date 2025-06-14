const { ipcRenderer } = require('electron');
window.ipcRenderer = ipcRenderer;


// 应用主逻辑
class WxPusherApp {
  constructor() {
    this.wsManager = new WebSocketManager();
    this.qrCodeManager = new QrCodeManager();
    // 将管理器暴露到全局，供其他模块使用
    window.qrCodeManager = this.qrCodeManager;
  }

  // 初始化应用
  init() {
    console.log('初始化WxPusher Desktop应用');

    // 初始化UI状态
    utils.updateConnectionStatus(false);
    utils.updateUserStatus(false);
    this.initSettings();

    // 检查已保存的用户状态
    const deviceUuid = utils.storage.get('deviceUuid');
    const deviceToken = utils.storage.get('deviceToken');
    if (deviceUuid && deviceToken) {
      utils.updateUserStatus(true);
    }

    // 建立WebSocket连接
    this.wsManager.connect();

    utils.showAlert('正在连接服务器...', 'warning');

    // 监听应用事件
    this.setupEventListeners();
  }

  // 初始化设置
  initSettings() {
    // 声音设置
    const soundEnabled = utils.storage.getBool('soundEnabled', true);
    document.getElementById('wxpusher_sound_toggle').checked = soundEnabled;

    // 后台保持连接设置
    const backgroundKeepAlive = utils.storage.getBool('backgroundKeepAlive', true);
    document.getElementById('wxpusher_background_toggle').checked = backgroundKeepAlive;

    // 通知设置
    const notificationEnabled = utils.storage.getBool('notificationEnabled', false);
    document.getElementById('wxpusher_notification_toggle').checked = notificationEnabled;

    // 开机启动设置
    this.initAutoStartSetting();
  }

  // 初始化开机启动设置
  initAutoStartSetting() {
    // 通过IPC获取当前开机启动状态
    ipcRenderer.invoke('get-auto-start').then(enabled => {
      document.getElementById('wxpusher_autostart_toggle').checked = enabled;
    });
  }

  // 设置事件监听
  setupEventListeners() {
    // 声音设置
    document.getElementById('wxpusher_sound_toggle').addEventListener('change', (e) => {
      utils.storage.set('soundEnabled', e.target.checked);
    });

    // 后台保持连接设置
    document.getElementById('wxpusher_background_toggle').addEventListener('change', (e) => {
      utils.storage.set('backgroundKeepAlive', e.target.checked);

      if (!e.target.checked) {
        utils.showAlert('关闭后台保持连接可能会影响消息接收', 'warning');
      }
    });

    // 通知设置
    document.getElementById('wxpusher_notification_toggle').addEventListener('change', (e) => {
      utils.storage.set('notificationEnabled', e.target.checked);

      if (e.target.checked) {
        // 请求通知权限
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            e.target.checked = false;
            utils.storage.set('notificationEnabled', false);
            utils.showAlert('通知权限被拒绝，请在系统设置中允许通知', 'warning');
          }
        });
      }
    });

    // 开机启动设置
    document.getElementById('wxpusher_autostart_toggle').addEventListener('change', (e) => {
      ipcRenderer.invoke('set-auto-start', e.target.checked).then(success => {
        if (!success) {
          e.target.checked = !e.target.checked;
          utils.showAlert('设置开机启动失败', 'error');
        }
      });
    });

    // 监听主进程事件
    ipcRenderer.on('window-state-changed', (event, isVisible) => {
      if (isVisible) {
        document.getElementById('wxpusher_page_status').textContent = '前台运行';
        document.getElementById('wxpusher_page_status').className = 'status-value status-success';
      } else {
        document.getElementById('wxpusher_page_status').textContent = '后台运行';
        document.getElementById('wxpusher_page_status').className = 'status-value status-warning';
      }
    });

    // 监听网络状态变化
    window.addEventListener('online', () => {
      utils.showAlert('网络已连接', 'success');
      if (!this.wsManager.socket || this.wsManager.socket.readyState !== WebSocket.OPEN) {
        this.wsManager.connect();
      }
    });

    window.addEventListener('offline', () => {
      utils.showAlert('网络已断开', 'warning');
    });
  }

  // 清理资源
  cleanup() {
    this.wsManager.disconnect();
    this.qrCodeManager.clearBindPoll();
  }
}

// 创建并初始化应用
const app = new WxPusherApp();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// 页面卸载前清理
window.addEventListener('beforeunload', () => {
  app.cleanup();
});
