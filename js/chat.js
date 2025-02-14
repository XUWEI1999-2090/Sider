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

        this.displayMessage(message, 'user');
        this.saveMessage(message, 'user');
        this.messageInput.value = '';

        this.showTypingIndicator();

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: 'processMessage', message },
                    (response) => resolve(response)
                );
            });

            this.hideTypingIndicator();
            this.displayMessage(response.response, 'bot');
            this.saveMessage(response.response, 'bot');

        } catch (error) {
            this.hideTypingIndicator();
            this.displayError('Failed to get response. Please try again.');
        }
    }

    displayMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${type}-message`);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text;

        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
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

    hideTypingIndicator() {
        const typingDiv = this.chatMessages.querySelector('.typing-indicator')?.closest('.message');
        if (typingDiv) {
            typingDiv.classList.add('removing');
            setTimeout(() => {
                typingDiv.remove();
            }, 300); // 等待动画完成后移除元素
        }
    }

    displayError(message) {
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