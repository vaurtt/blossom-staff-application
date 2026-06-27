const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Send the application panel (Admin only)'),

    async execute(interaction, client) {
        // 🔒 CONTROLLO PERMESSI - Solo Admin e Owner
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const hasPermission = member.roles.cache.has(config.roles.admin) || 
                             member.roles.cache.has(config.roles.owner);
        
        if (!hasPermission) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Permission Denied')
                .setDescription('You do not have permission to use this command. This command is restricted to **Admin** and **Owner**.')
                .setColor(config.settings.embedColor);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('Application')
            .setDescription(
                'Click the button below to start your staff application.\n\n' +
                '**Instructions:**\n' +
                '• Answer all questions honestly\n' +
                '• Take your time to write quality responses\n' +
                '• Use `/skip` to skip optional questions\n' +
                '• Once submitted, staff will review your application\n' +
                '• Please refrain from using AI during this questionnaire'
            )
            .setColor(config.settings.embedColor)
            .setFooter({ text: 'Good luck!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('apply_start')
                    .setLabel('Apply')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
    }
};
