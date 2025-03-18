from flask import Flask, request, jsonify, redirect, url_for
from flask_cors import CORS
import os
from multimodal_handler import MultimodalHandler
from flask import jsonify

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "API Server is running"
handler = MultimodalHandler()

@app.route('/api/chat/multimodal', methods=['POST'])
async def handle_multimodal_chat():
    try:
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            return jsonify({"error": "API认证失败：DASHSCOPE_API_KEY未设置"}), 401
            
        data = request.json
        files = request.files
        
        if not data and not files:
            return jsonify({"error": "未收到有效的请求数据"}), 400

        if 'pdf' in files:
            content = handler.handle_pdf(files['pdf'])
        else:
            content = data.get('content')

        history = data.get('history', [])
        response = handler.get_completion(content, history)

        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)