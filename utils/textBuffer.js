class TextBuffer {
    constructor(maxLength = 1500) {
        this.buffer = '';
        this.maxLength = maxLength;
        this.activeFormatting = new Set();
    }

    append(text) {
        this.buffer += text;
    }

    shouldFlush() {
        return this.buffer.length >= this.maxLength;
    }

    // Nouvelle méthode pour détecter le formatage actif
    updateActiveFormatting(text) {
        const markdownPatterns = {
            bold: /\*\*/g,
            italic: /\*/g,
            underline: /__/g,
            strike: /~~/g,
            code: /`/g,
            codeblock: /```/g
        };

        for (const [style, pattern] of Object.entries(markdownPatterns)) {
            const matches = text.match(pattern);
            if (matches && matches.length % 2 !== 0) {
                if (this.activeFormatting.has(style)) {
                    this.activeFormatting.delete(style);
                } else {
                    this.activeFormatting.add(style);
                }
            }
        }
    }

    // Nouvelle méthode pour obtenir le formatage de début
    getLeadingFormatting() {
        let formatting = '';
        for (const style of this.activeFormatting) {
            switch(style) {
                case 'bold': formatting += '**'; break;
                case 'italic': formatting += '*'; break;
                case 'underline': formatting += '__'; break;
                case 'strike': formatting += '~~'; break;
                case 'code': formatting += '`'; break;
                case 'codeblock': formatting += '```\n'; break;
            }
        }
        return formatting;
    }

    // Nouvelle méthode pour obtenir le formatage de fin
    getTrailingFormatting() {
        let formatting = '';
        [...this.activeFormatting].reverse().forEach(style => {
            switch(style) {
                case 'bold': formatting += '**'; break;
                case 'italic': formatting += '*'; break;
                case 'underline': formatting += '__'; break;
                case 'strike': formatting += '~~'; break;
                case 'code': formatting += '`'; break;
                case 'codeblock': formatting += '\n```'; break;
            }
        });
        return formatting;
    }

    flush() {
        let text = '';
        
        if (this.buffer.length > this.maxLength) {
            const safeBreakRegex = /(<@!?\d+>)|(\p{Emoji})|([.,!?]\s+)|(\s+)/gu;
            let lastSafeBreak = 0;
            let match;

            while ((match = safeBreakRegex.exec(this.buffer)) !== null) {
                if (match.index > this.maxLength) break;
                lastSafeBreak = match.index + match[0].length;
            }

            if (lastSafeBreak > 0) {
                text = this.buffer.substring(0, lastSafeBreak);
                this.buffer = this.buffer.substring(lastSafeBreak).trim();
            } else {
                text = this.buffer.substring(0, this.maxLength);
                this.buffer = this.buffer.substring(this.maxLength);
            }

            // Mettre à jour le formatage actif
            this.updateActiveFormatting(text);

            // Ajouter le formatage de fin au texte actuel
            text += this.getTrailingFormatting();

            // Ajouter le formatage de début au buffer restant
            if (this.buffer.length > 0) {
                this.buffer = this.getLeadingFormatting() + this.buffer;
            }
        } else {
            text = this.buffer;
            this.buffer = '';
            this.activeFormatting.clear();
        }

        // Gérer les mentions coupées
        const mentionCheck = text.match(/<@!?\d+$/);
        if (mentionCheck) {
            const mentionStart = text.lastIndexOf('<');
            this.buffer = text.substring(mentionStart) + this.buffer;
            text = text.substring(0, mentionStart).trim();
        }

        return text;
    }
}

module.exports = TextBuffer;
