class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;

        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.attachmentPreview = document.getElementById('attachmentPreview');
        this.fileInput = document.getElementById('fileInput'); // Add file input element

        this.loadConversations();
        this.setupEventListeners();

        // 将实例存储在窗口对象中，以便其他模块访问
        window.chatManager = this;

        console.log('Initializing ChatManager');
    }

    loadConversations() {
        try {
            // Use chrome.storage.local instead of localStorage for larger storage capacity
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['conversations', 'currentConversationId'], (result) => {
                    console.log('Loading from chrome.storage:', result);

                    if (result.conversations && result.conversations.length > 0) {
                        this.conversations = result.conversations;

                        // Get the current conversation ID
                        const currentId = result.currentConversationId;
                        if (currentId && this.getConversationById(currentId)) {
                            this.currentConversationId = currentId;
                            this.loadCurrentConversation();
                        } else {
                            // Use the most recent conversation if current ID is not valid
                            this.currentConversationId = this.conversations[0].id;
                            this.loadCurrentConversation();
                        }
                    }

                    // Add debug log to verify data loading
                    console.log('Loaded conversations:', this.conversations);
                });
            } else {
                // Fallback to localStorage for development/testing
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
            }
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
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e);
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
            // 更新存储中的当前会话ID
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({'currentConversationId': this.currentConversationId});
            } else {
                localStorage.setItem('currentConversationId', this.currentConversationId);
            }

            // 清空并重新渲染消息
            if (this.messageContainer) {
                // 先清空消息容器
                this.messageContainer.innerHTML = '';

                if (conversation.messages && conversation.messages.length > 0) {
                    console.log(`Rendering ${conversation.messages.length} messages for conversation ${conversation.id}`);

                    // 遍历渲染所有消息
                    conversation.messages.forEach(message => {
                        this.renderMessage(message);
                    });
                } else {
                    console.log('No messages to render in this conversation');
                }

                // 滚动到底部
                setTimeout(() => {
                    this.scrollToBottom();
                }, 100);
            }

            console.log('Loaded conversation:', conversation);
            return true;
        } else {
            console.warn('Failed to load conversation with ID:', this.currentConversationId);
            // 如果找不到当前对话，创建一个新的
            this.createNewConversation();
            return false;
        }
    }

    switchConversation(id) {
        console.log('Switching to conversation:', id);
        const conversation = this.getConversationById(id);

        if (!conversation) {
            console.error('Conversation not found:', id);
            return false;
        }

        // 始终进行切换，确保消息正确加载
        this.currentConversationId = id;

        // 保存当前会话ID到存储中
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({'currentConversationId': id});
        } else {
            localStorage.setItem('currentConversationId', id);
        }

        // 更新历史记录列表中的活动状态
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.classList.remove('active-conversation');
            if (item.dataset.id === id) {
                item.classList.add('active-conversation');
            }
        });

        console.log(`Loading conversation with ID ${id} and ${conversation.messages ? conversation.messages.length : 0} messages`);

        // 加载当前会话的消息
        this.loadCurrentConversation();

        // 关闭历史面板
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel) {
            historyPanel.classList.remove('active');
        }

        return true;
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
        const hasAttachments = this.attachments && this.attachments.length > 0; // Check for attachments

        if (!content && !hasAttachments) return;

        const userMessage = {
            text: content,
            attachments: hasAttachments ? [...this.attachments] : [], // Use this.attachments
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
        this.attachments = []; // Clear attachments after sending

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


        this.scrollToBottom();
    }

    saveConversations() {
        try {
            // Clone the conversations to ensure we have a clean object
            const conversationsToSave = JSON.parse(JSON.stringify(this.conversations));

            // Use chrome.storage.local if available (has much higher storage limit than localStorage)
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({
                    'conversations': conversationsToSave,
                    'currentConversationId': this.currentConversationId
                }, () => {
                    // Log success message with data size
                    const dataSize = JSON.stringify(conversationsToSave).length;
                    console.log(`Saved ${this.conversations.length} conversations to chrome.storage (${dataSize} bytes)`);
                });
            } else {
                // Fallback to localStorage for development/testing
                localStorage.setItem('conversations', JSON.stringify(conversationsToSave));
                localStorage.setItem('currentConversationId', this.currentConversationId);

                // Log success message with data size
                const dataSize = JSON.stringify(conversationsToSave).length;
                console.log(`Saved ${this.conversations.length} conversations to localStorage (${dataSize} bytes)`);
            }
        } catch (err) {
            console.error('Error saving conversations:', err);
            // Show alert for users when saving fails
            if (err.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded. Try clearing some history.');
            }
        }
    }

    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        messageEl.style.display = 'block';
        messageEl.style.opacity = '1';

        if (message.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.textContent = message.text;
            messageEl.appendChild(textDiv);
        }

        if (message.attachments && message.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'message-attachments';
            message.attachments.forEach(attachment => {
                const attachmentElement = document.createElement('div');
                attachmentElement.className = 'attachment-item';
                if (attachment.type === 'pdf') {
                  const link = document.createElement('a');
                  link.href = attachment.url; // Assuming attachment.url contains the URL to the PDF
                  link.textContent = attachment.name;
                  link.target = '_blank';
                  attachmentElement.appendChild(link);
                } else {
                  // Handle other attachment types if needed.
                  attachmentElement.textContent = attachment.name;
                }
                attachmentsDiv.appendChild(attachmentElement);
            });
            messageEl.appendChild(attachmentsDiv);
        }


        this.messageContainer.appendChild(messageEl);
    }

    renderConversations(container) {
        if (!container) return;

        container.innerHTML = '';

        // 检查是否有对话
        if (!this.conversations || this.conversations.length === 0) {
            console.log('No conversations to render');
            const noConversationsMsg = document.getElementById('noConversationsMsg');
            if (noConversationsMsg) {
                noConversationsMsg.style.display = 'block';
            }
            return;
        }

        console.log('Rendering conversations:', this.conversations.length);

        // 隐藏"暂无历史对话"消息
        const noConversationsMsg = document.getElementById('noConversationsMsg');
        if (noConversationsMsg) {
            noConversationsMsg.style.display = 'none';
        }

        // 渲染所有对话
        this.conversations.forEach(conversation => {
            if (!conversation || !conversation.id) {
                console.warn('Invalid conversation object:', conversation);
                return;
            }

            // 计算消息数量，用于显示会话信息
            const messageCount = conversation.messages ? conversation.messages.length : 0;

            const item = document.createElement('div');
            item.className = `conversation-item ${conversation.id === this.currentConversationId ? 'active-conversation' : ''}`;
            item.dataset.id = conversation.id;

            const title = document.createElement('div');
            title.className = 'conversation-title';
            title.textContent = conversation.title || '无标题对话';

            const date = document.createElement('div');
            date.className = 'conversation-date';
            date.textContent = `${this.formatDate(conversation.updatedAt)} (${messageCount}条消息)`;

            // 添加一个删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger delete-conversation-btn';
            deleteBtn.innerHTML = '<i data-feather="trash-2"></i>';
            deleteBtn.style.float = 'right';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // 阻止事件冒泡，避免触发对话切换
                if (confirm('确定要删除此对话吗？')) {
                    this.deleteConversation(conversation.id);
                    this.renderConversations(container);
                }
            };

            item.appendChild(title);
            item.appendChild(date);
            item.appendChild(deleteBtn);

            // 添加点击事件，重要修复：确保正确绑定conversation.id到事件处理函数中
            const conversationId = conversation.id; // 使用局部变量保存ID
            item.addEventListener('click', (e) => {
                console.log(`Clicked on conversation ${conversationId} with ${messageCount} messages`);
                // 防止事件冒泡，确保只处理一次点击事件
                e.preventDefault();
                e.stopPropagation();

                // 移除所有项目的活动状态
                document.querySelectorAll('.conversation-item').forEach(el => {
                    el.classList.remove('active-conversation');
                });

                // 添加当前项目的活动状态
                item.classList.add('active-conversation');

                // 切换到选定的对话，使用保存的ID
                this.switchConversation(conversationId);
            });

            container.appendChild(item);
        });

        // 初始化Feather图标
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    deleteConversation(id) {
        // 删除对话
        this.conversations = this.conversations.filter(c => c.id !== id);

        // 如果删除的是当前对话，切换到第一个对话或创建新对话
        if (this.currentConversationId === id) {
            if (this.conversations.length > 0) {
                this.currentConversationId = this.conversations[0].id;
                this.loadCurrentConversation();
            } else {
                this.createNewConversation();
            }
        }

        this.saveConversations();
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

        // Clear from chrome.storage.local if available
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['conversations', 'currentConversationId'], () => {
                console.log('Cleared history from chrome.storage');
            });
        } else {
            // Fallback to localStorage
            localStorage.removeItem('conversations');
            localStorage.removeItem('currentConversationId');
        }

        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
        // Create a new conversation after clearing
        this.createNewConversation();
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.attachments = [{name: file.name, type: file.type, url: event.target.result}];
                this.renderAttachmentPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    renderAttachmentPreview(dataUrl) {
        const preview = this.attachmentPreview;
        if (preview) {
            preview.innerHTML = `<img src="${dataUrl}" alt="Attachment Preview">`;
            preview.classList.remove('d-none');
        }
    }
}

// Initialize chat manager
document.addEventListener('DOMContentLoaded', () => {
    // 确保不会创建多个实例
    if (!window.chatManager) {
        console.log('Initializing ChatManager');
        window.chatManager = new ChatManager();

        // 确保至少有一个对话
        setTimeout(() => {
            if (!window.chatManager.currentConversationId) {
                console.log('No current conversation, creating new one');
                window.chatManager.createNewConversation();
            }

            // 每分钟自动保存一次，防止数据丢失
            setInterval(() => {
                window.chatManager.saveConversations();
            }, 60000);
        }, 1000);
    }
});