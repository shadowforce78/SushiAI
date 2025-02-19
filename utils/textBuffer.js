class TextBuffer {
    constructor(maxLength = 1500) {
        this.buffer = '';
        this.maxLength = maxLength;
    }

    append(text) {
        this.buffer += text;
    }

    shouldFlush() {
        return this.buffer.length >= this.maxLength;
    }

    flush() {
        let text = '';
        
        if (this.buffer.length > this.maxLength) {
            // Regex pour trouver les points de coupure sûrs
            // Évite de couper les mentions Discord (<@...>), les emojis et les mots
            const safeBreakRegex = /(<@!?\d+>)|(\p{Emoji})|([.,!?]\s+)|(\s+)/gu;
            let lastSafeBreak = 0;
            let match;

            // Rechercher le dernier point de coupure sûr avant la limite
            while ((match = safeBreakRegex.exec(this.buffer)) !== null) {
                if (match.index > this.maxLength) break;
                lastSafeBreak = match.index + match[0].length;
            }

            // Si on a trouvé un point de coupure sûr
            if (lastSafeBreak > 0) {
                text = this.buffer.substring(0, lastSafeBreak);
                this.buffer = this.buffer.substring(lastSafeBreak).trim();
            } else {
                // Si pas de point de coupure sûr, couper à la limite
                text = this.buffer.substring(0, this.maxLength);
                this.buffer = this.buffer.substring(this.maxLength);
            }
        } else {
            text = this.buffer;
            this.buffer = '';
        }

        // Vérifier si une mention est coupée à la fin
        const mentionCheck = text.match(/<@!?\d+$/);
        if (mentionCheck) {
            // Déplacer la mention coupée vers le buffer suivant
            const mentionStart = text.lastIndexOf('<');
            this.buffer = text.substring(mentionStart) + this.buffer;
            text = text.substring(0, mentionStart).trim();
        }

        return text;
    }
}

module.exports = TextBuffer;
