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
            
            // Inject screenshot capture script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.captureVisibleTab
            });

            // Listen for the screenshot data
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.type === 'screenshot') {
                    this.displayScreenshot(message.data);
                }
            });
        } catch (error) {
            console.error('Screenshot failed:', error);
            this.displayError('Failed to take screenshot. Please try again.');
        }
    }

    captureVisibleTab() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

        canvas.width = scrollWidth;
        canvas.height = scrollHeight;

        // Capture the entire page
        context.drawWindow(window, 0, 0, scrollWidth, scrollHeight, "rgb(255,255,255)");

        // Convert to base64 and send back to extension
        const screenshot = canvas.toDataURL();
        chrome.runtime.sendMessage({ type: 'screenshot', data: screenshot });
    }

    displayScreenshot(dataUrl) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');
        
        const img = document.createElement('img');
        img.src = dataUrl;
        img.classList.add('screenshot-preview');
        
        messageDiv.appendChild(img);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    displayError(message) {
        const chatMessages = document.getElementById('chatMessages');
        const errorDiv = document.createElement('div');
        errorDiv.classList.add('message', 'bot-message', 'error-message');
        errorDiv.textContent = message;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize screenshot manager when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScreenshotManager();
});
