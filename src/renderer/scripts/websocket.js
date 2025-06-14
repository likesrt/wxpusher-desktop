// WebSocket管理
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.heartInterval = null;
        this.lastServerHeart = 0;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartTimeSpace = 26 * 1000;
        this.wsHost = `wss://${API_CONFIG.baseHost}`;
        
        // 消息类型枚举
        this.MSG_TYPE = {
            HEART_UP: 101,
            HEART: 201,
            INIT: 202,
            ERROR: 203,
            UPDATE: 204,
            NOTIFICATION: 20001
        };
    }

    // 连接WebSocket
    connect() {
        const pushToken = utils.storage.get('pushToken');
        let wsUrl = `${this.wsHost}/ws?version=${API_CONFIG.version}&platform=${API_CONFIG.platform}`;
      
        if (pushToken) {
            wsUrl += `&pushToken=${pushToken}`;
        }

        console.log('连接WebSocket:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('WebSocket已连接');
            utils.updateConnectionStatus(true);
            this.startHeartbeat();
            this.reconnectAttempts = 0;
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket已断开, 原因:', event.reason, '代码:', event.code);
            utils.updateConnectionStatus(false);
            this.stopHeartbeat();
            this.handleReconnect();
        };

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket错误:', error);
            utils.updateConnectionStatus(false);
        };
    }

    // 处理重连
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('重连次数已达上限，停止重连');
            utils.showAlert('连接失败，已停止自动重连。请检查网络后重启应用。', 'danger');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
        console.log(`${delay/1000}秒后进行第${this.reconnectAttempts}次重连...`);
      
        setTimeout(() => {
            if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
                this.connect();
            }
        }, delay);
    }

    // 处理WebSocket消息
    handleMessage(message) {
        console.log('收到消息:', message);

        switch (message.msgType) {
            case this.MSG_TYPE.HEART:
                this.lastServerHeart = Date.now();
                console.log('收到心跳响应');
                break;

            case this.MSG_TYPE.INIT:
                console.log('收到初始化消息');
                utils.storage.set('pushToken', message.pushToken);
                this.handleInitMessage(message);
                break;

            case this.MSG_TYPE.NOTIFICATION:
                console.log('收到推送通知');
                utils.addMessage(message.content);
                break;

            case this.MSG_TYPE.UPDATE:
                utils.showAlert(`发现新版本：${message.version}，请升级！`, 'warning');
                break;

            case this.MSG_TYPE.ERROR:
                utils.showAlert(`服务器错误：${message.content}`, 'danger');
                break;
        }
    }

    // 处理初始化消息
    async handleInitMessage(message) {
        const deviceUuid = utils.storage.get('deviceUuid');
      
        try {
            let result;
            if (deviceUuid) {
                result = await api.updatePushToken(message.pushToken, deviceUuid);
            } else {
                window.qrCodeManager.showQrCodeLogin();
                return;
            }

            if (result.success) {
                utils.storage.set('deviceUuid', result.data.deviceUuid);
                utils.storage.set('deviceToken', result.data.deviceToken);
                utils.updateUserStatus(true);
                utils.showAlert('设备绑定成功！', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            utils.showAlert(`设备绑定失败：${error.message}`, 'danger');
            window.qrCodeManager.showQrCodeLogin();
        }
    }

    // 开始心跳
    startHeartbeat() {
        if (this.heartInterval) return;

        this.heartInterval = setInterval(() => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                utils.updateConnectionStatus(false);
                return;
            }

            // 检查心跳超时
            if (Date.now() - this.lastServerHeart > this.heartTimeSpace + 10000) {
                console.log('心跳超时，连接异常');
                utils.updateConnectionStatus(false);
                this.socket.close();
                return;
            }

            // 发送心跳
            const heartbeat = { msgType: this.MSG_TYPE.HEART_UP };
            this.socket.send(JSON.stringify(heartbeat));
            console.log('发送心跳');
        }, this.heartTimeSpace);
    }

    // 停止心跳
    stopHeartbeat() {
        if (this.heartInterval) {
            clearInterval(this.heartInterval);
            this.heartInterval = null;
        }
    }

    // 断开连接
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

// 二维码管理
class QrCodeManager {
    constructor() {
        this.bindPollInterval = null;
    }

    // 显示二维码登录
    async showQrCodeLogin() {
        try {
            const result = await api.createLoginQrcode();
            if (result.success) {
                const qrcodeUrl = `${apiHost}/api/qrcode/${result.data.code}.jpg`;
                document.getElementById('wxpusher_qrcode').src = qrcodeUrl;
                document.getElementById('wxpusher_qrcode_section').classList.add('show');
              
                this.clearBindPoll();
                this.pollBindStatus(result.data.code);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            utils.showAlert(`创建二维码失败：${error.message}`, 'danger');
        }
    }

    // 轮询绑定状态
    pollBindStatus(code) {
        let pollCount = 0;
        const maxPollCount = 100;
      
        this.bindPollInterval = setInterval(async () => {
            pollCount++;
          
            try {
                const pushToken = utils.storage.get('pushToken');
                const deviceName = `${API_CONFIG.platform}-Desktop`;
              
                console.log(`第${pollCount}次轮询绑定状态...`);
                const result = await api.bindPushToken(code, pushToken, deviceName);
              
                if (result.success) {
                    console.log('绑定成功，清理轮询定时器');
                    this.clearBindPoll();
                  
                    utils.storage.set('deviceUuid', result.data.deviceUuid);
                    utils.storage.set('deviceToken', result.data.deviceToken);
                    utils.updateUserStatus(true);
                    document.getElementById('wxpusher_qrcode_section').classList.remove('show');
                    utils.showAlert('微信绑定成功！', 'success');
                  
                    return;
                } else if (result.code !== 10000) {
                    console.log(`绑定失败，代码: ${result.code}，消息: ${result.message}`);
                    this.clearBindPoll();
                    utils.showAlert(`绑定失败：${result.message}`, 'danger');
                    return;
                }
              
                if (pollCount >= maxPollCount) {
                    console.log('轮询次数已达上限，停止轮询');
                    this.clearBindPoll();
                    utils.showAlert('扫码超时，请重新尝试', 'warning');
                }
              
            } catch (error) {
                console.error('轮询绑定状态错误:', error);
                if (pollCount >= maxPollCount) {
                    this.clearBindPoll();
                    utils.showAlert('网络错误，请检查网络连接后重试', 'danger');
                }
            }
        }, 3000);
    }

    // 清理绑定轮询
    clearBindPoll() {
        if (this.bindPollInterval) {
            console.log('清理绑定轮询定时器');
            clearInterval(this.bindPollInterval);
            this.bindPollInterval = null;
        }
    }
}

// 导出管理器
window.WebSocketManager = WebSocketManager;
window.QrCodeManager = QrCodeManager;
