import base64
import os
from Qwen import query_qwen

def get_image_base64(image_path):
    """
    读取图像文件并转换为 base64 编码
    
    参数:
    - image_path: 图像文件路径
    
    返回:
    - base64 编码的图像数据URI
    """
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode("utf-8")
        
    # 根据文件扩展名确定 MIME 类型
    file_ext = os.path.splitext(image_path)[1].lower()
    if file_ext in ['.jpg', '.jpeg']:
        mime_type = 'image/jpeg'
    elif file_ext == '.png':
        mime_type = 'image/png'
    elif file_ext == '.webp':
        mime_type = 'image/webp'
    else:
        mime_type = 'image/jpeg'  # 默认使用 jpeg
        
    return f"data:{mime_type};base64,{base64_image}"

def process_images_to_content(image_paths):
    """
    Convert multiple images to base64 and format content for Qwen API
    
    Parameters:
    - image_paths: list of image file paths
    
    Returns:
    - list: formatted content for Qwen API
    """
    content = []
    
    # Add initial text question
    content.append({
        "type": "text",
        "text": "这张图片中有什么？"
    })
    
    # Add each image as base64
    for image_path in image_paths:
        base64_image = get_image_base64(image_path)
        content.append({
            "type": "image_url",
            "image_url": {
                "url": base64_image
            }
        })
    
    return content

# 示例用法
if __name__ == "__main__":
    image_path = r"png_images\ambiguous_page1.png"  # 替换为您的图像路径
    content = process_images_to_content(image_path)   
    
    print("已准备好content内容")