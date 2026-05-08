import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDir, writeFile, exists } from '../utils/fs.js';
import type { ProjectConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

export async function copyProjectAssets(config: ProjectConfig): Promise<void> {
	const resourceDir = path.resolve('resource');
	const outResourceDir = path.join(path.resolve(config.output.dir), 'resource');
	if (await exists(resourceDir)) {
		await copyDir(resourceDir, outResourceDir, name => !name.endsWith('.thm.json'));
	}
}

/**
 * @param outputFiles Map from compile result: { engine, main, thm } → hashed filenames.
 */
export async function applyTarget(
	config: ProjectConfig,
	outputFiles: Record<string, string> = {},
	isRelease = false,
): Promise<void> {
	const outDir = path.resolve(config.output.dir);
	if (isRelease) {
		await writeFile(path.join(outDir, 'index.html'), generateReleaseHtml(config, outputFiles));
	} else {
		const script = path.basename(config.entry).replace(/\.ts$/, '.js');
		await writeFile(path.join(outDir, 'index.html'), generateDevHtml(config, script));
	}
}

function generateReleaseHtml(config: ProjectConfig, files: Record<string, string>): string {
	const { stage } = config;
	const engine = files['engine'] ?? 'blakron.engine.js';
	const main = files['main'] ?? 'main.js';
	const thm = files['thm'];
	const thmScript = thm ? '\n    <script type="module" src="' + thm + '"></script>' : '';
	return (
		'<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">\n    <title>Blakron Game</title>\n    <style>html,body{margin:0;padding:0;width:100%;height:100%;background:' +
		stage.background +
		';overflow:hidden;}canvas{display:block;}</style>\n</head>\n<body>\n    <canvas id="gameCanvas"\n        data-entry-class="Main"\n        data-orientation="' +
		stage.orientation +
		'"\n        data-frame-rate="' +
		stage.frameRate +
		'"\n        data-scale-mode="' +
		stage.scaleMode +
		'"\n        data-content-width="' +
		stage.width +
		'"\n        data-content-height="' +
		stage.height +
		'"\n    ></canvas>\n    <script type="module" src="' +
		engine +
		'"></script>' +
		thmScript +
		'\n    <script type="module" src="' +
		main +
		'"></script>\n</body>\n</html>'
	);
}

function generateDevHtml(config: ProjectConfig, entryScript: string): string {
	const { stage } = config;
	return (
		'<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="utf-8">\n    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">\n    <title>Blakron Game</title>\n    <style>html,body{margin:0;padding:0;width:100%;height:100%;background:' +
		stage.background +
		';overflow:hidden;}canvas{display:block;}</style>\n</head>\n<body>\n    <canvas id="gameCanvas"\n        data-entry-class="Main"\n        data-orientation="' +
		stage.orientation +
		'"\n        data-frame-rate="' +
		stage.frameRate +
		'"\n        data-scale-mode="' +
		stage.scaleMode +
		'"\n        data-content-width="' +
		stage.width +
		'"\n        data-content-height="' +
		stage.height +
		'"\n    ></canvas>\n    <script type="module" src="' +
		entryScript +
		'"></script>\n</body>\n</html>'
	);
}

export async function scaffoldProject(name: string, templateName: string): Promise<void> {
	const templateDir = path.join(TEMPLATES_DIR, templateName);
	const destDir = path.resolve(name);

	if (!(await exists(templateDir))) {
		throw new Error(`Template "${templateName}" not found at ${templateDir}`);
	}

	await copyDir(templateDir, destDir);

	const pkgPath = path.join(destDir, 'package.json');
	if (await exists(pkgPath)) {
		const raw = await fs.readFile(pkgPath, 'utf-8');
		const pkg = JSON.parse(raw) as Record<string, unknown>;
		pkg['name'] = name;
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
	}
}
