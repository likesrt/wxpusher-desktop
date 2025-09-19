// 消息管理
class MessageManager {
    constructor() {
        this.api = window.ApiManager;
        this.storage = window.StorageManager;
        this.elements = window.ElementManager;
        
        this.historyLastMessageId = 0;
        this.historyLoading = false;
        this.historyEnd = false;
    }

    // 添加新消息
    addMessage(content, time = new Date(), qid = null) {
        const messageList = this.elements.messageList;
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

        // 触发通知
        if (window.NotificationManager) {
            window.NotificationManager.handleNewMessage(content, qid);
        }
    }

    // 渲染历史消息
    renderHistoryMessages(list, append = false) {
        const historyList = this.elements.historyMessageList;
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

    // 加载历史消息
    async loadHistoryMessages(firstLoad = false) {
        if (this.historyLoading || this.historyEnd) return;
        
        this.historyLoading = true;
        this.elements.loadMoreBtn.style.display = 'none';
        
        if (firstLoad) {
            this.historyLastMessageId = 0;
            this.historyEnd = false;
            this.elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载中...</div>';
        }
        
        const res = await this.api.getHistoryMessages(this.historyLastMessageId);
        this.historyLoading = false;
        
        if (res.success) {
            const list = res.data;
            if (firstLoad) {
                this.renderHistoryMessages(list, false);
            } else {
                this.renderHistoryMessages(list, true);
            }
            
            if (list.length === 0) {
                this.historyEnd = true;
                this.elements.loadMoreBtn.style.display = 'none';
                if (firstLoad) {
                    this.elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无历史消息</div>';
                }
            } else {
                this.historyLastMessageId = list[list.length - 1].id;
                this.elements.loadMoreBtn.style.display = '';
            }
        } else {
            if (window.UIManager) {
                window.UIManager.showAlert('历史消息加载失败: ' + res.message, 'danger');
            }
            if (firstLoad) {
                this.elements.historyMessageList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">加载失败</div>';
            }
        }
    }

    // 初始化事件监听
    init() {
        this.elements.loadMoreBtn.addEventListener('click', () => {
            this.loadHistoryMessages(false);
        });
    }
}

// 导出单例
window.MessageManager = new MessageManager();