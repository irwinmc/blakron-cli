import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { compile } from '../core/compiler.js';
import { compileExml } from '../core/exml-compiler.js';
import { applyTarget, copyProjectAssets } from '../core/template.js';
import { BuildError } from '../core/errors.js';
import { logger } from '../utils/logger.js';

export const buildCommand = new Command('build')
	.description('Build the project')
	.option('-m, --minify', 'Bundle and minify output', false)
	.option('--sourcemap', 'Generate sourcemaps', false)
	.action(async (options: { minify: boolean; sourcemap: boolean }) => {
		const start = Date.now();

		try {
			const config = await loadConfig();

			logger.info('Building...');

			if (config.exml) {
				logger.info('Compiling EXML...');
				await compileExml(config);
			}

			logger.info('Compiling TypeScript...');
			await compile(config, { target: 'html5', minify: options.minify, sourcemap: options.sourcemap });

			logger.info('Applying target template...');
			await applyTarget(config);

			logger.info('Copying assets...');
			await copyProjectAssets(config);

			const elapsed = ((Date.now() - start) / 1000).toFixed(2);
			logger.success(`Build completed in ${elapsed}s → ${config.output.dir}/`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new BuildError(`Build failed: ${message}`, err instanceof Error ? err : undefined);
		}
	});
