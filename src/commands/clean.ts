import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from '../core/config.js';
import { logger } from '../utils/logger.js';

export const cleanCommand = new Command('clean')
    .description('Remove build output directory')
    .action(async () => {
        const config = await loadConfig();
        const outDir = path.resolve(config.output.dir);
        await fs.rm(outDir, { recursive: true, force: true });
        logger.success(`Cleaned ${config.output.dir}/`);
    });
