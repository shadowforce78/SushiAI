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
        // Vérifier si c'est le canal de chat configuré
        const configuredChannel = await db.getChatChannel(message.guildId);
        if (message.channelId !== configuredChannel) return;

        // Vérifier le quota
        if (!checkAndIncrementCounter()) {
            return message.reply("Quota dépassé pour aujourd'hui my G (SAD!) 😔");
        }

        // Indiquer que le bot écrit
        await message.channel.sendTyping();

        // Récupérer l'historique récent
        const history = await db.getRecentHistory(message.guildId, message.author.id);
        const systemContext = getSystemContext();

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construire le prompt avec l'historique
        const contents = [
            { role: 'user', parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: "Compris, je suis TH et je vais répondre selon ces directives." }] }
        ];

        // Ajouter l'historique récent
        history.reverse().forEach(entry => {
            contents.push({ role: 'user', parts: [{ text: entry.message }] });
            contents.push({ role: 'model', parts: [{ text: entry.response }] });
        });

        // Ajouter le message actuel
        contents.push({ role: 'user', parts: [{ text: message.content }] });

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
        await db.saveChat(message.guildId, message.author.id, message.content, fullResponse);

    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
        await message.reply("Une erreur est survenue my G (ERROR!) 😔");
    }

})