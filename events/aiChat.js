const client = require('../index.js');
const { Message, Client } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const geminiKey = require("../config.json").gemini;
const { checkAndIncrementCounter } = require("../utils/requestCounter");
const { getSystemContext, updateSystemContext } = require("../utils/botContext");
const TextBuffer = require("../utils/textBuffer");
const db = require("../utils/database");

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

        // Récupération et validation du contexte actuel
        const userContext = await db.getUserContext(message.author.id);
        const currentSystemContext = await getSystemContext(message.author.id);
        
        // Plus besoin de forcer la mise à jour si pas de changement
        if (userContext && userContext !== currentSystemContext) {
            await updateSystemContext(message.author.id, currentSystemContext);
        }

        // Nettoyer l'ancien historique et récupérer l'historique récent
        await db.cleanOldHistory(message.guildId, message.author.id);
        const history = await db.getRecentHistory(message.guildId, message.author.id);

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9
            }
        });

        // Ajout d'un rappel explicite du contexte dans chaque conversation
        const contextReminder = `Important: ${currentSystemContext}\nRappel: Garde toujours ce contexte en tête pour ta réponse.`;

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: contextReminder }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Compris, je vais strictement suivre ce contexte." }]
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
                    parts: [{ text: `${contextReminder}\n\nMessage de l'utilisateur: ${message.content}` }]
                }
            ]
        });

        const response = result.response.text();

        // Découper la réponse en morceaux si nécessaire
        const buffer = new TextBuffer();
        buffer.append(response);

        // Premier message avec mention de l'utilisateur
        let isFirstMessage = true;
        while (buffer.buffer.length > 0) {
            const content = buffer.flush();
            await message.channel.send({
                content: isFirstMessage ? `<@${message.author.id}> ${content}` : content,
                allowedMentions: { users: [message.author.id] }
            });
            isFirstMessage = false;
        }

        // Sauvegarder dans l'historique
        await db.saveChat(message.guildId, message.author.id, message.content, response);

    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
        await message.reply("Une erreur est survenue 😔");
    }

})