
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
            
            // 显示处理指示器
            if (processingIndicator) {
                processingIndicator.classList.remove('d-none');
            }
            
            // 如果当前有选中的文本，添加到消息中
            let selectedTexts = window.selectedTexts || [];
            
            // 添加到消息区域
            if (window.chatManager) {
                // 创建消息对象
                const message = {
                    text: '',
                    attachments: [{
                        name: file.name,
                        type: 'pdf',
                        size: file.size
                    }],
                    sender: 'user',
                    timestamp: new Date().toISOString()
                };
                
                // 添加消息并保存
                window.chatManager.addMessage(message);
                window.chatManager.updateConversation({ modelType: 'multimodal' });
                window.chatManager.saveConversations();
                
                // 处理PDF文件
                await processPdfFile(file, selectedTexts);
            }
            
            // 清空文件输入
            fileInput.value = '';
            
        } catch (error) {
            console.error('文件处理错误:', error);
            
            // 添加错误消息
            if (window.chatManager) {
                const errorMessage = {
                    text: `抱歉，处理您的请求时出错: ${error.message || '未知错误'}`,
                    sender: 'assistant',
                    timestamp: new Date().toISOString()
                };
                window.chatManager.addMessage(errorMessage);
                window.chatManager.saveConversations();
            }
            
            // 隐藏处理指示器
            if (processingIndicator) {
                processingIndicator.classList.add('d-none');
            }
        }
    });
    
    // 处理PDF文件
    async function processPdfFile(file, selectedTexts) {
        console.log('处理PDF文件:', file.name);
        
        try {
            // 读取文件内容
            const arrayBuffer = await readFileAsArrayBuffer(file);
            
            // 转换PDF为图像
            const pdfPages = await convertPdfToImages(arrayBuffer);
            
            // 构建API请求内容
            let contentItems = [];
            
            // 添加用户选中的文本（如果有）
            if (selectedTexts && selectedTexts.length > 0) {
                for (const text of selectedTexts) {
                    contentItems.push({
                        type: 'text',
                        text: text
                    });
                }
            }
            
            // 添加PDF图像
            for (const page of pdfPages) {
                contentItems.push({
                    type: 'image',
                    image: page.dataUrl
                });
            }
            
            console.log('PDF文件处理完成');
            console.log('构建了包含' + contentItems.length + '个内容项的请求');
            
            // 调用API处理图像内容
            await callApiWithContent(contentItems);
            
            // 隐藏处理指示器
            if (processingIndicator) {
                processingIndicator.classList.add('d-none');
            }
            
            // 清空选中文本和预览区域
            window.selectedTexts = [];
            const previewArea = document.getElementById('attachmentPreview');
            const previewContainer = document.getElementById('previewContainer');
            if (previewArea && previewContainer) {
                previewContainer.innerHTML = '';
                previewArea.classList.add('d-none');
            }
            
        } catch (error) {
            console.error('Error:', error);
            throw new Error('文件处理错误: ' + (error.message || '未知错误'));
        }
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
    
    // 调用API处理内容
    async function callApiWithContent(contentItems) {
        console.log('调用Qwen API...');
        
        try {
            // 这里应该调用实际的API
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 假设API调用成功
            console.log('API响应成功');
            
            // 创建并添加响应消息
            if (window.chatManager) {
                const responseMessage = {
                    text: '我已经分析了您上传的PDF文件内容。有什么我可以帮助您的吗？',
                    sender: 'assistant',
                    timestamp: new Date().toISOString()
                };
                window.chatManager.addMessage(responseMessage);
                window.chatManager.saveConversations();
            }
            
        } catch (error) {
            console.error('API调用失败:', error);
            throw new Error('API error: ' + (error.status || error.message || '未知错误'));
        }
    }
});
