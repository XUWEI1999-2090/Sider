
import os
import sys
import fitz  # PyMuPDF
import base64
import time
from io import BytesIO
import requests
import json

def pdf_to_text(pdf_path):
    """从PDF提取文本内容"""
    text_content = ""
    try:
        # 打开PDF文件
        doc = fitz.open(pdf_path)
        # 遍历PDF的每一页
        for page_num in range(len(doc)):
            # 获取当前页面
            page = doc.load_page(page_num)
            # 提取文本
            text_content += page.get_text()
        doc.close()
        return text_content
    except Exception as e:
        print(f"PDF转文本出错: {e}")
        return ""

def pdf_to_images(pdf_path):
    """将PDF转换为图片列表"""
    images = []
    try:
        # 打开PDF文件
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            # 获取页面
            page = doc.load_page(page_num)
            # 将页面渲染为图像
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            
            # 将图像转换为base64编码
            img_bytes = BytesIO()
            pix.save(img_bytes, "png")
            img_bytes.seek(0)
            img_base64 = base64.b64encode(img_bytes.read()).decode('utf-8')
            
            # 将图像添加到列表中
            images.append(f"data:image/png;base64,{img_base64}")
        
        doc.close()
        return images
    except Exception as e:
        print(f"PDF转图像出错: {e}")
        return []

def process_pdf_file(pdf_path):
    """处理PDF文件，提取文本和图像"""
    # 提取文本
    text_content = pdf_to_text(pdf_path)
    
    # 转换为图像
    images = pdf_to_images(pdf_path)
    
    # 构建处理后的内容
    processed_content = {
        "text": text_content,
        "images": images,
        "page_count": len(images),
        "filename": os.path.basename(pdf_path),
        "processed_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    }
    
    return processed_content

def answer_question(processed_content, question):
    """使用Qwen模型回答关于PDF内容的问题"""
    try:
        # 构建包含文本和图像的提示
        prompt = f"以下是PDF文档的内容:\n\n{processed_content['text']}\n\n"
        
        if processed_content['images'] and len(processed_content['images']) > 0:
            prompt += f"PDF有{processed_content['page_count']}页。\n\n"
        
        prompt += f"问题: {question}\n\n请根据以上PDF内容回答这个问题。"
        
        # 调用深度学习模型API
        response = requests.post(
            url="https://api.siliconflow.cn/v1/chat/completions",
            headers={
                "Authorization": "Bearer sk-rebktjhdywuqfmulddzhdygglyrkeengnhlshvejdveeuwdw",
                "Content-Type": "application/json"
            },
            json={
                "model": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            }
        )
        
        # 解析响应
        response_data = response.json()
        if 'choices' in response_data and len(response_data['choices']) > 0:
            answer = response_data['choices'][0]['message']['content']
            return answer
        else:
            return "无法从AI获取回答。"
    except Exception as e:
        print(f"获取回答出错: {e}")
        return f"获取回答时出错: {str(e)}"

# 测试代码
if __name__ == "__main__":
    # 如果提供了命令行参数，则使用第一个参数作为PDF文件路径
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        question = sys.argv[2] if len(sys.argv) > 2 else "这个PDF文档的主要内容是什么？"
        
        print(f"处理文件: {pdf_path}")
        processed_content = process_pdf_file(pdf_path)
        
        print(f"问题: {question}")
        answer = answer_question(processed_content, question)
        
        print(f"回答: {answer}")
    else:
        print("请提供PDF文件路径作为命令行参数。")
