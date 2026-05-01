import * as esbuild from 'esbuild';
import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir } from '../utils/fs.js';
import { applyTarget, copyProjectAssets } from './template.js';
import type { ProjectConfig } from './config.js';
import { logger } from '../utils/logger.js';

export interface DevServerOptions {
	port: number;
	sourcemap: boolean;
}

/**
 * Starts a development server with file watching and live reload.
 *
 * Architecture:
 * - esbuild `context.watch()` recompiles on file changes
 * - esbuild `context.serve()` serves compiled JS from memory
 * - A thin Node.js HTTP proxy sits in front, serving static files
 *   (index.html, resource/) and forwarding JS requests to esbuild
 * - Live reload is delivered via Server-Sent Events (SSE): esbuild's
 *   built-in `/esbuild` SSE endpoint is proxied through to the browser,
 *   and a small inline script in index.html subscribes to it
 */
export async function startDevServer(config: ProjectConfig, options: DevServerOptions): Promise<void> {
	const outDir = path.resolve(config.output.dir);
	await ensureDir(outDir);

	// ── Generate static files (index.html, resource/) ────────────────────────
	await applyTarget(config);
	await copyProjectAssets(config);

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

	// Start watching — esbuild rebuilds on every file change.
	await ctx.watch();

	// esbuild's built-in serve provides an in-memory file server for compiled
	// JS and exposes a /esbuild SSE endpoint for live reload notifications.
	const esbuildServer = await ctx.serve({ port: 0 }); // port 0 = OS-assigned
	const esbuildHost = esbuildServer.hosts[0] ?? '127.0.0.1';

	// ── Proxy HTTP server ─────────────────────────────────────────────────────
	const server = http.createServer(async (req, res) => {
		const url = req.url ?? '/';

		// Forward /esbuild SSE endpoint (live reload) to esbuild's server.
		if (url === '/esbuild') {
			proxyRequest(req, res, esbuildHost, esbuildServer.port);
			return;
		}

		// Forward compiled JS files to esbuild's in-memory server.
		if (url.endsWith('.js') || url.endsWith('.js.map')) {
			proxyRequest(req, res, esbuildHost, esbuildServer.port);
			return;
		}

		// Serve static files from the output directory.
		let filePath = path.join(outDir, url === '/' ? 'index.html' : url);

		// Inject live-reload script into index.html responses.
		if (filePath.endsWith('index.html')) {
			try {
				let html = await fs.readFile(filePath, 'utf-8');
				html = injectLiveReload(html);
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(html);
			} catch {
				res.writeHead(404);
				res.end('Not found');
			}
			return;
		}

		// Serve other static files (images, audio, resource/, etc.)
		try {
			const data = await fs.readFile(filePath);
			res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
			res.end(data);
		} catch {
			res.writeHead(404);
			res.end('Not found');
		}
	});

	server.listen(options.port, () => {
		logger.success(`Dev server running at http://localhost:${options.port}`);
		logger.info('Watching for file changes...');
	});

	// Graceful shutdown on Ctrl+C.
	process.on('SIGINT', async () => {
		logger.info('Stopping dev server...');
		await ctx.dispose();
		server.close();
		process.exit(0);
	});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Injects a small SSE-based live reload script before </body>.
 * Subscribes to esbuild's /esbuild endpoint and reloads on rebuild.
 */
function injectLiveReload(html: string): string {
	const script = `<script>
new EventSource('/esbuild').addEventListener('change', () => location.reload());
</script>`;
	return html.includes('</body>') ? html.replace('</body>', `${script}\n</body>`) : html + script;
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
