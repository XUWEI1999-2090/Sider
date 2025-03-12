
document.addEventListener('DOMContentLoaded', () => {
    const uploadPdfBtn = document.getElementById('uploadPdfBtn');
    const processingIndicator = document.getElementById('processingIndicator');
    
    if (!uploadPdfBtn) return;
    
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'pdfFileInput';
    document.body.appendChild(fileInput);
    
    // 点击按钮时触发文件选择
    uploadPdfBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 监听文件选择事件
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            console.log('已选择文件:', file.name);
            
            // 不再显示处理指示器，只显示附件预览
            
            // 如果当前有选中的文本，添加到消息中
            let selectedTexts = window.selectedTexts || [];
            
            // 存储PDF文件到全局变量，以便在chat.js中处理
            window.currentPdfFile = file;
            
            // 添加到预览区域
            const previewContainer = document.getElementById('previewContainer');
            const attachmentPreview = document.getElementById('attachmentPreview');
            
            if (previewContainer && attachmentPreview) {
                // 显示预览区域
                attachmentPreview.classList.remove('d-none');
                
                // 创建预览元素
                const previewContent = document.createElement('div');
                previewContent.className = 'preview-content file-preview';
                
                const iconEl = document.createElement('i');
                iconEl.setAttribute('data-feather', 'file-text');
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = file.name;
                nameSpan.className = 'ms-2';
                
                const sizeSpan = document.createElement('span');
                sizeSpan.textContent = `(${formatFileSize(file.size)})`;
                sizeSpan.className = 'ms-2 text-muted';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-close';
                removeBtn.innerHTML = '<i data-feather="x"></i>';
                
                previewContent.appendChild(iconEl);
                previewContent.appendChild(nameSpan);
                previewContent.appendChild(sizeSpan);
                previewContent.appendChild(removeBtn);
                previewContainer.appendChild(previewContent);
                
                // 设置删除按钮事件
                removeBtn.onclick = () => {
                    previewContent.remove();
                    window.currentPdfFile = null;
                    
                    // 如果没有其他预览内容，隐藏整个预览区域
                    if (!previewContainer.querySelector('.preview-content')) {
                        attachmentPreview.classList.add('d-none');
                    }
                };
                
                // 初始化Feather图标
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }
            
            // 清空文件输入
            fileInput.value = '';
            
        } catch (error) {
            console.error('文件处理错误:', error);
            
            window.currentPdfFile = null;
            
            // 隐藏处理指示器（以防万一）
            if (processingIndicator) {
                processingIndicator.classList.add('d-none');
            }
        }
    });
    
    // 文件大小格式化辅助函数
    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // 处理PDF文件 - 现在只用于处理发送按钮点击后的操作
    async function processPdfFile(file, selectedTexts) {
        console.log('处理PDF文件:', file.name);
        // 不再需要处理逻辑，文件已经通过预览展示给用户
        return true;
    }
    
    // 读取文件为ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    // 转换PDF为图像
    async function convertPdfToImages(arrayBuffer) {
        // 检查PDF.js是否可用
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js库未加载，无法处理PDF文件');
        }
        
        // 加载PDF文档
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pages = [];
        
        // 处理每一页
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            // 创建canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // 渲染PDF页面到canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // 转换canvas为dataURL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            pages.push({
                pageNum: i,
                dataUrl: dataUrl
            });
        }
        
        return pages;
    }
    
    // 简化API处理函数，由于我们将PDF处理逻辑移到了chat.js中，这个函数简化了
    async function callApiWithContent(contentItems) {
        console.log('调用Qwen API...');
        
        try {
            // 简化为单纯的API成功记录
            console.log('API响应成功');
        } catch (error) {
            console.error('API调用失败:', error);
            throw new Error('API error: ' + (error.status || error.message || '未知错误'));
        }
    }
});
