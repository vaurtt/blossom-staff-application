const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { db, saveDB } = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('accept')
        .setDescription('Accept a staff application (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to accept')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for accepting')
                .setRequired(false)
        ),

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

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        // Controlla che chi usa il comando NON sia l'utente stesso
        if (interaction.user.id === user.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('You cannot accept your own application!')
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

        app.status = 'accepted';
        app.acceptedAt = Date.now();
        app.acceptedBy = interaction.user.id;
        saveDB();

        const channel = interaction.guild.channels.cache.get(app.channelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Application Accepted!')
                .setDescription(`**${interaction.user.tag}** has accepted this application.`)
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

        const memberUser = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (memberUser) {
            await memberUser.roles.add(config.roles.moderator).catch(console.error);
            await memberUser.send({
                content: `🎉 **Congratulations!** Your application has been accepted! You are now a moderator!`
            }).catch(console.error);
        }

        const logChannel = interaction.guild.channels.cache.get(config.channels.log);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('✅ Application Accepted')
                .setDescription(`Application from <@${user.id}> was accepted by ${interaction.user.tag}`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Application Accepted')
            .setDescription(`Successfully accepted <@${user.id}>'s application!`)
            .setColor(config.settings.embedColor);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
