class ChatManager {
    constructor() {
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');

        this.initializeChat();
        this.bindEvents();
    }

    initializeChat() {
        chrome.storage.local.get(['chatHistory'], (result) => {
            if (result.chatHistory) {
                result.chatHistory.forEach((msg, index) => {
                    setTimeout(() => {
                        this.displayMessage(msg.text, msg.type);
                    }, index * 100); // 逐个显示消息，每条消息间隔100ms
                });
            }
        });
    }

    bindEvents() {
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMessageSubmit();
        });
    }

    async handleMessageSubmit() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // 先显示用户消息
        await this.displayMessage(message, 'user');
        this.saveMessage(message, 'user');
        this.messageInput.value = '';

        // 显示机器人正在输入的动画
        this.showTypingIndicator();

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: 'processMessage', message },
                    (response) => resolve(response)
                );
            });

            // 移除输入指示器并显示回复
            await this.hideTypingIndicator();
            await this.displayMessage(response.response, 'bot');
            this.saveMessage(response.response, 'bot');

        } catch (error) {
            await this.hideTypingIndicator();
            await this.displayError('Failed to get response. Please try again.');
        }
    }

    async displayMessage(text, type) {
        return new Promise((resolve) => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', `${type}-message`);

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('message-content');
            contentDiv.textContent = text;

            messageDiv.appendChild(contentDiv);
            this.chatMessages.appendChild(messageDiv);

            // 添加动画效果
            requestAnimationFrame(() => {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(20px)';

                requestAnimationFrame(() => {
                    messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    messageDiv.style.opacity = '1';
                    messageDiv.style.transform = 'translateY(0)';
                });
            });

            this.scrollToBottom();

            // 等待动画完成后解析Promise
            setTimeout(resolve, 300);
        });
    }

    saveMessage(text, type) {
        chrome.storage.local.get(['chatHistory'], (result) => {
            const history = result.chatHistory || [];
            history.push({ text, type });
            chrome.storage.local.set({ chatHistory: history });
        });
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message');
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    async hideTypingIndicator() {
        return new Promise((resolve) => {
            const typingDiv = this.chatMessages.querySelector('.typing-indicator')?.closest('.message');
            if (typingDiv) {
                typingDiv.classList.add('removing');
                setTimeout(() => {
                    typingDiv.remove();
                    resolve();
                }, 300); // 等待动画完成后移除元素
            } else {
                resolve();
            }
        });
    }

    async displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message', 'error');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = message;

        errorDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatManager();
});