const CLIENT_CONFIG = require("config");

const fs = require("fs");

const Discord = require("discord.js");

if (!fs.existsSync("./assets/misc/raha/user-data.json")) {
    fs.writeFileSync("./assets/misc/raha/user-data.json", '{"users": {}}');
}

let userdata = JSON.parse(
    fs.readFileSync("./assets/misc/raha/user-data.json", "utf8")
);
let embed = new Discord.MessageEmbed().setColor(0xf4e542);
const configuration = {
    name: "raha",
    admin: false,
    syntax: "raha <saldo / uhkapeli / lahjoita /  palkka>",
    desc: "Kosmeettisen virtuaalivaluutan pyörittelyyn",
    daily: 250,
    sub: {
        saldo: {
            syntax: "raha saldo",
            desc: "Näyttää oman rahatilanteen.",
            name: "saldo"
        },
        uhkapeli: {
            syntax: "raha uhkapeli <määrä>",
            desc:
                "Heittää asettamallasi määrällä kolikkoa. Voitolla tuplaat panoksen, ja häviöllä menetät.",
            name: "uhkapeli"
        },
        lahjoita: {
            syntax: "raha lahjoita <määrä> <@kenelle>",
            desc: "Lahjoittaa asettamasi määrän haluamallesi käyttäjälle.",
            name: "lahjoita"
        },
        palkka: {
            syntax: "raha palkka",
            desc: "Antaa sinulle päivän palkan.",
            name: "palkka"
        }
    },
    triggers: ["raha", "rahe", "money", "gamble"],
    type: ["fun"]
};

