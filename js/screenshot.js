class ScreenshotManager {
    constructor() {
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.bindEvents();
    }

    bindEvents() {
        this.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
    }

    async takeScreenshot() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Take screenshot of current tab
            const response = await new Promise((resolve) => {
                chrome.tabs.captureVisibleTab(
                    tab.windowId,
                    { format: 'png' },
                    (dataUrl) => resolve(dataUrl)
                );
            });

            this.displayScreenshot(response);

        } catch (error) {
            console.error('Screenshot failed:', error);
            this.displayError('无法获取截图，请确保已授予截图权限。');
        }
    }

    displayScreenshot(dataUrl) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const img = document.createElement('img');
        img.src = dataUrl;
        img.classList.add('screenshot-preview');
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.marginTop = '8px';

        contentDiv.appendChild(img);
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    displayError(message) {
        const chatMessages = document.getElementById('chatMessages');
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content', 'error-message');
        contentDiv.textContent = message;

        errorDiv.appendChild(contentDiv);
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize screenshot manager when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScreenshotManager();
});