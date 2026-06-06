import type { BuildPlugin } from '../pipeline.js';
import { compileExml } from './compile-exml.js';
import { compileEngine } from './compile-engine.js';
import { compileSource } from './compile-source.js';
import { generateHtml } from './generate-html.js';
import { writeManifest } from './manifest.js';
import { copyAssets } from './copy-assets.js';

export { compileExml } from './compile-exml.js';
export { compileEngine } from './compile-engine.js';
export { compileSource } from './compile-source.js';
export { generateHtml } from './generate-html.js';
export { writeManifest } from './manifest.js';
export { copyAssets } from './copy-assets.js';

/**
 * The standard build sequence.
 *
 * Order matters: EXML, engine, and source compilation run first (the source
 * and engine plugins report their output paths), then the HTML and manifest
 * referencing them are written, and finally static assets are copied.
 */
export function defaultPlugins(): BuildPlugin[] {
	return [compileExml(), compileEngine(), compileSource(), generateHtml(), writeManifest(), copyAssets()];
}
