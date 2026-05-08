import { Command } from 'commander';
import { loadConfig } from '../core/config.js';
import { compile } from '../core/compiler.js';
import { compileExml } from '../core/exml-compiler.js';
import { applyTarget, copyProjectAssets } from '../core/template.js';
import { BuildError } from '../core/errors.js';
import { logger } from '../utils/logger.js';

function getReleaseDir(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	return `bin-release/${timestamp}`;
}

export const buildCommand = new Command('build')
	.description('Build the project')
	.option('-m, --minify', 'Bundle and minify output (release build)', false)
	.option('--sourcemap', 'Generate sourcemaps', false)
	.option('--watch', 'Enable watch mode (rebuild on file changes, no dev server)', false)
	.option('--analyze', 'Output bundle size analysis (esbuild metafile)', false)
	.action(async (options: { minify: boolean; sourcemap: boolean; watch: boolean; analyze: boolean }) => {
		const start = Date.now();

		try {
			const config = await loadConfig();

			// Release builds go to bin-release/{timestamp}/
			if (options.minify) {
				config.output.dir = getReleaseDir();
			}

			logger.info(`Building${options.minify ? ' (release)' : ''}...`);

			if (options.watch && options.minify) {
				logger.warn('Watch mode is typically used with dev builds (without --minify).');
			}

			if (config.exml) {
				logger.info('Compiling EXML...');
				await compileExml(config);
			}

			logger.info('Compiling TypeScript...');
			await compile(config, {
				target: 'html5',
				minify: options.minify,
				sourcemap: options.sourcemap,
				watch: options.watch,
				analyze: options.analyze,
			});

			// index.html + assets are needed in ALL modes (including watch)
			logger.info('Applying target template...');
			await applyTarget(config, 'main.js');

			logger.info('Copying assets...');
			await copyProjectAssets(config);

			if (!options.watch) {
				const elapsed = ((Date.now() - start) / 1000).toFixed(2);
				logger.success(`Build completed in ${elapsed}s → ${config.output.dir}/`);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new BuildError(`Build failed: ${message}`, err instanceof Error ? err : undefined);
		}
	});
