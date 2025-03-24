document.addEventListener("DOMContentLoaded", () => {
    const uploadPdfBtn = document.getElementById("uploadPdfBtn");
    const processingIndicator = document.getElementById("processingIndicator");

    if (!uploadPdfBtn) return;

    // 创建文件输入元素
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf";
    fileInput.style.display = "none";
    fileInput.id = "pdfFileInput";
    document.body.appendChild(fileInput);

    // 点击按钮时触发文件选择
    uploadPdfBtn.addEventListener("click", () => {
        fileInput.click();
    });

    // 监听文件选择事件
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            console.log("已选择文件:", file.name);

            // 存储PDF文件到全局变量，以便在chat.js中处理
            window.currentPdfFile = file;

            // 添加到预览区域
            const previewContainer = document.getElementById("previewContainer");
            const attachmentPreview = document.getElementById("attachmentPreview");

            if (previewContainer && attachmentPreview) {
                attachmentPreview.classList.remove("d-none");

                const previewContent = document.createElement("div");
                previewContent.className = "preview-content file-preview";
                previewContent.innerHTML = `
                    <i data-feather="file-text"></i>
                    <span class="ms-2">${file.name}</span>
                    <span class="ms-2 text-muted">(${formatFileSize(file.size)})</span>
                    <button class="btn btn-close"><i data-feather="x"></i></button>
                `;

                previewContainer.appendChild(previewContent);

                // 设置删除按钮事件
                const removeBtn = previewContent.querySelector('.btn-close');
                if (removeBtn) {
                    removeBtn.onclick = () => {
                        previewContent.remove();
                        window.currentPdfFile = null;

                        // 如果没有其他预览内容，隐藏整个预览区域
                        if (!previewContainer.querySelector(".preview-content")) {
                            attachmentPreview.classList.add("d-none");
                        }
                    };
                }

                // 初始化Feather图标
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }

            // 清空文件输入
            fileInput.value = "";
        } catch (error) {
            console.error("文件处理错误:", error);
            window.currentPdfFile = null;
        }
    });
});

// 文件大小格式化辅助函数
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
}