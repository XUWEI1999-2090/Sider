
class ChatManager {
    constructor() {
        this.messageContainer = document.getElementById('chatMessages');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.messages = [];
        
        this.loadMessages();
        this.setupEventListeners();
    }

    loadMessages() {
        try {
            const savedMessages = localStorage.getItem('messages');
            if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
                this.renderMessages();
            }
        } catch (e) {
            console.error('Error loading messages:', e);
        }
    }

    setupEventListeners() {
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMessageSubmit();
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleMessageSubmit();
            }
        });
    }

    async handleMessageSubmit() {
        const content = this.messageInput.value.trim();
        const hasAttachments = window.screenshots && window.screenshots.length > 0;
        const hasSelectedTexts = window.selectedTexts && window.selectedTexts.length > 0;

        if (!content && !hasAttachments && !hasSelectedTexts) return;

        const userMessage = {
            text: content,
            attachments: hasAttachments ? [...window.screenshots] : [],
            selectedTexts: hasSelectedTexts ? [...window.selectedTexts] : [],
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        this.messages.push(userMessage);
        this.saveMessages();
        this.renderMessage(userMessage);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        try {
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer sk-rebktjhdywuqfmulddzhdygglyrkeengnhlshvejdveeuwdw',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
                    messages: [{
                        role: "user",
                        content: content
                    }]
                })
            };

            const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
            const data = await response.json();
            
            const aiMessage = {
                text: data.choices[0].message.content,
                sender: 'assistant',
                timestamp: new Date().toISOString()
            };

            this.messages.push(aiMessage);
            this.saveMessages();
            this.renderMessage(aiMessage);
        } catch (err) {
            console.error('Error calling LLM API:', err);
            const errorMessage = {
                text: "Sorry, I encountered an error processing your request.",
                sender: 'assistant',
                timestamp: new Date().toISOString()
            };
            this.messages.push(errorMessage);
            this.saveMessages();
            this.renderMessage(errorMessage);
        }
        
        // 清理附件和选中文本
        const preview = document.getElementById('attachmentPreview');
        if (preview) preview.classList.add('d-none');
        const previewContainer = document.getElementById('previewContainer');
        if (previewContainer) previewContainer.innerHTML = '';
        
        if (hasAttachments) {
            window.screenshots = [];
        }
        
        if (hasSelectedTexts) {
            window.selectedTexts = [];
        }

        this.scrollToBottom();
    }

    saveMessages() {
        try {
            localStorage.setItem('messages', JSON.stringify(this.messages));
        } catch (err) {
            console.error('Error saving messages:', err);
        }
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender}`;
        messageElement.style.display = 'block';
        messageElement.style.opacity = '1';

        if (message.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = message.text;
            messageElement.appendChild(textDiv);
        }

        if (message.attachments && message.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'message-attachments';
            message.attachments.forEach(attachment => {
                const img = document.createElement('img');
                img.src = attachment;
                img.style.maxWidth = '200px';
                img.style.marginTop = '8px';
                attachmentsDiv.appendChild(img);
            });
            messageElement.appendChild(attachmentsDiv);
        }

        if (message.selectedTexts && message.selectedTexts.length > 0) {
            const selectedTextsDiv = document.createElement('div');
            selectedTextsDiv.className = 'selected-texts';
            message.selectedTexts.forEach(text => {
                const textElement = document.createElement('div');
                textElement.className = 'selected-text-item';
                textElement.textContent = text;
                selectedTextsDiv.appendChild(textElement);
            });
            messageElement.appendChild(selectedTextsDiv);
        }

        this.messageContainer.appendChild(messageElement);
    }

    renderMessages() {
        if (!this.messageContainer) return;
        this.messageContainer.innerHTML = '';
        this.messages.forEach(message => this.renderMessage(message));
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }

    clearHistory() {
        this.messages = [];
        this.messageContainer.innerHTML = '';
        localStorage.removeItem('messages');
    }
}

// Initialize chat manager
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});
