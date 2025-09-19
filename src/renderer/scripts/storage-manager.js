// 本地存储管理
class StorageManager {
    constructor() {
        this.prefix = 'wxpusher_';
    }

    set(key, value) {
        localStorage.setItem(`${this.prefix}${key}`, value);
    }

    get(key, defaultValue = '') {
        return localStorage.getItem(`${this.prefix}${key}`) || defaultValue;
    }

    getBool(key, defaultValue = false) {
        const value = localStorage.getItem(`${this.prefix}${key}`);
        return value !== null ? value === 'true' : defaultValue;
    }

    remove(key) {
        localStorage.removeItem(`${this.prefix}${key}`);
    }

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
}

// 导出单例
window.StorageManager = new StorageManager();