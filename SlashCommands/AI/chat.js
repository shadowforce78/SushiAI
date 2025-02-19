const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, CommandInteraction } = require("discord.js");
const geminiKey = require("../../config.json").gemini;
const { checkAndIncrementCounter } = require("../../utils/requestCounter");
const { getSystemContext } = require("../../utils/botContext");
const TextBuffer = require("../../utils/textBuffer");
const db = require("../../utils/database");

module.exports = {
    name: "chat",
    description: "Discute avec l'IA en gardant l'historique",
    type: 'CHAT_INPUT',
    options: [
        {
            name: "message",
            description: "Ton message pour l'IA",
            type: "STRING",
            required: true
        }
    ],

    run: async (client, interaction, args) => {
        // Vérifier si le canal est configuré
        const chatChannelId = await db.getChatChannel(interaction.guildId);
        if (chatChannelId !== interaction.channelId) {
            return interaction.followUp({
                content: `Yo my G (WRONG!), utilise cette commande dans le canal configuré <#${chatChannelId}> no cap! 🧢❌`
            });
        }

        if (!checkAndIncrementCounter()) {
            return interaction.followUp({
                content: "Quota dépassé pour aujourd'hui my G (SAD!) 😔"
            });
        }

        const message = interaction.options.getString("message");
        const history = await db.getRecentHistory(interaction.guildId, interaction.user.id);
        
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
        contents.push({ role: 'user', parts: [{ text: message }] });

        try {
            const result = await model.generateContentStream({ contents });
            const buffer = new TextBuffer();
            let fullResponse = '';

            await interaction.followUp({ content: "Processing my G (THINKING!)... 🤔" });

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;
                buffer.append(chunkText);
                
                if (buffer.shouldFlush()) {
                    await interaction.channel.send({
                        content: buffer.flush(),
                        allowedMentions: { parse: [] }
                    });
                }
            }

            if (buffer.buffer.length > 0) {
                await interaction.channel.send({
                    content: buffer.flush(),
                    allowedMentions: { parse: [] }
                });
            }

            // Sauvegarder dans l'historique
            await db.saveChat(interaction.guildId, interaction.user.id, message, fullResponse);

        } catch (error) {
            console.error('Erreur lors du chat:', error);
            await interaction.channel.send({
                content: "Une erreur est survenue my G (ERROR!) 😔"
            });
        }
    },
};
