import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

/**
 * Writes `index.html` referencing the compiled entry script.
 *
 * The page is intentionally minimal: a single canvas plus one ES module. The
 * engine is bootstrapped by the user's own `createPlayer()` call inside the
 * entry script, so no engine-injected bootstrapping is needed here.
 */
export function generateHtml(): BuildPlugin {
	return {
		name: 'generate index.html',
		async apply(ctx: BuildContext): Promise<void> {
			const entryScript = ctx.outputs.entryScript ?? 'main.js';
			const html = renderHtml(ctx.project, entryScript);
			await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);
		},
	};
}

function renderHtml(project: Project, entryScript: string): string {
	const { stage } = project.config;
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
	<title>Blakron Game</title>
	<style>html,body{margin:0;padding:0;width:100%;height:100%;background:${stage.background};overflow:hidden;}canvas{display:block;}</style>
</head>
<body>
	<canvas id="gameCanvas"
		data-content-width="${stage.width}"
		data-content-height="${stage.height}"
		data-scale-mode="${stage.scaleMode}"
		data-orientation="${stage.orientation}"
		data-frame-rate="${stage.frameRate}"></canvas>
	<script type="module" src="${entryScript}"></script>
</body>
</html>
`;
}
