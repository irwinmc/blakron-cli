/**
 * Tests for the EXML parser pipeline.
 *
 * Run with: pnpm test
 */

import { describe, it, expect } from 'vitest';
import { parseXML, filterElements, getTextContent } from '../src/core/exml/xml-parser.js';
import {
	lookupComponent,
	resolveModule,
	localName,
	isPropertyNode,
	parsePropertyNode,
	getDefaultProperty,
} from '../src/core/exml/registry.js';
import { parseEXML } from '../src/core/exml/exml-parser.js';
import { generateCode } from '../src/core/exml/codegen.js';
import { compileEXML } from '../src/core/exml/index.js';

// ── XML Parser ───────────────────────────────────────────────────────

describe('parseXML', () => {
	it('parses a simple element', () => {
		const el = parseXML('<eui:Skin class="TestSkin"/>');
		expect(el.name).toBe('eui:Skin');
		expect(el.attributes[0]).toEqual({ name: 'class', value: 'TestSkin' });
	});

	it('parses nested elements', () => {
		const el = parseXML('<eui:Skin><eui:Button label="OK"/></eui:Skin>');
		expect(el.name).toBe('eui:Skin');
		const children = filterElements(el.children);
		expect(children).toHaveLength(1);
		expect(children[0].name).toBe('eui:Button');
		expect(children[0].attributes[0]).toEqual({ name: 'label', value: 'OK' });
	});

	it('parses text content', () => {
		const el = parseXML('<eui:Label>Hello World</eui:Label>');
		expect(getTextContent(el.children)).toBe('Hello World');
	});

	it('handles CDATA sections', () => {
		const el = parseXML('<root><![CDATA[<script>alert("hi")</script>]]></root>');
		expect(getTextContent(el.children)).toBe('<script>alert("hi")</script>');
	});

	it('skips comments', () => {
		const el = parseXML('<root><!-- a comment --><child/></root>');
		const children = filterElements(el.children);
		expect(children).toHaveLength(1);
	});

	it('handles multiple attributes', () => {
		const el = parseXML('<eui:Button id="btn1" label="Click" width="100" height="50"/>');
		expect(el.attributes).toHaveLength(4);
		const attrMap = Object.fromEntries(el.attributes.map(a => [a.name, a.value]));
		expect(attrMap).toEqual({
			id: 'btn1',
			label: 'Click',
			width: '100',
			height: '50',
		});
	});
});

// ── Registry ─────────────────────────────────────────────────────────

describe('Component Registry', () => {
	it('looks up Button component', () => {
		const info = lookupComponent('eui:Button');
		expect(info).not.toBeNull();
		expect(info!.module).toBe('@blakron/ui');
	});

	it('looks up Skin with default property', () => {
		const dp = getDefaultProperty('eui:Skin');
		expect(dp).toBe('elementsContent');
	});

	it('resolves module from namespace prefix', () => {
		expect(resolveModule('eui:Button')).toBe('@blakron/ui');
		expect(resolveModule('egret:Sprite')).toBe('@blakron/core');
	});

	it('extracts local names', () => {
		expect(localName('eui:Button')).toBe('Button');
		expect(localName('Button')).toBe('Button');
	});

	it('detects property nodes', () => {
		expect(isPropertyNode('eui:Button.label')).toBe(true);
		expect(isPropertyNode('eui:Button')).toBe(false);
	});

	it('parses property node names', () => {
		const parsed = parsePropertyNode('eui:Button.label');
		expect(parsed).toEqual({ owner: 'Button', property: 'label' });
	});
});

// ── Full pipeline ────────────────────────────────────────────────────

const SIMPLE_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.SimpleSkin" width="400" height="300" xmlns:eui="http://ns.egret.com/eui">
	<eui:Button id="btn" label="Click Me" x="10" y="20"/>
	<eui:Label id="title" text="Hello"/>
