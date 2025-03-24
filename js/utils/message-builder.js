class BuildMessages {
    constructor() {
        this.messages = [];
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
            const pdfData = await pdfFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
            let text = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }

            this.messages.push({
                "role": "user",
                "content": text
            });

            return this.messages;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            return this.messages;
        }
    }
}

window.BuildMessages = BuildMessages;