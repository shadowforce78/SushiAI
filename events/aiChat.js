const client = require('../index.js');
const { Message, Client } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiKey = require("../config.json").gemini;
const { checkAndIncrementCounter } = require("../utils/requestCounter");
const { getSystemContext } = require("../utils/botContext");
const TextBuffer = require("../utils/textBuffer");
const db = require("../utils/database");
const FileParser = require('../utils/fileParser');

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
        const configuredChannel = await db.getChatChannel(message.guildId);
        if (message.channelId !== configuredChannel) return;
        if (message.content.startsWith('\\')) return; // Ignore les commandes si on met un backslash

        if (!checkAndIncrementCounter()) {
            return message.reply("Quota dépassé pour aujourd'hui 😔");
        }

        await message.channel.sendTyping();

        // Traiter les fichiers joints s'il y en a
        let fileContent = '';
        if (message.attachments.size > 0) {
            await message.channel.sendTyping();
            
            for (const [_, attachment] of message.attachments) {
                const fileType = FileParser.getFileType(attachment.contentType);
                if (fileType) {
                    try {
                        const content = await FileParser.parseFile(attachment.url, fileType);
                        fileContent += `\nContenu du fichier ${attachment.name}:\n${content}\n`;
                    } catch (error) {
                        console.error(`Erreur lors du traitement du fichier ${attachment.name}:`, error);
                        await message.reply(`Je n'ai pas pu lire le fichier ${attachment.name} (ERROR!) 😔`);
                    }
                }
            }
        }

        // Nettoyer l'ancien historique
        await db.cleanOldHistory(message.guildId);

        // Récupérer l'historique global du salon
        const history = await db.getRecentHistory(message.guildId);
        const systemContext = await getSystemContext(message.author.id);

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9
            }
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: systemContext }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Compris, je vais répondre selon ces directives." }]
                },
                ...history.reverse().flatMap(entry => [
                    {
                        role: 'user',
                        parts: [{ text: entry.message }]
                    },
                    {
                        role: 'model',
                        parts: [{ text: entry.response }]
                    }
                ]),
                {
                    role: 'user',
                    parts: [{ text: fileContent ? 
                        `${message.content}\n\nFichiers joints:\n${fileContent}` : 
                        message.content 
                    }]
                }
            ]
        });

        const response = result.response.text();
        
        // Découper la réponse en morceaux si nécessaire
        const buffer = new TextBuffer();
        buffer.append(response);

        while (buffer.buffer.length > 0) {
            await message.channel.send({
                content: buffer.flush(),
                allowedMentions: { parse: [] }
            });
        }

        // Sauvegarder dans l'historique
        await db.saveChat(message.guildId, message.author.id, message.content, response);

    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
        await message.reply("Une erreur est survenue 😔");
    }

})