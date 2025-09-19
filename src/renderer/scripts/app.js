// WxPusher Desktop Application JavaScript

// ---- Electron 通信 ----
const isElectron = !!window.electronAPI;

async function syncSettingsWithTray() {
    if (!isElectron) return;
    const settings = await window.electronAPI.getSettings();
    elements.soundToggle.checked = settings.soundEnabled;
    elements.notificationToggle.checked = settings.notificationEnabled;
}

if (isElectron) {
    // 从托盘菜单同步到界面
    window.electronAPI.onSetSoundEnabled((val) => {
        elements.soundToggle.checked = val;
        storage.set('soundEnabled', val);
    });
    window.electronAPI.onSetNotificationEnabled((val) => {
        elements.notificationToggle.checked = val;
        storage.set('notificationEnabled', val);
    });
}

// WxPusher Electron版本配置
const WXPUSHER_CONFIG = {
    baseHost: "wxpusher.zjiecode.com",
    platform: "Chrome-Windows",
    version: "1.1.0"
};

const apiHost = `https://${WXPUSHER_CONFIG.baseHost}`;
const wsHost = `wss://${WXPUSHER_CONFIG.baseHost}`;

// 消息类型枚举
const WS_MSG_TYPE = {
    HEART_UP: 101,
    HEART: 201,
    INIT: 202,
    ERROR: 203,
    UPDATE: 204,
    NOTIFICATION: 20001
};

let socket = null;
let heartInterval = null;
let lastServerHeart = 0;
let bindPollInterval = null;
let isPageVisible = true;
let backgroundKeepAlive = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEART_TIME_SPACE = 26 * 1000;
let historyLastMessageId = 0;
let historyLoading = false;
let historyEnd = false;

const elements = {
    alert: document.getElementById('wxpusher_alert'),
    wsStatus: document.getElementById('wxpusher_ws_status'),
    userStatus: document.getElementById('wxpusher_user_status'),
    qrcodeSection: document.getElementById('wxpusher_qrcode_section'),
    qrcode: document.getElementById('wxpusher_qrcode'),
    messageList: document.getElementById('wxpusher_message_list'),
    historyMessageList: document.getElementById('wxpusher_history_message_list'),
    soundToggle: document.getElementById('wxpusher_sound_toggle'),
    notificationToggle: document.getElementById('wxpusher_notification_toggle'),
    notificationSound: document.getElementById('wxpusher_notification_sound'),
    tabSettings: document.getElementById('tab_settings'),
    tabMessages: document.getElementById('tab_messages'),
    tabSettingsBtn: document.getElementById('tab_settings_btn'),
    tabMessagesBtn: document.getElementById('tab_messages_btn'),
    loadMoreBtn: document.getElementById('wxpusher_load_more_btn')
};

// 通知对象（Electron下直接允许）
const notification = {
    show(title, options = {}, qid = null) {
        const n = new Notification(title, {
                icon: 'src/assets/icons/wxpusher_32x32.ico',
                badge: 'src/assets/icons/wxpusher_32x32.ico',
                appName: 'WxPusher', // 设置应用名称
                ...options
            });
        n.onclick = function () {
            if (qid) {
                window.open(`https://wxpusher.zjiecode.com/api/message/${qid}`, '_blank');
            } else {
                window.focus();
            }
            this.close();
        };
        setTimeout(() => n.close(), 5000);
    }
};

// 本地存储
const storage = {
    set(key, value) { localStorage.setItem(`wxpusher_${key}`, value); },
    get(key, defaultValue = '') { return localStorage.getItem(`wxpusher_${key}`) || defaultValue; },
    getBool(key, defaultValue = false) {
        const value = localStorage.getItem(`wxpusher_${key}`);
        return value !== null ? value === 'true' : defaultValue;
    }
};

// HTTP请求封装
async function httpRequest(method, url, data = null, headers = {}) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'platform': WXPUSHER_CONFIG.platform,
            'version': WXPUSHER_CONFIG.version,
            'deviceToken': storage.get('deviceToken'),
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

