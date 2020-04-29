import {baseLogger} from '../../util/logger';
import {DiceListener, DiceListenerCategories} from '../../structures/DiceListener';
import {runningInProduction, readyWebhook} from '../../config';
import {MessageEmbed, WebhookClient} from 'discord.js';
import {code} from 'discord-md-tags';
import * as pkg from '../../../package.json';
import {captureException} from '@sentry/node';

const embed = new MessageEmbed({
	title: 'Ready',
	fields: [
		{
			name: 'Version',
			value: code`${pkg.version}`
		}
	]
});

export default class ReadyListener extends DiceListener {
	logger: typeof baseLogger;
	private scopedWithClusterID = false;

	constructor() {
		super('ready', {
			emitter: 'client',
			event: 'ready',
			category: DiceListenerCategories.Client
		});

		this.logger = baseLogger.scope('client');
	}

	exec(): void {
		this.client.user!.setPresence({activity: {name: 'for @Dice help', type: 'WATCHING'}}).catch(error => {
			this.logger.error("An error occurred while setting the client's presence", error);
			return captureException(error);
		});

		if (!this.scopedWithClusterID && this.client.shard?.id !== undefined) {
			this.logger = baseLogger.scope('client', `cluster ${this.client.shard?.id}`);
			this.scopedWithClusterID = true;
		}

		if (runningInProduction) {
			if (readyWebhook.id !== undefined && readyWebhook.token !== undefined) {
				const webhookClient = new WebhookClient(readyWebhook.id, readyWebhook.token);

				embed.setTimestamp(this.client.readyAt ?? new Date());

				webhookClient.send(embed).catch(error => {
					this.logger.error('An error occurred while sending the ready webhook', error);
					return captureException(error);
				});
			} else {
				this.logger.warn('Running in production, but the ready webhook credentials are invalid');

				if (readyWebhook.id === undefined && readyWebhook.token === undefined) {
					this.logger.warn('Ready webhook ID and token not provided');
				} else if (readyWebhook.id === undefined) {
					this.logger.warn('Ready webhook ID not provided');
				} else if (readyWebhook.token === undefined) {
					this.logger.warn('Ready webhook token not provided');
				}
			}
		}

		return this.logger.start('Ready');
	}
}
