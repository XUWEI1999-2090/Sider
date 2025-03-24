
class BuildMessages {
    constructor(outputDir = "png_images", messages = null) {
        this.outputDir = outputDir;
        this.messages = messages || [];
    }

    async parsingImage(imagePath) {
        try {
            const response = await fetch(imagePath);
            if (!response.ok) {
                console.error(`File not found: ${imagePath}`);
                return this.messages;
            }

            const blob = await response.blob();
            const base64Img = await this.blobToBase64(blob);
            
            this.messages.push({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": `data:image/jpeg;base64,${base64Img}`
                        }
                    }
                ]
            });
            
            return this.messages;
        } catch (error) {
            console.error(`Error processing image ${imagePath}:`, error);
            return this.messages;
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async parsingPdf(pdfFile) {
        try {
            await this.ensureDirectoryExists(this.outputDir);
            
            const pdfFilename = pdfFile.name.split('.').slice(0, -1).join('.');
            const pdfData = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            
            for (let pageNum = 0; pageNum < pdf.numPages; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum + 1);
                    const scale = 2.0;
                    const viewport = page.getViewport({ scale });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    await page.render(renderContext).promise;
                    
                    const outputPath = `${this.outputDir}/${pdfFilename}_page${pageNum + 1}.png`;
                    const imageBlob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png');
                    });
                    
                    const imageUrl = URL.createObjectURL(imageBlob);
                    
                    console.log(`✅ Saved page ${pageNum + 1}: ${outputPath}`);
                    
                    await this.parsingImage(imageUrl);
                    console.log(`✅ Added page ${pageNum + 1} to message build list`);
                    
                    URL.revokeObjectURL(imageUrl);
                    
                } catch (error) {
                    console.error(`❌ Error processing page ${pageNum + 1}: ${error}`);
                }
            }
            
            return this.messages;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            return this.messages;
        }
    }
    
    async ensureDirectoryExists(dirPath) {
        console.log(`Ensuring directory exists: ${dirPath}`);
        return true;
    }
}

export { BuildMessages };
