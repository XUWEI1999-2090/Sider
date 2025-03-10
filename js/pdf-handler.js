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

    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close ms-auto';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');

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

    // 组装预览元素
    filePreviewDiv.appendChild(fileIconEl);
    filePreviewDiv.appendChild(fileNameEl);
    filePreviewDiv.appendChild(closeBtn);

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
 * 发送PDF文件到服务器并获取回答
 * @param {string} message - 用户输入的消息
 * @returns {Promise<string>} - 处理结果
 */
async function processPdfAndGetAnswer(message) {
    if (!window.currentPdfFile) {
        return "请先上传PDF文件。";
    }

    try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', window.currentPdfFile);
        formData.append('prompt', message || "这个PDF文档里包含什么信息？");

        // 显示加载状态
        const loadingMessage = "正在处理PDF文件，请稍候...";

        // 发送请求到API服务器
        const response = await fetch('http://localhost:5000/api/upload-pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '处理PDF时出错');
        }

        const data = await response.json();

        // 清除当前PDF文件引用
        window.currentPdfFile = null;

        // 清除预览
        const attachmentPreview = document.getElementById('attachmentPreview');
        const previewContainer = document.getElementById('previewContainer');
        previewContainer.innerHTML = '';
        attachmentPreview.classList.add('d-none');

        // 重置文件输入
        document.getElementById('pdfFileInput').value = '';

        return data.answer || "无法从AI获取回答。";

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