// API 调用
const api = {
    async createLoginQrcode() {
        return await httpRequest('GET', `${apiHost}/api/device/create-login-qrcode`);
    },
    async bindPushToken(code, pushToken, deviceName) {
        return await httpRequest('POST', `${apiHost}/api/device/register-device`, {
            code, pushToken, deviceName
        });
    },
    async updatePushToken(pushToken, deviceUuid) {
        return await httpRequest('POST', `${apiHost}/api/device/register-device`, {
            pushToken, deviceUuid
        });
    },
    async getHistoryMessages(lastMessageId = 0) {
        const headers = new Headers();
        headers.append('User-Agent', 'Mozilla/5.0 (Linux; Android 10; Mi 10 Pro Build/QP1A.191105.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36');
        headers.append('sec-ch-ua', '"Chromium";v="128", "Not;A=Brand";v="24", "Android WebView";v="128"');
        headers.append('deviceToken', storage.get('deviceToken'));
        headers.append('Content-Type', 'application/json;charset=utf-8');
        try {
            const url = `${apiHost}/api/need-login/device/message-list?lastMessageId=${lastMessageId}`;
            const res = await fetch(url, { method: 'GET', headers });
            const result = await res.json();
            if (result.code === 1000) return { success: true, data: result.data };
            else return { success: false, message: result.msg };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

function showAlert(message, type = 'danger') {
    elements.alert.className = `alert alert-${type}`;
    elements.alert.textContent = message;
    elements.alert.style.display = 'block';
}

function updateConnectionStatus(connected) {
    if (connected) {
        elements.wsStatus.textContent = '已连接';
        elements.wsStatus.className = 'status-value status-success';
        reconnectAttempts = 0;
    } else {
        elements.wsStatus.textContent = '未连接';
        elements.wsStatus.className = 'status-value status-error';
    }
}

function updateUserStatus(loggedIn) {
    if (loggedIn) {
        elements.userStatus.textContent = '已登录';
        elements.userStatus.className = 'status-value status-success';
        elements.qrcodeSection.classList.remove('show');
    } else {
        elements.userStatus.textContent = '未登录';
        elements.userStatus.className = 'status-value status-error';
    }
}

function addMessage(content, time = new Date(), qid = null) {
    const messageList = elements.messageList;
    if (messageList.children.length === 1 && messageList.children[0].textContent.includes('等待消息推送')) {
        messageList.innerHTML = '';
    }
    const messageElement = document.createElement('div');
    messageElement.className = 'message-item';
    let inner = `
        <div class="message-time">${time.toLocaleString()}</div>
        <div class="message-content">${content}</div>
    `;
    if (qid) {
        messageElement.innerHTML = `<a href="https://wxpusher.zjiecode.com/api/message/${qid}" target="_blank">${inner}</a>`;
    } else {
        messageElement.innerHTML = inner;
    }
    messageList.insertBefore(messageElement, messageList.firstChild);
    if (messageList.children.length > 50) {
        messageList.removeChild(messageList.lastChild);
    }
    if (storage.getBool('soundEnabled', true)) playNotificationSound();
    if (!isPageVisible && storage.getBool('notificationEnabled', false)) {
        notification.show('WxPusher 新消息', {
            body: content.length > 50 ? content.substring(0, 50) + '...' : content,
            tag: 'wxpusher-message',
            requireInteraction: false
        }, qid);
    }
}

function renderHistoryMessages(list, append = false) {
    const historyList = elements.historyMessageList;
    if (!append) historyList.innerHTML = '';
    if (!list || list.length === 0) {
        if (!append) {
            historyList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无历史消息</div>';
        }
        return;
    }
    for (const msg of list) {
        const time = new Date(msg.createTime);
        const msgEl = document.createElement('div');
        msgEl.className = 'message-item';
        msgEl.innerHTML = `
            <a href="https://wxpusher.zjiecode.com/api/message/${msg.qid}" target="_blank">
                <div class="message-time">${time.toLocaleString()}</div>
                <div class="message-content">${msg.summary || ''}</div>
                ${msg.url ? `<div><small>原文链接</small></div>` : ''}
            </a>
        `;
        historyList.appendChild(msgEl);
    }
}

function playNotificationSound() {
    try {
        elements.notificationSound.currentTime = 0;
        elements.notificationSound.play().catch(() => { });
    } catch { }
}

function clearBindPoll() {
    if (bindPollInterval) {
        clearInterval(bindPollInterval);
        bindPollInterval = null;
    }
}

function connectWebSocket() {
    if (!isPageVisible && !backgroundKeepAlive) return;
    const pushToken = storage.get('pushToken');
    let wsUrl = `${wsHost}/ws?version=${WXPUSHER_CONFIG.version}&platform=${WXPUSHER_CONFIG.platform}`;
    if (pushToken) wsUrl += `&pushToken=${pushToken}`;
    socket = new WebSocket(wsUrl);
    socket.onopen = function () {
        updateConnectionStatus(true);
        startHeartbeat();
    };
    socket.onclose = function (event) {
        updateConnectionStatus(false);
        stopHeartbeat();
        handleReconnect();
    };
    socket.onmessage = function (event) {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
    socket.onerror = function (error) {
        updateConnectionStatus(false);
    };
}

function handleReconnect() {
    if (!isPageVisible && !backgroundKeepAlive) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        showAlert('连接失败，已停止自动重连。请检查网络后刷新页面。', 'danger');
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(() => {
        if (!socket || socket.readyState === WebSocket.CLOSED) connectWebSocket();
    }, delay);
}

function handleWebSocketMessage(message) {
    switch (message.msgType) {
        case WS_MSG_TYPE.HEART:
            lastServerHeart = Date.now();
            break;
        case WS_MSG_TYPE.INIT:
            storage.set('pushToken', message.pushToken);
            handleInitMessage(message);
            break;
        case WS_MSG_TYPE.NOTIFICATION:
            addMessage(message.content, new Date(), message.qid);
            break;
        case WS_MSG_TYPE.UPDATE:
            // showAlert(`发现新版本：${message.version}，请升级！`, 'warning');
            break;
        case WS_MSG_TYPE.ERROR:
            showAlert(`服务器错误：${message.content}`, 'danger');
            break;
    }
}

async function handleInitMessage(message) {
    const deviceUuid = storage.get('deviceUuid');
    try {
        let result;
        if (deviceUuid) {
            result = await api.updatePushToken(message.pushToken, deviceUuid);
        } else {
            showQrCodeLogin();
            return;
        }
        if (result.success) {
            storage.set('deviceUuid', result.data.deviceUuid);
            storage.set('deviceToken', result.data.deviceToken);
            updateUserStatus(true);
            showAlert('设备绑定成功！', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showAlert(`设备绑定失败：${error.message}`, 'danger');
        showQrCodeLogin();
    }
}

async function showQrCodeLogin() {
    try {
        const result = await api.createLoginQrcode();
        if (result.success) {
            const qrcodeUrl = `${apiHost}/api/qrcode/${result.data.code}.jpg`;
            elements.qrcode.src = qrcodeUrl;
            elements.qrcodeSection.classList.add('show');
            clearBindPoll();
            pollBindStatus(result.data.code);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showAlert(`创建二维码失败：${error.message}`, 'danger');
    }
}

function pollBindStatus(code) {
    let pollCount = 0;
    const maxPollCount = 100;
    bindPollInterval = setInterval(async () => {
        pollCount++;
        try {
            const pushToken = storage.get('pushToken');
            const deviceName = `${WXPUSHER_CONFIG.platform}-WebApp`;
            const result = await api.bindPushToken(code, pushToken, deviceName);
            if (result.success) {
                clearBindPoll();
                storage.set('deviceUuid', result.data.deviceUuid);
                storage.set('deviceToken', result.data.deviceToken);
                updateUserStatus(true);
                elements.qrcodeSection.classList.remove('show');
                showAlert('微信绑定成功！', 'success');
                return;
            } else if (result.code !== 10000) {
                clearBindPoll();
                showAlert(`绑定失败：${result.message}`, 'danger');
                return;
            }
            if (pollCount >= maxPollCount) {
                clearBindPoll();
                showAlert('扫码超时，请刷新页面重试', 'warning');
            }
        } catch (error) {
            if (pollCount >= maxPollCount) {
                clearBindPoll();
                showAlert('网络错误，请检查网络连接后重试', 'danger');
            }
        }
    }, 3000);
}

function startHeartbeat() {
    if (heartInterval) return;
    heartInterval = setInterval(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            updateConnectionStatus(false);
            return;
        }
        if (!isPageVisible && !backgroundKeepAlive) return;
        const heartTimeout = isPageVisible ? HEART_TIME_SPACE + 10000 : HEART_TIME_SPACE + 30000;
        if (Date.now() - lastServerHeart > heartTimeout) {
            updateConnectionStatus(false);
            socket.close();
            return;
        }
        const heartbeat = { msgType: WS_MSG_TYPE.HEART_UP };
        socket.send(JSON.stringify(heartbeat));
    }, HEART_TIME_SPACE);
}

function stopHeartbeat() {
    if (heartInterval) {
        clearInterval(heartInterval);
        heartInterval = null;
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        isPageVisible = false;
    } else {
        isPageVisible = true;
        if (!socket || socket.readyState !== WebSocket.OPEN) connectWebSocket();
    }
}

function initSettings() {
    // 自动写入默认值
    if (localStorage.getItem('wxpusher_notificationEnabled') === null) {
        localStorage.setItem('wxpusher_notificationEnabled', 'true');
    }
    if (localStorage.getItem('wxpusher_soundEnabled') === null) {
        localStorage.setItem('wxpusher_soundEnabled', 'true');
    }

    const soundEnabled = storage.getBool('soundEnabled', true);
    elements.soundToggle.checked = soundEnabled;
    elements.soundToggle.addEventListener('change', (e) => {
        storage.set('soundEnabled', e.target.checked);
        if (isElectron) window.electronAPI.settingChanged('soundEnabled', e.target.checked);
    });

    const notificationEnabled = storage.getBool('notificationEnabled', true);
    elements.notificationToggle.checked = notificationEnabled;
    elements.notificationToggle.addEventListener('change', (e) => {
        storage.set('notificationEnabled', e.target.checked);
        if (isElectron) window.electronAPI.settingChanged('notificationEnabled', e.target.checked);
        if (e.target.checked) {
            showAlert('桌面通知已开启', 'success');
        } else {
            showAlert('桌面通知已关闭', 'warning');
        }
    });
}

async function loadHistoryMessages(firstLoad = false) {
    if (historyLoading || historyEnd) return;
    historyLoading = true;
    elements.loadMoreBtn.style.display = 'none';
    if (firstLoad) {
        historyLastMessageId = 0;
        historyEnd = false;
        elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载中...</div>';
    }
    const res = await api.getHistoryMessages(historyLastMessageId);
    historyLoading = false;
    if (res.success) {
        const list = res.data;
        if (firstLoad) {
            renderHistoryMessages(list, false);
        } else {
            renderHistoryMessages(list, true);
        }
        if (list.length === 0) {
            historyEnd = true;
            elements.loadMoreBtn.style.display = 'none';
            if (firstLoad) {
                elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无历史消息</div>';
            }
        } else {
            historyLastMessageId = list[list.length - 1].id;
            elements.loadMoreBtn.style.display = '';
        }
    } else {
        showAlert('历史消息加载失败: ' + res.message, 'danger');
        if (firstLoad) {
            elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载失败</div>';
        }
    }
}

function setupTabs() {
    elements.tabSettingsBtn.addEventListener('click', () => {
        elements.tabSettingsBtn.classList.add('active');
        elements.tabMessagesBtn.classList.remove('active');
        elements.tabSettings.classList.add('active');
        elements.tabMessages.classList.remove('active');
    });
    elements.tabMessagesBtn.addEventListener('click', () => {
        elements.tabMessagesBtn.classList.add('active');
        elements.tabSettingsBtn.classList.remove('active');
        elements.tabMessages.classList.add('active');
        elements.tabSettings.classList.remove('active');
        if (elements.historyMessageList.innerHTML.trim().length === 0 ||
            elements.historyMessageList.innerHTML.includes('加载中')) {
            loadHistoryMessages(true);
        }
    });
}

function init() {
    updateConnectionStatus(false);
    updateUserStatus(false);
    initSettings();
    setupTabs();
    if (isElectron) syncSettingsWithTray();

    elements.loadMoreBtn.addEventListener('click', function () {
        loadHistoryMessages(false);
    });

    const deviceUuid = storage.get('deviceUuid');
    const deviceToken = storage.get('deviceToken');
    if (deviceUuid && deviceToken) {
        updateUserStatus(true);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    connectWebSocket();
    showAlert('正在连接服务器...', 'warning');

    window.addEventListener('beforeunload', () => {
        if (socket) socket.close();
        stopHeartbeat();
        clearBindPoll();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
    
    // 监听来自主进程的设置变更
    window.electron.receive('toggle-sound', (enabled) => {
        elements.soundToggle.checked = enabled;
        storage.set('soundEnabled', enabled);
    });

    window.electron.receive('toggle-notification', (enabled) => {
        elements.notificationToggle.checked = enabled;
        storage.set('notificationEnabled', enabled);
    });
}

document.addEventListener('DOMContentLoaded', init);