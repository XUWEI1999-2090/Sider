import { chatWithMemory } from './api/chat-api.js';

class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.currentModelType = 'text';
        this.attachments = [];

        this.messageBuilder = new BuildMessages();

        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.attachmentPreview = document.getElementById('attachmentPreview');

        this.loadConversations();
        this.setupEventListeners();

        window.chatManager = this;
        console.log('ChatManager initialized.');
    }

    /** 加载本地存储会话 */
    loadConversations() {
        try {
            const savedConversations = JSON.parse(localStorage.getItem('conversations')) || [];
            this.conversations = savedConversations;
            this.currentConversationId = localStorage.getItem('currentConversationId') || null;

            if (!this.currentConversationId || !this.getConversationById(this.currentConversationId)) {
                this.createNewConversation();
            } else {
                setTimeout(() => this.loadCurrentConversation(), 0);
            }
        } catch (e) {
            console.error('Error loading conversations:', e);
            this.createNewConversation();
        }
    }

    /** 监听事件 */
    setupEventListeners() {
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMessage();
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleMessage();
            }
        });

        this.setupFileUploadListener();
    }

    /** 处理文件上传 */
    setupFileUploadListener() {
        const uploadBtn = document.getElementById('uploadPdfBtn');
        if (!uploadBtn) return;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                window.currentPdfFile = file;
                this.showFilePreview(file);
            }
        });
    }

    /** 处理用户输入 */
    async handleMessage() {
        const prompt = this.messageInput.value.trim();
        if (!prompt && !window.currentPdfFile && this.attachments.length === 0) return;

        this.messageInput.value = ''; // 清空输入框

        const isMultimodal = !!window.currentPdfFile || this.attachments.length > 0;
        const conversation = this.getConversationById(this.currentConversationId);
        if (conversation && isMultimodal) conversation.modelType = "multimodal";

        const userMessage = this.processUserMessage(prompt);
        this.renderMessage(userMessage);

        this.renderMessage({
            text: isMultimodal ? "正在处理附件，请稍候..." : "正在思考中...",
            sender: "assistant",
            isTemporary: true
        });

        try {
            const aiResponse = await chatWithMemory(this.messageBuilder.messages, isMultimodal);
            this.processAiResponse(aiResponse);
        } catch (err) {
            console.error("Error:", err);
            this.renderMessage({ text: `处理失败: ${err.message}`, sender: "system" });
        }
    }

    /** 处理用户消息 */
    processUserMessage(prompt) {
        const message = { text: prompt, sender: "user", timestamp: new Date().toISOString() };

        if (prompt) {
            this.messageBuilder.messages.push({ role: "user", content: prompt });
        }

        if (window.currentPdfFile) {
            message.attachments = [{ name: window.currentPdfFile.name, type: 'pdf', size: window.currentPdfFile.size }];
            this.messageBuilder.parsingPdf(window.currentPdfFile);
        }

        if (this.attachments.length > 0) {
            message.attachments = [...this.attachments];
            this.attachments.forEach(att => this.messageBuilder.parsingImage(att.url));
        }

        const conversation = this.getConversationById(this.currentConversationId);
        if (conversation) {
            conversation.messages.push(...this.messageBuilder.messages);
            this.saveConversations();
        }

        return message;
    }

    /** 处理 AI 响应 */
    processAiResponse(aiResponse) {
        if (!aiResponse) throw new Error("API 返回了空响应");

        const aiMessage = { text: aiResponse, sender: "assistant", timestamp: new Date().toISOString() };
        const conversation = this.getConversationById(this.currentConversationId);
        
        conversation.messages.push(aiMessage);
        conversation.updatedAt = new Date().toISOString();
        this.saveConversations();
        this.renderMessage(aiMessage);

        document.querySelectorAll(".temporary-message").forEach(msg => msg.remove());
        this.attachments = [];
        window.currentPdfFile = null;
        this.clearFilePreview();
    }

    /** 渲染消息 */
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
    
    /** 显示附件预览 */
    showFilePreview(file) {
        const preview = document.getElementById('attachmentPreview');
        if (preview) {
            preview.innerHTML = `<span>${file.name} (${this.formatFileSize(file.size)})</span>`;
            preview.classList.remove('d-none');
        }
    }

    /** 清理附件预览 */
    clearFilePreview() {
        const preview = document.getElementById('attachmentPreview');
        if (preview) {
            preview.innerHTML = '';
            preview.classList.add('d-none');
        }
    }

    /** 滚动到底部 */
    scrollToBottom() {
        setTimeout(() => this.chatMessages.scrollTop = this.chatMessages.scrollHeight, 100);
    }

    /** 获取会话 */
    getConversationById(id) {
        return this.conversations.find(conv => conv.id === id);
    }

    /** 创建新会话 */
    createNewConversation() {
        const newConv = { id: Date.now().toString(), messages: [], modelType: 'text' };
        this.conversations.unshift(newConv);
        this.currentConversationId = newConv.id;
        this.saveConversations();
        this.loadCurrentConversation();
    }

    /** 存储会话 */
    saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(this.conversations));
        localStorage.setItem('currentConversationId', this.currentConversationId);
    }

    /** 格式化文件大小 */
    formatFileSize(size) {
        return size < 1024 ? size + ' B' : (size / 1024).toFixed(1) + ' KB';
    }

    loadCurrentConversation() {
        const conversation = this.getConversationById(this.currentConversationId);
        if (!conversation) {
            console.warn('Invalid conversation ID:', this.currentConversationId);
            this.createNewConversation();
            return;
        }

        localStorage.setItem('currentConversationId', this.currentConversationId);
        this.chatMessages.innerHTML = '';
        conversation.messages.forEach(msg => this.renderMessage(msg));
        console.log('Loaded conversation:', conversation);
    }
}

document.addEventListener('DOMContentLoaded', () => new ChatManager());
