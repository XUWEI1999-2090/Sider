
class ChatManager {
  constructor() {
      this.conversations = [];
      this.currentConversationId = null;
      this.currentModelType = 'text'; // 默认使用文本模型
      this.attachments = []; // 添加这行，初始化attachments数组

      this.messageForm = document.getElementById('messageForm');
      this.messageInput = document.getElementById('messageInput');
      this.chatMessages = document.getElementById('chatMessages');
      this.messageContainer = document.getElementById('chatMessages'); // 添加这一行
      this.attachmentPreview = document.getElementById('attachmentPreview');

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
          e.preventDefault(); // 阻止表单默认行为
          e.stopPropagation(); // 停止事件冒泡
          this.handleMessageSubmit();
          return false; // 确保不会继续传播
      });

      this.messageInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              this.handleMessageSubmit();
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
          modelType: 'text' // 新增字段，标记对话使用的模型类型
      };

      // Add to beginning of array (most recent first)
      this.conversations.unshift(newConversation);
      this.currentConversationId = newConversation.id;

      // 先保存会话
      this.saveConversations();

      // 清空聊天消息显示
      if (this.chatMessages) {
          this.chatMessages.innerHTML = '';
      }

      // 加载当前会话
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
  
  updateConversation(options) {
      const conversation = this.getConversationById(this.currentConversationId);
      if (conversation) {
          // 更新会话属性
          if (options.modelType) {
              conversation.modelType = options.modelType;
          }
          this.saveConversations();
          return true;
      }
      return false;
  }

  async handleMessageSubmit() {
      const prompt = this.messageInput.value.trim();
      const hasPdfFile = window.currentPdfFile !== undefined && window.currentPdfFile !== null;
      const hasAttachments = this.attachments && this.attachments.length > 0;

      if (!prompt && !hasAttachments && !hasPdfFile) return;

      const conversation = this.getConversationById(this.currentConversationId);
      if (!conversation) return;

      // 确定是否需要切换到多模态模型
      if (conversation.modelType === 'text' && (hasAttachments || hasPdfFile)) {
          conversation.modelType = 'multimodal';
          this.saveConversations();
      }

      // 创建用户消息对象
      const userMessage = {
          text: prompt,
          attachments: hasAttachments ? [...this.attachments] : [],
          sender: 'user',
          timestamp: new Date().toISOString()
      };

      // 如果有PDF文件，添加到消息附件中
      if (hasPdfFile) {
          if (!userMessage.attachments) {
              userMessage.attachments = [];
          }
          userMessage.attachments.push({
              name: window.currentPdfFile.name,
              type: 'pdf',
              size: window.currentPdfFile.size
          });
      }

      // Update conversation
      conversation.messages.push(userMessage);
      conversation.updatedAt = new Date().toISOString();

      // Update title if this is the first message
      if (conversation.messages.length === 1) {
          this.updateConversationTitle(this.currentConversationId, prompt);
      }

      this.saveConversations();
      this.renderMessage(userMessage);
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      this.attachments = []; // Clear attachments after sending

      try {
          let response;
          const isMultimodal = conversation.modelType === 'multimodal';
          
          // 无论是否有附件，都显示处理中提示
          this.renderMessage({
              text: hasPdfFile || hasAttachments ? "正在处理文件，请稍候..." : "正在思考中，请稍候...",
              sender: 'assistant',
              isTemporary: true,
              timestamp: new Date().toISOString()
          });
          
          if (hasPdfFile || hasAttachments) {

              const content = [{
                  type: "text",
                  text: prompt || "请分析文件内容，并总结主要信息"
              }];

              // 处理PDF文件
              if (hasPdfFile && window.currentPdfFile) {
                  const pdfBase64 = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                          const base64 = reader.result.split(',')[1];
                          resolve(base64);
                      };
                      reader.onerror = reject;
                      reader.readAsDataURL(window.currentPdfFile);
                  });

                  content.push({
                      type: "image_url",
                      image_url: {
                          url: `data:application/pdf;base64,${pdfBase64}`
                      }
                  });
              }

              // 处理图片附件
              if (hasAttachments && this.attachments) {
                  for (const attachment of this.attachments) {
                      if (attachment && attachment.type && attachment.type.startsWith('image/')) {
                          const base64 = await new Promise((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                  const base64 = reader.result.split(',')[1];
                                  resolve(base64);
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(attachment);
                          });

                          content.push({
                              type: "image_url",
                              image_url: {
                                  url: `data:${attachment.type};base64,${base64}`
                              }
                          });
                      }
                  }
              }

              response = await fetchApiResponse(content, true);
          } else {
              // 纯文本对话
              response = await fetchApiResponse({ text: prompt }, false);
          }

          // 安全检查：确保我们有有效的响应
          if (!response) {
              throw new Error("API返回了空响应");
          }

          // 移除临时处理消息
          const tempMessages = this.chatMessages.querySelectorAll('.temporary-message');
          tempMessages.forEach(msg => msg.remove());

          const aiMessage = {
              text: response,
              sender: 'assistant',
              timestamp: new Date().toISOString()
          };

          // Update conversation with AI response
          conversation.messages.push(aiMessage);
          conversation.updatedAt = new Date().toISOString();
          this.saveConversations();
          this.renderMessage(aiMessage);
      } catch (err) {
          console.error('Error:', err);
          
          // 移除临时处理消息
          const tempMessages = this.chatMessages.querySelectorAll('.temporary-message');
          tempMessages.forEach(msg => msg.remove());
          
          // 提供更友好的错误消息
          let errorText = "抱歉，处理您的请求时出错";
          if (err.message) {
              // 针对常见错误提供更具体的提示
              if (err.message.includes('API error: 401')) {
                  errorText += ": API认证失败，可能需要更新API密钥";
              } else if (err.message.includes('API error: 429')) {
                  errorText += ": 请求过于频繁，请稍后再试";
              } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                  errorText += ": 网络连接问题，请检查您的网络连接";
              } else {
                  errorText += ": " + err.message;
              }
          }
          
          const errorMessage = {
              text: errorText,
              sender: 'assistant',
              timestamp: new Date().toISOString()
          };
          conversation.messages.push(errorMessage);
          this.saveConversations();
          this.renderMessage(errorMessage);
      }

      // 清理附件
      this.attachments = []; // 重置为空数组而不是 null
      
      // 清理附件和选中文本，只隐藏而不清空内容
      const preview = document.getElementById('attachmentPreview');
      if (preview) preview.classList.add('d-none');
      const previewContainer = document.getElementById('previewContainer');
      if (previewContainer) previewContainer.innerHTML = '';

      // 清除PDF文件引用
      window.currentPdfFile = null;

      // 确保聊天区域可见
      const chatMessagesContainer = document.getElementById('chatMessages');
      if (chatMessagesContainer) {
          chatMessagesContainer.classList.remove('d-none');
      }
      
      // 确保滚动到底部显示最新消息
      this.scrollToBottom();
      
      // 确保消息输入框重新获得焦点
      if (this.messageInput) {
          this.messageInput.focus();
      }
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

  addMessage(message) {
      const conversation = this.getConversationById(this.currentConversationId);
      if (conversation) {
          conversation.messages.push(message);
          conversation.updatedAt = new Date().toISOString();
          this.renderMessage(message);
          this.scrollToBottom();
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
          textDiv.textContent = message.text;
          messageEl.appendChild(textDiv);
      }

      if (message.attachments && message.attachments.length > 0) {
          const attachmentsDiv = document.createElement('div');
          attachmentsDiv.className = 'message-attachments';
          message.attachments.forEach(attachment => {
              const attachmentElement = document.createElement('div');
              attachmentElement.className = 'attachment-item';

              // 文件图标
              const iconEl = document.createElement('i');

              if (attachment.type === 'pdf') {
                  iconEl.setAttribute('data-feather', 'file-text');
                  attachmentElement.appendChild(iconEl);

                  // 文件名
                  const nameSpan = document.createElement('span');
                  nameSpan.textContent = attachment.name;
                  nameSpan.className = 'ms-2';
                  attachmentElement.appendChild(nameSpan);

                  // 文件大小
                  if (attachment.size) {
                      const sizeSpan = document.createElement('span');
                      sizeSpan.textContent = `(${this.formatFileSize(attachment.size)})`;
                      sizeSpan.className = 'ms-2 text-muted';
                      attachmentElement.appendChild(sizeSpan);
                  }
              } else if (attachment.url) {
                  // 处理有URL的附件（如图片）
                  const link = document.createElement('a');
                  link.href = attachment.url;
                  link.textContent = attachment.name;
                  link.target = '_blank';
                  attachmentElement.appendChild(link);
              } else {
                  // 处理其他类型附件
                  iconEl.setAttribute('data-feather', 'paperclip');
                  attachmentElement.appendChild(iconEl);
                  attachmentElement.appendChild(document.createTextNode(attachment.name));
              }

              attachmentsDiv.appendChild(attachmentElement);
          });
          messageEl.appendChild(attachmentsDiv);
      }

      this.chatMessages.appendChild(messageEl);

      // 初始化Feather图标
      if (typeof feather !== 'undefined') {
          feather.replace();
      }
      
      // 每次添加消息后立即滚动到底部
      this.scrollToBottom();
  }

  // 添加格式化文件大小的辅助方法
  formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      else return (bytes / 1048576).toFixed(1) + ' MB';
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
          // 使用setTimeout确保滚动在DOM更新后执行
          setTimeout(() => {
              this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
              
              // 双重保险：如果第一次滚动不成功，再尝试一次
              setTimeout(() => {
                  this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
              }, 100);
          }, 10);
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
              // 确保 attachments 是数组
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

  // 辅助函数：将Blob转换为base64
  async blobToBase64(blob) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  }
}

