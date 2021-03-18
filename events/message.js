const mongoose = require('mongoose');
const Guild = require('../models/guild');
const userServer = require('../models/userServer');
const userGlobal = require('../models/userGlobal');
const Command = require('../models/command');
const Discord = require('discord.js');
const cmdThing = require('node-cmd');
const TikTokScraper = require('tiktok-scraper');
const fetch = require('node-fetch');
require('dotenv').config();
const moment = require('moment');


var markdownEscape = function(text) {
   if (text.includes('_', '*', '~')) {
     return `\`\`\`${text}\`\`\``
   } else {
     return text
   }
};

module.exports = async (client, message) => {
    if (message.author.bot) return;

    const settings = await Guild.findOne({
        guildID: message.guild.id
    }, (err, guild) => {
        if (err) console.error(err)
        if (!guild) {
            const newGuild = new Guild({
                _id: mongoose.Types.ObjectId(),
                guildID: message.guild.id,
                guildName: message.guild.name,
                prefix: process.env.PREFIX,
                logChannelID: null
            })

            newGuild.save()
            .then(result => console.log(result))
            .catch(err => console.error(err));

            return message.channel.send('This server was not in our database! We have now added and you should be able to use bot commands.').then(m => m.delete({timeout: 10000}));
        }
    });
    const userS = await userServer.findOne({
        guildID: message.guild.id, userID: message.author.id
    }, (err, author) => {
        if (err) console.error(err)
        if (!author) {
            const newUserServer = new userServer({
                _id: mongoose.Types.ObjectId(),
                guildID: message.guild.id,
                guildName: message.guild.name,
                userID: message.author.id,
                username: message.author.tag,
                xp: 0,
                level: 1,
                muteCount: 0,
                warnCount: 0,
                kickCount: 0,
                banCount: 0
            })

            newUserServer.save()
            .then()
            .catch(err => console.error(err));
        }
    });
    const userG = await userGlobal.findOne({
        userID: message.author.id
    }, (err, author) => {
        if (err) console.error(err)
        if (!author) {
            const newUserGlobal = new userGlobal({
                _id: mongoose.Types.ObjectId(),
                userID: message.author.id,
                username: message.author.tag,
                xp: 0,
                level: 1,
                weather: '',
                horoscope: '',
                lastfm: ''
            })

            newUserGlobal.save()
            .then()
            .catch(err => console.error(err));
            return console.log(`${message.author.username} has joined our database`);
        }
    });
    
    const addXPserver = async (guildID, userID, xpToAdd) => {
        const getNeededXP = (level) => level * level * 100
        const result = await userServer.findOneAndUpdate(
            {
                guildID,
                userID,
            },
            {
                guildID,
                userID,
              $inc: {
                xp: xpToAdd,
              },
            },
            {
              upsert: true,
              new: true,
            }
          )
          let { xp, level } = result
        const needed = getNeededXP(level)

        if (xp >= needed) {
         ++level
            xp -= needed
            await userServer.updateOne(
                {
                  guildID,
                  userID,
                },
                {
                  level,
                  xp,
                }
              )
            }
        }
        addXPserver(message.guild.id, message.member.id, 23).catch();
    
        const addXPglobal = async (userID, xpToAdd) => {
            const getNeededXP = (level) => level * level * 100
            const result = await userGlobal.findOneAndUpdate(
                {
                    userID
                },
                {
                    userID,
                  $inc: {
                    xp: xpToAdd,
                  },
                },
                {
                  upsert: true,
                  new: true,
                }
              )
              let { xp, level } = result
            const needed = getNeededXP(level)
    
            if (xp >= needed) {
             ++level
                xp -= needed
                await userGlobal.updateOne(
                    {
                      userID,
                    },
                    {
                      level,
                      xp,
                    }
                  )
                }
            }
            addXPglobal(message.member.id, 23).catch();
    if (message.content.includes('tiktok.com')) {
      // need to check if it is a link before executing
      let checkUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/
      if (checkUrl.test(message) == false) {
        return
      }
      let testString = message.content
      const query = testString.match(/\bhttps?:\/\/\S+/gi);
      const videoMeta = await TikTokScraper.getVideoMeta(query)
      const video = videoMeta.collector[0];
      //console.log(video)
      const videoURL = video.videoUrl
      const headers = videoMeta.headers;
      const response = await fetch(videoURL, {
        method: 'GET', headers
      });
      const buffer = await response.buffer()
      //console.log(response)
      //console.log(buffer)
      try {
      const embed = new Discord.MessageEmbed()
      .setTitle(`${markdownEscape(video.text)}`)
      .setFooter(moment.unix(video.createTime).format("dddd, MMMM Do YYYY, h:mm A"))
      .setColor('#000000')
      .setAuthor(video.authorMeta.name, video.authorMeta.avatar, `https://www.tiktok.com/@${video.authorMeta.name}?`)
      await message.channel.send(new Discord.MessageAttachment(buffer, 'video.mp4'))
      await message.channel.send(embed)
      } catch {
        return
      }
    }

    const prefix = settings.prefix;

    if (!message.guild) return;
    if (!message.content.startsWith(prefix)) return;
    if (message.content.includes(`${prefix}?`)) return;
    if (message.content.includes(`${prefix}!`)) return;
    if (message.content.includes(`${prefix}+`)) return;
    if (message.content.includes(`${prefix}%`)) return;
    if (message.content.includes(`${prefix}/`)) return;
    
    if (!message.member) message.member = await message.guild.fetchMember (message);

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    
    if (cmd.length === 0) return;
    
    let command = client.commands.get(cmd) || client.commands.find(command => command.aliases && command.aliases.includes(cmd));
    if (!command) command = client.commands.get(client.aliases.get(cmd));    

    /*
    if (command) {
        command.run(client, message, args);
    }
    */
   
   if (command) {
    {
        command.run(client, message, args);
    }
  } else {
    Command.findOne(
        { guildID: message.guild.id, command: cmd },
        async (err, data) => {
          if (err) throw err;
          if (data) {
              return message.channel.send(data.content);
          } else {
              return message.channel.send(`This command does not exist.\nUse ${prefix}Commands for a list of all commands. \nIf it was supposed to be a custom tag, it does not exist on this server.`);
        }
      }
    );
  }
  
};