const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, CommandInteraction } = require("discord.js");
const geminiKey = require("../../config.json").gemini;
const { checkAndIncrementCounter } = require("../../utils/requestCounter");
const TextBuffer = require("../../utils/textBuffer");

module.exports = {
    name: "ask",
    description: "Pose une question textuelle à l'IA",
    type: 'CHAT_INPUT',
    options: [
        {
            name: "question",
            description: "La question à poser à l'IA",
            type: "STRING",
            required: true
        }
    ],
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        // Vérifie si on peut faire une nouvelle requête
        if (!checkAndIncrementCounter()) {
            return interaction.followUp({
                content: "Désolé, la limite quotidienne de requêtes (1500) a été atteinte. Veuillez réessayer demain."
            });
        }

        const question = interaction.options.getString("question");

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = question

        const result = await model.generateContentStream(prompt);
        const buffer = new TextBuffer();

        await interaction.followUp({ content: "🤖 Génération de la réponse..." });

        try {
            for await (const chunk of result.stream) {
                buffer.append(chunk.text());
                
                if (buffer.shouldFlush()) {
                    await interaction.channel.send({
                        content: buffer.flush(),
                        allowedMentions: { parse: [] }
                    });
                }
            }

            // Envoyer le reste du buffer s'il en reste
            if (buffer.buffer.length > 0) {
                await interaction.channel.send({
                    content: buffer.flush(),
                    allowedMentions: { parse: [] }
                });
            }
        } catch (error) {
            console.error('Erreur lors du streaming:', error);
            await interaction.channel.send({
                content: "Une erreur est survenue lors de la génération de la réponse."
            });
        }
    },
};
