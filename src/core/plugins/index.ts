import type { BuildPlugin } from '../pipeline.js';
import { compileExml } from './compile-exml.js';
import { compileSource } from './compile-source.js';
import { generateHtml } from './generate-html.js';
import { copyAssets } from './copy-assets.js';

export { compileExml } from './compile-exml.js';
export { compileSource } from './compile-source.js';
export { generateHtml } from './generate-html.js';
export { copyAssets } from './copy-assets.js';

/**
 * The standard build sequence.
 *
 * Order matters: EXML and source compilation run first (the source compiler
 * reports the entry script name), then the HTML referencing them is written,
 * and finally static assets are copied.
 */
export function defaultPlugins(): BuildPlugin[] {
	return [compileExml(), compileSource(), generateHtml(), copyAssets()];
}
