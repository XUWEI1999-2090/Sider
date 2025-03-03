
document.addEventListener('DOMContentLoaded', () => {
    // 初始化选中文本数组
    window.selectedTexts = [];
    
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
    
    // 设置按钮相关
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.querySelector('.btn-close-settings');
    const darkModeToggle = document.getElementById('darkMode');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // 初始化暗色模式
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }

    // 切换设置面板
    function toggleSettings() {
        settingsPanel.classList.toggle('active');
    }

    // 绑定设置按钮事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettings);
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', toggleSettings);
    }

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
