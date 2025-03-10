
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from pdf_to_png_pymupdf import convert_pdf_to_pngs
from image_to_base64 import process_images_to_content
from Qwen import query_qwen
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # 启用CORS以允许浏览器扩展调用API

# 配置上传文件夹
UPLOAD_FOLDER = 'uploads'
OUTPUT_DIR = 'png_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制上传大小为16MB

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and file.filename.lower().endswith('.pdf'):
        # 生成唯一文件名
        filename = str(uuid.uuid4()) + '.pdf'
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # 处理PDF文件
            image_dim = 1024  # 图像尺寸
            saved_images = convert_pdf_to_pngs(filepath, OUTPUT_DIR, image_dim)
            
            # 将图像转换为内容格式
            content = process_images_to_content(saved_images)
            
            # 查询Qwen API
            prompt = request.form.get('prompt', '这个PDF文档里包含什么信息？')
            
            # 修改content的第一个文本元素
            if content and len(content) > 0 and content[0]['type'] == 'text':
                content[0]['text'] = prompt
            
            response = query_qwen(content)
            
            # 从API响应中提取回答
            answer = ''
            if 'choices' in response and len(response['choices']) > 0:
                message = response['choices'][0].get('message', {})
                answer = message.get('content', '')
            
            return jsonify({
                'status': 'success',
                'answer': answer,
                'original_response': response
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            # 清理临时文件
            try:
                os.remove(filepath)
            except:
                pass
    
    return jsonify({'error': 'Invalid file format. Please upload a PDF file.'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
