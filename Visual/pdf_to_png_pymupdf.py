#!/usr/bin/env python
import os
import fitz  # PyMuPDF
from PIL import Image
import io
import sys

def convert_pdf_to_pngs(pdf_path, output_dir=None):
    """
    将PDF文件转换为PNG图像

    参数:
    pdf_path (str): PDF文件路径
    output_dir (str, optional): 输出目录，如果不指定，返回内存中的图像数据

    返回:
    list: 如果指定了output_dir，返回保存的图像文件路径列表；否则返回图像数据列表
    """
    # 确定输出目录
    save_to_file = output_dir is not None
    if save_to_file and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 打开PDF文件
    pdf_document = fitz.open(pdf_path)
    results = []

    # 获取PDF文件名（不含扩展名）
    pdf_filename = os.path.splitext(os.path.basename(pdf_path))[0]

    # 遍历每一页
    for page_num in range(len(pdf_document)):
        try:
            # 获取页面
            page = pdf_document.load_page(page_num)

            # 渲染为图像，放大系数为2以提高清晰度
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

            if save_to_file:
                # 构造输出文件路径
                output_path = os.path.join(output_dir, f"{pdf_filename}_page{page_num+1}.png")

                # 保存图像
                pix.save(output_path)
                results.append(output_path)
                print(f"✅ 已保存第 {page_num+1} 页: {output_path}")
            else:
                # 将图像数据返回
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                results.append(img)
                print(f"✅ 已处理第 {page_num+1} 页")

        except Exception as e:
            print(f"❌ 处理第 {page_num+1} 页时出错: {e}")

    # 关闭PDF文档
    pdf_document.close()

    return results

if __name__ == "__main__":
    # 测试函数
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        output_dir = "png_images" if len(sys.argv) <= 2 else sys.argv[2]
        convert_pdf_to_pngs(pdf_path, output_dir)
    else:
        print("用法: python pdf_to_png_pymupdf.py [PDF文件路径] [输出目录(可选)]")