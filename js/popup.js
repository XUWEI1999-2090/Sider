
document.addEventListener('DOMContentLoaded', () => {
    // 初始化选中文本数组
    window.selectedTexts = [];
    
    // 我们不需要在这里创建新对话，因为ChatManager的构造函数中已经处理了
    // 当没有现有对话时才会创建新对话
    
    // 检查是否在Chrome扩展环境中
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        // 监听来自background的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'NEW_SELECTED_TEXT') {
                // 显示选中文本预览
                showSelectedTextPreview(request.text);
            }
            return true; // 保持消息通道开放
        });
        
        // 获取之前选中的文本
        try {
            chrome.runtime.sendMessage({ type: 'GET_SELECTED_TEXTS' }, (response) => {
                if (response && response.selectedTexts && response.selectedTexts.length > 0) {
                    window.selectedTexts = response.selectedTexts;
                    response.selectedTexts.forEach(text => {
                        showSelectedTextPreview(text);
                    });
                }
            });
        } catch (e) {
            console.warn('Chrome扩展API可能不可用:', e);
        }
    } else {
        console.warn('未检测到Chrome扩展API，可能在普通网页环境中运行');
        // 在非扩展环境中添加模拟数据用于测试
        if (window.location.hostname.includes('replit.com') || window.location.hostname === 'localhost') {
            setTimeout(() => {
                showSelectedTextPreview('这是一个测试选中的文本，用于展示功能');
            }, 1000);
        }
    }
    
    // 按钮和面板相关
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.querySelector('.btn-close-settings');
    const darkModeToggle = document.getElementById('darkMode');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const newChatBtn = document.getElementById('newChatBtn');
    const historyBtn = document.getElementById('historyBtn');
    const historyPanel = document.getElementById('historyPanel');
    const closeHistoryBtn = document.querySelector('.btn-close-history');
    const conversationsList = document.getElementById('conversationsList');
    const noConversationsMsg = document.getElementById('noConversationsMsg');

    // 初始化暗色模式
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }

    // 切换设置面板
    function toggleSettings() {
        settingsPanel.classList.toggle('active');
        // 确保历史面板关闭
        historyPanel.classList.remove('active');
    }
    
    // 切换历史记录面板
    function toggleHistory() {
        const isActive = historyPanel.classList.contains('active');
        historyPanel.classList.toggle('active');
        
        // 确保设置面板关闭
        settingsPanel.classList.remove('active');
        
        // 如果是打开历史面板，则更新历史记录列表
        if (!isActive && window.chatManager && conversationsList) {
            console.log('打开历史面板，正在加载历史数据...');
            
            // 确保我们有最新的会话数据
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get(['conversations'], (result) => {
                    console.log('从Chrome Storage加载会话数据:', result);
                    
                    if (result.conversations && Array.isArray(result.conversations)) {
                        window.chatManager.conversations = result.conversations;
                        console.log(`已加载 ${result.conversations.length} 个会话`);
                    } else {
                        console.log('未找到会话数据或数据格式不正确');
                    }
                    
                    // 渲染会话列表
                    window.chatManager.renderConversations(conversationsList);
                    
                    // 显示或隐藏"暂无历史对话"消息
                    if (window.chatManager.conversations && window.chatManager.conversations.length > 0) {
                        if (noConversationsMsg) noConversationsMsg.style.display = 'none';
                    } else {
                        if (noConversationsMsg) noConversationsMsg.style.display = 'block';
                    }
                });
            } else {
                // 从localStorage加载数据
                const savedConversations = localStorage.getItem('conversations');
                if (savedConversations) {
                    try {
                        window.chatManager.conversations = JSON.parse(savedConversations);
                        console.log(`从localStorage加载了 ${window.chatManager.conversations.length} 个会话`);
                    } catch (e) {
                        console.error('解析会话数据时出错:', e);
                    }
                }
                
                // 渲染会话列表
                window.chatManager.renderConversations(conversationsList);
                
                // 显示或隐藏"暂无历史对话"消息
                if (window.chatManager.conversations && window.chatManager.conversations.length > 0) {
                    if (noConversationsMsg) noConversationsMsg.style.display = 'none';
                } else {
                    if (noConversationsMsg) noConversationsMsg.style.display = 'block';
                }
            }
        }
    }
    
    // 新建对话
    function createNewChat() {
        if (window.chatManager) {
            window.chatManager.createNewConversation();
            
            // 关闭历史面板
            historyPanel.classList.remove('active');
        }
    }

    // 绑定设置按钮事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettings);
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', toggleSettings);
    }
    
    // 绑定历史按钮事件
    if (historyBtn) {
        historyBtn.addEventListener('click', toggleHistory);
    }
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', toggleHistory);
    }
    
    // 绑定新建对话按钮事件
    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewChat);
    }
    
    // 注意：对话列表点击事件处理已移至ChatManager.renderConversations方法中
    // 这样可以避免事件处理冲突，并确保事件绑定在正确的元素上

    // 暗色模式切换
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function(e) {
            const isDark = e.target.checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('darkMode', isDark);
        });
    }

    // 清除历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            if (window.confirm('确定要清除所有聊天记录吗？')) {
                if (window.chatManager) {
                    window.chatManager.clearHistory();
                }
                toggleSettings();
            }
        });
    }

    // 响应式设计处理
    function handleResize() {
        const width = window.innerWidth;
        document.documentElement.style.setProperty(
            '--sidebar-width',
            width <= 576 ? '100%' : '360px'
        );

        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            msg.style.maxWidth = width <= 576 ? '90%' : '85%';
        });
    }

    // 初始调用和窗口大小改变事件监听
    handleResize();
    window.addEventListener('resize', handleResize);

    // 输入框自动调整高度
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    // 初始化Feather图标
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});


