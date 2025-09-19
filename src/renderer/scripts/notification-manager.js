// 通知管理
class NotificationManager {
    constructor() {
        this.settings = window.SettingsManager;
        this.elements = window.ElementManager;
        this.isPageVisible = true;
        
        this.setupVisibilityListener();
    }

    // 播放通知声音
    playNotificationSound() {
        if (!this.settings.getSoundEnabled()) return;
        
        try {
            this.elements.notificationSound.currentTime = 0;
            this.elements.notificationSound.play().catch(() => {
                // 静默处理播放失败
            });
        } catch (error) {
            // 静默处理异常
        }
    }

    // 显示桌面通知
    showDesktopNotification(title, options = {}, qid = null) {
        if (!this.settings.getNotificationEnabled()) return;
        if (this.isPageVisible) return; // 页面可见时不显示桌面通知
        
        try {
            const notification = new Notification(title, {
                icon: '../assets/icons/wxpusher_32x32.ico',
                badge: '../assets/icons/wxpusher_32x32.ico',
                appName: 'WxPusher',
                ...options
            });
            
            notification.onclick = function () {
                if (qid) {
                    window.open(`https://wxpusher.zjiecode.com/api/message/${qid}`, '_blank');
                } else {
                    window.focus();
                }
                this.close();
            };
            
            // 5秒后自动关闭
            setTimeout(() => notification.close(), 5000);
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    // 处理新消息通知
    handleNewMessage(content, qid = null) {
        // 播放声音
        this.playNotificationSound();
        
        // 显示桌面通知
        this.showDesktopNotification('WxPusher 新消息', {
            body: content.length > 50 ? content.substring(0, 50) + '...' : content,
            tag: 'wxpusher-message',
            requireInteraction: false
        }, qid);
    }

    // 设置页面可见性监听
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
        });
    }

    // 请求通知权限
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                return false;
            }
        }
        return Notification.permission === 'granted';
    }
}

// 导出单例
window.NotificationManager = new NotificationManager();