
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
from werkzeug.utils import secure_filename
from pdf_to_png_pymupdf import convert_pdf_to_pngs
import main
import multimodal_handler

app = Flask(__name__)
CORS(app)  # 启用CORS以支持从浏览器扩展发起的请求

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """处理上传的PDF文件并返回问答结果（保持向后兼容性）"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "没有上传文件"}), 400

        file = request.files['file']
        prompt = request.form.get('prompt', "请问这个PDF文档包含什么内容？")

        if file.filename == '':
            return jsonify({"error": "未选择文件"}), 400

        if file and file.filename.lower().endswith('.pdf'):
            # 创建临时文件保存上传的PDF
            temp_dir = tempfile.mkdtemp()
            pdf_path = os.path.join(temp_dir, secure_filename(file.filename))
            file.save(pdf_path)

            # 处理PDF文件
            print(f"处理PDF文件: {pdf_path}")
            try:
                # 调用main.py中的函数处理PDF并获取问答结果
                processed_content = main.process_pdf_file(pdf_path)
                answer = main.answer_question(processed_content, prompt)

                # 返回处理结果
                return jsonify({
                    "success": True,
                    "answer": answer,
                    "filename": file.filename
                })
            except Exception as e:
                print(f"处理PDF时出错: {str(e)}")
                return jsonify({"error": f"处理PDF时出错: {str(e)}"}), 500
            finally:
                # 清理临时文件
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                try:
                    os.rmdir(temp_dir)
                except:
                    pass
        else:
            return jsonify({"error": "请上传PDF文件"}), 400
    except Exception as e:
        return jsonify({"error": f"处理请求时出错: {str(e)}"}), 500

@app.route('/api/query', methods=['POST'])
def process_query():
    """处理各种类型的查询请求（包括纯文本、图像和PDF）"""
    try:
        result = multimodal_handler.process_request(request)
        
        # 如果返回元组，表示有错误码
        if isinstance(result, tuple) and len(result) == 2:
            return jsonify(result[0]), result[1]
        
        return jsonify(result)
    except Exception as e:
        print(f"处理查询请求时出错: {str(e)}")
        return jsonify({"error": f"处理查询请求时出错: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
