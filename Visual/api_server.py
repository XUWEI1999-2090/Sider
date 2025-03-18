from flask import Flask, request, jsonify
from flask_cors import CORS
from multimodal_handler import MultimodalHandler

app = Flask(__name__)
CORS(app)
handler = MultimodalHandler()

@app.route('/api/chat/multimodal', methods=['POST'])
async def handle_multimodal_chat():
    try:
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