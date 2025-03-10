
/**
 * PDF处理器模块 - 处理PDF文件上传和处理
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

        // 创建上传按钮并添加到界面
        this.createUploadButton();
    }

    /**
     * 创建上传按钮
     */
    createUploadButton() {
        // 创建上传按钮
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'btn btn-action';
        uploadBtn.id = 'uploadPdfBtn';
        uploadBtn.title = '上传PDF';
        
        // 添加PDF图标
        const icon = document.createElement('i');
        icon.setAttribute('data-feather', 'file-text');
        uploadBtn.appendChild(icon);
        
        // 查找输入组
        const inputGroup = document.querySelector('.input-group-append');
        if (inputGroup) {
            // 插入到截图按钮之前
            inputGroup.insertBefore(uploadBtn, document.getElementById('screenshotBtn'));
            // 初始化Feather图标
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            // 添加点击事件监听器
            uploadBtn.addEventListener('click', this.triggerFileSelection.bind(this));
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
        
        console.log('已选择文件:', file.name);
        
        // 显示附件预览区域
        const attachmentPreview = document.getElementById('attachmentPreview');
        if (attachmentPreview) {
            attachmentPreview.classList.remove('d-none');
            
            // 清空预览区域
            const previewContainer = document.getElementById('previewContainer');
            if (previewContainer) {
                previewContainer.innerHTML = '';
                
                // 创建文件预览元素
                const filePreview = document.createElement('div');
                filePreview.className = 'file-preview';
                filePreview.style.position = 'relative';
                filePreview.style.display = 'flex';
                filePreview.style.alignItems = 'center';
                
                const fileIcon = document.createElement('i');
                fileIcon.setAttribute('data-feather', 'file-text');
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                fileName.style.marginLeft = '8px';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-close';
                removeBtn.innerHTML = '<i data-feather="x"></i>';
                removeBtn.style.position = 'absolute';
                removeBtn.style.right = '5px';
                removeBtn.style.top = '50%';
                removeBtn.style.transform = 'translateY(-50%)';
                removeBtn.style.backgroundColor = 'transparent';
                removeBtn.style.border = 'none';
                removeBtn.style.padding = '2px';
                
                // 添加删除按钮功能
                removeBtn.addEventListener('click', () => {
                    attachmentPreview.classList.add('d-none');
                    previewContainer.innerHTML = '';
                    // 重置文件输入，允许再次上传相同文件
                    this.fileInput.value = '';
                });
                
                filePreview.appendChild(fileIcon);
                filePreview.appendChild(fileName);
                filePreview.appendChild(removeBtn);
                previewContainer.appendChild(filePreview);
                
                // 刷新图标
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
        }
        
        // 处理PDF文件
        this.processPDF(file);
    }

    /**
     * 处理PDF文件
     */
    processPDF(file) {
        // 创建一个FormData对象来发送文件
        const formData = new FormData();
        formData.append('pdf_file', file);
        
        try {
            // 创建文件读取器获取文件内容
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = e.target.result;
                
                // 在本地环境中显示PDF内容
                this.displayPDFContent(file.name, fileData);
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('处理PDF时出错:', error);
        }
    }

    /**
     * 显示PDF内容
     */
    displayPDFContent(fileName, fileData) {
        // 获取聊天管理器实例
        const chatManager = window.chatManager;
        if (!chatManager) {
            console.error('无法获取聊天管理器实例');
            return;
        }
        
        // 向聊天添加PDF附件消息
        chatManager.addMessage({
            role: 'user',
            content: `我上传了PDF文件: ${fileName}。请帮我分析这个文档。`,
            timestamp: new Date().toISOString(),
            hasAttachment: true,
            attachmentType: 'pdf',
            attachmentName: fileName
        });
        
        // 清空输入框
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
        }
    }
}

// 在页面加载完成后初始化PDF处理器
document.addEventListener('DOMContentLoaded', () => {
    window.pdfHandler = new PDFHandler();
});
