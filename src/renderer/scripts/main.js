// WxPusher Desktop Application - 主入口文件

// 应用主控制器
class WxPusherApp {
    constructor() {
        this.config = window.WxPusherConfig;
        this.ui = window.UIManager;
        this.settings = window.SettingsManager;
        this.websocket = window.WebSocketManager;
        this.message = window.MessageManager;
        this.notification = window.NotificationManager;
        this.login = window.LoginManager;
        
        this.isElectron = !!window.electronAPI;
    }

    // 初始化应用
    async init() {
        // 初始化UI
        this.ui.init();
        
        // 初始化设置
        this.settings.init();
        
        // 初始化消息管理
        this.message.init();
        
        // 设置WebSocket事件回调
        this.setupWebSocketCallbacks();
        
        // 检查登录状态
        this.login.checkLoginStatus();
        
        // 请求通知权限
        await this.notification.requestNotificationPermission();
        
        // 同步Electron设置
        if (this.isElectron) {
            await this.settings.syncSettingsWithTray();
        }
        
        // 连接WebSocket
        this.websocket.connect();
        this.ui.showAlert('正在连接服务器...', 'warning');
        
        // 设置页面卸载事件
        this.setupUnloadHandler();
    }

    // 设置WebSocket回调
    setupWebSocketCallbacks() {
        this.websocket.setOnConnectionChange((connected) => {
            this.ui.updateConnectionStatus(connected);
        });
        
        this.websocket.setOnMessage((message) => {
            this.handleWebSocketMessage(message);
        });
    }

    // 处理WebSocket消息
    handleWebSocketMessage(message) {
        switch (message.msgType) {
            case this.config.WS_MSG_TYPE.INIT:
                this.login.handleInitMessage(message);
                break;
            case this.config.WS_MSG_TYPE.NOTIFICATION:
                this.message.addMessage(message.content, new Date(), message.qid);
                break;
            case this.config.WS_MSG_TYPE.UPDATE:
                // 可以在这里处理版本更新提示
                // this.ui.showAlert(`发现新版本：${message.version}，请升级！`, 'warning');
                break;
            case this.config.WS_MSG_TYPE.ERROR:
                this.ui.showAlert(`服务器错误：${message.content}`, 'danger');
                break;
        }
    }

    // 设置页面卸载处理
    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // 清理资源
    cleanup() {
        this.websocket.disconnect();
        this.login.cleanup();
    }
}

// 应用初始化
function initApp() {
    const app = new WxPusherApp();
    app.init().catch(error => {
        console.error('Failed to initialize app:', error);
    });
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);