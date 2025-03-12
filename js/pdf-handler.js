/**
 * PDF处理器模块 - 处理PDF文件上传和与API交互
 */

class PDFHandler {
    constructor() {
        this.fileInput = null;
        this.initializeUploadButton();
    }

    /**
     * 初始化上传按钮
     */
    initializeUploadButton() {
        // 创建一个隐藏的文件输入框
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.pdf';
        this.fileInput.style.display = 'none';
        this.fileInput.id = 'pdfFileInput';
        document.body.appendChild(this.fileInput);

        // 添加文件选择事件处理
        this.fileInput.addEventListener('change', this.handleFileSelected.bind(this));

        // 查找并使用已有的上传按钮
        this.findExistingUploadButton();
    }

    /**
     * 查找已有的上传按钮
     */
    findExistingUploadButton() {
        // 查找已有的上传PDF按钮
        const existingBtn = document.querySelector('.input-group-append button[title="上传PDF文件"]');
        if (existingBtn) {
            // 添加点击事件监听器
            existingBtn.addEventListener('click', this.triggerFileSelection.bind(this));
        } else {
            console.error('未找到上传PDF按钮');
        }
    }

    /**
     * 触发文件选择对话框
     */
    triggerFileSelection() {
        this.fileInput.click();
    }

    /**
     * 处理选择的文件
     */
    handleFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 处理PDF文件
        handlePdfUpload(file);
    }
}


/**
 * 处理PDF文件上传
 * @param {File} file - 用户选择的PDF文件
 */
function handlePdfUpload(file) {
    // 显示附件预览区域
    const attachmentPreview = document.getElementById('attachmentPreview');
    const previewContainer = document.getElementById('previewContainer');

    // 确保预览区域可见
    attachmentPreview.classList.remove('d-none');

    // 创建文件预览元素
    const filePreviewDiv = document.createElement('div');
    filePreviewDiv.className = 'file-preview';
    filePreviewDiv.id = `file-preview-${Date.now()}`;

    // 创建文件图标
    const fileIconEl = document.createElement('i');
    fileIconEl.setAttribute('data-feather', 'file-text');

    // 创建文件名元素
    const fileNameEl = document.createElement('span');
    fileNameEl.textContent = file.name;
    fileNameEl.className = 'ms-2';

    // 创建文件预览内容包装器（使其与截图预览结构一致）
    const previewContent = document.createElement('div');
    previewContent.className = 'preview-content';
    
    // 创建关闭按钮（使用与截图预览相同的样式）
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-close';
    closeBtn.innerHTML = '<i data-feather="x"></i>';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');

    // 创建文件图标和名称的包装器
    const fileInfoDiv = document.createElement('div');
    fileInfoDiv.className = 'file-info';
    fileInfoDiv.style.display = 'flex';
    fileInfoDiv.style.alignItems = 'center';
    fileInfoDiv.style.padding = '8px 12px';
    fileInfoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
    fileInfoDiv.style.borderRadius = '4px';
    fileInfoDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    // 添加关闭按钮事件
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        filePreviewDiv.remove();

        // 如果没有预览项目，隐藏预览区域
        if (previewContainer.children.length === 0) {
            attachmentPreview.classList.add('d-none');
        }

        // 重置文件输入
        document.getElementById('pdfFileInput').value = '';
        window.currentPdfFile = null;
    });

    // 组装文件信息元素
    fileInfoDiv.appendChild(fileIconEl);
    fileInfoDiv.appendChild(fileNameEl);
    
    // 组装预览元素
    previewContent.appendChild(fileInfoDiv);
    previewContent.appendChild(closeBtn);
    filePreviewDiv.appendChild(previewContent);

    // 添加到预览容器
    previewContainer.appendChild(filePreviewDiv);

    // 初始化Feather图标
    feather.replace();

    // 存储文件引用，用于后续发送
    filePreviewDiv.dataset.file = JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type
    });

    // 也将文件对象存储在全局变量中（实际应用中可能需要更好的方式）
    window.currentPdfFile = file;
    
    console.log("已选择文件:", file.name);
}

/**
 * 直接在浏览器中处理PDF文件并获取回答
 * @param {string} content - 用户输入的消息
 * @returns {Promise<string>} - 处理结果
 */
async function processPdfAndGetAnswer(content) {
    if (!window.currentPdfFile) {
        return "请先上传PDF文件。";
    }

    try {
        console.log('开始处理PDF文件:', window.currentPdfFile.name);
        
        // 显示处理状态
        const statusMessage = "正在处理PDF文件，请稍候...";
        const tempMessage = { role: 'assistant', content: statusMessage };
        // 如果存在消息显示函数，则显示临时消息
        if (window.chatManager && window.chatManager.displayMessage) {
            window.chatManager.displayMessage(tempMessage);
        }
        
        // 第1步：将PDF转换为图像
        const pageImages = await window.pdfToImages.convertPdfToImages(window.currentPdfFile);
        console.log('✓ PDF转换为图像完成，共获取', pageImages.length, '页');
        
        // 第2步：准备多模态内容格式
        const prompt = content || "这个PDF文档里包含什么信息？";
        const multimodalContent = window.pdfToImages.prepareMultimodalContent(pageImages, prompt);
        console.log('✓ 多模态内容准备完成:', multimodalContent.length, '个元素');
        
        // 第3步：调用API
        console.log('开始调用模型API...');
        
        // 使用配置文件中的 API 信息
        const apiUrl = window.apiConfig.endpoint;
        const apiKey = window.apiConfig.apiKey;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey ? `Bearer ${apiKey}` : undefined
            },
            body: JSON.stringify({
                model: window.apiConfig.model,
                messages: [
                    {
                        role: 'user',
                        content: multimodalContent
                    }
                ],
                max_tokens: window.apiConfig.maxTokens
            })
        });

        // 检查响应状态
        if (!response.ok) {
            console.error('API响应错误:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('错误响应内容:', errorText);
            return `调用API时出错 (${response.status}): ${errorText || response.statusText}`;
        }

        // 解析API响应
        const data = await response.json();
        console.log('✓ API响应成功:', data);
        
        // 提取回答内容
        const answer = data.choices?.[0]?.message?.content || "无法从API获取有效回答。";
        return answer;
        
    } catch (error) {
        console.error('PDF处理错误:', error);
        return `处理PDF时出错: ${error.message}`;
    }
}

// 导出处理PDF文件的函数供其他模块使用
window.processPdfAndGetAnswer = processPdfAndGetAnswer;

// 在页面加载完成后初始化PDF处理器
document.addEventListener('DOMContentLoaded', () => {
    window.pdfHandler = new PDFHandler();
});