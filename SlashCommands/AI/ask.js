const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, CommandInteraction } = require("discord.js");
const geminiKey = require("../../config.json").gemini;
const { checkAndIncrementCounter } = require("../../utils/requestCounter");
const TextBuffer = require("../../utils/textBuffer");
const { getSystemContext } = require("../../utils/botContext");

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
        const systemContext = await getSystemContext(interaction.user.id);

        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.9
            }
        });

        try {
            await interaction.followUp({ content: "🤖 Génération de la réponse..." });

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
                    {
                        role: 'user',
                        parts: [{ text: question }]
                    }
                ]
            });

            const response = result.response.text();
            
            // Découper la réponse en morceaux si nécessaire
            const buffer = new TextBuffer();
            buffer.append(response);

            while (buffer.buffer.length > 0) {
                await interaction.channel.send({
                    content: buffer.flush(),
                    allowedMentions: { parse: [] }
                });
            }

        } catch (error) {
            console.error('Erreur lors de la génération:', error);
            await interaction.channel.send({
                content: "Une erreur est survenue lors de la génération de la réponse."
            });
        }
    },
};
