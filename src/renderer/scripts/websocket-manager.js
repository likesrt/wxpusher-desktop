// WebSocket 连接管理
class WebSocketManager {
    constructor() {
        this.config = window.WxPusherConfig;
        this.storage = window.StorageManager;
        
        this.socket = null;
        this.heartInterval = null;
        this.lastServerHeart = 0;
        this.reconnectAttempts = 0;
        this.isPageVisible = true;
        this.backgroundKeepAlive = true;
        
        // 事件回调
        this.onConnectionChange = null;
        this.onMessage = null;
        
        this.setupVisibilityListener();
    }

    // 连接WebSocket
    connect() {
        if (!this.isPageVisible && !this.backgroundKeepAlive) return;
        
        const pushToken = this.storage.get('pushToken');
        let wsUrl = `${this.config.wsHost}/ws?version=${this.config.WXPUSHER_CONFIG.version}&platform=${this.config.WXPUSHER_CONFIG.platform}`;
        if (pushToken) wsUrl += `&pushToken=${pushToken}`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            this.updateConnectionStatus(true);
            this.startHeartbeat();
        };
        
        this.socket.onclose = () => {
            this.updateConnectionStatus(false);
            this.stopHeartbeat();
            this.handleReconnect();
        };
        
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.socket.onerror = () => {
            this.updateConnectionStatus(false);
        };
    }

    // 处理消息
    handleMessage(message) {
        switch (message.msgType) {
            case this.config.WS_MSG_TYPE.HEART:
                this.lastServerHeart = Date.now();
                break;
            case this.config.WS_MSG_TYPE.INIT:
                this.storage.set('pushToken', message.pushToken);
                break;
            case this.config.WS_MSG_TYPE.NOTIFICATION:
            case this.config.WS_MSG_TYPE.ERROR:
            case this.config.WS_MSG_TYPE.UPDATE:
                if (this.onMessage) {
                    this.onMessage(message);
                }
                break;
        }
    }

    // 开始心跳
    startHeartbeat() {
        if (this.heartInterval) return;
        
        this.heartInterval = setInterval(() => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                this.updateConnectionStatus(false);
                return;
            }
            
            if (!this.isPageVisible && !this.backgroundKeepAlive) return;
            
            const heartTimeout = this.isPageVisible ? 
                this.config.HEART_TIME_SPACE + 10000 : 
                this.config.HEART_TIME_SPACE + 30000;
                
            if (Date.now() - this.lastServerHeart > heartTimeout) {
                this.updateConnectionStatus(false);
                this.socket.close();
                return;
            }
            
            const heartbeat = { msgType: this.config.WS_MSG_TYPE.HEART_UP };
            this.socket.send(JSON.stringify(heartbeat));
        }, this.config.HEART_TIME_SPACE);
    }

    // 停止心跳
    stopHeartbeat() {
        if (this.heartInterval) {
            clearInterval(this.heartInterval);
            this.heartInterval = null;
        }
    }

    // 处理重连
    handleReconnect() {
        if (!this.isPageVisible && !this.backgroundKeepAlive) return;
        
        if (this.reconnectAttempts >= this.config.MAX_RECONNECT_ATTEMPTS) {
            if (window.UIManager) {
                window.UIManager.showAlert('连接失败，已停止自动重连。请检查网络后刷新页面。', 'danger');
            }
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        setTimeout(() => {
            if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
                this.connect();
            }
        }, delay);
    }

    // 更新连接状态
    updateConnectionStatus(connected) {
        if (connected) {
            this.reconnectAttempts = 0;
        }
        
        if (this.onConnectionChange) {
            this.onConnectionChange(connected);
        }
    }

    // 设置页面可见性监听
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isPageVisible = false;
            } else {
                this.isPageVisible = true;
                if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                    this.connect();
                }
            }
        });
    }

    // 断开连接
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.stopHeartbeat();
    }

    // 设置事件回调
    setOnConnectionChange(callback) {
        this.onConnectionChange = callback;
    }

    setOnMessage(callback) {
        this.onMessage = callback;
    }
}

// 导出单例
window.WebSocketManager = new WebSocketManager();