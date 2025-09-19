// 登录管理
class LoginManager {
    constructor() {
        this.api = window.ApiManager;
        this.storage = window.StorageManager;
        this.config = window.WxPusherConfig;
        this.ui = window.UIManager;
        
        this.bindPollInterval = null;
    }

    // 处理初始化消息
    async handleInitMessage(message) {
        const deviceUuid = this.storage.get('deviceUuid');
        
        try {
            let result;
            if (deviceUuid) {
                result = await this.api.updatePushToken(message.pushToken, deviceUuid);
            } else {
                this.showQrCodeLogin();
                return;
            }
            
            if (result.success) {
                this.storage.set('deviceUuid', result.data.deviceUuid);
                this.storage.set('deviceToken', result.data.deviceToken);
                this.ui.updateUserStatus(true);
                this.ui.showAlert('设备绑定成功！', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.ui.showAlert(`设备绑定失败：${error.message}`, 'danger');
            this.showQrCodeLogin();
        }
    }

    // 显示二维码登录
    async showQrCodeLogin() {
        try {
            const result = await this.api.createLoginQrcode();
            if (result.success) {
                const qrcodeUrl = `${this.config.apiHost}/api/qrcode/${result.data.code}.jpg`;
                this.ui.showQrCode(qrcodeUrl);
                this.clearBindPoll();
                this.pollBindStatus(result.data.code);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.ui.showAlert(`创建二维码失败：${error.message}`, 'danger');
        }
    }

    // 轮询绑定状态
    pollBindStatus(code) {
        let pollCount = 0;
        const maxPollCount = 100;
        
        this.bindPollInterval = setInterval(async () => {
            pollCount++;
            
            try {
                const pushToken = this.storage.get('pushToken');
                const deviceName = `${this.config.WXPUSHER_CONFIG.platform}-WebApp`;
                const result = await this.api.bindPushToken(code, pushToken, deviceName);
                
                if (result.success) {
                    this.clearBindPoll();
                    this.storage.set('deviceUuid', result.data.deviceUuid);
                    this.storage.set('deviceToken', result.data.deviceToken);
                    this.ui.updateUserStatus(true);
                    this.ui.hideQrCode();
                    this.ui.showAlert('微信绑定成功！', 'success');
                    return;
                } else if (result.code !== 10000) {
                    this.clearBindPoll();
                    this.ui.showAlert(`绑定失败：${result.message}`, 'danger');
                    return;
                }
                
                if (pollCount >= maxPollCount) {
                    this.clearBindPoll();
                    this.ui.showAlert('扫码超时，请刷新页面重试', 'warning');
                }
            } catch (error) {
                if (pollCount >= maxPollCount) {
                    this.clearBindPoll();
                    this.ui.showAlert('网络错误，请检查网络连接后重试', 'danger');
                }
            }
        }, 3000);
    }

    // 清除绑定轮询
    clearBindPoll() {
        if (this.bindPollInterval) {
            clearInterval(this.bindPollInterval);
            this.bindPollInterval = null;
        }
    }

    // 检查登录状态
    checkLoginStatus() {
        const deviceUuid = this.storage.get('deviceUuid');
        const deviceToken = this.storage.get('deviceToken');
        
        if (deviceUuid && deviceToken) {
            this.ui.updateUserStatus(true);
            return true;
        }
        return false;
    }

    // 清理资源
    cleanup() {
        this.clearBindPoll();
    }
}

// 导出单例
window.LoginManager = new LoginManager();