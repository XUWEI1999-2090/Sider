
import os
from openai import OpenAI
import base64
import fitz  # PyMuPDF

class MultimodalHandler:
    def __init__(self):
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            print("警告: DASHSCOPE_API_KEY 未设置")
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

    def encode_image(self, image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def create_multimodal_content(self, image_paths, prompt="总结以下内容的大体结构，用中文回答。"):
        content = []
        content.append({
            "type": "text",
            "text": prompt
        })

        for image_path in image_paths:
            if os.path.exists(image_path):
                base64_img = self.encode_image(image_path)
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_img}"
                    }
                })
            else:
                print(f"File not found: {image_path}")
        return content

    def handle_pdf(self, pdf_file, output_dir="png_images"):
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        image_paths = []
        pdf_document = fitz.open(stream=pdf_file.read(), filetype="pdf")
        pdf_filename = "temp"

        for page_num in range(len(pdf_document)):
            try:
                page = pdf_document[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                output_path = os.path.join(output_dir, f"{pdf_filename}_page{page_num+1}.png")
                pix.save(output_path)
                image_paths.append(output_path)
                print(f"✅ 已保存第 {page_num+1} 页: {output_path}")
            except Exception as e:
                print(f"❌ 处理第 {page_num+1} 页时出错: {e}")

        pdf_document.close()
        return self.create_multimodal_content(image_paths)

    async def get_completion(self, queries, history=None):
        if history is None:
            history = []
        
        history.append({"role": "user", "content": queries})
        
        response = self.client.chat.completions.create(
            model="qwen2.5-vl-7b-instruct",
            messages=history,
            stream=True,
            stream_options={"include_usage": True}
        )

        full_response = ""
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                print(content, end='')
                full_response += content
                yield content

        history.append({"role": "assistant", "content": full_response})
        yield None  # Signal completion
