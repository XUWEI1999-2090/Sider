class ChatManager {
    constructor() {
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        
        this.initializeChat();
        this.bindEvents();
    }

    initializeChat() {
        // Load chat history
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

        // Display user message
        this.displayMessage(message, 'user');
        this.saveMessage(message, 'user');
        this.messageInput.value = '';

        // Show loading indicator
        this.showLoading();

        try {
            // Send message to background script for processing
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage(
                    { type: 'processMessage', message },
                    (response) => resolve(response)
                );
            });

            // Hide loading and display bot response
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
        messageDiv.textContent = text;
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
        loadingDiv.classList.add('loading');
        loadingDiv.innerHTML = `
            <div class="loading-dots">
                <span></span>
                <span style="animation-delay: 0.2s"></span>
                <span style="animation-delay: 0.4s"></span>
            </div>
        `;
        this.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    hideLoading() {
        const loadingDiv = this.chatMessages.querySelector('.loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message', 'error-message');
        errorDiv.textContent = message;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chat when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatManager();
});
