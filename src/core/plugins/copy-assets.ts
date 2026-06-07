import * as path from 'node:path';
import { copyDir, exists } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';

/**
 * Copies the project's `resource/` directory into the output.
 *
 * - The theme file is skipped — `compile EXML` emits it with the resolved skin
 *   payload, so copying the source version would overwrite it.
 * - `.exml` source files are skipped when the publish policy embeds skins
 *   (`gjs` / `content`), since the runtime no longer needs them — this keeps
 *   the output clean (no raw skin sources shipped), matching Egret's release.
 */
export function copyAssets(): BuildPlugin {
	return {
		name: 'copy assets',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (!(await exists(project.resourceDir))) return;

			const exml = project.config.exml;
			const themeName = exml ? path.basename(exml.themeFile) : undefined;
			const skipExml = exml ? exml.publishPolicy === 'gjs' || exml.publishPolicy === 'content' : false;

			const dest = path.join(project.outputDir, 'resource');
			await copyDir(project.resourceDir, dest, name => {
				if (name === themeName) return false;
				if (skipExml && name.endsWith('.exml')) return false;
				return true;
			});
		},
	};
}