// 显示选中文本预览
function showSelectedTextPreview(text) {
    if (!text || text.trim() === '') return;
    
    // 添加到全局数组
    if (!window.selectedTexts) {
        window.selectedTexts = [];
    }
    window.selectedTexts.push(text);
    
    // 显示预览区域
    const previewArea = document.getElementById('attachmentPreview');
    if (previewArea) {
        previewArea.classList.remove('d-none');
    }
    
    // 创建预览元素
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
        // 检查是否需要添加清空全部按钮
        if (previewContainer.querySelector('.clear-all-btn') === null && window.selectedTexts.length > 0) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'btn btn-sm btn-outline-danger clear-all-btn';
            clearAllBtn.textContent = '清空全部';
            clearAllBtn.style.marginBottom = '8px';
            clearAllBtn.addEventListener('click', () => {
                // 清空所有选中文本
                window.selectedTexts = [];
                // 移除所有预览元素但保留清空按钮
                const textPreviews = previewContainer.querySelectorAll('.selected-text-preview');
                textPreviews.forEach(el => el.remove());
                
                // 如果没有截图预览，则隐藏整个预览区域
                const screenshotPreviews = previewContainer.querySelectorAll('.screenshot-preview');
                if (screenshotPreviews.length === 0) {
                    previewArea.classList.add('d-none');
                    // 同时也移除清空按钮
                    clearAllBtn.remove();
                }
            });
            
            previewContainer.insertBefore(clearAllBtn, previewContainer.firstChild);
        }
        
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-content selected-text-preview';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'selected-text-content';
        textDiv.textContent = text;
        
        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-close';
        deleteBtn.setAttribute('aria-label', 'Close');
        deleteBtn.addEventListener('click', () => {
            // 从DOM和数组中移除
            previewContainer.removeChild(previewItem);
            const index = window.selectedTexts.indexOf(text);
            if (index > -1) {
                window.selectedTexts.splice(index, 1);
            }
            
            // 如果没有选中文本了但还有清空按钮，则移除清空按钮
            if (window.selectedTexts.length === 0) {
                const clearBtn = previewContainer.querySelector('.clear-all-btn');
                if (clearBtn) clearBtn.remove();
            }
            
            // 如果没有预览内容了，隐藏预览区域
            if (previewContainer.children.length === 0 || 
                (previewContainer.children.length === 1 && previewContainer.querySelector('.clear-all-btn'))) {
                previewArea.classList.add('d-none');
            }
        });
        
        previewItem.appendChild(textDiv);
        previewItem.appendChild(deleteBtn);
        previewContainer.appendChild(previewItem);
    }
}
