import * as path from 'node:path';
import { loadConfig, type ProjectConfig } from './config.js';

export type BuildMode = 'development' | 'release';

/**
 * Resolved view of a Blakron project.
 *
 * Loads `blakron.config.ts`, then resolves every project path to an absolute
 * location so plugins never have to touch `process.cwd()` or `path.resolve`
 * themselves. This is the single source of truth for the build pipeline.
 */
export interface Project {
	/** Project root (current working directory). */
	readonly root: string;
	/** Build mode this project view was resolved for. */
	readonly mode: BuildMode;
	/** Validated user configuration. */
	readonly config: ProjectConfig;
	/** Absolute path to the entry source file. */
	readonly entry: string;
	/** Absolute output directory (`bin-debug` in dev, `bin-release` in release). */
	readonly outputDir: string;
	/** Absolute path to the `resource/` directory. */
	readonly resourceDir: string;
	/** Absolute path to the theme file, when EXML is enabled. */
	readonly themeFile?: string;
}

/** Loads and resolves the project rooted at the current working directory. */
export async function loadProject(mode: BuildMode): Promise<Project> {
	const root = process.cwd();
	const config = await loadConfig();
	const outputName = mode === 'release' ? 'bin-release' : config.output.dir;

	return {
		root,
		mode,
		config,
		entry: path.resolve(root, config.entry),
		outputDir: path.resolve(root, outputName),
		resourceDir: path.resolve(root, 'resource'),
		themeFile: config.exml ? path.resolve(root, config.exml.themeFile) : undefined,
	};
}
