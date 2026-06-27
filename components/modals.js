const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { db, saveDB } = require('../db.js');

// 🔒 Funzione per controllare se l'utente è Admin o Owner
async function hasStaffPermission(interaction) {
    try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        return member.roles.cache.has(config.roles.admin) || 
               member.roles.cache.has(config.roles.owner);
    } catch {
        return false;
    }
}

module.exports = {
    async execute(interaction, client) {
        const customId = interaction.customId;

        // ACCEPT MODAL SUBMIT
        if (customId.startsWith('accept_modal_')) {
            const userId = customId.split('_')[2];
            
            // 🔒 CONTROLLO PERMESSI
            const hasPermission = await hasStaffPermission(interaction);
            if (!hasPermission) {
                return interaction.reply({ 
                    content: '❌ You do not have permission to do this.', 
                    ephemeral: true 
                });
            }
            
            const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided.';
            
            const app = Object.values(db.applications).find(app => app.userId === userId && app.status === 'open');
            if (!app) {
                return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
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

                await channel.permissionOverwrites.edit(userId, {
                    ViewChannel: false,
                    SendMessages: false,
                    ReadMessageHistory: false
                }).catch(console.error);

                await channel.setParent(config.categories.archive);
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                await member.roles.add(config.roles.moderator).catch(console.error);
                await member.send({
                    content: `🎉 **Congratulations!** Your application has been accepted! You are now a moderator!`
                }).catch(console.error);
            }

            const logChannel = interaction.guild.channels.cache.get(config.channels.log);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('✅ Application Accepted')
                    .setDescription(`Application from <@${userId}> was accepted by ${interaction.user.tag}`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false }
                    )
                    .setColor(config.settings.embedColor)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `✅ Application from <@${userId}> has been accepted!`, ephemeral: true });
            return;
        }

        // REFUSE MODAL SUBMIT
        if (customId.startsWith('refuse_modal_')) {
            const userId = customId.split('_')[2];
            
            // 🔒 CONTROLLO PERMESSI
            const hasPermission = await hasStaffPermission(interaction);
            if (!hasPermission) {
                return interaction.reply({ 
                    content: '❌ You do not have permission to do this.', 
                    ephemeral: true 
                });
            }
            
            const reason = interaction.fields.getTextInputValue('reason');
            
            const app = Object.values(db.applications).find(app => app.userId === userId && app.status === 'open');
            if (!app) {
                return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
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

                await channel.permissionOverwrites.edit(userId, {
                    ViewChannel: false,
                    SendMessages: false,
                    ReadMessageHistory: false
                }).catch(console.error);

                await channel.setParent(config.categories.archive);
            }

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                await member.send({
                    content: `❌ Your application has been refused.\n\n**Reason:** ${reason}\n\nThank you for your interest!`
                }).catch(console.error);
            }

            const logChannel = interaction.guild.channels.cache.get(config.channels.log);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('❌ Application Refused')
                    .setDescription(`Application from <@${userId}> was refused by ${interaction.user.tag}`)
                    .addFields(
                        { name: 'Reason', value: reason, inline: false }
                    )
                    .setColor(config.settings.embedColor)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `❌ Application from <@${userId}> has been refused.`, ephemeral: true });
            return;
        }

        // NOTE MODAL SUBMIT
        if (customId.startsWith('note_modal_')) {
            const userId = customId.split('_')[2];
            
            // 🔒 CONTROLLO PERMESSI
            const hasPermission = await hasStaffPermission(interaction);
            if (!hasPermission) {
                return interaction.reply({ 
                    content: '❌ You do not have permission to do this.', 
                    ephemeral: true 
                });
            }
            
            const note = interaction.fields.getTextInputValue('note');
            
            const app = Object.values(db.applications).find(app => app.userId === userId && app.status === 'open');
            if (!app) {
                return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
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
                    .setDescription(`Note added to ${userId}'s application by ${interaction.user.tag}`)
                    .addFields(
                        { name: 'Note', value: note, inline: false }
                    )
                    .setColor(config.settings.embedColor)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: '✅ Note added!', ephemeral: true });
            return;
        }
    }
};
