import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDir, writeFile, exists } from '../utils/fs.js';
import type { ProjectConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

/**
 * Copies static assets (resource/, etc.) from the project to the output dir.
 */
export async function copyProjectAssets(config: ProjectConfig): Promise<void> {
	const resourceDir = path.resolve('resource');
	const outResourceDir = path.join(path.resolve(config.output.dir), 'resource');
	if (await exists(resourceDir)) {
		await copyDir(resourceDir, outResourceDir);
	}
}

/**
 * Generates the platform entry file (index.html).
 */
export async function applyTarget(config: ProjectConfig): Promise<void> {
	const outDir = path.resolve(config.output.dir);
	await writeFile(path.join(outDir, 'index.html'), generateIndexHtml(config));
}

function generateIndexHtml(config: ProjectConfig): string {
	const { stage } = config;
	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
    <title>Blakron Game</title>
    <style>html,body{margin:0;padding:0;background:${stage.background};overflow:hidden;}</style>
</head>
<body>
    <canvas id="gameCanvas"
        data-entry-class="Main"
        data-orientation="${stage.orientation}"
        data-frame-rate="${stage.frameRate}"
        data-scale-mode="${stage.scaleMode}"
        data-content-width="${stage.width}"
        data-content-height="${stage.height}"
    ></canvas>
    <script type="module" src="Main.js"></script>
</body>
</html>`;
}

/**
 * Scaffolds a new project from a built-in template.
 */
export async function scaffoldProject(name: string, templateName: string): Promise<void> {
	const templateDir = path.join(TEMPLATES_DIR, templateName);
	const destDir = path.resolve(name);

	if (!(await exists(templateDir))) {
		throw new Error(`Template "${templateName}" not found at ${templateDir}`);
	}

	await copyDir(templateDir, destDir);

	// Patch package.json name
	const pkgPath = path.join(destDir, 'package.json');
	if (await exists(pkgPath)) {
		const raw = await fs.readFile(pkgPath, 'utf-8');
		const pkg = JSON.parse(raw) as Record<string, unknown>;
		pkg['name'] = name;
		await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
	}
}
