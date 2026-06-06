import * as path from 'node:path';
import { writeFile } from '../../utils/fs.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

/**
 * Writes `index.html`.
 *
 * Engine packages are wired up through an ES module import map
 * (`@blakron/core` → `./js/blakron.core.js`), so the bundled app and engine
 * chunks resolve bare specifiers in the browser. The entry script bootstraps
 * the engine via the user's own `createPlayer()` call.
 */
export function generateHtml(): BuildPlugin {
	return {
		name: 'generate index.html',
		async apply(ctx: BuildContext): Promise<void> {
			const entryScript = ctx.outputs.entryScript ?? 'main.js';
			const html = renderHtml(ctx.project, entryScript, ctx.outputs.engine);
			await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);
		},
	};
}

function renderHtml(project: Project, entryScript: string, engine: Record<string, string>): string {
	const { stage } = project.config;
	const importMap = Object.keys(engine).length > 0 ? renderImportMap(engine) : '';
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
	<title>Blakron Game</title>
	<style>html,body{margin:0;padding:0;width:100%;height:100%;background:${stage.background};overflow:hidden;}canvas{display:block;}</style>
${importMap}</head>
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

function renderImportMap(engine: Record<string, string>): string {
	const imports = Object.entries(engine)
		.map(([pkg, file]) => `\t\t\t"${pkg}": "./${file}"`)
		.join(',\n');
	return `\t<script type="importmap">\n\t{\n\t\t"imports": {\n${imports}\n\t\t}\n\t}\n\t</script>\n`;
}
