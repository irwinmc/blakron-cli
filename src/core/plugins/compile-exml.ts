import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { compileEXML } from '../exml/index.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

interface ExmlFile {
	/** Absolute path to the `.exml` file. */
	path: string;
	/** Path relative to `resource/`, using forward slashes. */
	relPath: string;
	contents: string;
}

/** A resolved skin: its source file plus the class name declared in the EXML. */
interface CompiledSkin {
	file: ExmlFile;
	className: string;
}

/**
 * Theme file, kept compatible with Egret's `default.thm.json` on input:
 * - `skins` values may be skin paths (`resource/skins/X.exml`) or class names.
 * - `autoGenerateExmlsList` toggles auto-scan vs. the explicit `exmls` list.
 * - `exmls` entries may be project-root-relative paths (Egret) or objects.
 */
interface ThemeData {
	skins?: Record<string, string>;
	exmls?: Array<string | { path: string; [k: string]: unknown }>;
	autoGenerateExmlsList?: boolean;
	[k: string]: unknown;
}

/**
 * Compiles `.exml` skin files into the theme output.
 *
 * The input theme file follows Egret conventions; the output keeps Blakron's
 * runtime shape (skin values become class names; `gjs` embeds factory code).
 * Honours the configured `publishPolicy`:
 *
 * - `path` / `json` — theme lists skin file paths (loaded at runtime).
 * - `content`       — theme embeds raw EXML source.
 * - `gjs`           — theme embeds generated JS factories (best runtime perf).
 */
export function compileExml(): BuildPlugin {
	return {
		name: 'compile EXML',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!project.config.exml || !project.themeFile) return;

			const theme = await loadTheme(project);
			const files = await resolveExmlFiles(project, theme);
			if (files.length === 0) {
				logger.step('no .exml files found, skipping');
				return;
			}

			const policy = project.config.exml.publishPolicy;
			const skins: CompiledSkin[] = files.map(file => ({ file, className: extractClassName(file) }));

			theme.skins = remapSkins(project, theme.skins ?? {}, skins);
			theme.exmls = buildExmls(policy, skins);

			const relThemePath = project.config.exml.themeFile;
			const outThemePath = path.join(project.outputDir, relThemePath);
			await writeFile(outThemePath, JSON.stringify(theme, null, '\t'));
			logger.step(`compiled ${skins.length} skin(s) → ${relThemePath} (policy: ${policy})`);
		},
	};
}

/**
 * Determines which `.exml` files to compile.
 *
 * Egret semantics: when `autoGenerateExmlsList` is `false` the explicit `exmls`
 * list is authoritative; otherwise the resource directory is scanned.
 */
async function resolveExmlFiles(project: Project, theme: ThemeData): Promise<ExmlFile[]> {
	const declared = (theme.exmls ?? []).map(e => (typeof e === 'string' ? e : e?.path)).filter(Boolean) as string[];

	if (theme.autoGenerateExmlsList === false && declared.length > 0) {
		const files: ExmlFile[] = [];
		for (const rel of declared) {
			try {
				files.push(await readExml(project, resolveExmlPath(project, rel)));
			} catch {
				logger.warn(`declared EXML not found, skipping: ${rel}`);
			}
		}
		return files;
	}

	return collectExmlFiles(project.resourceDir);
}

/** Recursively collects every `.exml` file under `resource/`, sorted by path. */
async function collectExmlFiles(resourceDir: string): Promise<ExmlFile[]> {
	const results: ExmlFile[] = [];

	async function walk(dir: string): Promise<void> {
		let entries: import('node:fs').Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.name.endsWith('.exml')) {
				results.push(await readExmlAt(resourceDir, full));
			}
		}
	}

	await walk(resourceDir);
	return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/**
 * Resolves an EXML path declared in the theme file. Accepts both Egret-style
 * project-root-relative paths (`resource/skins/X.exml`) and resource-relative
 * paths (`skins/X.exml`).
 */
function resolveExmlPath(project: Project, declared: string): string {
	const normalized = declared.replace(/^\.\//, '');
	return normalized.startsWith('resource/')
		? path.resolve(project.root, normalized)
		: path.resolve(project.resourceDir, normalized);
}

async function readExml(project: Project, absolute: string): Promise<ExmlFile> {
	return readExmlAt(project.resourceDir, absolute);
}

async function readExmlAt(resourceDir: string, absolute: string): Promise<ExmlFile> {
	return {
		path: absolute,
		relPath: path.relative(resourceDir, absolute).split(path.sep).join('/'),
		contents: await fs.readFile(absolute, 'utf-8'),
	};
}

/** Reads the existing theme file, or returns an empty theme on miss. */
async function loadTheme(project: Project): Promise<ThemeData> {
	try {
		const raw = await fs.readFile(project.themeFile!, 'utf-8');
		return JSON.parse(raw) as ThemeData;
	} catch {
		return { skins: {}, exmls: [] };
	}
}

/**
 * Rewrites the `skins` map to Blakron's runtime form: each value becomes the
 * skin's class name. Egret path values (`resource/skins/X.exml`) are matched to
 * their compiled skin; values that are already class names pass through.
 */
function remapSkins(project: Project, skins: Record<string, string>, compiled: CompiledSkin[]): Record<string, string> {
	const byRelPath = new Map(compiled.map(s => [s.file.relPath, s.className]));
	const result: Record<string, string> = {};

	for (const [host, value] of Object.entries(skins)) {
		if (/\.exml$/i.test(value) || value.includes('/')) {
			const relPath = path
				.relative(project.resourceDir, resolveExmlPath(project, value))
				.split(path.sep)
				.join('/');
			result[host] = byRelPath.get(relPath) ?? value;
		} else {
			result[host] = value;
		}
	}
	return result;
}

/** Builds the output `exmls` payload for the given publish policy. */
function buildExmls(policy: string, compiled: CompiledSkin[]): ThemeData['exmls'] {
	switch (policy) {
		case 'content':
			return compiled.map(s => ({ path: s.file.relPath, content: s.file.contents }));
		case 'gjs':
			return compiled.map(s => ({ path: s.file.relPath, className: s.className, gjs: generateGjs(s) }));
		case 'path':
		case 'json':
		default:
			return compiled.map(s => s.file.relPath);
	}
}

/** Reads the `class="..."` attribute, falling back to the file name. */
function extractClassName(file: ExmlFile): string {
	const match = file.contents.match(/class="([^"]+)"/);
	return match ? match[1] : path.basename(file.path, '.exml');
}

/** Generates an IIFE skin factory, returning a stub on parse failure. */
function generateGjs(skin: CompiledSkin): string {
	try {
		return compileEXML(skin.file.contents, skin.className, { format: 'iife' });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.warn(`EXML compile failed for ${skin.file.relPath}: ${message}`);
		return `// Failed to compile ${skin.file.relPath}: ${message}\nfunction createSkin() { return {}; }\n`;
	}
}

export { collectExmlFiles };
export type { ExmlFile, ThemeData };
