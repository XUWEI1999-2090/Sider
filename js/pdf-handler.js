
// PDF处理和问答功能
document.addEventListener('DOMContentLoaded', () => {
    const pdfFileInput = document.getElementById('pdfFileInput');
    const pdfQuestionSection = document.getElementById('pdfQuestionSection');
    const pdfQuestion = document.getElementById('pdfQuestion');
    const askPdfBtn = document.getElementById('askPdfBtn');
    const progressBar = document.getElementById('pdfProgressBar');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    
    let currentPdfFile = null;
    
    // 监听文件上传
    pdfFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            currentPdfFile = file;
            pdfQuestionSection.style.display = 'block';
            // 显示文件名
            console.log(`已选择文件: ${file.name}`);
        } else {
            pdfQuestionSection.style.display = 'none';
            currentPdfFile = null;
            if (file) {
                alert('请选择PDF文件');
                pdfFileInput.value = '';
            }
        }
    });
    
    // 监听提问按钮点击
    askPdfBtn.addEventListener('click', () => {
        if (!currentPdfFile) {
            alert('请先选择PDF文件');
            return;
        }
        
        const question = pdfQuestion.value.trim();
        if (!question) {
            alert('请输入问题');
            return;
        }
        
        // 显示进度条
        progressBar.style.display = 'block';
        progressBarInner.style.width = '10%';
        progressBarInner.setAttribute('aria-valuenow', '10');
        
        processPdfAndAsk(currentPdfFile, question);
    });
    
    // 处理PDF并提问
    function processPdfAndAsk(pdfFile, question) {
        // 创建FormData对象，用于发送文件
        const formData = new FormData();
        formData.append('pdf_file', pdfFile);
        formData.append('question', question);
        
        // 更新进度
        progressBarInner.style.width = '30%';
        progressBarInner.setAttribute('aria-valuenow', '30');
        
        // 调用后端API
        fetch('http://localhost:5000/api/pdf_qa', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            // 更新进度
            progressBarInner.style.width = '70%';
            progressBarInner.setAttribute('aria-valuenow', '70');
            return response.json();
        })
        .then(data => {
            // 处理返回的数据
            progressBarInner.style.width = '100%';
            progressBarInner.setAttribute('aria-valuenow', '100');
            
            // 添加到聊天界面
            const chatContainer = document.getElementById('chatContainer');
            
            // 添加用户问题
            const userMsgDiv = document.createElement('div');
            userMsgDiv.className = 'message user-message';
            userMsgDiv.innerHTML = `<div class="message-content">${question}</div>`;
            chatContainer.appendChild(userMsgDiv);
            
            // 添加AI回答
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'message assistant-message';
            aiMsgDiv.innerHTML = `<div class="message-content">${data.response}</div>`;
            chatContainer.appendChild(aiMsgDiv);
            
            // 滚动到底部
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            // 隐藏进度条
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressBarInner.style.width = '0%';
            }, 1000);
        })
        .catch(error => {
            console.error('处理PDF时出错:', error);
            alert('PDF处理失败: ' + error.message);
            progressBar.style.display = 'none';
        });
    }
});