</eui:Skin>`;

describe('EXML Parser (full pipeline)', () => {
	it('parses a simple skin', () => {
		const ir = parseEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(ir.className).toBe('skins.SimpleSkin');
		expect(ir.children).toHaveLength(2);
		expect(ir.skinParts).toContain('btn');
		expect(ir.skinParts).toContain('title');
	});

	it('collects imports', () => {
		const ir = parseEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(ir.imports.has('Skin')).toBe(true);
		expect(ir.imports.has('Button')).toBe(true);
		expect(ir.imports.has('Label')).toBe(true);
		expect(ir.imports.get('Button')).toBe('@blakron/ui');
	});
});

describe('Code Generator', () => {
	it('generates valid JS for a simple skin', () => {
		const code = compileEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(code).toContain('import {');
		expect(code).toContain('from "@blakron/ui"');
		expect(code).toContain('export function createSimpleSkin()');
		expect(code).toContain('new Skin()');
		expect(code).toContain('new Button()');
		expect(code).toContain('btn.label = "Click Me"');
		expect(code).toContain('skin.btn = btn');
	});

	it('generates elementsContent assignment', () => {
		const code = compileEXML(SIMPLE_EXML, 'skins.SimpleSkin');
		expect(code).toContain('skin.elementsContent = [btn, title]');
	});
});

// ── States ───────────────────────────────────────────────────────────

const STATE_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.StateSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:states>
		<eui:State name="up"/>
		<eui:State name="down"/>
		<eui:State name="disabled"/>
	</eui:states>
	<eui:Button id="btn" label="Up" label.down="Down" label.disabled="Off"/>
</eui:Skin>`;

describe('States', () => {
	it('parses state definitions', () => {
		const ir = parseEXML(STATE_EXML, 'skins.StateSkin');
		expect(ir.states).toHaveLength(3);
		expect(ir.states[0].name).toBe('up');
		expect(ir.states[1].name).toBe('down');
		expect(ir.states[2].name).toBe('disabled');
	});

	it('handles state-specific properties', () => {
		const ir = parseEXML(STATE_EXML, 'skins.StateSkin');
		const btn = ir.children[0];
		const stateProps = btn.properties.filter(p => p.state);
		expect(stateProps).toHaveLength(2);
		expect(stateProps.find(p => p.state === 'down')?.value).toEqual({ type: 'literal', value: 'Down' });
	});
});

// ── Percent values ───────────────────────────────────────────────────

const PERCENT_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.PercentSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:Group width="100%" height="50%"/>
</eui:Skin>`;

describe('Percent values', () => {
	it('parses percent values', () => {
		const ir = parseEXML(PERCENT_EXML, 'skins.PercentSkin');
		const group = ir.children[0];
		const widthProp = group.properties.find(p => p.name === 'width');
		expect(widthProp?.value).toEqual({ type: 'percent', value: 100 });
	});

	it('generates percentWidth/percentHeight in code', () => {
		const code = compileEXML(PERCENT_EXML, 'skins.PercentSkin');
		expect(code).toContain('percentWidth = 100');
		expect(code).toContain('percentHeight = 50');
	});
});

// ── Bindings ─────────────────────────────────────────────────────────

const BINDING_EXML = `<?xml version="1.0" encoding="utf-8"?>
<eui:Skin class="skins.BindSkin" xmlns:eui="http://ns.egret.com/eui">
	<eui:Label id="lbl" text="{data.name}"/>
</eui:Skin>`;

describe('Bindings', () => {
	it('parses binding expressions', () => {
		const ir = parseEXML(BINDING_EXML, 'skins.BindSkin');
		const lbl = ir.children[0];
		const textProp = lbl.properties.find(p => p.name === 'text');
		expect(textProp?.value).toEqual({ type: 'binding', expression: 'data.name' });
	});

	it('generates binding code', () => {
		const code = compileEXML(BINDING_EXML, 'skins.BindSkin');
		expect(code).toContain('Binding');
	});
});
