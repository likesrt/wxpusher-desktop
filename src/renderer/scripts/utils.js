const { shell, ipcRenderer } = require('electron');
const Store = require('electron-store');

// 初始化存储
const store = new Store();

// 工具函数
const utils = {
    // 本地存储操作
    storage: {
        set(key, value) {
            store.set(`wxpusher_${key}`, value);
        },
        get(key, defaultValue = '') {
            return store.get(`wxpusher_${key}`, defaultValue);
        },
        getBool(key, defaultValue = false) {
            return store.get(`wxpusher_${key}`, defaultValue);
        }
    },

    // 显示提示信息
    showAlert(message, type = 'danger') {
        const alertElement = document.getElementById('wxpusher_alert');
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        alertElement.style.display = 'block';

        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    },

    // 更新连接状态
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('wxpusher_ws_status');
        if (connected) {
            statusElement.textContent = '已连接';
            statusElement.className = 'status-value status-success';
        } else {
            statusElement.textContent = '未连接';
            statusElement.className = 'status-value status-error';
        }
    },

    // 更新用户状态
    updateUserStatus(loggedIn) {
        const statusElement = document.getElementById('wxpusher_user_status');
        const qrcodeSection = document.getElementById('wxpusher_qrcode_section');
        
        if (loggedIn) {
            statusElement.textContent = '已登录';
            statusElement.className = 'status-value status-success';
            qrcodeSection.classList.remove('show');
        } else {
            statusElement.textContent = '未登录';
            statusElement.className = 'status-value status-error';
        }
    },

    // 播放通知声音
    playNotificationSound() {
        if (!this.storage.getBool('soundEnabled', true)) return;
        
        try {
            const audio = document.getElementById('wxpusher_notification_sound');
            audio.currentTime = 0;
            audio.play().catch(err => {
                console.log('音频播放失败:', err);
            });
        } catch (error) {
            console.log('音频播放错误:', error);
        }
    },

    // 显示桌面通知
    showDesktopNotification(title, body) {
        if (!this.storage.getBool('notificationEnabled', false)) return;
        
        ipcRenderer.send('show-notification', { title, body });
    },

    // 添加消息到列表
    addMessage(content, time = new Date()) {
        const messageList = document.getElementById('wxpusher_message_list');
        
        // 清除占位符
        if (messageList.children.length === 1 && 
            messageList.children[0].textContent.includes('等待消息推送')) {
            messageList.innerHTML = '';
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message-item';
        messageElement.innerHTML = `
            <div class="message-time">${time.toLocaleString()}</div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;

        messageList.insertBefore(messageElement, messageList.firstChild);

        // 限制消息数量
        if (messageList.children.length > 50) {
            messageList.removeChild(messageList.lastChild);
        }

        // 播放提示音
        this.playNotificationSound();

        // 显示桌面通知
        this.showDesktopNotification('WxPusher 新消息', 
            content.length > 50 ? content.substring(0, 50) + '...' : content);
    },

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// 打开外部链接
function openExternal(url) {
    shell.openExternal(url);
}

// 导出工具函数
window.utils = utils;
