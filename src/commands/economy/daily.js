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
const config = require("../../config");
const database = require("../../util/database");
const { formatDistance } = require("date-fns");
const logger = require("../../util/logger").scope("command", "daily");
const { oneLine } = require("common-tags");
const ms = require("ms");

module.exports = class DailyCommand extends SentryCommand {
  constructor(client) {
    super(client, {
      name: "daily",
      group: "economy",
      memberName: "daily",
      description: `Collect your daily ${config.currency.plural}.`,
      details: `When you collect your dailies the bot
       will get the same amount of ${config.currency.plural} as you.`,
      aliases: ["dailies"],
      throttling: {
        usages: 1,
        duration: 60
      }
    });
  }

  async exec(msg) {
    try {
      msg.channel.startTyping();

      // Initialize variables
      const oldTimestamp = await database.getDailyUsed(msg.author.id);
      const currentTimestamp = msg.createdTimestamp;

      // 23 hours because it's better for users to have some wiggle room
      const fullDay = ms("23 hours");

      let payout = 1000;
      let note;
      let multiplier = 1;

      if (config.patrons[msg.author.id] && config.patrons[msg.author.id].basic === true) {
        payout *= 2;
        multiplier *= 2;

        note = `You got ${multiplier}x your payout from voting for being a basic tier (or higher) Patreon supporter.`;
      } else {
        note = "You can get double your dailies from being a basic tier (or higher) Patreon supporter.";
      }

      if (oldTimestamp) {
        logger.debug(`Old timestamp: ${new Date(oldTimestamp)} (${oldTimestamp})`);
      } else {
        logger.debug("No date in records");
      }

      logger.debug(`Current timestamp: ${new Date(currentTimestamp)} (${currentTimestamp})`);

      if (!oldTimestamp || oldTimestamp + fullDay < currentTimestamp) {
        // Pay message author their daily and save the time their daily was used
        await Promise.all([
          database.balances.increase(msg.author.id, payout),
          // Pay Dice the same amount to help handle the economy
          database.balances.increase(this.client.user.id, payout),
          database.setDailyUsed(msg.author.id, currentTimestamp)
        ]);

        // Daily not collected in one day
        const bal = (await database.balances.get(msg.author.id)).toLocaleString();

        const message = oneLine`You were paid ${payout.toLocaleString()} ${config.currency.plural}.
        Your balance is now ${bal} ${config.currency.plural}.`;
        return msg.reply(`${message}\n${note}`);
      }
      // Daily collected in a day or less (so, recently)
      const waitDuration = formatDistance(oldTimestamp + fullDay, currentTimestamp);

      return msg.reply(`You must wait ${waitDuration} before collecting your daily ${config.currency.plural}.`);
    } finally {
      msg.channel.stopTyping();
    }
  }
};
