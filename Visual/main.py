from pdf_to_png_pymupdf import convert_pdf_to_pngs
from image_to_base64 import process_images_to_content
from Qwen import query_qwen

def main():
    # PDF conversion parameters
    pdf_path = r"gnarly_pdfs\skinnypage.pdf"
    output_dir = "png_images"
    image_dim = 1024
    
    # Step 1: Convert PDF to PNGs and get image paths
    saved_images = convert_pdf_to_pngs(pdf_path, output_dir, image_dim)
    
    # Step 2: Convert images to base64 and format content
    content = process_images_to_content(saved_images)
    
    # Step 3: Query Qwen API and print response
    response = query_qwen(content)
    print("API Response:", response)

if __name__ == "__main__":
    main()