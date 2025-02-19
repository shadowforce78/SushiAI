const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client, CommandInteraction, AttachmentBuilder } = require("discord.js");
const geminiKey = require("../../config.json").gemini;
const { checkAndIncrementCounter } = require("../../utils/requestCounter");
const pdfParse = require('pdf-parse');
const https = require('https');
const fs = require('fs');
const path = require('path');
const TextBuffer = require("../../utils/textBuffer");
const { getSystemContext } = require("../../utils/botContext");

module.exports = {
    name: "askpdf",
    description: "Pose une question à l'IA en fournissant un fichier PDF",
    type: 'CHAT_INPUT',
    options: [
        {
            name: "question",
            description: "La question à poser à l'IA",
            type: "STRING",
            required: true
        },
        {
            name: "pdf",
            description: "Le fichier PDF à analyser",
            type: "ATTACHMENT",
            required: true
        }
    ],

    run: async (client, interaction, args) => {
        if (!checkAndIncrementCounter()) {
            return interaction.followUp({
                content: "Désolé, la limite quotidienne de requêtes a été atteinte."
            });
        }

        const question = interaction.options.getString("question");
        const pdfFile = interaction.options.getAttachment("pdf");
        const systemContext = await getSystemContext(interaction.user.id);

        if (!pdfFile.contentType?.includes('pdf')) {
            return interaction.followUp({
                content: "Le fichier doit être au format PDF."
            });
        }

        await interaction.followUp({ content: "Analyse du PDF en cours..." });

        try {
            const pdfBuffer = await downloadFile(pdfFile.url);
            const pdfData = await pdfParse(pdfBuffer);

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
                        parts: [{ text: "Compris, je suis TH et je vais répondre selon ces directives." }]
                    },
                    {
                        role: 'user',
                        parts: [{ text: `Voici le contenu du PDF à analyser:\n\n${pdfData.text}\n\nQuestion: ${question}` }]
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
            console.error('Erreur lors du traitement du PDF:', error);
            await interaction.channel.send({
                content: "Une erreur est survenue lors du traitement du PDF my G (ERROR!) 😔"
            });
        }
    },
};

async function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}