module.exports.executor = function (msg, client, args) {
    return new Promise((resolve, reject) => {
        const prefix = CLIENT_CONFIG.get('DISCORD.PREFIX');
        let syntax = configuration.syntax;
        let daily = configuration.daily;
        embed
            .setTitle(`Komento ${configuration.name} toimii näin:`)
            .setDescription(`\`${syntax}\``);

        if (!msg.author.bot) {
            let userid = msg.author.id.toString();
            let usrobj;

            if (userdata.users[msg.author.id]) {
                usrobj = userdata.users[msg.author.id];
            } else {
                userdata.users[userid] = {
                    credits: 200,
                    bot: msg.author.bot,
                    whenclaimed: Date.now() - 86400000
                };
                usrobj = userdata.users[msg.author.id];
            }

            if (args[1]) {
                let subsyntax;

                switch (args[1]) {
                    case "saldo":
                        subsyntax = configuration.sub[args[1]].syntax;
                        embed
                            .setTitle(`${msg.member.user.username} balanssi:`)
                            .setDescription(`${usrobj.credits} kolea`);
                        msg.channel.send(embed).catch(error => console.info(error));
                        break;

                    case "uhkapeli":
                        subsyntax = configuration.sub[args[1]].syntax;

                        if (!isNaN(parseInt(args[2])) && parseInt(args[2]) > 0) {
                            if (parseInt(args[2]) <= parseInt(usrobj.credits)) {
                                embed
                                    .setTitle(
                                        `Käyttäjä ${msg.author.username} uhkapelaa ${
                                        args[2]
                                        } kolikolla. Lets mennään.`
                                    )
                                    .setDescription(`:game_die:`);
                                msg.channel.send(embed).then(newmsg => {
                                    let newembed = embed;

                                    function winorlose() {
                                        let result = Math.round(Math.random());
                                        return result === 1
                                    }

                                    setTimeout(function () {
                                        if (winorlose()) {
                                            newembed.setDescription(
                                                `:game_die: Voitto! Sait ${args[2]} kolikkoa :game_die:`
                                            );
                                            newmsg.edit(newembed).catch(error => console.info(error));
                                            usrobj.credits =
                                                parseInt(usrobj.credits) + parseInt(args[2]);
                                        } else {
                                            newembed.setDescription(
                                                `:game_die: Häviö! Hävisit ${
                                                args[2]
                                                } kolikkoa :game_die:`
                                            );
                                            newmsg.edit(newembed).catch(error => console.info(error));
                                            usrobj.credits =
                                                parseInt(usrobj.credits) - parseInt(args[2]);
                                        }
                                    }, 1500);
                                });
                            } else {
                                embed
                                    .setTitle(`${msg.member.user.username}, ,:`)
                                    .setDescription(`Sulla ei oo tarpeeks koleja!`);
                                msg.channel.send(embed).catch(error => console.info(error));
                            }
                        } else {
                            embed
                                .setTitle(
                                    `Komennon ${configuration.name} alakomento ${
                                    configuration.sub[args[1]].name
                                    } toimii näin:`
                                )
                                .setDescription(`\`${subsyntax}\``);
                            msg.channel.send(embed).catch(error => console.info(error));
                        }

                        break;

                    case "lahjoita":
                        subsyntax = configuration.sub[args[1]].syntax;

                        if (!isNaN(parseInt(args[2])) && parseInt(args[2]) > 0 && args[3]) {
                            if (parseInt(args[2]) <= parseInt(usrobj.credits)) {
                                let giftTo = "";

                                function gambleCheck(userid) {
                                    for (let i = 0; i < userdata.users.length; i++) {
                                        if (userdata.users[i].id == userid) {
                                            giftTo = userdata.users[i];
                                            return true;
                                        }
                                    }
                                }

                                if (gambleCheck(args[3].replace(/\D/g, ""))) {
                                    usrobj.credits = usrobj.credits - parseInt(args[2]);
                                    giftTo.credits = giftTo.credits + parseInt(args[2]);
                                    embed
                                        .setTitle(`${msg.member.user.username}, huomaa:`)
                                        .setDescription(
                                            `Lahjoitit ${parseInt(args[2])} kolikkoa onnistuneesti!`
                                        );
                                    msg.channel.send(embed).catch(error => console.info(error));
                                } else {
                                    embed
                                        .setTitle(`${msg.member.user.username}, huomaa:`)
                                        .setDescription(
                                            `Valitsemasi pelaaja ei ole vielä koskaan käyttänyt komentoa: \`${prefix}${
                                            configuration.name
                                            }\`. Et voi lahjoittaa hänelle.`
                                        );
                                    msg.channel.send(embed).catch(error => console.info(error));
                                }
                            } else {
                                embed
                                    .setTitle(`${msg.member.user.username}, huomaa:`)
                                    .setDescription(`Sulla ei oo tarpeeks koleja!`);
                                msg.channel.send(embed).catch(error => console.info(error));
                            }
                        } else {
                            embed
                                .setTitle(
                                    `Komennon ${configuration.name} alakomento ${
                                    configuration.sub[args[1]].name
                                    } toimii näin:`
                                )
                                .setDescription(`\`${subsyntax}\``);
                            msg.channel.send(embed).catch(error => console.info(error));
                        }

                        break;

                    case "palkka":
                        subsyntax = configuration.sub[args[1]].syntax;

                        if (Date.now() - usrobj.whenclaimed > 86400000) {
                            embed
                                .setTitle(`${msg.member.user.username}, huomaa:`)
                                .setDescription(`Sait päivän palkan, eli ${daily} kolikkelia.`);
                            msg.channel.send(embed).catch(error => console.info(error));
                            usrobj.whenclaimed = Date.now();
                            usrobj.credits = usrobj.credits + daily;
                        } else {
                            let timeremaining = Math.round(
                                (((usrobj.whenclaimed + 86400000 - Date.now()) / 1000 / 60 / 60) * 100) / 100
                            );
                            embed
                                .setTitle(`${msg.member.user.username}, huomaa:`)
                                .setDescription(
                                    `Vielä ${timeremaining} tuntia et saat kolikkeleita.`
                                );
                            msg.channel.send(embed).catch(error => console.info(error));
                        }

                        break;

                    default:
                        msg.channel.send(embed).catch(error => console.info(error));
                        break;
                }
            } else {
                msg.channel.send(embed).catch(error => console.info(error));
            }

            fs.writeFile(
                "./assets/misc/raha/user-data.json",
                JSON.stringify(userdata),
                function (err) {
                    if (err) {
                        return console.info(err);
                    }
                }
            );
        }

        resolve();
    });
};

module.exports.configuration = configuration;
