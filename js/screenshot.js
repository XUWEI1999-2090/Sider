
class ScreenshotManager {
    constructor() {
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.bindEvents();
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
    }

    bindEvents() {
        this.screenshotBtn.addEventListener('click', () => this.initializeSelection());
    }

    initializeSelection() {
        try {
            if (!chrome || !chrome.tabs || !chrome.permissions) {
                throw new Error('Chrome APIs not available');
            }

            // Create selection overlay
            const overlay = document.createElement('div');
            overlay.id = 'screenshot-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                cursor: crosshair;
                z-index: 999999;
            `;

            const selection = document.createElement('div');
            selection.id = 'screenshot-selection';
            selection.style.cssText = `
                position: absolute;
                border: 2px solid #0095ff;
                background: rgba(0, 149, 255, 0.1);
                display: none;
            `;

            overlay.appendChild(selection);
            document.body.appendChild(overlay);

            overlay.addEventListener('mousedown', (e) => {
                this.isSelecting = true;
                this.startX = e.clientX;
                this.startY = e.clientY;
                selection.style.left = `${this.startX}px`;
                selection.style.top = `${this.startY}px`;
                selection.style.display = 'block';
            });

            overlay.addEventListener('mousemove', (e) => {
                if (!this.isSelecting) return;
                
                const currentX = e.clientX;
                const currentY = e.clientY;
                
                const width = currentX - this.startX;
                const height = currentY - this.startY;
                
                selection.style.width = `${Math.abs(width)}px`;
                selection.style.height = `${Math.abs(height)}px`;
                selection.style.left = `${width < 0 ? currentX : this.startX}px`;
                selection.style.top = `${height < 0 ? currentY : this.startY}px`;
            });

            overlay.addEventListener('mouseup', async (e) => {
                this.isSelecting = false;
                const rect = selection.getBoundingClientRect();
                document.body.removeChild(overlay);
                await this.captureSelectedArea(rect);
            });

        } catch (error) {
            console.error('Screenshot initialization failed:', error);
            this.displayError('请在Chrome扩展中运行此功能');
        }
    }

    async captureSelectedArea(rect) {
        try {
            // Request screenshot permission if needed
            const granted = await chrome.permissions.request({
                permissions: ['tabCapture']
            });

            if (!granted) {
                throw new Error('Screenshot permission denied');
            }

            // Capture the visible tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) {
                throw new Error('No active tab found');
            }

            const tab = tabs[0];
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

            // Crop the image
            const img = new Image();
            img.src = dataUrl;
            await new Promise(resolve => img.onload = resolve);

            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
            
            const croppedDataUrl = canvas.toDataURL('image/png');
            await this.displayScreenshot(croppedDataUrl);

        } catch (error) {
            console.error('Screenshot failed:', error);
            const errorMsg = error.message === 'Chrome APIs not available' 
                ? '请在Chrome扩展中运行此功能' 
                : '无法获取截图，请确保已授予截图权限。如果问题持续，请刷新页面重试。';
            this.displayError(errorMsg);
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
