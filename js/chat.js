import { chatWithMemory } from './api/chat-api.js';

class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.currentModelType = 'text';
        this.attachments = [];

        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageContainer = document.getElementById('chatMessages');
        this.attachmentPreview = document.getElementById('attachmentPreview');

        this.loadConversations();
        this.setupEventListeners();

        window.chatManager = this;
        console.log('Initializing ChatManager');
    }

    async handleMessage(prompt, hasPdfFile, hasAttachments) {
        try {
            // 准备消息内容
            const messageBuilder = new BuildMessages();

            // 创建用户消息对象
            const userMessage = {
                text: prompt || '',
                attachments: [],
                sender: "user",
                timestamp: new Date().toISOString()
            };

            // 处理文本内容
            if (prompt) {
                messageBuilder.messages.push({
                    role: "user", 
                    content: prompt
                });
            }

            // 预处理附件并添加到用户消息
            if (hasPdfFile && window.currentPdfFile) {
                userMessage.attachments.push({
                    name: window.currentPdfFile.name,
                    type: 'pdf',
                    size: window.currentPdfFile.size
                });
                await messageBuilder.parsingPdf(window.currentPdfFile);
            }

            if (hasAttachments && Array.isArray(this.attachments)) {
                for (const attachment of this.attachments) {
                    if (attachment.url) {
                        userMessage.attachments.push(attachment);
                        await messageBuilder.parsingImage(attachment.url);
                    }
                }
            }

            // 添加附件到用户消息
            if (this.attachments && this.attachments.length > 0) {
                userMessage.attachments = [...this.attachments];
            } else if (window.currentPdfFile) {
                userMessage.attachments = [{
                    name: window.currentPdfFile.name,
                    type: 'pdf',
                    size: window.currentPdfFile.size
                }];
            }

            // 添加到会话并保存
            const conversation = this.getConversationById(this.currentConversationId);
            if (conversation) {
                conversation.messages.push(userMessage);
                this.saveConversations();

                // 渲染用户消息
                this.renderMessage(userMessage);
                this.chatMessages.appendChild(document.createElement('br'));
            }

            // 显示临时消息
            this.renderMessage({
                text: hasPdfFile || hasAttachments ? "正在处理附件，请稍候..." : "正在思考中，请稍候...",
                sender: "assistant",
                isTemporary: true,
                timestamp: new Date().toISOString()
            });

            // 处理附件
            if (hasPdfFile && window.currentPdfFile) {
                await messageBuilder.parsingPdf(window.currentPdfFile);
            }

            if (hasAttachments && Array.isArray(this.attachments)) {
                for (const attachment of this.attachments) {
                    if (attachment.url) {
                        await messageBuilder.parsingImage(attachment.url);
                    }
                }
            }

            // 获取会话并设置类型
            if (conversation && (hasPdfFile || hasAttachments)) {
                conversation.modelType = "multimodal";
            }

            // 检查是否为多模态请求
            const isMultimodal = hasPdfFile || hasAttachments;

            // 发送API请求
            const aiResponse = await chatWithMemory(
                messageBuilder.messages,
                isMultimodal
            );

            if (!aiResponse) {
                throw new Error("API返回了空响应");
            }

            // Add AI response to conversation
            const aiMessage = {
                text: aiResponse,
                sender: "assistant",
                timestamp: new Date().toISOString()
            };

            conversation.messages.push(aiMessage);
            conversation.updatedAt = new Date().toISOString();
            this.saveConversations();
            this.renderMessage(aiMessage);

            // Clear input field
            this.messageInput.value = '';

            // 清理临时消息和附件
            this.chatMessages.querySelectorAll(".temporary-message")
                .forEach(msg => msg.remove());

            // 清理附件
            this.attachments = [];
            window.currentPdfFile = null;
            const preview = document.getElementById('attachmentPreview');
            if (preview) {
                preview.innerHTML = '';
                preview.classList.add('d-none');
            }


        } catch (err) {
            console.error("Error:", err);
            this.chatMessages.querySelectorAll(".temporary-message")
                .forEach(msg => msg.remove());

            this.renderMessage({
                text: `处理失败: ${err.message}`,
                sender: "system",
                timestamp: new Date().toISOString()
            });
        }
    }

    loadConversations() {
        try {
            const savedConversations = localStorage.getItem('conversations');
            if (savedConversations) {
                this.conversations = JSON.parse(savedConversations);
                const currentId = localStorage.getItem('currentConversationId');
                if (currentId && this.getConversationById(currentId)) {
                    this.currentConversationId = currentId;
                    this.loadCurrentConversation();
                } else if (this.conversations.length > 0) {
                    this.currentConversationId = this.conversations[0].id;
                    this.loadCurrentConversation();
                }
            }
        } catch (e) {
            console.error('Error loading conversations:', e);
            this.createNewConversation();
        }
    }

    setupEventListeners() {
        // 设置PDF上传按钮处理
        const uploadPdfBtn = document.getElementById('uploadPdfBtn');
        if (uploadPdfBtn) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            uploadPdfBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file && file.type === 'application/pdf') {
                    window.currentPdfFile = file;
                    // 显示预览
                    const preview = document.getElementById('attachmentPreview');
                    if (preview) {
                        preview.classList.remove('d-none');
                        const container = document.getElementById('previewContainer');
                        if (container) {
                            const previewContent = document.createElement('div');
                            previewContent.className = 'preview-content file-preview';
                            previewContent.innerHTML = `
                                <i data-feather="file-text"></i>
                                <span class="ms-2">${file.name}</span>
                                <span class="ms-2 text-muted">(${this.formatFileSize(file.size)})</span>
                                <button class="btn btn-close"><i data-feather="x"></i></button>
                            `;

                            container.appendChild(previewContent);
                            if (typeof feather !== 'undefined') {
                                feather.replace();
                            }

                            const removeBtn = previewContent.querySelector('.btn-close');
                            if (removeBtn) {
                                removeBtn.onclick = () => {
                                    previewContent.remove();
                                    window.currentPdfFile = null;
                                    if (!container.querySelector('.preview-content')) {
                                        preview.classList.add('d-none');
                                    }
                                };
                            }
                        }
                    }
                }
            });
        }

        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const prompt = this.messageInput.value.trim();
            const hasPdfFile = window.currentPdfFile !== undefined && window.currentPdfFile !== null;
            const hasAttachments = this.attachments && this.attachments.length > 0;
            this.handleMessage(prompt, hasPdfFile, hasAttachments);
            return false;
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                const prompt = this.messageInput.value.trim();
                const hasPdfFile = window.currentPdfFile !== undefined && window.currentPdfFile !== null;
                const hasAttachments = this.attachments && this.attachments.length > 0;
                this.handleMessage(prompt, hasPdfFile, hasAttachments);
                return false;
            }
        });
    }

    createNewConversation() {
        const newConversation = {
            id: this.generateId(),
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            modelType: 'text'
        };
        this.conversations.unshift(newConversation);
        this.currentConversationId = newConversation.id;
        this.saveConversations();
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
        this.loadCurrentConversation();
        console.log('创建新对话:', newConversation.id);
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
                if (conversation.messages && conversation.messages.length > 0) {
                    console.log(`Rendering ${conversation.messages.length} messages for conversation ${conversation.id}`);
                    conversation.messages.forEach(message => {
                        this.renderMessage(message);
                    });
                } else {
                    console.log('No messages to render in this conversation');
                }
                setTimeout(() => {
                    this.scrollToBottom();
                }, 100);
            }
            console.log('Loaded conversation:', conversation);
            return true;
        } else {
            console.warn('Failed to load conversation with ID:', this.currentConversationId);
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
        this.currentConversationId = id;
        localStorage.setItem('currentConversationId', id);
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.classList.remove('active-conversation');
            if (item.dataset.id === id) {
                item.classList.add('active-conversation');
            }
        });
        console.log(`Loading conversation with ID ${id} and ${conversation.messages ? conversation.messages.length : 0} messages`);
        this.loadCurrentConversation();
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel) {
            historyPanel.classList.remove('active');
        }
        return true;
    }

    updateConversationTitle(id, firstMessage) {
        const conversation = this.getConversationById(id);
        if (conversation && conversation.title === '新对话' && firstMessage) {
            const maxTitleLength = 20;
            conversation.title = firstMessage.length > maxTitleLength
                ? firstMessage.substring(0, maxTitleLength) + '...'
                : firstMessage;
            this.saveConversations();
        }
    }

    updateConversation(options) {
        const conversation = this.getConversationById(this.currentConversationId);
        if (conversation) {
            if (options.modelType) {
                conversation.modelType = options.modelType;
            }
            this.saveConversations();
            return true;
        }
        return false;
    }


    saveConversations() {
        try {
            localStorage.setItem('conversations', JSON.stringify(this.conversations));
            localStorage.setItem('currentConversationId', this.currentConversationId);
        } catch (err) {
            console.error('Error saving conversations:', err);
        }
    }

    addMessage(message) {
        const conversation = this.getConversationById(this.currentConversationId);
        if (conversation) {
            // 先添加到会话消息列表
            conversation.messages.push(message);
            conversation.updatedAt = new Date().toISOString();

            // 确保消息有文本内容
            if (message.text || message.text === '') {
                this.renderMessage(message);
                this.scrollToBottom();
                this.saveConversations();
            }
            return true;
        }
        return false;
    }

    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sender}`;
        if (message.isTemporary) {
            messageEl.className += ' temporary-message';
        }
        messageEl.style.display = 'block';
        messageEl.style.opacity = '1';

        if (message.text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'message-text';
            textDiv.innerHTML = marked.parse(String(message.text || ''), {
                breaks: true,
                gfm: true
            });
            messageEl.appendChild(textDiv);

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<i data-feather="copy"></i>';
            copyButton.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(message.text);
                    copyButton.innerHTML = '<i data-feather="check"></i>';
                    feather.replace();
                    setTimeout(() => {
                        copyButton.innerHTML = '<i data-feather="copy"></i>';
                        feather.replace();
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            };
            messageEl.appendChild(copyButton);
        }

        if (message.attachments && message.attachments.length > 0) {
            const attachmentsDiv = document.createElement('div');
            attachmentsDiv.className = 'message-attachments';
            message.attachments.forEach(attachment => {
                const attachmentElement = document.createElement('div');
                attachmentElement.className = 'attachment-item';
                const iconEl = document.createElement('i');

                if (attachment.type === 'pdf') {
                    iconEl.setAttribute('data-feather', 'file-text');
                    attachmentElement.appendChild(iconEl);
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = attachment.name;
                    nameSpan.className = 'ms-2';
                    attachmentElement.appendChild(nameSpan);
                    if (attachment.size) {
                        const sizeSpan = document.createElement('span');
                        sizeSpan.textContent = `(${this.formatFileSize(attachment.size)})`;
                        sizeSpan.className = 'ms-2 text-muted';
                        attachmentElement.appendChild(sizeSpan);
                    }
                } else if (attachment.url) {
                    const link = document.createElement('a');
                    link.href = attachment.url;
                    link.textContent = attachment.name;
                    link.target = '_blank';
                    attachmentElement.appendChild(link);
                } else {
                    iconEl.setAttribute('data-feather', 'paperclip');
                    attachmentElement.appendChild(iconEl);
                    attachmentElement.appendChild(document.createTextNode(attachment.name));
                }
                attachmentsDiv.appendChild(attachmentElement);
            });
            messageEl.appendChild(attachmentsDiv);
        }

        this.chatMessages.appendChild(messageEl);
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        this.scrollToBottom();
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    renderConversations(container) {
        if (!container) return;
        container.innerHTML = '';
        if (!this.conversations || this.conversations.length === 0) {
            console.log('No conversations to render');
            const noConversationsMsg = document.getElementById('noConversationsMsg');
            if (noConversationsMsg) {
                noConversationsMsg.style.display = 'block';
            }
            return;
        }
        console.log('Rendering conversations:', this.conversations.length);
        const noConversationsMsg = document.getElementById('noConversationsMsg');
        if (noConversationsMsg) {
            noConversationsMsg.style.display = 'none';
        }
        this.conversations.forEach(conversation => {
            if (!conversation || !conversation.id) {
                console.warn('Invalid conversation object:', conversation);
                return;
            }
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
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger delete-conversation-btn';
            deleteBtn.innerHTML = '<i data-feather="trash-2"></i>';
            deleteBtn.style.float = 'right';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('确定要删除此对话吗？')) {
                    this.deleteConversation(conversation.id);
                    this.renderConversations(container);
                }
            };
            item.appendChild(title);
            item.appendChild(date);
            item.appendChild(deleteBtn);
            const conversationId = conversation.id;
            item.addEventListener('click', (e) => {
                console.log(`Clicked on conversation ${conversationId} with ${messageCount} messages`);
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.conversation-item').forEach(el => {
                    el.classList.remove('active-conversation');
                });
                item.classList.add('active-conversation');
                this.switchConversation(conversationId);
            });
            container.appendChild(item);
        });
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    deleteConversation(id) {
        this.conversations = this.conversations.filter(c => c.id !== id);
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
            setTimeout(() => {
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
                setTimeout(() => {
                    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
                }, 100);
            }, 10);
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
        this.createNewConversation();
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (!this.attachments) {
                    this.attachments = [];
                }
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

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatManager) {
        console.log('Initializing ChatManager');
        window.chatManager = new ChatManager();

        setTimeout(() => {
            if (!window.chatManager.currentConversationId) {
                console.log('No current conversation, creating new one');
                window.chatManager.createNewConversation();
            }

            setInterval(() => {
                window.chatManager.saveConversations();
            }, 60000);
        }, 1000);
    }
});

export { ChatManager };