class TextBuffer {
    constructor(maxLength = 1500) { // Réduit à 1500 pour plus de sécurité
        this.buffer = '';
        this.maxLength = maxLength;
    }

    append(text) {
        this.buffer += text;
    }

    shouldFlush() {
        // Si le buffer dépasse la limite maximale
        if (this.buffer.length >= this.maxLength) {
            return true;
        }

        // Si on a une phrase complète
        const lastPeriod = this.buffer.search(/[.!?]\s[A-Z]/);
        return lastPeriod !== -1 && lastPeriod < this.maxLength;
    }

    flush() {
        let text = '';
        
        if (this.buffer.length > this.maxLength) {
            // Chercher le dernier point ou espace avant la limite
            const lastBreak = this.buffer.substring(0, this.maxLength).search(/[.!?\s][^\s]*$/);
            
            if (lastBreak !== -1) {
                text = this.buffer.substring(0, lastBreak + 1);
                this.buffer = this.buffer.substring(lastBreak + 1).trim();
            } else {
                // Si pas de point trouvé, couper au dernier espace
                const lastSpace = this.buffer.substring(0, this.maxLength).lastIndexOf(' ');
                if (lastSpace !== -1) {
                    text = this.buffer.substring(0, lastSpace);
                    this.buffer = this.buffer.substring(lastSpace + 1);
                } else {
                    // En dernier recours, couper à la limite
                    text = this.buffer.substring(0, this.maxLength);
                    this.buffer = this.buffer.substring(this.maxLength);
                }
            }
        } else {
            text = this.buffer;
            this.buffer = '';
        }

        return text.trim();
    }
}

module.exports = TextBuffer;
