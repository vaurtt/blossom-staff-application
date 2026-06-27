const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`[BOT] Logged in as ${client.user.tag}!`);
        client.user.setPresence({
            activities: [{
                name: 'Staff Applications | /apply',
                type: ActivityType.Watching,
            }],
            status: 'online',
        });
        console.log('[BOT] Application Bot is ready!');
    }
};