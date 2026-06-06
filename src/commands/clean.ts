import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { loadProject } from '../core/project.js';
import { logger } from '../utils/logger.js';

export const cleanCommand = new Command('clean').description('Remove build output directories').action(async () => {
	const dev = await loadProject('development');
	const release = await loadProject('release');
	const dirs = [...new Set([dev.outputDir, release.outputDir])];

	for (const dir of dirs) {
		await fs.rm(dir, { recursive: true, force: true });
	}
	const names = dirs.map(d => d.replace(process.cwd() + '/', '') + '/');
	logger.success(`Cleaned ${names.join(', ')}`);
});
