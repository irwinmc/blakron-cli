import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { ensureDir } from '../utils/fs.js';
import type { ProjectConfig } from './config.js';

export interface CompileOptions {
	target: 'html5';
	minify: boolean;
	sourcemap: boolean;
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

	if (options.minify) {
		// Bundle mode: single output file
		await esbuild.build({
			entryPoints: [path.resolve(config.entry)],
			outfile: path.join(outDir, 'main.js'),
			bundle: true,
			minify: true,
			sourcemap: options.sourcemap,
			target: esTarget,
			format,
			platform,
			define,
			logLevel: 'warning',
		});
	} else {
		// Dev mode: transpile-only, preserve file structure
		await esbuild.build({
			entryPoints: ['src/**/*.ts'],
			outdir: outDir,
			bundle: false,
			minify: false,
			sourcemap: options.sourcemap,
			target: esTarget,
			format,
			platform,
			define,
			logLevel: 'warning',
		});
	}
}
