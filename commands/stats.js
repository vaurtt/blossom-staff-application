const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { db } = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show application statistics'),

    async execute(interaction, client) {
        const apps = Object.values(db.applications);
        
        const open = apps.filter(app => app.status === 'open').length;
        const accepted = apps.filter(app => app.status === 'accepted').length;
        const refused = apps.filter(app => app.status === 'refused').length;
        const total = apps.length;

        const embed = new EmbedBuilder()
            .setTitle('📊 Application Statistics')
            .setColor(config.settings.embedColor)
            .addFields(
                { name: '📋 Total Applications', value: `${total}`, inline: true },
                { name: '🟢 Open', value: `${open}`, inline: true },
                { name: '✅ Accepted', value: `${accepted}`, inline: true },
                { name: '❌ Refused', value: `${refused}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};