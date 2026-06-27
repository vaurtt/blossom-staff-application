const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`[BOT] Logged in as ${client.user.tag}!`);
        client.user.setPresence({
            activities: [{
                name: 'blossom | staff applications',
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/lyonwgflive'
            }],
            status: 'online',
        });
        console.log('[BOT] Application Bot is ready!');
    }
};
