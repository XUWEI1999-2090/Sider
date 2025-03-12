import os
import sys
import tempfile
import base64
from io import BytesIO
import requests
from werkzeug.utils import secure_filename
import fitz
from PIL import Image

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
    
def convert_pdf_to_base64_images(pdf_path):
    """Convert PDF pages to base64 encoded images"""
    images = []
    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_bytes = BytesIO()
        pix.save(img_bytes, "png")
        img_bytes.seek(0)
        images.append(base64.b64encode(img_bytes.getvalue()).decode())
    doc.close()
    return images

def process_request(request):
    """处理请求，根据请求类型路由到相应的处理函数"""
    try:
        model_type = request.form.get('modelType', 'text')
        print(f"收到请求，模型类型: {model_type}")
        
        if model_type == 'multimodal':
            content = []
            text_prompt = request.form.get('prompt', '').strip()
            has_attachments = 'file' in request.files
            
            print(f"多模态请求 - 文本提示: {text_prompt}, 是否有附件: {has_attachments}")
            
            # 添加文本提示
            content.append({
                "type": "text",
                "text": text_prompt if text_prompt else "请分析文件内容，并总结主要信息"
            })
            
            if has_attachments:
                file = request.files['file']
                print(f"处理附件: {file.filename}, 类型: {file.content_type}")
                
                if is_pdf(file):
                    try:
                        # 读取PDF数据
                        pdf_data = file.read()
                        pdf_stream = BytesIO(pdf_data)
                        doc = fitz.open(stream=pdf_stream, filetype="pdf")
                        page_count = len(doc)
                        print(f"PDF文档页数: {page_count}")
                        
                        # 处理每一页
                        for page_num in range(page_count):
                            try:
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
                                
                                content.append({
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{img_base64}"
                                    }
                                })
                                print(f"成功处理第 {page_num + 1} 页")
                                
                            except Exception as e:
                                print(f"处理第 {page_num + 1} 页时出错: {str(e)}")
                                continue
                        
                        doc.close()
                        print(f"PDF处理完成，共转换 {len(content) - 1} 张图片")
                        
                    except Exception as e:
                        print(f"PDF处理错误: {str(e)}")
                        return {"error": f"PDF处理错误: {str(e)}"}, 500
                        
                elif is_image(file):
                    try:
                        # 直接读取图片数据
                        img_data = file.read()
                        img_base64 = base64.b64encode(img_data).decode()
                        content.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}"
                            }
                        })
                    except Exception as e:
                        print(f"图片处理错误: {str(e)}")
                        return {"error": f"图片处理错误: {str(e)}"}, 500
            
            # 调用 OpenRouter API
            try:
                print("准备调用多模态API，content长度:", len(content))
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": "Bearer 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",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:5001",
                        "X-Title": "Sider Chat"
                    },
                    json={
                        "model": "qwen/qwen2.5-vl-72b-instruct:free",
                        "messages": [{
                            "role": "user",
                            "content": content
                        }]
                    },
                    timeout=30
                )
                
                print("API响应状态码:", response.status_code)
                result = response.json()
                
                return {
                    "success": True,
                    "answer": extract_answer_from_response(result),
                    "model_type": "multimodal"
                }
            except Exception as e:
                print(f"调用多模态API出错: {str(e)}")
                return {"error": f"调用多模态模型出错: {str(e)}"}, 500
                
        else:
            # 纯文本处理
            text_prompt = request.form.get('prompt')
            if not text_prompt:
                return {"error": "文本模式需要提供prompt参数"}, 400
                
            try:
                response = call_text_llm(text_prompt)
                return {
                    "success": True,
                    "answer": extract_answer_from_response(response),
                    "model_type": "text"
                }
            except Exception as e:
                return {"error": f"调用文本模型出错: {str(e)}"}, 500
    except Exception as e:
        print(f"处理请求时发生错误: {str(e)}")
        return {"error": f"处理请求时出错: {str(e)}"}, 500

def call_text_llm(prompt):
    """调用 SiliconFlow 文本 API"""
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
    return response.json()

def call_multimodal_model(content):
    """调用 OpenRouter 多模态 API"""
    try:
        print("发送到 OpenRouter 的内容:", content)  # 打印请求内容
        
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": "Bearer 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",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5001",  # 修改为实际的 referer
                "X-Title": "Sider Chat"  # 修改为实际的应用名称
            },
            json={
                "model": "qwen/qwen2.5-vl-72b-instruct:free",
                "messages": [{
                    "role": "user",
                    "content": content
                }]
            },
            timeout=30  # 添加超时设置
        )
        
        # 打印完整的响应内容
        print("OpenRouter API 响应状态码:", response.status_code)
        print("OpenRouter API 响应头:", dict(response.headers))
        print("OpenRouter API 响应内容:", response.text)
        
        if response.status_code != 200:
            raise Exception(f"API 请求失败: HTTP {response.status_code} - {response.text}")
            
        return response.json()
        
    except requests.exceptions.Timeout:
        raise Exception("请求超时，请稍后重试")
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求错误: {str(e)}")
    except Exception as e:
        raise Exception(f"调用多模态API时出错: {str(e)}")

def extract_answer_from_response(response):
    """从API响应中提取答案"""
    try:
        print("正在解析API响应:", response)  # 打印完整响应
        
        if not isinstance(response, dict):
            raise ValueError("响应不是有效的JSON对象")
            
        if 'error' in response:
            raise ValueError(f"API返回错误: {response['error']}")
            
        if 'choices' not in response:
            raise ValueError("响应中没有 'choices' 字段")
            
        if not response['choices']:
            raise ValueError("choices 数组为空")
            
        if 'message' not in response['choices'][0]:
            raise ValueError("响应中没有 message 字段")
            
        if 'content' not in response['choices'][0]['message']:
            raise ValueError("消息中没有 content 字段")
            
        return response['choices'][0]['message']['content']
        
    except Exception as e:
        print(f"解析响应时出错: {str(e)}")
        print(f"原始响应: {response}")
        return f"处理AI响应时出错: {str(e)}"

def cleanup_temp_files(file_path, temp_dir):
    """清理临时文件和目录"""
    if os.path.exists(file_path):
        os.remove(file_path)
    try:
        os.rmdir(temp_dir)
    except:
        pass

