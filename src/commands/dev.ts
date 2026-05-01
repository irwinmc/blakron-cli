import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { startDevServer } from '../core/dev-server.js';
import { BuildError } from '../core/errors.js';
import { logger } from '../utils/logger.js';

export const devCommand = new Command('dev')
	.description('Start development server with live reload')
	.option('-p, --port <port>', 'Port to listen on', '3000')
	.option('--sourcemap', 'Generate sourcemaps', false)
	.action(async (options: { port: string; sourcemap: boolean }) => {
		try {
			const config = await loadConfig();
			const port = parseInt(options.port, 10);

			if (isNaN(port) || port < 1 || port > 65535) {
				throw new BuildError(`Invalid port: ${options.port}`);
			}

			logger.info(`Starting dev server on port ${port}...`);
			await startDevServer(config, { port, sourcemap: options.sourcemap });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error(`Dev server failed: ${message}`);
			process.exit(1);
		}
	});
