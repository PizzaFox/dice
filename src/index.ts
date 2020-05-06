import {start as startDebugAgent} from '@google-cloud/debug-agent';
import {start as startProfiler} from '@google-cloud/profiler';
import {captureException} from '@sentry/node';
import {ShardingManager} from 'kurasuta';
import {join} from 'path';
import pkg from '../package.json';
import {discordToken, googleAppCredentials, runningInProduction} from './config';
import {DiceClient} from './structures/DiceClient';
import {baseLogger} from './util/logger';
import {registerSharderEvents} from './util/register-sharder-events';
import {googleProjectId} from './constants';

const logger = baseLogger.scope('sharder');

if (googleAppCredentials) {
	const serviceContext = {version: pkg?.version ?? process.env.npm_package_version, service: 'shard-manager'};

	startProfiler({
		projectId: googleProjectId,
		serviceContext
	})
		// eslint-disable-next-line promise/prefer-await-to-then
		.then(() => logger.success('Started Google Cloud Profiler'))
		.catch(error => {
			logger.error('Failed to initialize Google Cloud Profiler', error);
			captureException(error);
		});

	try {
		startDebugAgent({
			projectId: googleProjectId,
			serviceContext
		});
	} catch (error) {
		logger.error('Failed to initialize Google Cloud Debug Agent', error);
		captureException(error);
	}
}

const sharder = new ShardingManager(join(__dirname, 'structures', 'DiceCluster'), {
	client: DiceClient,
	development: !runningInProduction,
	// Only restart in production
	respawn: runningInProduction,
	retry: runningInProduction,
	// Used to automatically determine recommended shard count from the Discord API
	token: discordToken
});

registerSharderEvents(sharder, logger);

sharder.spawn().catch(logger.fatal);