// 独立的API请求函数
async function fetchApiResponse(content, isMultimodal = false) {
    const apiEndpoint = isMultimodal ? 
        "https://openrouter.ai/api/v1/chat/completions" :
        "https://api.siliconflow.cn/v1/chat/completions";

    const headers = isMultimodal ? {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://localhost:5001',
        'X-Title': 'Sider Chat'
    } : {
        'Authorization': 'Bearer sk-rebktjhdywuqfmulddzhdygglyrkeengnhlshvejdveeuwdw',
        'Content-Type': 'application/json'
    };

    const model = isMultimodal ? 
        "qwen/qwen2.5-vl-72b-instruct:free" :
        "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B";

    try {
        console.log('调用' + (isMultimodal ? 'Qwen' : 'DeepSeek') + ' API...');
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model,
                messages: [{
                    role: "user",
                    content: isMultimodal ? content : content.text || content
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API响应成功:', data); // 记录完整响应以便调试
        
        // 更强健的响应格式检查
        if (!data) {
            throw new Error('API返回空响应');
        }
        
        // 处理不同API可能返回的不同格式
        if (data.choices && data.choices[0]) {
            if (data.choices[0].message && data.choices[0].message.content) {
                return data.choices[0].message.content;
            } else if (data.choices[0].text) {
                return data.choices[0].text;
            } else if (data.choices[0].content) {
                return data.choices[0].content;
            }
        } else if (data.content) {
            return data.content;
        } else if (data.text) {
            return data.text;
        } else if (data.message) {
            return typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        }
        
        // 如果无法找到有效内容，记录错误并返回格式化的响应
        console.error('无法解析API响应:', data);
        throw new Error(`API响应格式错误: ${JSON.stringify(data).substring(0, 100)}...`);
    } catch (error) {
        console.error('Error fetching API response:', error);
        throw error;
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
