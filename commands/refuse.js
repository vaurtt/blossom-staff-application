const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { db, saveDB } = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refuse')
        .setDescription('Refuse a staff application')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to refuse')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for refusing')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Controlla che chi usa il comando NON sia l'utente stesso
        if (interaction.user.id === user.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('You cannot refuse your own application!')
                .setColor(config.settings.embedColor);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const app = Object.values(db.applications).find(
            app => app.userId === user.id && app.status === 'open'
        );

        if (!app) {
            const embed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription(`<@${user.id}> does not have an open application.`)
                .setColor(config.settings.embedColor);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        app.status = 'refused';
        app.refusedAt = Date.now();
        app.refusedBy = interaction.user.id;
        app.refuseReason = reason;
        saveDB();

        const channel = interaction.guild.channels.cache.get(app.channelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Application Refused')
                .setDescription(`**${interaction.user.tag}** has refused this application.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            
            const messages = await channel.messages.fetch({ limit: 10 });
            const appMessage = messages.find(msg => msg.components && msg.components.length > 0);
            if (appMessage) {
                await appMessage.edit({ components: [] });
            }

            await channel.permissionOverwrites.edit(user.id, {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            }).catch(console.error);

            await channel.setParent(config.categories.archive);
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member) {
            await member.send({
                content: `❌ Your application has been refused.\n\n**Reason:** ${reason}\n\nThank you for your interest!`
            }).catch(console.error);
        }

        const logChannel = interaction.guild.channels.cache.get(config.channels.log);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('❌ Application Refused')
                .setDescription(`Application from <@${user.id}> was refused by ${interaction.user.tag}`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('❌ Application Refused')
            .setDescription(`Successfully refused <@${user.id}>'s application.`)
            .setColor(config.settings.embedColor);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};