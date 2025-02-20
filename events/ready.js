const client = require("../index");

client.on("ready", () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║             SUSHI AI BOT              ║
    ╚═══════════════════════════════════════╝
    `);
    console.log(`► Bot connecté en tant que ${client.user.tag}`);
    console.log(`► Actif sur ${client.guilds.cache.size} serveurs`);

    // Status rotatif
    let status = [
        { name: '🍣 vos commandes', type: 'LISTENING' },
        { name: `🌟 ${client.guilds.cache.size} serveurs`, type: 'WATCHING' },
        { name: '🎮 avec Discord.js', type: 'PLAYING' },
        { name: '🤖 Intelligence Artificielle', type: 'COMPETING' }
    ];
    let i = 0;

    setInterval(() => {
        if(i >= status.length) i = 0;
        client.user.setActivity(status[i].name, { type: status[i].type });
        i++;
    }, 5000); // Change toutes les 5 secondes
});
