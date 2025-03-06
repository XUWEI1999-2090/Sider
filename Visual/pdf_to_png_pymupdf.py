#!/usr/bin/env python
import os
import fitz  # PyMuPDF
from PIL import Image
from Qwen import query_qwen  # 添加这行导入

def convert_pdf_to_pngs(pdf_path, output_dir, image_dim=1024):
    """
    将PDF文件转换为PNG图像，每页生成一个PNG文件，使用PyMuPDF库
    
    参数:
    - pdf_path: PDF文件路径
    - output_dir: 输出目录
    - image_dim: 图像最长边的目标尺寸
    
    返回:
    - dict: 包含所有生成图片路径的消息模板
    """
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取PDF文件名(不含扩展名)
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    saved_images = []  # 用于存储成功保存的图片路径
    
    try:
        # 打开PDF文件
        pdf_document = fitz.open(pdf_path)
        num_pages = pdf_document.page_count
        
        print(f"PDF '{pdf_path}' 共有 {num_pages} 页")
        
        # 处理每一页
        for page_num in range(num_pages):
            try:
                # 获取页面
                page = pdf_document[page_num]
                
                # 计算缩放比例，使最长边为image_dim
                orig_width, orig_height = page.rect.width, page.rect.height
                scale_factor = image_dim / max(orig_width, orig_height)
                
                # 设置渲染参数
                mat = fitz.Matrix(scale_factor, scale_factor)
                
                # 渲染页面为像素图
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                # 转换为PIL图像进行保存
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # 构建输出文件路径
                output_path = os.path.join(output_dir, f"{base_name}_page{page_num+1}.png")
                
                # 保存为PNG
                img.save(output_path, format="PNG")
                saved_images.append(output_path)  # 添加保存成功的图片路径
                
                print(f"✅ 已保存第 {page_num+1} 页: {output_path}")
                
            except Exception as e:
                print(f"❌ 处理第 {page_num+1} 页时出错: {e}")
        
        # 关闭PDF文档
        pdf_document.close()
        
    except Exception as e:
        print(f"❌ 打开PDF文件时出错: {e}")
    
    print("PDF转换完成") 
    return saved_images

if __name__ == "__main__":
    # 直接在这里设置参数
    pdf_path = r"gnarly_pdfs\ambiguous.pdf"  # PDF文件路径
    output_dir = "png_images"   # 输出目录
    image_dim = 1024           # 图像最长边的目标尺寸
    
    content = convert_pdf_to_pngs(pdf_path, output_dir, image_dim)


