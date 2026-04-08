import * as path from 'node:path';
import { exists } from '../utils/fs.js';

export type BuildTarget = 'html5' | 'wxgame';
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

/** Defines a typed project config — used in heron.config.ts */
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

export async function loadConfig(): Promise<ProjectConfig> {
    const configPath = path.resolve('heron.config.ts');
    const jsConfigPath = path.resolve('heron.config.js');

    if (await exists(configPath) || await exists(jsConfigPath)) {
        // Dynamic import works for both .js and pre-compiled .ts (via tsx/ts-node)
        const mod = await import(await exists(configPath) ? configPath : jsConfigPath);
        const userConfig: ProjectConfig = mod.default ?? mod;
        return { ...DEFAULTS, ...userConfig, stage: { ...DEFAULTS.stage, ...userConfig.stage } };
    }

    return DEFAULTS;
}
