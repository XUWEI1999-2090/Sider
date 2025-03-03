
class ChatManager {
    constructor() {
        this.messageContainer = document.getElementById('chatMessages');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.conversations = [];
        this.currentConversationId = null;
        
        this.loadConversations();
        this.setupEventListeners();
        
        // Always create a new conversation when the page loads (per requirement)
        this.createNewConversation();
    }

    loadConversations() {
        try {
            const savedConversations = localStorage.getItem('conversations');
            if (savedConversations) {
                this.conversations = JSON.parse(savedConversations);
                
                // Get the current conversation ID from localStorage
                const currentId = localStorage.getItem('currentConversationId');
                if (currentId && this.getConversationById(currentId)) {
                    this.currentConversationId = currentId;
                    this.loadCurrentConversation();
                } else if (this.conversations.length > 0) {
                    // Use the most recent conversation if current ID is not valid
                    this.currentConversationId = this.conversations[0].id;
                    this.loadCurrentConversation();
                }
            }
            
            // Add debug log to verify data loading
            console.log('Loaded conversations:', this.conversations);
        } catch (e) {
            console.error('Error loading conversations:', e);
            // Create a new conversation if there's an error
            this.createNewConversation();
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

    createNewConversation() {
        const newConversation = {
            id: this.generateId(),
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to beginning of array (most recent first)
        this.conversations.unshift(newConversation);
        this.currentConversationId = newConversation.id;
        
        this.saveConversations();
        this.loadCurrentConversation();
        return newConversation;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getConversationById(id) {
        return this.conversations.find(conv => conv.id === id);
    }

    loadCurrentConversation() {
        const conversation = this.getConversationById(this.currentConversationId);
        if (conversation) {
            localStorage.setItem('currentConversationId', this.currentConversationId);
            if (this.messageContainer) {
                this.messageContainer.innerHTML = '';
                conversation.messages.forEach(message => this.renderMessage(message));
                this.scrollToBottom();
            }
        }
    }

    switchConversation(id) {
        if (this.currentConversationId !== id) {
            this.currentConversationId = id;
            this.loadCurrentConversation();
            return true;
        }
        return false;
    }

    updateConversationTitle(id, firstMessage) {
        const conversation = this.getConversationById(id);
        if (conversation && conversation.title === '新对话' && firstMessage) {
            // Set the title to the first few characters of the first message
            const maxTitleLength = 20;
            conversation.title = firstMessage.length > maxTitleLength 
                ? firstMessage.substring(0, maxTitleLength) + '...' 
                : firstMessage;
            this.saveConversations();
        }
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

        // Get current conversation
        const conversation = this.getConversationById(this.currentConversationId);
        if (!conversation) return;
        
        // Update conversation
        conversation.messages.push(userMessage);
        conversation.updatedAt = new Date().toISOString();
        
        // Update title if this is the first message
        if (conversation.messages.length === 1) {
            this.updateConversationTitle(this.currentConversationId, content);
        }
        
        this.saveConversations();
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

            // Update current conversation with AI response
            conversation.messages.push(aiMessage);
            conversation.updatedAt = new Date().toISOString();
            this.saveConversations();
            this.renderMessage(aiMessage);
        } catch (err) {
            console.error('Error calling LLM API:', err);
            const errorMessage = {
                text: "Sorry, I encountered an error processing your request.",
                sender: 'assistant',
                timestamp: new Date().toISOString()
            };
            conversation.messages.push(errorMessage);
            this.saveConversations();
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

    saveConversations() {
        try {
            // Clone the conversations to ensure we have a clean object
            const conversationsToSave = JSON.parse(JSON.stringify(this.conversations));
            localStorage.setItem('conversations', JSON.stringify(conversationsToSave));
            localStorage.setItem('currentConversationId', this.currentConversationId);
            
            // Log success message with data size
            const dataSize = JSON.stringify(conversationsToSave).length;
            console.log(`Saved ${this.conversations.length} conversations (${dataSize} bytes)`);
        } catch (err) {
            console.error('Error saving conversations:', err);
            // Show alert for users when saving fails
            if (err.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Try clearing some history.');
            }
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

    renderConversations(container) {
        if (!container || !this.conversations.length) return;
        
        container.innerHTML = '';
        
        this.conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = `conversation-item ${conversation.id === this.currentConversationId ? 'active-conversation' : ''}`;
            item.dataset.id = conversation.id;
            
            const title = document.createElement('div');
            title.className = 'conversation-title';
            title.textContent = conversation.title;
            
            const date = document.createElement('div');
            date.className = 'conversation-date';
            date.textContent = this.formatDate(conversation.updatedAt);
            
            item.appendChild(title);
            item.appendChild(date);
            container.appendChild(item);
        });
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }

    clearHistory() {
        this.conversations = [];
        this.currentConversationId = null;
        localStorage.removeItem('conversations');
        localStorage.removeItem('currentConversationId');
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
        // Create a new conversation after clearing
        this.createNewConversation();
    }
}

// Initialize chat manager
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});
