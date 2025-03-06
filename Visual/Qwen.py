import requests
import json

def query_qwen(content):
    """
    调用 Qwen API 分析图片
    
    参数:
    - image_url: 图片的URL地址
    
    返回:
    - dict: API 响应的 JSON 数据
    """
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": "Bearer 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",
            "Content-Type": "application/json",
            "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional. Site URL for rankings on openrouter.ai.
            "X-Title": "<YOUR_SITE_NAME>",  # Optional. Site title for rankings on openrouter.ai.
        },
        data=json.dumps({
            "model": "qwen/qwen2.5-vl-72b-instruct:free",
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ],
        })
    )
    return response.json()