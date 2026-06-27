const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { db, saveDB } = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('note')
        .setDescription('Add a note to an application (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose application to note')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('note')
                .setDescription('The note to add')
                .setRequired(true)
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
        const note = interaction.options.getString('note');

        // Controlla che chi usa il comando NON sia l'utente stesso
        if (interaction.user.id === user.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('You cannot add notes to your own application!')
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

        app.notes.push({
            staffId: interaction.user.id,
            staffName: interaction.user.tag,
            note: note,
            timestamp: Date.now()
        });
        saveDB();

        const channel = interaction.guild.channels.cache.get(app.channelId);
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('📝 Note Added')
                .setDescription(`**${interaction.user.tag}** added a note:`)
                .addFields(
                    { name: 'Note', value: note, inline: false }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }

        const logChannel = interaction.guild.channels.cache.get(config.channels.log);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📝 Note Added')
                .setDescription(`Note added to ${user.tag}'s application by ${interaction.user.tag}`)
                .addFields(
                    { name: 'Note', value: note, inline: false }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Note Added')
            .setDescription(`Successfully added note to <@${user.id}>'s application.`)
            .setColor(config.settings.embedColor);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
