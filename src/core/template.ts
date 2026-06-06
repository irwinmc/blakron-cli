import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copyDir, writeFile, exists } from '../utils/fs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

export const TEMPLATES = ['game', 'empty'] as const;
export type TemplateName = (typeof TEMPLATES)[number];

/**
 * Scaffolds a new project by copying `templates/<template>/` into `./<name>/`
 * and setting the project's `package.json` name.
 */
export async function scaffoldProject(name: string, template: TemplateName): Promise<void> {
	const templateDir = path.join(TEMPLATES_DIR, template);
	const destDir = path.resolve(name);

	if (!(await exists(templateDir))) {
		throw new Error(`Template "${template}" not found at ${templateDir}`);
	}
	if (await exists(destDir)) {
		throw new Error(`Directory "${name}" already exists`);
	}

	await copyDir(templateDir, destDir);

	const pkgPath = path.join(destDir, 'package.json');
	if (await exists(pkgPath)) {
		const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8')) as Record<string, unknown>;
		pkg['name'] = name;
		await writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
	}
}
