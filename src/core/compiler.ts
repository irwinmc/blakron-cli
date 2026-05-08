import * as esbuild from 'esbuild';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
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

export interface CompileResult {
	/** Map of logical name → hashed filename (e.g. 'engine' → 'blakron.engine.a1b2c3d4.js') */
	outputFiles: Record<string, string>;
}

export async function compile(config: ProjectConfig, options: CompileOptions): Promise<CompileResult> {
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
	};

	if (options.minify) {
		// ═══ Release mode: two-pass build ═══════════════════════════════
		const outputFiles: Record<string, string> = {};
		const vendorPackages = ['@blakron/core', '@blakron/ui', '@blakron/game'];

		// ── Pass 1: engine (self-contained, no external deps) ──────────
		const engineStubPath = path.resolve('src/_generated/engine.ts');
		await ensureDir(path.dirname(engineStubPath));
		await fs.writeFile(engineStubPath, genEngineStub());

		const engineResult = await esbuild.build({
			...commonOptions,
			entryPoints: { 'blakron.engine': engineStubPath },
			outdir: outDir,
			entryNames: '[name].[hash]',
			bundle: true,
			minify: true,
			metafile: true,
		});

		const engineFiles = getOutputFiles(engineResult);
		outputFiles['engine'] = engineFiles['blakron.engine'] ?? 'blakron.engine.js';

		// ── Pass 2: game + skins (external engine packages) ─────────────
		const appEntries: Record<string, string> = {
			main: path.resolve(config.entry),
		};

		const skinIndex = path.resolve('src/_generated/skins/index.ts');
		try {
			await fs.access(skinIndex);
			appEntries['default.thm'] = skinIndex;
		} catch {
			// No generated skins, skip thm entry
		}

		const appResult = await esbuild.build({
			...commonOptions,
			entryPoints: appEntries,
			outdir: outDir,
			entryNames: '[name].[hash]',
			bundle: true,
			minify: true,
			splitting: true,
			external: vendorPackages,
			metafile: true,
		});

		const appFiles = getOutputFiles(appResult);
		if (appFiles['main']) outputFiles['main'] = appFiles['main'];
		if (appFiles['default.thm']) outputFiles['thm'] = appFiles['default.thm'];

		logger.info(`  Engine: ${outputFiles['engine']}`);
		logger.info(`  Main:   ${outputFiles['main']}`);
		if (outputFiles['thm']) logger.info(`  Skins:  ${outputFiles['thm']}`);

		return { outputFiles };
	} else {
		// ═══ Dev mode: single bundle ═══════════════════════════════════
		const buildOptions: esbuild.BuildOptions = {
			...commonOptions,
			entryPoints: [path.resolve(config.entry)],
			outfile: path.join(outDir, 'main.js'),
			bundle: true,
			minify: false,
			metafile: options.analyze,
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

		return { outputFiles: {} };
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────

function genEngineStub(): string {
	const vendors = ['@blakron/core', '@blakron/ui', '@blakron/game'];
	return [
		'// Auto-generated — imports engine packages for standalone bundle',
		...vendors.map(pkg => `import '${pkg}';`),
		'',
	].join('\n');
}

function getOutputFiles(result: esbuild.BuildResult): Record<string, string> {
	const files: Record<string, string> = {};
	if (!result.metafile) return files;
	for (const key of Object.keys(result.metafile.outputs)) {
		const name = path.basename(key);
		const base = name.replace(/\.\w+$/, '').replace(/\.([a-f0-9]{8})$/, '');
		// Map plain name → hashed filename (e.g. 'blakron.engine' → 'blakron.engine.a1b2c3d4.js')
		files[base] = name;
		// Also map the full base (with hash stripped) for easier lookup
		const noExt = name.replace(/\.js$/, '');
		files[noExt] = name;
	}
	return files;
}
