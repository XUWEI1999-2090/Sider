
/**
 * PDF 图像处理模块 - 将 PDF 文件转换为图像
 * 使用 PDF.js 库实现类似 PyMuPDF 的功能
 */

// PDF.js 库路径
const pdfJsLib = window.pdfjsLib;

// 确保 PDF.js 加载
if (!pdfJsLib) {
  console.error('PDF.js 库未加载！');
}

/**
 * 将 PDF 文件转换为多个页面图像
 * @param {File|Blob} pdfFile - PDF 文件对象
 * @returns {Promise<Array>} 包含每页图像数据的数组，格式为 {pageNumber, imageData, base64}
 */
async function convertPdfToImages(pdfFile) {
  try {
    console.log('开始处理 PDF 文件...');
    
    // 读取 PDF 文件为 ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // 加载 PDF 文档
    const loadingTask = pdfJsLib.getDocument({ data: arrayBuffer });
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
        
        // 设置比例因子，类似于 PyMuPDF 中的 Matrix(2, 2)
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
        
        // 将 canvas 转换为图像数据
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // 获取 base64 格式
        const base64 = canvas.toDataURL('image/png');
        
        // 添加到结果数组
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

/**
 * 将 PDF 页面图像转换为类似 test_multimodal.py 中的内容格式
 * @param {Array} pageImages - PDF 页面图像数组
 * @param {string} prompt - 用户提示
 * @returns {Array} 符合 API 要求的内容数组
 */
function prepareMultimodalContent(pageImages, prompt = "请分析文件内容，并总结主要信息") {
  // 构造基础内容
  const content = [
    {
      "type": "text",
      "text": prompt
    }
  ];
  
  // 添加每页图像
  pageImages.forEach(page => {
    content.push({
      "type": "image_url",
      "image_url": {
        "url": page.dataUrl
      }
    });
  });
  
  return content;
}

// 处理图片为base64
async function imageToBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}

// 准备多模态内容
async function prepareMultimodalContent(files, prompt = "请分析文件内容，并总结主要信息") {
  console.log("准备处理文件数量:", files.length);
  const content = [{
    type: "text",
    text: prompt
  }];

  for (const file of files) {
    if (file.type === 'application/pdf') {
      const images = await convertPdfToImages(file);
      for (const image of images) {
        content.push({
          type: "image_url",
          image_url: {
            url: image.dataUrl
          }
        });
      }
    } else if (file.type.startsWith('image/')) {
      const base64 = await imageToBase64(file);
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${file.type};base64,${base64}`
        }
      });
    }
  }

  return content;
}

// 导出模块
window.pdfToImages = {
  convertPdfToImages,
  prepareMultimodalContent,
  imageToBase64
};
