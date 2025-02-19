class TextBuffer {
    constructor(maxLength = 1900) { // 1900 pour garder une marge de sécurité avec la limite Discord de 2000
        this.buffer = '';
        this.maxLength = maxLength;
    }

    append(text) {
        this.buffer += text;
    }

    shouldFlush() {
        // Vérifie si on a une phrase complète et si on approche de la limite
        return this.buffer.length >= this.maxLength || 
               (this.buffer.length > 0 && this.buffer.match(/[.!?]\s*$/));
    }

    flush() {
        const text = this.buffer;
        this.buffer = '';
        return text;
    }
}

module.exports = TextBuffer;
