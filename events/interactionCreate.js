const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            try {
                const command = require(`../commands/${interaction.commandName}.js`);
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[ERROR] Command ${interaction.commandName}:`, error);
                const embed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Something went wrong while executing this command.')
                    .setColor(config.settings.embedColor);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            return;
        }

        if (interaction.isButton()) {
            try {
                const button = require(`../components/buttons.js`);
                await button.execute(interaction, client);
            } catch (error) {
                console.error('[ERROR] Button:', error);
                await interaction.reply({ 
                    content: '❌ Something went wrong with this button!', 
                    ephemeral: true 
                });
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            try {
                const modal = require(`../components/modals.js`);
                await modal.execute(interaction, client);
            } catch (error) {
                console.error('[ERROR] Modal:', error);
                await interaction.reply({ 
                    content: '❌ Something went wrong with this form!', 
                    ephemeral: true 
                });
            }
            return;
        }
    }
};