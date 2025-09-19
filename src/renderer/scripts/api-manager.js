// WxPusher API 管理
class ApiManager {
    constructor() {
        this.config = window.WxPusherConfig;
        this.storage = window.StorageManager;
    }

    // HTTP请求封装
    async httpRequest(method, url, data = null, headers = {}) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'platform': this.config.WXPUSHER_CONFIG.platform,
                'version': this.config.WXPUSHER_CONFIG.version,
                'deviceToken': this.storage.get('deviceToken'),
                ...headers
            }
        };
        if (data) config.body = JSON.stringify(data);
        
        try {
            const response = await fetch(url, config);
            const result = await response.json();
            if (result.code === 1000) return { success: true, data: result.data };
            else return { success: false, code: result.code, message: result.msg };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // 创建登录二维码
    async createLoginQrcode() {
        return await this.httpRequest('GET', `${this.config.apiHost}/api/device/create-login-qrcode`);
    }

    // 绑定推送令牌
    async bindPushToken(code, pushToken, deviceName) {
        return await this.httpRequest('POST', `${this.config.apiHost}/api/device/register-device`, {
            code, pushToken, deviceName
        });
    }

    // 更新推送令牌
    async updatePushToken(pushToken, deviceUuid) {
        return await this.httpRequest('POST', `${this.config.apiHost}/api/device/register-device`, {
            pushToken, deviceUuid
        });
    }

    // 获取历史消息
    async getHistoryMessages(lastMessageId = 0) {
        const headers = new Headers();
        headers.append('User-Agent', 'Mozilla/5.0 (Linux; Android 10; Mi 10 Pro Build/QP1A.191105.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36');
        headers.append('sec-ch-ua', '"Chromium";v="128", "Not;A=Brand";v="24", "Android WebView";v="128"');
        headers.append('deviceToken', this.storage.get('deviceToken'));
        headers.append('Content-Type', 'application/json;charset=utf-8');
        
        try {
            const url = `${this.config.apiHost}/api/need-login/device/message-list?lastMessageId=${lastMessageId}`;
            const res = await fetch(url, { method: 'GET', headers });
            const result = await res.json();
            if (result.code === 1000) return { success: true, data: result.data };
            else return { success: false, message: result.msg };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// 导出单例
window.ApiManager = new ApiManager();