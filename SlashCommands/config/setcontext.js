const { Client, CommandInteraction } = require("discord.js");
const db = require("../../utils/database");
const contexts = require("../../utils/botContexts");

module.exports = {
    name: "setcontext",
    description: "Change la personnalité du bot pour vous",
    type: 'CHAT_INPUT',
    userperm: [],
    botperm : [],
    options: [
        {
            name: "personnalite",
            description: "Choisissez la personnalité du bot",
            type: "STRING",
            required: true,
            choices: Object.entries(contexts).map(([value, context]) => ({
                name: `${context.name} - ${context.description}`,
                value: value
            }))
        }
    ],

    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        try {
            const selectedContext = interaction.options.getString("personnalite");
            await db.setUserContext(interaction.user.id, selectedContext);
            
            await interaction.followUp({
                content: `✅ J'ai changé ma personnalité en "${contexts[selectedContext].name}" uniquement pour vous !`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            await interaction.followUp({
                content: '❌ Une erreur est survenue lors du changement de personnalité.',
                ephemeral: true
            });
        }
    }
};
