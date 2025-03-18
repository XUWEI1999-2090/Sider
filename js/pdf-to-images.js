/**
 * PDF 图像处理模块 - 将 PDF 文件转换为图像
 * 使用 PDF.js 库实现类似 PyMuPDF 的功能
 */

// PDF.js 库路径和配置
const PDFJS_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 加载 PDF.js 脚本
async function loadPdfJs() {
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

/**
 * 将 PDF 文件转换为多个页面图像
 * @param {File|Blob} pdfFile - PDF 文件对象
 * @returns {Promise<Array>} 包含每页图像数据的数组，格式为 {pageNumber, imageData, base64}
 */
async function convertPdfToImages(pdfFile) {
  try {
    console.log('开始处理 PDF 文件...');

    // 加载 PDF.js
    const pdfjs = await loadPdfJs();
    if (!pdfjs) {
      throw new Error('PDF.js 加载失败');
    }

    // 读取 PDF 文件为 ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // 加载 PDF 文档
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const totalPages = pdfDocument.numPages;
    console.log(`✓ PDF 文件加载成功，共 ${totalPages} 页`);

    // 存储所有页面图像
    const pageImages = [];

    // 处理每一页
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`处理第 ${pageNum} 页...`);

        // 获取页面
        const page = await pdfDocument.getPage(pageNum);

        // 设置比例因子
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // 创建 canvas 元素
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 渲染 PDF 页面到 canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // 获取图像数据和base64格式
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/png');

        pageImages.push({
          pageNumber: pageNum,
          imageData: imageData,
          base64: base64,
          dataUrl: base64
        });

        console.log(`✓ 第 ${pageNum} 页处理成功`);
      } catch (err) {
        console.error(`✗ 处理第 ${pageNum} 页时出错:`, err);
      }
    }

    console.log(`✓ 总共处理了 ${pageImages.length} 页`);
    return pageImages;
  } catch (error) {
    console.error('PDF 处理失败:', error);
    throw error;
  }
}

// 导出模块
window.pdfToImages = {
  convertPdfToImages
};