// API配置
const API_CONFIG = {
    baseHost: "wxpusher.zjiecode.com",
    platform: "Chrome-Windows",
    version: "1.0.0"
};

const apiHost = `https://${API_CONFIG.baseHost}`;

// HTTP请求封装
async function httpRequest(method, url, data = null, headers = {}) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'platform': API_CONFIG.platform,
            'version': API_CONFIG.version,
            'deviceToken': utils.storage.get('deviceToken'),
            ...headers
        }
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const result = await response.json();
      
        if (result.code === 1000) {
            return { success: true, data: result.data };
        } else {
            return { success: false, code: result.code, message: result.msg };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// API调用
const api = {
    // 创建登录二维码
    async createLoginQrcode() {
        return await httpRequest('GET', `${apiHost}/api/device/create-login-qrcode`);
    },

    // 绑定推送Token
    async bindPushToken(code, pushToken, deviceName) {
        return await httpRequest('POST', `${apiHost}/api/device/register-device`, {
            code,
            pushToken,
            deviceName
        });
    },

    // 更新推送Token
    async updatePushToken(pushToken, deviceUuid) {
        return await httpRequest('POST', `${apiHost}/api/device/register-device`, {
            pushToken,
            deviceUuid
        });
    }
};

// 导出API
window.api = api;
window.API_CONFIG = API_CONFIG;
window.apiHost = apiHost;
