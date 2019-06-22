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
const logger = require("../../util/logger").scope("command", "discoin rates");
const axios = require("axios");

module.exports = class DiscoinRatesCommand extends SentryCommand {
  constructor(client) {
    super(client, {
      name: "discoin-rates",
      group: "economy",
      memberName: "discoin-rates",
      description: "Lists the conversion rates for Discoin currencies.",
      aliases: ["rates", "conversion-rates", "convert-rates"],
      clientPermissions: ["EMBED_LINKS"],
      throttling: {
        usages: 1,
        duration: 5
      }
    });
  }

  async exec(msg) {
    try {
      msg.channel.startTyping();

      const rates = (await axios.get("http://discoin.sidetrip.xyz/rates.json")).data;

      const embed = new MessageEmbed({
        title: "Discoin Conversion Rates",
        url: "http://discoin.sidetrip.xyz"
      });

      rates.forEach(rate => {
        for (const bot in rate) {
          embed.addField(
            bot,
            `Currency code: ${rate[bot].currencyCode}\nTo Discoin: ${rate[bot].toDiscoin}\nFrom Discoin: ${rate[bot].fromDiscoin}`
          );
        }
      });

      return msg.replyEmbed(embed);
    } catch (error) {
      logger.error(error);
      return msg.reply("An error occured.");
    } finally {
      msg.channel.stopTyping();
    }
  }
};
