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
 * Collects all .exml files under the project src directory.
 */
export async function collectExmlFiles(projectDir: string): Promise<ExmlFile[]> {
	const results: ExmlFile[] = [];
	await walkDir(path.join(projectDir, 'src'), results);
	return results.sort((a, b) => a.filename.localeCompare(b.filename));
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
		themeData.exmls = exmls.map(e => e.filename);
		await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
	} else if (policy === 'content') {
		const exmlsWithContent = exmls.map(e => ({ path: e.filename, content: e.contents }));
		await writeFile(outThemePath, JSON.stringify({ ...themeData, exmls: exmlsWithContent }, null, '\t'));
	} else if (policy === 'gjs') {
		const gjsItems = exmls.map(e => {
			const { code, className } = exmlToGjs(e);
			return { path: e.filename, gjs: code, className };
		});

		// Generate individual .js files for each skin
		for (const item of gjsItems) {
			const outPath = path.join(outDir, item.path.replace(/\.exml$/, '.gjs.js'));
			await ensureDir(path.dirname(outPath));
			await writeFile(outPath, item.gjs);
		}

		// Also generate the thm.js registry file
		const thmJsPath = outThemePath.replace('thm.json', 'thm.js');
		const content = buildGjsThemeJs(themeData, gjsItems);
		await ensureDir(path.dirname(thmJsPath));
		await writeFile(thmJsPath, content);
	} else if (policy === 'json') {
		themeData.exmls = exmls.map(e => e.filename);
		await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
	}
}

function buildGjsThemeJs(theme: ThemeData, items: { path: string; gjs: string; className: string }[]): string {
	// Generate ESM imports from the individual .gjs.js files
	const imports = items
		.map((item, i) => {
			const funcName = item.className.split('.').pop()!;
			return `import { create${funcName} } from "./${item.path.replace(/\.exml$/, '.gjs.js')}";`;
		})
		.join('\n');

	const skinMap = items
		.map(item => {
			const funcName = item.className.split('.').pop()!;
			return `  "${item.path}": create${funcName},`;
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
