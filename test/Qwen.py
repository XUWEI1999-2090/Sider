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