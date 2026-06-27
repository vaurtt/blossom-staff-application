const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const session = activeSessions.get(userId);
        
        if (!session) return;
        if (message.channel.id !== session.channelId) return;

        // Delete the user's message
        await message.delete().catch(console.error);

        const currentIndex = session.currentQuestion;
        const answer = message.content;

        // Save answer
        session.answers[`q${currentIndex + 1}`] = answer;

        // Move to next question
        session.currentQuestion++;

        if (session.currentQuestion >= questions.length) {
            await deleteAllMessages(message.channel);
            await finalizeApplication(message, userId, session.answers);
            activeSessions.delete(userId);
        } else {
            const nextQuestion = new EmbedBuilder()
                .setTitle(`Question ${session.currentQuestion + 1}/${questions.length}`)
                .setDescription(questions[session.currentQuestion])
                .setColor(config.settings.embedColor);

            // Check if next question is optional and add info
            const isNextOptional = session.currentQuestion === 0 || session.currentQuestion === questions.length - 1;
            if (isNextOptional) {
                nextQuestion.setFooter({ text: '💡 This question is optional. Use /skip to skip it.' });
            }

            await message.channel.send({ embeds: [nextQuestion] });
        }
    }
};

async function deleteAllMessages(channel) {
    try {
        let messages = await channel.messages.fetch({ limit: 100 });
        while (messages.size > 0) {
            await channel.bulkDelete(messages, true);
            messages = await channel.messages.fetch({ limit: 100 });
        }
        console.log(`[CLEANUP] Deleted all messages in ${channel.name}`);
    } catch (error) {
        console.error('[ERROR] Failed to delete messages:', error);
    }
}

async function finalizeApplication(message, userId, answers) {
    const username = message.author.username;
    const guild = message.guild;
    const channel = message.channel;

    try {
        const embed = new EmbedBuilder()
            .setTitle(`📋 Staff Application - ${username}`)
            .setColor(config.settings.embedColor)
            .setTimestamp()
            .setFooter({ text: `User ID: ${userId}` });

        for (let i = 0; i < questions.length; i++) {
            const answer = answers[`q${i+1}`] || 'Not provided';
            embed.addFields({
                name: questions[i],
                value: answer.length > 1024 ? answer.substring(0, 1021) + '...' : answer,
                inline: false
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${userId}`)
                    .setLabel('✅ Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`refuse_${userId}`)
                    .setLabel('❌ Refuse')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`note_${userId}`)
                    .setLabel('📝 Note')
                    .setStyle(ButtonStyle.Secondary)
            );

        await channel.send({
            content: `<@&${config.roles.owner}> <@&${config.roles.admin}> - New application ready for review!`,
            embeds: [embed],
            components: [row]
        });

        const appId = Date.now().toString();
        db.applications[appId] = {
            userId: userId,
            username: username,
            channelId: channel.id,
            status: 'open',
            answers: answers,
            createdAt: Date.now(),
            notes: []
        };
        saveDB();

        const logChannel = guild.channels.cache.get(config.channels.log);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('✅ Application Completed')
                .setDescription(`${message.author.tag} has completed their application`)
                .addFields(
                    { name: 'User', value: `<@${userId}>`, inline: true },
                    { name: 'Channel', value: `<#${channel.id}>`, inline: true }
                )
                .setColor(config.settings.embedColor)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('[ERROR] Finalizing application:', error);
        await channel.send('❌ Error finalizing application. Please contact staff.');
    }
}