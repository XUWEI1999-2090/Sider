
import os
import base64
import fitz  # PyMuPDF
from openai import OpenAI

class MultimodalHandler:
    def __init__(self):
        self.client = OpenAI(
            api_key="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",
            base_url="https://openrouter.ai/api/v1",
        )
        
    def encode_image(self, image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def create_multimodal_content(self, image_paths, prompt="总结以下内容的大体结构，用中文回答。"):
        content = [{"type": "text", "text": prompt}]
        
        for image_path in image_paths:
            if os.path.exists(image_path):
                base64_img = self.encode_image(image_path)
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_img}"
                    }
                })
        return content

    def handle_pdf(self, pdf_file, output_dir="../png_images"):
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        image_paths = []
        pdf_document = fitz.open(stream=pdf_file.read(), filetype="pdf")
        
        for page_num in range(len(pdf_document)):
            try:
                page = pdf_document[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                output_path = os.path.join(output_dir, f"temp_page_{page_num+1}.png")
                pix.save(output_path)
                image_paths.append(output_path)
            except Exception as e:
                print(f"处理第 {page_num+1} 页时出错: {e}")
                
        pdf_document.close()
        return self.create_multimodal_content(image_paths)

    async def get_completion(self, messages, history=None):
        if history is None:
            history = []
            
        history.append({"role": "user", "content": messages})
        
        response = self.client.chat.completions.create(
            model="qwen/qwen2.5-vl-72b-instruct:free",
            messages=history,
            stream=True,
            stream_options={"include_usage": True}
        )

        full_response = ""
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield content

        history.append({"role": "assistant", "content": full_response})
        yield None  # Signal completion and send history through the last yield
