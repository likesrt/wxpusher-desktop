// 设置管理
class SettingsManager {
    constructor() {
        this.storage = window.StorageManager;
        this.elements = window.ElementManager;
        this.isElectron = !!window.electronAPI;
    }

    // 初始化设置
    init() {
        // 自动写入默认值
        if (localStorage.getItem('wxpusher_notificationEnabled') === null) {
            localStorage.setItem('wxpusher_notificationEnabled', 'true');
        }
        if (localStorage.getItem('wxpusher_soundEnabled') === null) {
            localStorage.setItem('wxpusher_soundEnabled', 'true');
        }

        this.initSoundSetting();
        this.initNotificationSetting();
        this.setupElectronSync();
    }

    // 初始化声音设置
    initSoundSetting() {
        const soundEnabled = this.storage.getBool('soundEnabled', true);
        this.elements.soundToggle.checked = soundEnabled;
        
        this.elements.soundToggle.addEventListener('change', (e) => {
            this.storage.set('soundEnabled', e.target.checked);
            if (this.isElectron && window.electronAPI) {
                window.electronAPI.settingChanged('soundEnabled', e.target.checked);
            }
        });
    }

    // 初始化通知设置
    initNotificationSetting() {
        const notificationEnabled = this.storage.getBool('notificationEnabled', true);
        this.elements.notificationToggle.checked = notificationEnabled;
        
        this.elements.notificationToggle.addEventListener('change', (e) => {
            this.storage.set('notificationEnabled', e.target.checked);
            if (this.isElectron && window.electronAPI) {
                window.electronAPI.settingChanged('notificationEnabled', e.target.checked);
            }
            
            if (window.UIManager) {
                if (e.target.checked) {
                    window.UIManager.showAlert('桌面通知已开启', 'success');
                } else {
                    window.UIManager.showAlert('桌面通知已关闭', 'warning');
                }
            }
        });
    }

    // 设置Electron同步
    setupElectronSync() {
        if (!this.isElectron) return;

        // 监听来自主进程的设置变更
        if (window.electron && window.electron.receive) {
            window.electron.receive('toggle-sound', (enabled) => {
                this.elements.soundToggle.checked = enabled;
                this.storage.set('soundEnabled', enabled);
            });

            window.electron.receive('toggle-notification', (enabled) => {
                this.elements.notificationToggle.checked = enabled;
                this.storage.set('notificationEnabled', enabled);
            });
        }
    }

    // 同步托盘设置
    async syncSettingsWithTray() {
        if (!this.isElectron || !window.electronAPI) return;
        
        try {
            const settings = await window.electronAPI.getSettings();
            this.elements.soundToggle.checked = settings.soundEnabled;
            this.elements.notificationToggle.checked = settings.notificationEnabled;
        } catch (error) {
            console.error('Failed to sync settings:', error);
        }
    }

    // 获取设置值
    getSoundEnabled() {
        return this.storage.getBool('soundEnabled', true);
    }

    getNotificationEnabled() {
        return this.storage.getBool('notificationEnabled', true);
    }
}

// 导出单例
window.SettingsManager = new SettingsManager();