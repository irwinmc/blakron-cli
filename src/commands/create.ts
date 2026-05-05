import { Command } from 'commander';
import { scaffoldProject } from '../core/template.js';
import { logger } from '../utils/logger.js';

export const createCommand = new Command('create')
	.description('Create a new Blakron project')
	.argument('<name>', 'Project name')
	.option('--template <template>', 'Project template: game | eui | empty', 'game')
	.action(async (name: string, options: { template: string }) => {
		const validTemplates = ['game', 'eui', 'empty'];
		if (!validTemplates.includes(options.template)) {
			logger.error(`Unknown template "${options.template}". Available: ${validTemplates.join(', ')}`);
			process.exit(1);
		}

		logger.info(`Creating project "${name}" from template "${options.template}"...`);
		await scaffoldProject(name, options.template);
		logger.success(`Project created at ./${name}`);

		const hint =
			options.template === 'eui'
				? `Next steps:\n  cd ${name}\n  pnpm install\n  blakron build   # compiles EXML skins to JS\n  blakron dev      # start dev server`
				: `Next steps:\n  cd ${name}\n  pnpm install\n  blakron build`;

		logger.info(hint);
	});
