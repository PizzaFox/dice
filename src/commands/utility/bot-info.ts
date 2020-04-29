import {formatDistanceToNow, subMilliseconds} from 'date-fns';
import {Message, MessageEmbed, Permissions} from 'discord.js';
import {Colors} from '../../constants';
import {DiceCommand, DiceCommandCategories} from '../../structures/DiceCommand';
import * as pkg from '../../../package.json';

export default class BotInfoCommand extends DiceCommand {
	constructor() {
		super('bot-info', {
			aliases: ['uptime', 'version', 'bot', 'memory', 'ram', 'memory-usage', 'ram-usage', 'patrons', 'supporters'],
			description: {content: 'Information about the bot.'},
			category: DiceCommandCategories.Util,
			clientPermissions: [Permissions.FLAGS.EMBED_LINKS]
		});
	}

	async exec(message: Message): Promise<Message | undefined> {
		return message.util?.send(
			new MessageEmbed({
				title: 'Dice',
				url: 'https://dice.js.org',
				color: Colors.Primary,
				description: 'Dice is a multipurpose, general-use, utility bot',
				thumbnail: {url: this.client.user?.displayAvatarURL({format: 'webp', size: 512})},
				fields: [
					{name: 'Uptime', value: formatDistanceToNow(subMilliseconds(new Date(), this.client.uptime!)), inline: true},
					{
						name: 'Version',
						value: `v${pkg.version}`,
						inline: true
					},
					{
						name: 'RAM usage',
						value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} megabytes`,
						inline: true
					},
					{
						name: 'Support team',
						value: 'PizzaFox#0075, okthx#0581, Chronomly#8108 and Jdender~#2316',
						inline: true
					}
				]
			})
		);
	}
}
