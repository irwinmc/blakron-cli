import * as path from 'node:path';
import { copyDir, exists } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Copies the project's `resource/` directory into the output.
 *
 * The theme file is skipped — it is emitted by the `compile EXML` plugin with
 * the resolved skin payload, so copying the source version would overwrite it.
 */
export function copyAssets(): BuildPlugin {
	return {
		name: 'copy assets',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!(await exists(project.resourceDir))) return;

			const themeName = project.config.exml ? path.basename(project.config.exml.themeFile) : undefined;
			const dest = path.join(project.outputDir, 'resource');
			await copyDir(project.resourceDir, dest, name => name !== themeName);
		},
	};
}
