const { Client, CommandInteraction } = require('discord.js');
const db = require("../../utils/database");
const contexts = require("../../utils/botContexts");

module.exports = {
    name: "setcontext",
    description: "Choisis la personnalité du bot",
    type: 'CHAT_INPUT',

    run: async (client, interaction, args) => {
        const options = Object.entries(contexts).map(([value, context]) => ({
            label: context.name,
            description: context.description,
            value: value
        }));

        const response = await interaction.followUp({
            content: 'Choisis ma personnalité my G (CHOOSE!) 🎭',
            components: [{
                type: 1, // ActionRow
                components: [{
                    type: 3, // StringSelect
                    custom_id: 'select_context',
                    placeholder: 'Choisis une personnalité',
                    options: options
                }]
            }]
        });

        try {
            const collected = await response.awaitMessageComponent({ 
                filter: (i) => i.user.id === interaction.user.id,
                time: 30000 
            });

            if (collected) {
                await db.setUserContext(collected.user.id, collected.values[0]);
                await collected.update({
                    content: `Nouvelle personnalité activée: ${contexts[collected.values[0]].name} (CHANGED!) 🔄`,
                    components: []
                });
            }

        } catch (error) {
            if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                await interaction.editReply({
                    content: 'Temps écoulé (TIMEOUT!) ⏰',
                    components: []
                });
            } else {
                console.error(error);
                await interaction.editReply({
                    content: 'Une erreur est survenue (ERROR!) ⚠️',
                    components: []
                });
            }
        }
    },
};
