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

const { Command } = require("discord.js-commando");
const Sentry = require("@sentry/node");
const database = require("../../src/util/database");
const logCommandToKeen = require("../../src/util/logCommandToKeen");

class SentryCommand extends Command {
  /**
   * Runs the command
   * @param {CommandoMessage} message - The message the command is being run for
   * @param {Object|string|string[]} args - The arguments for the command, or the matches from a pattern.
   * If args is specified on the command, this will be the argument values object. If argsType is single, then only
   * one string will be passed. If multiple, an array of strings will be passed. When fromPattern is true, this is the
   * matches array from the pattern match
   * (see [RegExp#exec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)).
   * @param {boolean} fromPattern - Whether or not the command is being run from a pattern match
   * @return {Promise<?Message|?Array<Message>>}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async run(message, args, fromPattern) {
    Sentry.configureScope(scope => {
      const { username, id } = message.author;
      scope.setUser({ username, id });

      scope.setTag("shard ID", message.client.shard.id);
      scope.setTag("cluster ID", Number(process.env.CLUSTER_ID));
      scope.setTag("command group", message.command.group.id);
      scope.setTag("command", message.command.memberName);

      scope.setExtra("guild ID", message.guild ? message.guild.id : "dm");
      scope.setExtra("channel ID", message.channel.id);
      scope.setExtra("message ID", message.id);
      scope.setExtra("arguments", args || {});

      database.balances.get(id, false).then(balance => {
        scope.setExtra("user balance", balance);
      });
    });

    logCommandToKeen(message, args);
    return this.exec(message, args, fromPattern);
  }

  /**
   * Runs the command
   * @param {CommandoMessage} message - The message the command is being run for
   * @param {Object|string|string[]} args - The arguments for the command, or the matches from a pattern.
   * If args is specified on the command, this will be the argument values object. If argsType is single, then only
   * one string will be passed. If multiple, an array of strings will be passed. When fromPattern is true, this is the
   * matches array from the pattern match
   * (see [RegExp#exec](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)).
   * @param {boolean} fromPattern - Whether or not the command is being run from a pattern match
   * @return {Promise<?Message|?Array<Message>>}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars, require-await
  async exec(message, args, fromPattern) {
    throw new Error(`${this.constructor.name} doesn't have an exec() method.`);
  }
}

module.exports = SentryCommand;
