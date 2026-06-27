const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config.json');
const { db, saveDB } = require('../db.js');
const { activeSessions } = require('../sessions.js');

const questions = [
    "Age: (Optional)",
    "Time zone:",
    "How active are you in the server?",
    "Why do you want to become a moderator?",
    "How would you handle conflict between two members?",
    "A member breaks a rule but they're your friend, what do you do?",
    "Another moderator publicly disagrees with you, how do you handle it?",
    "If two members accuse each other and there isn't enough evidence for a verdict, what do you do?",
    "You see another mod breaking rules or acting unfairly. What do you do?",
    "What do you think makes a good moderator?",
    "Anything else you'd like us to know? (Optional)",
     "What changes or ideas would you suggest to improve the server?"
];

module.exports = {
    async execute(interaction, client) {
        const customId = interaction.customId;

        // APPLY START - Start the application process
        if (customId === 'apply_start') {
            const userId = interaction.user.id;
            const username = interaction.user.username;
            
            // Check if user already has an open application
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

            // Check if user already has an active session
            if (activeSessions.has(userId)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Application')
                    .setDescription('You already have an ongoing application process. Please complete it first.')
                    .setColor(config.settings.embedColor);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Create the channel
            try {
                const channelName = `${config.settings.channelNamePrefix}${username}`;
                const guild = interaction.guild;

                const channel = await guild.channels.create({
                    name: channelName,
                    type: 0,
                    parent: config.categories.active,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: userId,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                        },
                        {
                            id: config.roles.owner,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                        },
                        {
                            id: config.roles.admin,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                        }
                    ]
                });

                // Send welcome message
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('📋 Staff Application')
                    .setDescription(`${interaction.user.tag}, answer the questions below. Staff will be able to see your responses.\n\nUse \`/skip\` to skip optional questions.`)
                    .setColor(config.settings.embedColor);

                await channel.send({
                    content: `<@${userId}>`,
                    embeds: [welcomeEmbed]
                });

                // Save session
                activeSessions.set(userId, {
                    channelId: channel.id,
                    currentQuestion: 0,
                    answers: {}
                });

                // Send first question
                const firstQuestion = new EmbedBuilder()
                    .setTitle(`Question 1/${questions.length}`)
                    .setDescription(questions[0])
                    .setColor(config.settings.embedColor);

                // Check if first question is optional
                if (0 === 0 || 0 === questions.length - 1) {
                    firstQuestion.setFooter({ text: '💡 This question is optional. Use /skip to skip it.' });
                }

                await channel.send({ embeds: [firstQuestion] });

                // Confirm to user
                const confirmEmbed = new EmbedBuilder()
                    .setTitle('✅ Application Started!')
                    .setDescription(`Your application channel has been created!\n<#${channel.id}>\n\nAnswer the questions there.`)
                    .setColor(config.settings.embedColor);

                await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

                // Log
                const logChannel = guild.channels.cache.get(config.channels.log);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📝 New Application')
                        .setDescription(`${interaction.user.tag} started a new application`)
                        .addFields(
                            { name: 'User', value: `<@${userId}>`, inline: true },
                            { name: 'Channel', value: `<#${channel.id}>`, inline: true }
                        )
                        .setColor(config.settings.embedColor)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }

            } catch (error) {
                console.error('[ERROR] Creating application channel:', error);
                const embed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Failed to create your application. Please contact staff.')
                    .setColor(config.settings.embedColor);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            return;
        }

        // ACCEPT BUTTON
        if (customId.startsWith('accept_')) {
            const userId = customId.split('_')[1];
            
            // Controlla che chi clicca NON sia l'utente che ha fatto l'application
            if (interaction.user.id === userId) {
                return interaction.reply({ 
                    content: '❌ You cannot accept your own application!', 
                    ephemeral: true 
                });
            }
            
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
                    .setColor(config.settings.embedColor)
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
                
                const messages = await channel.messages.fetch({ limit: 10 });
                const appMessage = messages.find(msg => msg.components && msg.components.length > 0);
                if (appMessage) {
                    await appMessage.edit({ components: [] });
                }

                // RIMUOVI I PERMESSI ALL'UTENTE
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
                    .setColor(config.settings.embedColor)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `✅ Application from <@${userId}> has been accepted!`, ephemeral: true });
            return;
        }

        // REFUSE BUTTON
        if (customId.startsWith('refuse_')) {
            const userId = customId.split('_')[1];
            
            if (interaction.user.id === userId) {
                return interaction.reply({ 
                    content: '❌ You cannot refuse your own application!', 
                    ephemeral: true 
                });
            }
            
            const app = Object.values(db.applications).find(app => app.userId === userId && app.status === 'open');
            
            if (!app) {
                return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`refuse_modal_${userId}`)
                .setTitle('Refuse Application');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Reason (required)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Why are you refusing this application?');

            const row = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }

        // NOTE BUTTON
        if (customId.startsWith('note_')) {
            const userId = customId.split('_')[1];
            
            if (interaction.user.id === userId) {
                return interaction.reply({ 
                    content: '❌ You cannot add notes to your own application!', 
                    ephemeral: true 
                });
            }
            
            const app = Object.values(db.applications).find(app => app.userId === userId && app.status === 'open');
            
            if (!app) {
                return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`note_modal_${userId}`)
                .setTitle('Add Note');

            const noteInput = new TextInputBuilder()
                .setCustomId('note')
                .setLabel('Note')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Write your note here...');

            const row = new ActionRowBuilder().addComponents(noteInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }
    }
};