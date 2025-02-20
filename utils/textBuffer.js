class TextBuffer {
    constructor(maxLength = 1500) {
        this.buffer = '';
        this.maxLength = maxLength;
        this.pendingCodeBlock = {
            active: false,
            language: '',
            content: ''
        };
        this.formatStack = [];
    }

    append(text) {
        this.buffer += text;
    }

    parseFormatting(text) {
        const tokens = [];
        let currentPos = 0;
        let inCodeBlock = false;
        let inInlineCode = false;

        const regex = /(```(?:[\w-]+)?\n?|\n```|`|[*_~]{1,2})/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const token = match[0];
            const pos = match.index;

            // Ajouter le texte avant le token
            if (pos > currentPos) {
                tokens.push({
                    type: 'text',
                    content: text.slice(currentPos, pos)
                });
            }

            // Gérer les différents types de formatage
            if (token.startsWith('```')) {
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    const language = token.slice(3).trim();
                    tokens.push({
                        type: 'codeblock_start',
                        language: language
                    });
                } else {
                    inCodeBlock = false;
                    tokens.push({ type: 'codeblock_end' });
                }
            } else if (token === '`' && !inCodeBlock) {
                tokens.push({
                    type: inInlineCode ? 'inline_code_end' : 'inline_code_start'
                });
                inInlineCode = !inInlineCode;
            } else if (!inCodeBlock && !inInlineCode) {
                tokens.push({
                    type: 'format',
                    marker: token
                });
            } else {
                tokens.push({
                    type: 'text',
                    content: token
                });
            }

            currentPos = pos + token.length;
        }

        // Ajouter le reste du texte
        if (currentPos < text.length) {
            tokens.push({
                type: 'text',
                content: text.slice(currentPos)
            });
        }

        return tokens;
    }

    flush() {
        if (this.buffer.length <= this.maxLength) {
            const result = this.buffer;
            this.buffer = '';
            this.formatStack = [];
            return result.trim();
        }

        const tokens = this.parseFormatting(this.buffer);
        let output = '';
        let length = 0;
        let activeFormats = [];
        let currentCodeBlock = null;

        for (const token of tokens) {
            const tokenText = token.type === 'text' ? token.content : 
                            token.type === 'codeblock_start' ? '```' + (token.language || '') + '\n' :
                            token.type === 'codeblock_end' ? '\n```' :
                            token.type === 'inline_code_start' || token.type === 'inline_code_end' ? '`' :
                            token.marker;

            if (length + tokenText.length > this.maxLength) {
                // Fermer tous les formats actifs
                if (currentCodeBlock) {
                    output += '\n```';
                    this.pendingCodeBlock = {
                        active: true,
                        language: currentCodeBlock,
                        content: this.buffer.slice(length)
                    };
                } else {
                    [...activeFormats].reverse().forEach(format => {
                        output += format;
                    });
                }
                
                this.buffer = this.buffer.slice(length);
                if (!currentCodeBlock) {
                    this.buffer = activeFormats.join('') + this.buffer;
                } else {
                    this.buffer = '```' + currentCodeBlock + '\n' + this.buffer;
                }
                
                return output.trim();
            }

            output += tokenText;
            length += tokenText.length;

            switch (token.type) {
                case 'codeblock_start':
                    currentCodeBlock = token.language;
                    activeFormats = [];
                    break;
                case 'codeblock_end':
                    currentCodeBlock = null;
                    break;
                case 'format':
                    if (!currentCodeBlock) {
                        if (activeFormats.includes(token.marker)) {
                            activeFormats = activeFormats.filter(f => f !== token.marker);
                        } else {
                            activeFormats.push(token.marker);
                        }
                    }
                    break;
            }
        }

        this.buffer = '';
        return output.trim();
    }
}

module.exports = TextBuffer;
