import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, writeFile } from '../utils/fs.js';
import type { ProjectConfig } from './config.js';
import { compileEXML } from './exml/index.js';

export interface ExmlFile {
	filename: string;
	contents: string;
}

export interface ThemeData {
	path: string;
	skins: Record<string, string>;
	exmls: string[];
	autoGenerateExmlsList?: boolean;
}

/**
 * Collects all .exml files under the project resource directory.
 */
export async function collectExmlFiles(projectDir: string): Promise<ExmlFile[]> {
	const results: ExmlFile[] = [];
	const resourceDir = path.join(projectDir, 'resource');
	await walkDir(resourceDir, results);
	return results.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Converts an absolute file path to a path relative to the project's resource/ directory.
 * e.g. "/proj/resource/skins/ButtonSkin.exml" → "skins/ButtonSkin.exml"
 */
export function toResourceRelative(absolutePath: string): string {
	const resourceDir = path.join(process.cwd(), 'resource');
	return path.relative(resourceDir, absolutePath).split(path.sep).join('/');
}

async function walkDir(dir: string, results: ExmlFile[]): Promise<void> {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await walkDir(fullPath, results);
		} else if (entry.name.endsWith('.exml')) {
			const contents = await fs.readFile(fullPath, 'utf-8');
			results.push({ filename: fullPath, contents });
		}
	}
}

/**
 * Converts a single EXML file to generated JS code using @blakron/exml-parser.
 *
 * Extracts the class name from the EXML `class` attribute (e.g. `skins.MySkin`)
 * and generates an ESM factory function.
 */
function exmlToGjs(exmlFile: ExmlFile): { code: string; className: string } {
	// Extract class name from EXML class attribute
	const classMatch = exmlFile.contents.match(/class="([^"]+)"/);
	const className = classMatch ? classMatch[1] : path.basename(exmlFile.filename, '.exml');

	try {
		const code = compileEXML(exmlFile.contents, className);
		return { code, className };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[exml] Error compiling ${exmlFile.filename}: ${message}`);
		// Return a stub so the build doesn't break
		const code = `// Error compiling ${path.basename(exmlFile.filename)}: ${message}\nexport function createSkin() { return {}; }\n`;
		return { code, className };
	}
}

/**
 * Compiles EXML files and writes theme output to the output directory.
 */
export async function compileExml(config: ProjectConfig): Promise<void> {
	if (!config.exml) return;

	const projectDir = process.cwd();
	const outDir = path.resolve(config.output.dir);
	const policy = config.exml.publishPolicy;
	const themeFilePath = path.join(projectDir, config.exml.themeFile);

	const exmls = await collectExmlFiles(projectDir);
	if (exmls.length === 0) return;

	let themeData: ThemeData;
	try {
		const raw = await fs.readFile(themeFilePath, 'utf-8');
		themeData = JSON.parse(raw);
		themeData.path = config.exml.themeFile;
	} catch {
		themeData = { path: config.exml.themeFile, skins: {}, exmls: [] };
	}

	const outThemePath = path.join(outDir, themeData.path);

	if (policy === 'path') {
		themeData.exmls = exmls.map(e => toResourceRelative(e.filename));
		await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
	} else if (policy === 'content') {
		const exmlsWithContent = exmls.map(e => ({ path: toResourceRelative(e.filename), content: e.contents }));
		await writeFile(outThemePath, JSON.stringify({ ...themeData, exmls: exmlsWithContent }, null, '\t'));
	} else if (policy === 'gjs') {
		const gjsItems = exmls.map(e => {
			const { code, className } = exmlToGjs(e);
			return { relPath: toResourceRelative(e.filename), gjs: code, className };
		});

		// Generate individual .js files for each skin
		for (const item of gjsItems) {
			const outPath = path.join(outDir, item.relPath.replace(/\.exml$/, '.gjs.js'));
			await ensureDir(path.dirname(outPath));
			await writeFile(outPath, item.gjs);
		}

		// Also generate the thm.js registry file
		const thmJsPath = outThemePath.replace('thm.json', 'thm.js');
		const content = buildGjsThemeJs(themeData, gjsItems, outDir, thmJsPath);
		await ensureDir(path.dirname(thmJsPath));
		await writeFile(thmJsPath, content);
	} else if (policy === 'json') {
		themeData.exmls = exmls.map(e => toResourceRelative(e.filename));
		await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
	}
}

function buildGjsThemeJs(
	theme: ThemeData,
	items: { relPath: string; gjs: string; className: string }[],
	outDir: string,
	thmJsPath: string,
): string {
	const thmJsDir = path.dirname(thmJsPath);

	// Generate ESM imports with relative paths from thm.js to each .gjs.js file
	const imports = items
		.map(item => {
			const funcName = item.className.split('.').pop()!;
			const gjsPath = path.join(outDir, item.relPath.replace(/\.exml$/, '.gjs.js'));
			const relImport = path.relative(thmJsDir, gjsPath).split(path.sep).join('/');
			return `import { create${funcName} } from "./${relImport}";`;
		})
		.join('\n');

	const skinMap = items
		.map(item => {
			const funcName = item.className.split('.').pop()!;
			return `  "${item.relPath}": create${funcName},`;
		})
		.join('\n');

	return [
		'// Auto-generated theme registry',
		imports,
		'',
		'export const skinMap = {',
		skinMap,
		'};',
		'',
		`export const styles = ${JSON.stringify(theme.skins)};`,
		'',
	].join('\n');
}
