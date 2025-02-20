const pdfParse = require('pdf-parse');
const https = require('https');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');

class FileParser {
    static async downloadFile(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
    }

    static async parsePDF(buffer) {
        const data = await pdfParse(buffer);
        return data.text;
    }

    static async parseImage(buffer) {
        // Optimiser l'image pour l'OCR
        const processedBuffer = await sharp(buffer)
            .grayscale()
            .normalize()
            .toBuffer();

        const worker = await createWorker('fra+eng');
        const { data: { text } } = await worker.recognize(processedBuffer);
        await worker.terminate();
        return text;
    }

    static async parseText(buffer) {
        return buffer.toString('utf-8');
    }

    static async parseFile(url, type) {
        const buffer = await this.downloadFile(url);
        
        switch(type) {
            case 'pdf':
                return await this.parsePDF(buffer);
            case 'image':
                return await this.parseImage(buffer);
            case 'text':
                return await this.parseText(buffer);
            default:
                throw new Error('Type de fichier non supporté');
        }
    }

    static getFileType(contentType) {
        if (contentType?.includes('pdf')) return 'pdf';
        if (contentType?.includes('image')) return 'image';
        if (contentType?.includes('text')) return 'text';
        return null;
    }
}

module.exports = FileParser;
