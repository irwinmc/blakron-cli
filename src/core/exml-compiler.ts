import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir, writeFile } from '../utils/fs.js';
import type { ProjectConfig } from './config.js';

export interface ExmlFile {
    filename: string;
    contents: string;
}

export interface ThemeData {
    path: string;
    skins: Record<string, string>;
    exmls: string[];
    autoGenerateExmlsList?: boolean;
}

/**
 * Collects all .exml files under the project src directory.
 */
export async function collectExmlFiles(projectDir: string): Promise<ExmlFile[]> {
    const results: ExmlFile[] = [];
    await walkDir(path.join(projectDir, 'src'), results);
    return results.sort((a, b) => a.filename.localeCompare(b.filename));
}

async function walkDir(dir: string, results: ExmlFile[]): Promise<void> {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkDir(fullPath, results);
        } else if (entry.name.endsWith('.exml')) {
            const contents = await fs.readFile(fullPath, 'utf-8');
            results.push({ filename: fullPath, contents });
        }
    }
}

/**
 * Converts a single EXML file to a JS class string (gjs policy).
 * This is a minimal stub — replace with @blakron/exml-parser when available.
 */
function exmlToGjs(exmlFile: ExmlFile): { code: string; className: string } {
    // Minimal: extract class name from exmlName attribute
    const classMatch = exmlFile.contents.match(/exmlName="([^"]+)"/);
    const className = classMatch ? classMatch[1] : path.basename(exmlFile.filename, '.exml');
    const code = `(function(){\n  var e = new eui.Skin();\n  // generated from ${path.basename(exmlFile.filename)}\n  return e;\n})`;
    return { code, className };
}

/**
 * Compiles EXML files and writes theme output to the output directory.
 */
export async function compileExml(config: ProjectConfig): Promise<void> {
    if (!config.exml) return;

    const projectDir = process.cwd();
    const outDir = path.resolve(config.output.dir);
    const policy = config.exml.publishPolicy;
    const themeFilePath = path.join(projectDir, config.exml.themeFile);

    const exmls = await collectExmlFiles(projectDir);
    if (exmls.length === 0) return;

    let themeData: ThemeData;
    try {
        const raw = await fs.readFile(themeFilePath, 'utf-8');
        themeData = JSON.parse(raw);
        themeData.path = config.exml.themeFile;
    } catch {
        themeData = { path: config.exml.themeFile, skins: {}, exmls: [] };
    }

    const outThemePath = path.join(outDir, themeData.path);

    if (policy === 'path') {
        themeData.exmls = exmls.map(e => e.filename);
        await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
    } else if (policy === 'content') {
        const exmlsWithContent = exmls.map(e => ({ path: e.filename, content: e.contents }));
        await writeFile(outThemePath, JSON.stringify({ ...themeData, exmls: exmlsWithContent }, null, '\t'));
    } else if (policy === 'gjs') {
        const gjsItems = exmls.map(e => {
            const { code, className } = exmlToGjs(e);
            return { path: e.filename, gjs: code, className };
        });
        const thmJsPath = outThemePath.replace('thm.json', 'thm.js');
        const content = buildGjsThemeJs(themeData, gjsItems);
        await ensureDir(path.dirname(thmJsPath));
        await writeFile(thmJsPath, content);
    } else if (policy === 'json') {
        themeData.exmls = exmls.map(e => e.filename);
        await writeFile(outThemePath, JSON.stringify(themeData, null, '\t'));
    }
}

function buildGjsThemeJs(
    theme: ThemeData,
    items: { path: string; gjs: string; className: string }[]
): string {
    const namespaces = new Set<string>();
    for (const item of items) {
        const parts = item.className.split('.');
        for (let i = 1; i < parts.length; i++) {
            namespaces.add(parts.slice(0, i).join('.'));
        }
    }

    const nsDecls = [...namespaces].map(ns => `window.${ns}=window.${ns}||{};`).join('\n');
    const pathAssignments = items
        .map(item => `generateEUI.paths['${item.path}'] = window.${item.className} = ${item.gjs};`)
        .join('\n');

    return [
        nsDecls,
        `window.generateEUI = window.generateEUI || {};`,
        `generateEUI.paths = generateEUI.paths || {};`,
        `generateEUI.styles = ${JSON.stringify(theme.skins)};`,
        pathAssignments,
    ].join('\n');
}
