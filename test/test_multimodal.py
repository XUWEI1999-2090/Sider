import os
import fitz
import base64
from io import BytesIO
import requests
import json
from PIL import Image
from Qwen import query_qwen

def test_single_image(image_path):
    """测试单个图片的处理"""
    print(f"\n=== 测试图片处理 ===")
    print(f"测试文件: {image_path}")
    
    try:
        # 读取并转换图片
        with open(image_path, 'rb') as img_file:
            img_data = img_file.read()
            img_base64 = base64.b64encode(img_data).decode()
        
        # 构造请求内容
        content = [
            {
                "type": "text",
                "text": "请分析文件内容，并总结主要信息"
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{img_base64}"
                }
            }
        ]
        
        # 调用API
        print("调用 Qwen API...")
        response = query_qwen(content)
        
        # 打印结果
        print("\n=== API响应 ===")
        print(json.dumps(response, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")

def test_pdf_processing(pdf_path):
    """测试PDF处理"""
    print(f"\n=== 测试PDF处理 ===")
    print(f"测试文件: {pdf_path}")
    
    try:
        # 读取PDF
        with open(pdf_path, 'rb') as f:
            pdf_data = f.read()
        print("✓ PDF文件读取成功")
        
        # 构造基础内容
        content = [
            {
                "type": "text",
                "text": "请分析文件内容，并总结主要信息"
            }
        ]
        
        # 处理PDF页面
        pdf_stream = BytesIO(pdf_data)
        doc = fitz.open(stream=pdf_stream, filetype="pdf")
        page_count = len(doc)
        print(f"✓ PDF页数: {page_count}")
        
        # 处理每一页
        for page_num in range(page_count):
            try:
                print(f"\n处理第 {page_num + 1} 页...")
                page = doc.load_page(page_num)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                
                # 转换为PIL图像
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # 保存为PNG
                img_bytes = BytesIO()
                img.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                
                # 转换为base64
                img_base64 = base64.b64encode(img_bytes.getvalue()).decode()
                
                # 添加到content
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                })
                print(f"✓ 第 {page_num + 1} 页处理成功")
                
            except Exception as e:
                print(f"✗ 处理第 {page_num + 1} 页时出错: {str(e)}")
        
        doc.close()
        print(f"\n✓ 总共处理了 {len(content) - 1} 页图片")
        
        # 调用API
        print("\n=== 调用 Qwen API ===")
        response = query_qwen(content)
        
        # 打印结果
        print("\n=== API响应 ===")
        print(json.dumps(response, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")

def test_combined_input(image_path, pdf_path, text_prompt):
    """测试组合输入（图片+PDF+文本）"""
    print(f"\n=== 测试组合输入 ===")
    
    try:
        content = [
            {
                "type": "text",
                "text": text_prompt
            }
        ]
        
        # 添加图片
        if image_path and os.path.exists(image_path):
            with open(image_path, 'rb') as img_file:
                img_data = img_file.read()
                img_base64 = base64.b64encode(img_data).decode()
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                })
                print("✓ 图片添加成功")
        
        # 添加PDF页面
        if pdf_path and os.path.exists(pdf_path):
            doc = fitz.open(pdf_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img_bytes = BytesIO()
                img.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                img_base64 = base64.b64encode(img_bytes.getvalue()).decode()
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}"
                    }
                })
                print(f"✓ PDF第 {page_num + 1} 页添加成功")
            doc.close()
        
        # 调用API
        print("\n=== 调用 Qwen API ===")
        response = query_qwen(content)
        
        # 打印结果
        print("\n=== API响应 ===")
        print(json.dumps(response, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")

if __name__ == "__main__":
    # 获取当前脚本所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 测试文件路径
    test_pdf = os.path.join(current_dir, "..", "gnarly_pdfs", "ambiguous.pdf")
    test_image = os.path.join(current_dir, "..", "png_images", "ambiguous_page1.png")
    
    # 运行测试
    print("=== 开始测试套件 ===")
    
    # 测试1：单图片
    if os.path.exists(test_image):
        test_single_image(test_image)
    
    # 测试2：PDF文档
    if os.path.exists(test_pdf):
        test_pdf_processing(test_pdf)
    
    # 测试3：组合输入
    test_combined_input(
        test_image,
        test_pdf,
        "请分析这些图片和PDF中的内容，并总结主要信息"
    ) 