/**
 * EXML skin file parser and code generator.
 *
 * Parses EXML (XML-based skin description format) into an intermediate
 * representation (SkinIR), then generates ESM-compatible JavaScript
 * factory functions.
 *
 * ## Usage
 *
 * ```ts
 * import { parseEXML, generateCode } from './exml/index.js';
 *
 * const ir = parseEXML(exmlSource, 'MySkin');
 * const jsCode = generateCode(ir);
 * ```
 */

// ── XML Parser ───────────────────────────────────────────────────────
export { parseXML, filterElements, getTextContent } from './xml-parser.js';
export type { XNode, XText, XAttribute, XElement } from './xml-parser.js';

// ── AST / IR types ───────────────────────────────────────────────────
export type {
	SkinIR,
	SkinNode,
	PropertyAssignment,
	PropertyValue,
	PropertyChild,
	LiteralValue,
	PercentValue,
	BindingValue,
	RefValue,
	StateDef,
	StateOverride,
	StateAddItems,
	StateSetProperty,
	StateSetStateProperty,
	BindingDef,
} from './ast.js';

// ── Component Registry ───────────────────────────────────────────────
export {
	lookupComponent,
	getDefaultProperty,
	resolveModule,
	localName,
	isPropertyNode,
	parsePropertyNode,
} from './registry.js';
export type { ComponentInfo } from './registry.js';

// ── EXML Parser ──────────────────────────────────────────────────────
export { parseEXML, parseSkinRoot } from './exml-parser.js';

// ── Code Generator ───────────────────────────────────────────────────
export { generateCode } from './codegen.js';

// ── Convenience: parse + generate in one step ────────────────────────

import { parseEXML } from './exml-parser.js';
import { generateCode } from './codegen.js';
import type { SkinIR } from './ast.js';

/**
 * Compile an EXML source string directly to JavaScript.
 *
 * @param source EXML source text
 * @param className Optional class name (used for factory function name)
 * @returns Generated JS source string
 */
export function compileEXML(source: string, className?: string): string {
	const ir = parseEXML(source, className);
	return generateCode(ir);
}

/**
 * Compile an EXML source string to a SkinIR (parse only, no codegen).
 *
 * @param source EXML source text
 * @param className Optional class name
 * @returns SkinIR intermediate representation
 */
export function parseToIR(source: string, className?: string): SkinIR {
	return parseEXML(source, className);
}
