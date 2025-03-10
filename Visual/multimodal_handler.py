
import os
import sys
import tempfile
import base64
from io import BytesIO
import requests
from werkzeug.utils import secure_filename
from pdf_to_png_pymupdf import convert_pdf_to_pngs
import main

# 模型端点
TEXT_LLM_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions"
MULTIMODAL_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions"

# API密钥
API_KEY = "sk-rebktjhdywuqfmulddzhdygglyrkeengnhlshvejdveeuwdw"

def has_attachment(request):
    """检查请求是否包含附件"""
    return 'file' in request.files and request.files['file'].filename != ''

def is_pdf(file):
    """检查文件是否为PDF"""
    return file.filename.lower().endswith('.pdf')

def is_image(file):
    """检查文件是否为图像"""
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    return any(file.filename.lower().endswith(ext) for ext in allowed_extensions)

def save_temp_file(file):
    """将上传的文件保存到临时目录"""
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, secure_filename(file.filename))
    file.save(file_path)
    return file_path, temp_dir

def image_to_base64(image_path):
    """将图像转换为base64编码"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def process_request(request):
    """处理请求，根据请求类型路由到相应的处理函数"""
    prompt = request.form.get('prompt', "请问这个内容是关于什么的？")
    
    if has_attachment(request):
        file = request.files['file']
        if is_pdf(file):
            return process_pdf_request(file, prompt)
        elif is_image(file):
            return process_image_request(file, prompt)
        else:
            return {"error": "不支持的文件类型"}, 400
    else:
        return process_text_request(prompt)

def process_text_request(question):
    """处理纯文本请求"""
    try:
        response = call_text_llm(question)
        return {
            "success": True,
            "answer": extract_answer_from_response(response),
            "model_type": "text"
        }
    except Exception as e:
        print(f"处理文本请求出错: {str(e)}")
        return {"error": f"处理文本请求出错: {str(e)}"}, 500

def process_pdf_request(pdf_file, question):
    """处理PDF请求"""
    try:
        # 保存PDF文件
        pdf_path, temp_dir = save_temp_file(pdf_file)
        
        try:
            # 使用现有的处理逻辑
            processed_content = main.process_pdf_file(pdf_path)
            answer = main.answer_question(processed_content, question)
            
            return {
                "success": True,
                "answer": answer,
                "filename": pdf_file.filename,
                "model_type": "multimodal"
            }
        except Exception as e:
            print(f"处理PDF时出错: {str(e)}")
            return {"error": f"处理PDF时出错: {str(e)}"}, 500
        finally:
            # 清理临时文件
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            try:
                os.rmdir(temp_dir)
            except:
                pass
    except Exception as e:
        return {"error": f"处理PDF请求出错: {str(e)}"}, 500

def process_image_request(image_file, question):
    """处理图像请求"""
    try:
        # 保存图像文件
        image_path, temp_dir = save_temp_file(image_file)
        
        try:
            # 将图像转换为base64
            base64_image = image_to_base64(image_path)
            
            # 调用多模态模型
            response = call_multimodal_model([base64_image], question)
            
            return {
                "success": True,
                "answer": extract_answer_from_response(response),
                "filename": image_file.filename,
                "model_type": "multimodal"
            }
        except Exception as e:
            print(f"处理图像时出错: {str(e)}")
            return {"error": f"处理图像时出错: {str(e)}"}, 500
        finally:
            # 清理临时文件
            if os.path.exists(image_path):
                os.remove(image_path)
            try:
                os.rmdir(temp_dir)
            except:
                pass
    except Exception as e:
        return {"error": f"处理图像请求出错: {str(e)}"}, 500

def call_text_llm(question, context=None):
    """调用纯文本LLM"""
    response = requests.post(
        url=TEXT_LLM_ENDPOINT,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
            "messages": [{
                "role": "user",
                "content": question
            }]
        }
    )
    return response.json()

def call_multimodal_model(base64_images, question, context=None):
    """调用多模态模型"""
    # 如果在将来支持真正的多模态模型，可以更新此函数
    # 目前，我们使用与文本模型相同的模型，但将来可能需要更改
    
    # 构建包含图像的提示
    prompt = f"以下是提供的图像内容:\n\n"
    if base64_images and len(base64_images) > 0:
        prompt += f"我上传了{len(base64_images)}张图片。\n\n"
    
    prompt += f"问题: {question}\n\n请根据提供的图像内容回答这个问题。"
    
    response = requests.post(
        url=MULTIMODAL_ENDPOINT,
        headers={
            "Authorization": f"Bearer {API_KEY}",
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
    return response.json()

def extract_answer_from_response(response):
    """从API响应中提取答案"""
    if 'choices' in response and len(response['choices']) > 0:
        return response['choices'][0]['message']['content']
    else:
        return "无法从AI获取回答。"
