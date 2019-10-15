const meta = {
    name: "hus",
    admin: false,
    syntax: "hus",
    desc: "Heittää botin pois äänikanavalta.",
    triggers: ["hus"],
    type:  ["utility"]
}

module.exports.run = function (msg, client, args) {
    return new Promise((resolve, reject) => {
        if (msg.guild.voiceConnection) {
            if (msg.guild.voiceConnection.dispatcher) {
                msg.guild.voiceConnection.dispatcher.end();
            }

        }
        if (msg.guild.me.voiceChannel) {
            msg.guild.me.voiceChannel.leave();
        }
        resolve();
    });
}

module.exports.meta = meta;