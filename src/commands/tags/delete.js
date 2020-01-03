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
const { Util } = require("discord.js");
const respond = require("../../util/simpleCommandResponse");

module.exports = class DeleteTagCommand extends SentryCommand {
  constructor(client) {
    super(client, {
      name: "delete-tag",
      aliases: ["del-tag", "tag-delete", "tag-del", "remove-tag", "tag-remove"],
      group: "tags",
      memberName: "delete",
      description: "Delete a tag from a server's tags.",
      examples: ["delete-tag "],
      guildOnly: true,
      args: [
        {
          key: "name",
          prompt: "Which tag do you want to delete?",
          type: "string",
          parse: val => Util.cleanContent(val.toLowerCase()),
          max: 50
        }
      ],
      throttling: {
        usages: 2,
        duration: 5
      }
    });
  }

  async exec(msg, { name }) {
    // Get the tags
    const tags = await this.client.provider.get(msg.guild, "tags", {});
    if (!Object.hasOwnProperty.call(tags, name)) return msg.reply("That tag doesn't exist.");

    const tag = tags[name];
    if (tag.author === msg.author.id || msg.member.permissions.has("MANAGE_MESSAGES")) {
      // Delete the specified tag
      delete tags[name];
    } else {
      return msg.reply(
        `You can only delete tags if you made them or you have "manage messages" permissions from a role. This tag was created by ${Util.escapeMarkdown(
          (await this.client.users.fetch(tag.author)).tag
        )}.`
      );
    }
    // Set the object to our updated version
    await this.client.provider.set(msg.guild, "tags", tags);

    // Respond to author with success
    respond(msg);

    return null;
  }
};
