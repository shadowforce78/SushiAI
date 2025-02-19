const { Client, CommandInteraction, PermissionFlagsBits } = require("discord.js");
const db = require("../../utils/database");

module.exports = {
    name: "setchat",
    description: "Configure le canal pour le chat avec l'IA",
    type: 'CHAT_INPUT',
    options: [
        {
            name: "channel",
            description: "Le canal à utiliser pour le chat",
            type: "CHANNEL",
            required: true
        }
    ],

    run: async (client, interaction, args) => {
        // Vérifier les permissions avec PermissionFlagsBits au lieu de PermissionsBitField
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.followUp({
                content: "Tu n'as pas la permission de configurer le chat my G (DENIED!) 🧢❌"
            });
        }

        const channel = interaction.options.getChannel("channel");
        
        try {
            await db.setChatChannel(interaction.guildId, channel.id);
            await interaction.followUp({
                content: `Yo my G (SKRRT!), le chat est maintenant configuré dans ${channel} no cap! 🧢❌ (GANG!)`
            });
        } catch (error) {
            console.error('Erreur lors de la configuration du chat:', error);
            await interaction.followUp({
                content: "Une erreur est survenue lors de la configuration (SAD!) 😔"
            });
        }
    },
};
