import * as esbuild from 'esbuild';
import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { ensureDir } from '../utils/fs.js';
import { applyTarget, copyProjectAssets } from './template.js';
import { compileExml } from './exml-compiler.js';
import type { ProjectConfig } from './config.js';
import { logger } from '../utils/logger.js';

export interface DevServerOptions {
	port: number;
	sourcemap: boolean;
}

/**
 * Starts a development server with file watching.
 *
 * - esbuild watches .ts files → auto recompile
 * - fs.watch monitors .exml files → auto recompile
 * - Browser does NOT auto-refresh — you control when to reload manually
 */
export async function startDevServer(config: ProjectConfig, options: DevServerOptions): Promise<void> {
	const outDir = path.resolve(config.output.dir);
	await ensureDir(outDir);

	// ── Generate static files (index.html, resource/) ────────────────────────
	await applyTarget(config);
	await copyProjectAssets(config);

	// ── Initial EXML compilation ─────────────────────────────────────────────
	if (config.exml) {
		try {
			await compileExml(config);
			logger.info('EXML skins compiled');
		} catch (err) {
			logger.warn(`EXML compilation failed: ${err instanceof Error ? err.message : err}`);
		}
	}

	// ── esbuild context: transpile-only, watch mode ───────────────────────────
	const ctx = await esbuild.context({
		entryPoints: ['src/**/*.ts'],
		outdir: outDir,
		bundle: false,
		sourcemap: options.sourcemap,
		target: 'es2022',
		format: 'esm',
		platform: 'browser',
		define: {
			'process.env.DEBUG': 'true',
			'process.env.RELEASE': 'false',
		},
		logLevel: 'warning',
	});

	// Start watching — esbuild rebuilds on every TS file change.
	await ctx.watch();

	// esbuild serve provides an in-memory file server for compiled JS.
	const esbuildServer = await ctx.serve({ port: 0 });
	const esbuildHost = esbuildServer.hosts[0] ?? '127.0.0.1';

	// ── EXML file watcher ─────────────────────────────────────────────────────
	let exmlWatcher: fsSync.FSWatcher | undefined;
	if (config.exml) {
		const srcDir = path.resolve('src');
		let exmlDebounce: ReturnType<typeof setTimeout> | undefined;

		try {
			exmlWatcher = fsSync.watch(
				srcDir,
				{ recursive: true },
				async (_eventType: string, filename: string | null) => {
					if (!filename || !filename.endsWith('.exml')) return;

					// Debounce: batch rapid changes (e.g. IDE save multiple files)
					if (exmlDebounce) clearTimeout(exmlDebounce);
					exmlDebounce = setTimeout(async () => {
						const shortName = filename.split(/[/\\]/).pop() ?? filename;
						logger.info(`EXML changed: ${shortName}, recompiling...`);
						try {
							await compileExml(config);
							logger.success('EXML skins recompiled');
						} catch (err) {
							logger.warn(`EXML recompile failed: ${err instanceof Error ? err.message : err}`);
						}
					}, 100);
				},
			);
		} catch {
			// fs.watch recursive may not be supported on all platforms
			logger.warn('EXML watcher not available (recursive fs.watch unsupported)');
		}
	}

	// ── HTTP server ───────────────────────────────────────────────────────────
	const server = http.createServer(async (req, res) => {
		const url = req.url ?? '/';

		// Forward compiled JS files to esbuild's in-memory server.
		if (url.endsWith('.js') || url.endsWith('.js.map')) {
			proxyRequest(req, res, esbuildHost, esbuildServer.port);
			return;
		}

		// Serve static files from the output directory.
		const filePath = path.join(outDir, url === '/' ? 'index.html' : url);

		try {
			const data = await fs.readFile(filePath);
			const contentType = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : getMimeType(filePath);
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(options.port, () => {
		logger.success(`Dev server running at http://localhost:${options.port}`);
		logger.info('Watching for file changes...');
		if (config.exml) {
			logger.info('Watching EXML skins for changes');
		}
	});

	// Graceful shutdown on Ctrl+C.
	process.on('SIGINT', async () => {
		logger.info('Stopping dev server...');
		exmlWatcher?.close();
		await ctx.dispose();
		server.close();
		process.exit(0);
	});
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Proxies an incoming request to esbuild's internal serve port. */
function proxyRequest(req: http.IncomingMessage, res: http.ServerResponse, host: string, port: number): void {
	const options: http.RequestOptions = {
		hostname: host,
		port,
		path: req.url,
		method: req.method,
		headers: req.headers,
	};
	const proxy = http.request(options, proxyRes => {
		res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
		proxyRes.pipe(res, { end: true });
	});
	proxy.on('error', () => {
		res.writeHead(502);
		res.end('Bad gateway');
	});
	req.pipe(proxy, { end: true });
}

/** Returns a basic MIME type for common file extensions. */
function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const types: Record<string, string> = {
		'.html': 'text/html',
		'.js': 'application/javascript',
		'.css': 'text/css',
		'.json': 'application/json',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.svg': 'image/svg+xml',
		'.webp': 'image/webp',
		'.mp3': 'audio/mpeg',
		'.ogg': 'audio/ogg',
		'.wav': 'audio/wav',
		'.mp4': 'video/mp4',
		'.woff': 'font/woff',
		'.woff2': 'font/woff2',
		'.ttf': 'font/ttf',
	};
	return types[ext] ?? 'application/octet-stream';
}
