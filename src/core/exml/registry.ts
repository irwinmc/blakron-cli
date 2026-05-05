/**
 * Static component registry for EXML → JS code generation.
 *
 * Maps short tag names (e.g. `Button`, `Skin`) to their module paths
 * and default properties. This replaces the old runtime-reflection-based
 * `EXMLConfig`.
 */

export interface ComponentInfo {
	/** Module path to import from (e.g. "@blakron/ui") */
	module: string;
	/** The default property name — direct children are assigned here */
	defaultProperty?: string;
}

// ── Namespace mappings ───────────────────────────────────────────────

/** Map XML namespace prefixes to module import paths */
const NAMESPACE_MODULES: Record<string, string> = {
	eui: '@blakron/ui',
	egret: '@blakron/core',
	w: '@blakron/ui',
	core: '@blakron/core',
};

// ── Component registry ───────────────────────────────────────────────

/**
 * All known components with their default properties.
 * Key is the local (un-prefixed) tag name.
 */
const COMPONENTS: Record<string, ComponentInfo> = {
	// Skins & containers
	Skin: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	Group: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	Panel: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	DataGroup: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	Scroller: { module: '@blakron/ui', defaultProperty: 'viewport' },

	// Basic controls
	Button: { module: '@blakron/ui' },
	Label: { module: '@blakron/ui' },
	Image: { module: '@blakron/ui' },
	Rect: { module: '@blakron/ui' },
	CheckBox: { module: '@blakron/ui' },
	RadioButton: { module: '@blakron/ui' },
	ToggleButton: { module: '@blakron/ui' },
	ToggleSwitch: { module: '@blakron/ui' },
	ProgressBar: { module: '@blakron/ui' },
	HSlider: { module: '@blakron/ui' },
	VSlider: { module: '@blakron/ui' },
	HScrollBar: { module: '@blakron/ui' },
	VScrollBar: { module: '@blakron/ui' },
	TabBar: { module: '@blakron/ui' },
	List: { module: '@blakron/ui', defaultProperty: 'dataProvider' },
	ItemRenderer: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	ViewStack: { module: '@blakron/ui', defaultProperty: 'elementsContent' },
	UILayer: { module: '@blakron/ui', defaultProperty: 'elementsContent' },

	// Text input controls
	TextInput: { module: '@blakron/ui' },
	EditableText: { module: '@blakron/ui' },

	// Layouts
	Layout: { module: '@blakron/ui' },
	BasicLayout: { module: '@blakron/ui' },
	HorizontalLayout: { module: '@blakron/ui' },
	VerticalLayout: { module: '@blakron/ui' },
	TileLayout: { module: '@blakron/ui' },

	// States
	State: { module: '@blakron/ui' },
	AddItems: { module: '@blakron/ui' },
	SetProperty: { module: '@blakron/ui' },
	SetStateProperty: { module: '@blakron/ui' },

	// Collections
	ArrayCollection: { module: '@blakron/ui' },

	// Binding
	Binding: { module: '@blakron/ui' },

	// Core classes (egret namespace)
	DisplayObject: { module: '@blakron/core' },
	DisplayObjectContainer: { module: '@blakron/core' },
	Sprite: { module: '@blakron/core' },
	TextField: { module: '@blakron/core' },
	Bitmap: { module: '@blakron/core' },
	Shape: { module: '@blakron/core' },
	Point: { module: '@blakron/core' },
	Rectangle: { module: '@blakron/core' },
	Matrix: { module: '@blakron/core' },
	Event: { module: '@blakron/core' },
	EventDispatcher: { module: '@blakron/core' },
	Timer: { module: '@blakron/core' },

	// Complex controls
	ComboBox: { module: '@blakron/ui', defaultProperty: 'dataProvider' },

	// Animation
	Animation: { module: '@blakron/ui' },
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Look up a component by its tag name.
 *
 * @param tagName - Full tag name possibly with prefix (e.g. "eui:Button")
 * @returns Component info or null if not found
 */
export function lookupComponent(tagName: string): ComponentInfo | null {
	// Strip namespace prefix if present
	const local = tagName.includes(':') ? tagName.split(':').pop()! : tagName;
	return COMPONENTS[local] ?? null;
}

/**
 * Get the default property for a component.
 */
export function getDefaultProperty(tagName: string): string | undefined {
	const info = lookupComponent(tagName);
	return info?.defaultProperty;
}

/**
 * Resolve a tag name to its import module path.
 */
export function resolveModule(tagName: string): string | null {
	// Check for namespace prefix first
	if (tagName.includes(':')) {
		const [prefix] = tagName.split(':');
		const modulePath = NAMESPACE_MODULES[prefix];
		if (modulePath) return modulePath;
	}

	// Fall back to component registry
	const info = lookupComponent(tagName);
	return info?.module ?? null;
}

/**
 * Get the local (un-prefixed) class name from a tag name.
 */
export function localName(tagName: string): string {
	return tagName.includes(':') ? tagName.split(':').pop()! : tagName;
}

/**
 * Check if a tag name is a known property node (contains a dot).
 * e.g. "eui:Button.label" → property "label" on Button
 */
export function isPropertyNode(tagName: string): boolean {
	return tagName.includes('.');
}

/**
 * Parse a property node tag like "eui:Button.label" into its parts.
 */
export function parsePropertyNode(tagName: string): { owner: string; property: string } | null {
	// First strip namespace prefix
	const parts = tagName.split('.');
	if (parts.length < 2) return null;
	const ownerPart = parts[0];
	const property = parts.slice(1).join('.');
	return { owner: localName(ownerPart), property };
}
