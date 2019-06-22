/*
Copyright 2019 Jonah Snider

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const SentryCommand = require("../../structures/SentryCommand");
const { MessageEmbed } = require("discord.js");
const config = require("../../config");
const simpleFormat = require("../../util/simpleFormat");
const winPercentage = require("../../util/winPercentage");
const database = require("../../util/database");

module.exports = class DiceGameCommand extends SentryCommand {
  constructor(client) {
    super(client, {
      name: "dice-game",
      group: "games",
      memberName: "dice-game",
      description: "Bet a wager on a multiplier.",
      details: `For each bet the outcome is randomly chosen between 1 and 100. It's up to you to guess a target that you think the outcome will exceed. If you lose, your ${config.currency.plural} are given to the bot. If you win they're taken from the bot`,
      aliases: ["game", "play-game", "play-dice", "betting-game", "bet"],
      examples: ["dice-game 250 4"],
      clientPermissions: ["EMBED_LINKS"],
      args: [
        {
          key: "wager",
          prompt: "How much do you want to wager? (whole number)",
          type: "integer",
          min: config.minCurrency
        },
        {
          key: "multiplier",
          prompt: "How much do you want to multiply your wager by?",
          type: "float",
          parse: multiplier => simpleFormat(multiplier),
          min: config.minMultiplier,
          max: config.maxMultiplier
        }
      ],
      throttling: {
        usages: 1,
        duration: 1
      }
    });
  }

  async exec(msg, { wager, multiplier }) {
    try {
      msg.channel.startTyping();

      const authorBalance = await database.balances.get(msg.author.id);

      // Wager checking
      if (wager > authorBalance) {
        return msg.reply(
          `You are missing \`${(wager - authorBalance).toLocaleString()}\` ${
            config.currency.plural
          }. Your balance is \`${authorBalance.toLocaleString()}\` ${config.currency.plural}.`
        );
      } else if (wager * multiplier - wager > (await database.balances.get(this.client.user.id))) {
        return msg.reply("I couldn't pay you your winnings if you won.");
      }

      await Promise.all([
        // Take away the player's wager no matter what
        database.balances.decrease(msg.author.id, wager),
        // Give the wager to the house
        database.balances.increase(this.client.user.id, wager)
      ]);

      // Round numbers to second decimal place
      const randomNumber = simpleFormat(Math.random() * config.maxMultiplier);

      // Get boolean if the random number is greater than the multiplier
      const gameResult = randomNumber > winPercentage(multiplier, msg.author);

      // Variables for later use
      const revenue = wager * multiplier;
      const profit = simpleFormat(revenue - wager);

      if (gameResult === false) {
        await Promise.all([
          // Give the player their winnings
          database.balances.increase(msg.author.id, revenue),
          // Take the winnings from the house
          database.balances.decrease(this.client.user.id, revenue)
        ]);
      }

      const embed = new MessageEmbed({
        title: `**${wager.toLocaleString()} 🇽 ${multiplier}**`,
        fields: [
          {
            name: "🔢 Random Number Result",
            value: `${randomNumber}`,
            inline: true
          },
          {
            name: "🏦 Updated Balance",
            value: `${(await database.balances.get(msg.author.id)).toLocaleString()} ${config.currency.plural}`,
            inline: true
          },
          {
            name: "💵 Wager",
            value: `${wager.toLocaleString()}`,
            inline: true
          },
          {
            name: "🇽 Multiplier",
            value: `${multiplier}`,
            inline: true
          }
        ]
      });

      if (gameResult === true) {
        // Red color and loss message
        embed.setColor(0xf44334);
        embed.setDescription(`You lost \`${wager.toLocaleString()}\` ${config.currency.plural}.`);
      } else {
        // Green color and win message
        embed.setColor(0x4caf50);
        embed.setDescription(`You made \`${profit.toLocaleString()}\` ${config.currency.plural} of profit!`);
      }

      return msg.replyEmbed(embed);
    } finally {
      msg.channel.stopTyping();
    }
  }
};
