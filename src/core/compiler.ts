import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { ensureDir } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import type { ProjectConfig } from './config.js';

export interface CompileOptions {
	target: 'html5';
	minify: boolean;
	sourcemap: boolean;
	watch: boolean;
	analyze: boolean;
}

export async function compile(config: ProjectConfig, options: CompileOptions): Promise<void> {
	const outDir = path.resolve(config.output.dir);
	await ensureDir(outDir);

	const esTarget = 'es2022';
	const format = 'esm';
	const platform = 'browser';

	const define: Record<string, string> = {
		'process.env.DEBUG': JSON.stringify(!options.minify),
		'process.env.RELEASE': JSON.stringify(options.minify),
	};

	const commonOptions: esbuild.BuildOptions = {
		sourcemap: options.sourcemap,
		target: esTarget,
		format,
		platform,
		define,
		logLevel: 'warning' as const,
		metafile: options.analyze,
	};

	if (options.minify) {
		// Bundle mode: single output file
		const buildOptions: esbuild.BuildOptions = {
			...commonOptions,
			entryPoints: [path.resolve(config.entry)],
			outfile: path.join(outDir, 'main.js'),
			bundle: true,
			minify: true,
		};

		if (options.watch) {
			const ctx = await esbuild.context(buildOptions);
			await ctx.watch();
			logger.info('Watch mode active (minify). Press Ctrl+C to stop.');
			await new Promise<void>(resolve => {
				const handler = async () => {
					process.off('SIGINT', handler);
					await ctx.dispose();
					resolve();
				};
				process.on('SIGINT', handler);
			});
		} else {
			const result = await esbuild.build(buildOptions);

			if (options.analyze && result.metafile) {
				const analysis = await esbuild.analyzeMetafile(result.metafile);
				logger.info('Bundle size analysis:\n' + analysis);
			}
		}
	} else {
		// Dev mode: transpile-only, preserve file structure
		const buildOptions: esbuild.BuildOptions = {
			...commonOptions,
			entryPoints: ['src/**/*.ts'],
			outdir: outDir,
			bundle: false,
			minify: false,
		};

		if (options.watch) {
			const ctx = await esbuild.context(buildOptions);
			await ctx.watch();
			logger.info('Watch mode active. Press Ctrl+C to stop.');
			await new Promise<void>(resolve => {
				const handler = async () => {
					process.off('SIGINT', handler);
					await ctx.dispose();
					resolve();
				};
				process.on('SIGINT', handler);
			});
		} else {
			const result = await esbuild.build(buildOptions);

			if (options.analyze && result.metafile) {
				const analysis = await esbuild.analyzeMetafile(result.metafile);
				logger.info('Bundle size analysis:\n' + analysis);
			}
		}
	}
}
