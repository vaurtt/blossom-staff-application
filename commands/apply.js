const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { db } = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Start a staff application'),

    async execute(interaction, client) {
        const userId = interaction.user.id;

        const existingApp = Object.values(db.applications).find(
            app => app.userId === userId && app.status === 'open'
        );

        if (existingApp) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Application')
                .setDescription(`You already have an open application!\nChannel: <#${existingApp.channelId}>`)
                .setColor(config.settings.embedColor);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check if user has a refused application (cooldown)
        const refusedApp = Object.values(db.applications).find(
            app => app.userId === userId && app.status === 'refused'
        );

        if (refusedApp) {
            const cooldownDays = config.settings.cooldownDays || 7;
            const refusedDate = new Date(refusedApp.refusedAt);
            const now = new Date();
            const diffDays = Math.floor((now - refusedDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays < cooldownDays) {
                const remainingDays = cooldownDays - diffDays;
                const embed = new EmbedBuilder()
                    .setTitle('❌ Cooldown')
                    .setDescription(`Your previous application was refused. You can apply again in **${remainingDays} day(s)**.`)
                    .setColor(config.settings.embedColor);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('Application')
            .setDescription(
                'Click the button below to start your staff application.\n\n' +
                '📝 **Instructions:**\n' +
                '• Answer all questions honestly\n' +
                '• Take your time to write quality responses\n' +
                '• Use `/skip` to skip optional questions\n' +
                '• Once submitted, staff will review your application'
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