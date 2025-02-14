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
                result.chatHistory.forEach(msg => this.displayMessage(msg.text, msg.type));
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

        this.showLoading();

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: 'processMessage', message },
                    (response) => resolve(response)
                );
            });

            this.hideLoading();
            this.displayMessage(response.response, 'bot');
            this.saveMessage(response.response, 'bot');

        } catch (error) {
            this.hideLoading();
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

    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot-message');
        loadingDiv.innerHTML = `
            <div class="message-content">
                <div class="loading-dots">
                    <span></span>
                    <span style="animation-delay: 0.2s"></span>
                    <span style="animation-delay: 0.4s"></span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    hideLoading() {
        const loadingDiv = this.chatMessages.querySelector('.loading-dots')?.closest('.message');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content', 'error-message');
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