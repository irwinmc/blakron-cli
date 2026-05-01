import { Command } from 'commander';
import { scaffoldProject } from '../core/template.js';
import { logger } from '../utils/logger.js';

export const createCommand = new Command('create')
	.description('Create a new Heron project')
	.argument('<name>', 'Project name')
	.option('--template <template>', 'Project template: game | eui | empty', 'game')
	.action(async (name: string, options: { template: string }) => {
		logger.info(`Creating project "${name}" from template "${options.template}"...`);
		await scaffoldProject(name, options.template);
		logger.success(`Project created at ./${name}`);
		logger.info(`Next steps:\n  cd ${name}\n  pnpm install\n  blakron build`);
	});
