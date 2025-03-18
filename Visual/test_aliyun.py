import os
from openai import OpenAI
import base64
import fitz  # PyMuPDF
import os

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
class ParsingInput:
    def __init__(self, pdf_path, output_dir="png_images"):
        self.pdf_path = pdf_path
        self.output_dir = output_dir
    def parsing_images(self, image_paths):
        content = []

        # Add initial text message
        content.append({
            "type": "text",
            "text": "总结以下内容的大体结构，用中文回答。"
        })

        # Process each provided image path
        for image_path in image_paths:
            if os.path.exists(image_path):
                base64_img = encode_image(image_path)
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_img}"
                    }
                })
            else:
                print(f"File not found: {image_path}")

        # 将内容包装在正确的消息格式中
        return content

    def parsing_pdf(self):
        # 确定输出目录
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

        # 打开PDF文件
        pdf_document = fitz.open(self.pdf_path)
        image_paths = []

        # 获取PDF文件名（不含扩展名）
        pdf_filename = os.path.splitext(os.path.basename(self.pdf_path))[0]

        # 遍历每一页
        for page_num in range(len(pdf_document)):
            try:
                # 获取页面
                page = pdf_document.load_page(page_num)

                # 渲染为图像，放大系数为2以提高清晰度
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

                # 构造输出文件路径
                output_path = os.path.join(self.output_dir, f"{pdf_filename}_page{page_num+1}.png")

                # 保存图像
                pix.save(output_path)
                image_paths.append(output_path)  # Collect image paths
                print(f"✅ 已保存第 {page_num+1} 页: {output_path}")

            except Exception as e:
                print(f"❌ 处理第 {page_num+1} 页时出错: {e}")

        # 关闭PDF文档
        pdf_document.close()

        # Call create_messages_with_images with the collected image paths
        return self.parsing_images(image_paths)

def chat_with_history(queries, history=None):
    if history is None:
        history = []  # 初始化 history 为一个空列表
    history.append({"role": "user", "content": queries})

    response = client.chat.completions.create(
        model="qwen2.5-vl-7b-instruct",
        # messages=[
        #     {
        #         "role": "user",
        #         "content": queries
        #     }
        # ],
        messages=history,
        stream=True,
        stream_options={"include_usage": True}
    )

    # 处理响应
    full_response = ""
    for chunk in response:
        if chunk.choices and len(chunk.choices) > 0:
            if chunk.choices[0].delta and chunk.choices[0].delta.content is not None:
                output = chunk.choices[0].delta.content
                print(output, end='')
                full_response += output

    history.append({"role": "assistant", "content": full_response})  # 将助手的响应添加到历史记录
    return history

# 多轮对话示例
parsing_input_instance = ParsingInput(r"../gnarly_pdfs/horribleocr.pdf")
# 第一轮对话
messages = parsing_input_instance.parsing_pdf()
history = chat_with_history(messages)

# 第二轮对话
messages = "统计这篇文献的图表数目"
history = chat_with_history(messages, history)

# 第三轮对话
messages = "没有统计表"
history = chat_with_history(messages, history)
