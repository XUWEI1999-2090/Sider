from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import multimodal_handler

app = Flask(__name__)
CORS(app)  # 启用CORS以支持从浏览器扩展发起的请求

@app.route('/', methods=['GET'])
def index():
    """提供API服务的根路径响应"""
    return jsonify({
        "status": "ok",
        "message": "API服务器正在运行",
        "endpoints": [
            "/api/query - 处理多模态查询请求"
        ]
    })

@app.route('/api/query', methods=['POST'])
def process_query():
    """处理各种类型的查询请求（包括纯文本、图像和PDF）"""
    try:
        # 获取请求参数
        model_type = request.form.get('modelType', 'text')
        prompt = request.form.get('prompt', '')
        has_file = 'file' in request.files
        
        print(f"收到请求 - 模型类型: {model_type}, 提示: {prompt}, 是否有文件: {has_file}")
        
        # 调用处理函数
        result = multimodal_handler.process_request(request)
        
        # 如果返回元组，表示有错误码
        if isinstance(result, tuple) and len(result) == 2:
            return jsonify(result[0]), result[1]
        
        return jsonify(result)
        
    except Exception as e:
        print(f"处理查询请求时出错: {str(e)}")
        return jsonify({
            "error": f"处理查询请求时出错: {str(e)}",
            "success": False
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
