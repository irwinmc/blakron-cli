import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Compiles and bundles the project source with esbuild.
 *
 * - **development**: a single, unminified `main.js`.
 * - **release**: a single, minified, content-hashed `main.[hash].js`.
 *
 * Everything (engine, game, skins) lands in one self-contained ESM bundle —
 * no bare-specifier externals, so the output runs directly in the browser.
 * The generated entry filename is reported via `ctx.outputs.entryScript`.
 */
export function compileSource(): BuildPlugin {
	return {
		name: 'compile source',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			const isRelease = project.mode === 'release';
			await ensureDir(project.outputDir);

			const options: esbuild.BuildOptions = {
				entryPoints: [project.entry],
				bundle: true,
				format: 'esm',
				platform: 'browser',
				target: 'es2022',
				sourcemap: ctx.sourcemap,
				minify: isRelease,
				logLevel: 'warning',
				define: {
					'process.env.DEBUG': JSON.stringify(!isRelease),
					'process.env.RELEASE': JSON.stringify(isRelease),
				},
			};

			if (isRelease) {
				// Content-hashed entry for long-term caching.
				options.outdir = project.outputDir;
				options.entryNames = 'main.[hash]';
				options.metafile = true;
			} else {
				options.outfile = path.join(project.outputDir, 'main.js');
				options.metafile = ctx.analyze;
				ctx.outputs.entryScript = 'main.js';
			}

			if (ctx.watch) {
				// Watch mode keeps an esbuild context alive; the first build runs
				// synchronously via watch(), later rebuilds happen on file change.
				const context = await esbuild.context(options);
				await context.watch();
				ctx.disposers.push(() => context.dispose());
				return;
			}

			const result = await esbuild.build(options);

			if (isRelease) {
				ctx.outputs.entryScript = findEntryScript(result.metafile!);
			}
			if (ctx.analyze && result.metafile) {
				logger.info('Bundle analysis:\n' + (await esbuild.analyzeMetafile(result.metafile)));
			}
		},
	};
}

/** Locates the emitted JS entry file (ignoring sourcemaps) in the metafile. */
function findEntryScript(metafile: esbuild.Metafile): string {
	const entry = Object.entries(metafile.outputs).find(
		([file, info]) => info.entryPoint !== undefined && file.endsWith('.js'),
	);
	const fallback = Object.keys(metafile.outputs).find(file => file.endsWith('.js'));
	return path.basename(entry?.[0] ?? fallback ?? 'main.js');
}
