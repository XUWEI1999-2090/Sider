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
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const tab = tabs[0];

            // Request screenshot permission if needed
            await chrome.permissions.request({
                permissions: ['tabCapture']
            });

            // Capture the visible tab
            const dataUrl = await new Promise((resolve, reject) => {
                chrome.tabs.captureVisibleTab(
                    tab.windowId,
                    { format: 'png' },
                    (dataUrl) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(dataUrl);
                        }
                    }
                );
            });

            // Display the screenshot
            await this.displayScreenshot(dataUrl);

        } catch (error) {
            console.error('Screenshot failed:', error);
            this.displayError('无法获取截图，请确保已授予截图权限。如果问题持续，请刷新页面重试。');
        }
    }

    async displayScreenshot(dataUrl) {
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

        // Save screenshot to chat history
        chrome.storage.local.get(['chatHistory'], (result) => {
            const history = result.chatHistory || [];
            history.push({
                type: 'user',
                text: '[Screenshot]',
                imageData: dataUrl
            });
            chrome.storage.local.set({ chatHistory: history });
        });
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

document.addEventListener('DOMContentLoaded', () => {
    new ScreenshotManager();
});