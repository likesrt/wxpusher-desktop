// DOM元素管理
class ElementManager {
    constructor() {
        this.alert = document.getElementById('wxpusher_alert');
        this.wsStatus = document.getElementById('wxpusher_ws_status');
        this.userStatus = document.getElementById('wxpusher_user_status');
        this.qrcodeSection = document.getElementById('wxpusher_qrcode_section');
        this.qrcode = document.getElementById('wxpusher_qrcode');
        this.messageList = document.getElementById('wxpusher_message_list');
        this.historyMessageList = document.getElementById('wxpusher_history_message_list');
        this.soundToggle = document.getElementById('wxpusher_sound_toggle');
        this.notificationToggle = document.getElementById('wxpusher_notification_toggle');
        this.notificationSound = document.getElementById('wxpusher_notification_sound');
        this.tabSettings = document.getElementById('tab_settings');
        this.tabMessages = document.getElementById('tab_messages');
        this.tabSettingsBtn = document.getElementById('tab_settings_btn');
        this.tabMessagesBtn = document.getElementById('tab_messages_btn');
        this.loadMoreBtn = document.getElementById('wxpusher_load_more_btn');
    }
}

// UI管理
class UIManager {
    constructor() {
        this.elements = new ElementManager();
        window.ElementManager = this.elements; // 全局暴露元素管理器
    }

    // 显示警告信息
    showAlert(message, type = 'danger') {
        this.elements.alert.className = `alert alert-${type}`;
        this.elements.alert.textContent = message;
        this.elements.alert.style.display = 'block';
        
        // 3秒后自动隐藏成功和警告消息
        if (type === 'success' || type === 'warning') {
            setTimeout(() => {
                this.elements.alert.style.display = 'none';
            }, 3000);
        }
    }

    // 更新连接状态
    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.wsStatus.textContent = '已连接';
            this.elements.wsStatus.className = 'status-value status-success';
        } else {
            this.elements.wsStatus.textContent = '未连接';
            this.elements.wsStatus.className = 'status-value status-error';
        }
    }

    // 更新用户状态
    updateUserStatus(loggedIn) {
        if (loggedIn) {
            this.elements.userStatus.textContent = '已登录';
            this.elements.userStatus.className = 'status-value status-success';
            this.elements.qrcodeSection.classList.remove('show');
        } else {
            this.elements.userStatus.textContent = '未登录';
            this.elements.userStatus.className = 'status-value status-error';
        }
    }

    // 显示二维码
    showQrCode(qrcodeUrl) {
        this.elements.qrcode.src = qrcodeUrl;
        this.elements.qrcodeSection.classList.add('show');
    }

    // 隐藏二维码
    hideQrCode() {
        this.elements.qrcodeSection.classList.remove('show');
    }

    // 设置标签页
    setupTabs() {
        this.elements.tabSettingsBtn.addEventListener('click', () => {
            this.switchToTab('settings');
        });
        
        this.elements.tabMessagesBtn.addEventListener('click', () => {
            this.switchToTab('messages');
            // 首次切换到消息页面时加载历史消息
            if (this.elements.historyMessageList.innerHTML.trim().length === 0 ||
                this.elements.historyMessageList.innerHTML.includes('加载中')) {
                if (window.MessageManager) {
                    window.MessageManager.loadHistoryMessages(true);
                }
            }
        });
    }

    // 切换标签页
    switchToTab(tab) {
        if (tab === 'settings') {
            this.elements.tabSettingsBtn.classList.add('active');
            this.elements.tabMessagesBtn.classList.remove('active');
            this.elements.tabSettings.classList.add('active');
            this.elements.tabMessages.classList.remove('active');
        } else if (tab === 'messages') {
            this.elements.tabMessagesBtn.classList.add('active');
            this.elements.tabSettingsBtn.classList.remove('active');
            this.elements.tabMessages.classList.add('active');
            this.elements.tabSettings.classList.remove('active');
        }
    }

    // 初始化UI
    init() {
        this.updateConnectionStatus(false);
        this.updateUserStatus(false);
        this.setupTabs();
    }
}

// 导出单例
window.UIManager = new UIManager();