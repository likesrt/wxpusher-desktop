// WxPusher 配置和常量
class WxPusherConfig {
    constructor() {
        this.WXPUSHER_CONFIG = {
            baseHost: "wxpusher.zjiecode.com",
            platform: "Chrome-Windows",
            version: "1.1.0"
        };

        this.apiHost = `https://${this.WXPUSHER_CONFIG.baseHost}`;
        this.wsHost = `wss://${this.WXPUSHER_CONFIG.baseHost}`;

        // 消息类型枚举
        this.WS_MSG_TYPE = {
            HEART_UP: 101,
            HEART: 201,
            INIT: 202,
            ERROR: 203,
            UPDATE: 204,
            NOTIFICATION: 20001
        };

        // 连接配置
        this.MAX_RECONNECT_ATTEMPTS = 5;
        this.HEART_TIME_SPACE = 26 * 1000;
    }
}

// 导出单例
window.WxPusherConfig = new WxPusherConfig();