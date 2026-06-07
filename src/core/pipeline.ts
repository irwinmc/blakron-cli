import { logger } from '../utils/logger.js';
import type { Project } from './project.js';

/**
 * Shared state threaded through every build plugin.
 *
 * Plugins read the immutable `project` and `options`, and communicate results
 * to later plugins through `outputs` (e.g. the source compiler reports the
 * generated entry script name so the HTML generator can reference it).
 */
export interface BuildContext {
	readonly project: Project;
	readonly sourcemap: boolean;
	readonly analyze: boolean;
	readonly watch: boolean;
	/** Artifacts produced during the build, populated incrementally by plugins. */
	readonly outputs: {
		/** Entry script path, relative to the output dir (e.g. `Main.js`, `js/main.min_ab12.js`). */
		entryScript?: string;
		/** Compiled skins module path, relative to the output dir (e.g. `js/default.thm.js`). */
		skinsScript?: string;
		/** Engine import-map: package specifier → chunk path relative to output dir. */
		engine: Record<string, string>;
	};
	/** Cleanup callbacks registered by long-lived plugins (watchers, contexts). */
	readonly disposers: Array<() => Promise<void> | void>;
}

/** A single, named step in the build pipeline. */
export interface BuildPlugin {
	readonly name: string;
	apply(ctx: BuildContext): Promise<void>;
}

/** Creates a fresh build context for a project. */
export function createContext(
	project: Project,
	options: { sourcemap?: boolean; analyze?: boolean; watch?: boolean } = {},
): BuildContext {
	return {
		project,
		sourcemap: options.sourcemap ?? false,
		analyze: options.analyze ?? false,
		watch: options.watch ?? false,
		outputs: { engine: {} },
		disposers: [],
	};
}

/** Runs plugins in order, logging each step. */
export async function runPipeline(ctx: BuildContext, plugins: BuildPlugin[]): Promise<void> {
	for (const plugin of plugins) {
		logger.step(plugin.name);
		await plugin.apply(ctx);
	}
}

/** Invokes every registered disposer, ignoring individual failures. */
export async function disposeContext(ctx: BuildContext): Promise<void> {
	await Promise.allSettled(ctx.disposers.map(dispose => dispose()));
}
