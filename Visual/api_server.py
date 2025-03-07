
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
from pdf_to_png_pymupdf import convert_pdf_to_pngs
from image_to_base64 import process_images_to_content
from Qwen import query_qwen

app = Flask(__name__)
CORS(app)  # 启用跨域请求支持

@app.route('/api/pdf_qa', methods=['POST'])
def pdf_qa():
    # 检查是否有文件
    if 'pdf_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['pdf_file']
    question = request.form.get('question', '这个PDF文件里有什么内容？')
    
    # 检查文件是否为空
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # 创建临时目录用于存储处理过程中的文件
        with tempfile.TemporaryDirectory() as temp_dir:
            # 保存上传的PDF文件
            filename = secure_filename(file.filename)
            pdf_path = os.path.join(temp_dir, filename)
            file.save(pdf_path)
            
            # 创建输出目录
            output_dir = os.path.join(temp_dir, 'png_images')
            os.makedirs(output_dir, exist_ok=True)
            
            # 转换PDF到PNG
            saved_images = convert_pdf_to_pngs(pdf_path, output_dir, 1024)
            
            # 处理图像并准备内容
            content = process_images_to_content(saved_images)
            
            # 修改内容中的问题
            if content and len(content) > 0 and content[0]['type'] == 'text':
                content[0]['text'] = question
            
            # 查询Qwen API
            response = query_qwen(content)
            
            # 从响应中提取回答
            answer = "无法获取回答"
            if 'choices' in response and len(response['choices']) > 0:
                if 'message' in response['choices'][0] and 'content' in response['choices'][0]['message']:
                    answer = response['choices'][0]['message']['content']
            
            return jsonify({'response': answer})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
