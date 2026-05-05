import * as path from 'node:path';
import { exists } from '../utils/fs.js';
import { ConfigError } from './errors.js';

export type BuildTarget = 'html5';
export type ExmlPolicy = 'path' | 'content' | 'gjs' | 'json';

export interface StageConfig {
	width: number;
	height: number;
	scaleMode: string;
	orientation: string;
	frameRate: number;
	background: string;
}

export interface ExmlConfig {
	publishPolicy: ExmlPolicy;
	themeFile: string;
}

export interface OutputConfig {
	dir: string;
}

export interface ProjectConfig {
	target: BuildTarget;
	entry: string;
	output: OutputConfig;
	stage: StageConfig;
	exml?: ExmlConfig;
}

/** Defines a typed project config — used in blakron.config.ts */
export function defineConfig(config: ProjectConfig): ProjectConfig {
	return config;
}

const DEFAULTS: ProjectConfig = {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
		background: '#000000',
	},
};

const VALID_SCALE_MODES = [
	'showAll',
	'noScale',
	'exactFit',
	'noBorder',
	'fixedHeight',
	'fixedWidth',
	'fixedNarrow',
	'fixedWide',
] as const;

export async function loadConfig(): Promise<ProjectConfig> {
	const configPath = path.resolve('blakron.config.ts');
	const jsConfigPath = path.resolve('blakron.config.js');

	let config: ProjectConfig;

	if ((await exists(configPath)) || (await exists(jsConfigPath))) {
		// Dynamic import works for both .js and pre-compiled .ts (via tsx/ts-node)
		const mod = await import((await exists(configPath)) ? configPath : jsConfigPath);
		const userConfig: ProjectConfig = mod.default ?? mod;
		config = { ...DEFAULTS, ...userConfig, stage: { ...DEFAULTS.stage, ...userConfig.stage } };
	} else {
		config = DEFAULTS;
	}

	// Validate stage.frameRate
	if (!Number.isInteger(config.stage.frameRate) || config.stage.frameRate <= 0) {
		throw new ConfigError(
			`Invalid config: stage.frameRate must be a positive integer, got ${config.stage.frameRate}`,
		);
	}

	// Validate stage.scaleMode
	if (!VALID_SCALE_MODES.includes(config.stage.scaleMode as (typeof VALID_SCALE_MODES)[number])) {
		throw new ConfigError(
			`Invalid config: stage.scaleMode must be one of ${VALID_SCALE_MODES.map(m => `'${m}'`).join(', ')}, got '${config.stage.scaleMode}'`,
		);
	}

	// Validate entry file exists
	const entryPath = path.resolve(config.entry);
	if (!(await exists(entryPath))) {
		throw new ConfigError(`Invalid config: entry file '${config.entry}' does not exist`);
	}

	return config;
}
