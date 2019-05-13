const key = require('../../config/authorize.json')["youtube-api-key"]
const queue = new Map()

const Discord = require('discord.js')
const YouTube = require('simple-youtube-api')
const ytdl = require('ytdl-core');
const yt = new YouTube(key);





function msToReadable(ms) {
    let min = Math.floor(ms / 60000);
    let sec = ((ms % 60000) / 1000).toFixed(0);

    return min + ":" + (sec < 10 ? '0' : '') + sec;
}

function buildQueue({ textChannel, voiceChannel, guild }) {
    return {
        textChannel: textChannel,
        voiceChannel: voiceChannel,
        guild: guild,
        connection: null,
        tracks: []
    }

}

function play(guild) {

    let serverQueue = queue.get(guild.id)

    if (!serverQueue) {
        return console.log("ERROR: NO SERVER QUEUE ?")
    }

    if (serverQueue.connection.channel.members.size === 1) {
        queue.delete(guild.id)
        serverQueue.connection.disconnect();
        return;
    }

    serverQueue.connection.dispatcher = undefined;

    let track = serverQueue.tracks[0]

    if (!track) {
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        return;
    }

    let dispatcher = serverQueue.connection.playStream(ytdl(track.url, { filter: "audioonly", quality: "lowest" }))

    dispatcher.on('end', (reason) => {
        console.log("DISPATCHER END:", reason)
        serverQueue.tracks.shift()
        setTimeout(() => {
            play(guild)
        }, 1000)
    })

    dispatcher.on('error', (err) => {
        console.log('error in dispatcher:', err)
    })
}



module.exports = {
    yt: yt,
    queue: {
        add: async function (args) {
            let { track, guild, voiceChannel } = args
            let serverQueue = await queue.get(guild.id)

            if (await !serverQueue) {
                queue.set(guild.id, buildQueue(args))
                serverQueue = await queue.get(guild.id)

                try {
                    let connection = voiceChannel.join()
                    serverQueue.connection = await connection;
                    serverQueue.tracks.push(track)
                    play(guild)
                } catch (err) {
                    console.error("COULD NOT START CONNECTION:", err)
                    queue.delete(guild.id)
                }

            } else if (track.toTop && serverQueue.tracks.length > 1) {
                serverQueue.tracks = [serverQueue.tracks[0], track, ...[...serverQueue.tracks].splice(1)]
            } else {
                serverQueue.tracks.push(track)
            }
        },
        show: function (args) {
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (!serverQueue) {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            } else if (serverQueue.tracks.length > 0) {
                msg.channel.send(serverQueue.tracks.map((t, i) => `${i}: ${t.title}`).join(`\n`))
            } else {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            }
        },
        nowPlaying: function (args) {
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (!serverQueue) {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            } else if (serverQueue.tracks.length > 0 && serverQueue.connection && serverQueue.connection.speaking) {
                let embed = new Discord.RichEmbed();
                let track = serverQueue.tracks[0];
                let dpTime = msToReadable(serverQueue.connection.dispatcher.time)
                let ytTime = serverQueue.tracks[0].duration
                embed
                    .setAuthor(`Ny soi: 🎵 ${track.title} 🎵`, track.thumbnails.default.url, track.url)
                    .setColor('RANDOM')
                    .addField('Duration', `${serverQueue.tracks[0].title}\n${dpTime} / ${ytTime.minutes}:${ytTime.seconds}`, true)
                    .addField('Requested By', track.user || '?', true)
                    .setThumbnail(track.thumbnails.default.url || null)
                    .setTimestamp();

                msg.channel.send(embed).catch(console.log)
            } else {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            }
        },
        skip: function (args) {
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)
            let connection = serverQueue.connection

            if (!serverQueue) {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            } else if (serverQueue && connection && (connection.dispatcher || connection.speaking === true)) {
                msg.channel.send(`:track_next: ${serverQueue.tracks[0].title} skipattu!`)
                serverQueue.connection.dispatcher.end('skip')
            } else {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            }
        },
        pause: function (args) { // pause ei toimi toivotusti
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (!serverQueue) {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            } else if (serverQueue.connection && serverQueue.connection.dispatcher && serverQueue.connection.dispatcher.paused === false) {
                serverQueue.connection.dispatcher.pause('pause')
            } else {
                msg.channel.send(":hand_splayed: Bro, ei pyge pausee")
            }
        },
        resume: function (args) { // resume ei toimi toivotusti
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (!serverQueue) {
                msg.channel.send(":hand_splayed: Bro, ei täällä soi mikään.")
            } else if (serverQueue.connection.dispatcher.paused === true) {
                serverQueue.connection.dispatcher.resume('pause')
            } else {
                msg.channel.send(":hand_splayed: Bro, ei pyge palaa")
            }
        },
        disconnect: function (args) {
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (serverQueue && serverQueue.connection.dispatcher) {
                serverQueue.tracks = []
                serverQueue.connection.dispatcher.end("disconnect command")
                msg.channel.send(":wave: Ilosesti böneen!")
            } else {
                msg.channel.send(":x: En edes ollut kiusaamassa.")
            }
        },
        clear: function (args) {
            let { guild, msg } = args
            let serverQueue = queue.get(guild.id)

            if (serverQueue && serverQueue.connection.dispatcher) {
                serverQueue.tracks = [serverQueue.tracks[0]]
                msg.channel.send(":wastebasket:  Musiikkijono tyhjennetty!")
            } else {
                msg.channel.send(":x: Ei ollut mitään mitä puhdistaa, >:^U")
            }
        }
    }
}