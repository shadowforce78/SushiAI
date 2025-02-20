const { Client, CommandInteraction } = require("discord.js");
const { loadCounter } = require("../../utils/requestCounter");

module.exports = {
    name: "quota",
    description: "Affiche le nombre de requêtes restantes pour aujourd'hui",
    type: 'CHAT_INPUT',
    userperm: [],
    botperm : [],
    
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const localData = loadCounter();
        const requestsUsed = localData.count;
        const requestsRemaining = 1500 - requestsUsed;
        
        await interaction.followUp({ 
            content: `🤖 État des requêtes pour aujourd'hui (${localData.date}):\n` +
                    `✓ Utilisées: ${requestsUsed}/1500\n` +
                    `⭐ Restantes: ${requestsRemaining}`
        });
    },
};
