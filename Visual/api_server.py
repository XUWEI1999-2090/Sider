from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from multimodal_handler import MultimodalHandler
from flask import jsonify

app = Flask(__name__)
CORS(app)
handler = MultimodalHandler()

@app.route('/api/chat/multimodal', methods=['POST'])
async def handle_multimodal_chat():
    try:
        if not os.getenv("DASHSCOPE_API_KEY"):
            return jsonify({"error": "API认证失败，请确保DASHSCOPE_API_KEY环境变量已设置"}), 401
            
        data = request.json
        files = request.files

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