import type { BuildPlugin } from '../pipeline.js';
import { compileExml } from './compile-exml.js';
import { compileEngine } from './compile-engine.js';
import { compileCustomNamespaces } from './compile-custom-namespaces.js';
import { compileSource } from './compile-source.js';
import { generateHtml } from './generate-html.js';
import { writeManifest } from './manifest.js';
import { copyAssets } from './copy-assets.js';

export { compileExml } from './compile-exml.js';
export { compileEngine } from './compile-engine.js';
export { compileCustomNamespaces } from './compile-custom-namespaces.js';
export { compileSource } from './compile-source.js';
export { generateHtml } from './generate-html.js';
export { writeManifest } from './manifest.js';
export { copyAssets } from './copy-assets.js';

/**
 * The standard build sequence.
 *
 * Order matters: custom namespace chunks must exist before EXML compilation
 * (the skins bundle marks them external) and before source compilation (the
 * app bundle does too); engine and source compilation report their output
 * paths, then the HTML and manifest referencing them are written, and
 * finally static assets are copied.
 */
export function defaultPlugins(): BuildPlugin[] {
	return [
		compileExml(),
		compileEngine(),
		compileCustomNamespaces(),
		compileSource(),
		generateHtml(),
		writeManifest(),
		copyAssets(),
	];
}
