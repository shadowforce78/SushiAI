const client = require('../index.js');
const { Message, Client } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiKey = require("../config.json").gemini;
const { checkAndIncrementCounter } = require("../utils/requestCounter");
const { getSystemContext } = require("../utils/botContext");
const TextBuffer = require("../utils/textBuffer");
const db = require("../utils/database");


client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
        const configuredChannel = await db.getChatChannel(message.guildId);
        if (message.channelId !== configuredChannel) return;
        if (message.content.startsWith('\\')) return; // Ignore les commandes si on met un backslash

        if (!checkAndIncrementCounter()) {
            return message.reply("Quota dépassé pour aujourd'hui my G (SAD!) 😔");
        }

        await message.channel.sendTyping();

        // Nettoyer l'ancien historique
        await db.cleanOldHistory(message.guildId);

        // Récupérer l'historique global du salon
        const history = await db.getRecentHistory(message.guildId);
        const systemContext = getSystemContext();

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construire le prompt avec l'historique
        const contents = [
            { role: 'user', parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: "Compris, je suis TH et je vais répondre selon ces directives." }] }
        ];

        // Ajouter l'historique récent avec les noms d'utilisateurs
        history.reverse().forEach(entry => {
            const userName = message.guild.members.cache.get(entry.user_id)?.displayName || "Utilisateur";
            contents.push({ 
                role: 'user', 
                parts: [{ text: `[${userName}]: ${entry.message}` }] 
            });
            contents.push({ 
                role: 'model', 
                parts: [{ text: entry.response }] 
            });
        });

        // Ajouter le message actuel avec le nom de l'utilisateur
        contents.push({ 
            role: 'user', 
            parts: [{ text: `[${message.member.displayName}]: ${message.content}` }] 
        });

        const result = await model.generateContentStream({ contents });
        const buffer = new TextBuffer();
        let fullResponse = '';

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            buffer.append(chunkText);

            if (buffer.shouldFlush()) {
                await message.channel.send({
                    content: buffer.flush(),
                    allowedMentions: { parse: [] }
                });
            }
        }

        if (buffer.buffer.length > 0) {
            await message.channel.send({
                content: buffer.flush(),
                allowedMentions: { parse: [] }
            });
        }

        // Sauvegarder dans l'historique
        await db.saveChat(message.guildId, message.author.id, 
            `[${message.member.displayName}]: ${message.content}`, 
            fullResponse
        );

    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
        await message.reply("Une erreur est survenue my G (ERROR!) 😔");
    }

})