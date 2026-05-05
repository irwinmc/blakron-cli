# @blakron/cli

Command-line build tool for the Blakron game engine. Replaces the legacy Egret CLI with fast esbuild-based compilation and built-in EXML skin file parsing & codegen.

## Install

```bash
pnpm add -D @blakron/cli
```

The `blakron` command is available after installation.

## Commands

### `blakron build`

Compile and bundle the project.

```bash
blakron build [options]
```

| Option           | Description                                      | Default |
| ---------------- | ------------------------------------------------ | ------- |
| `-m, --minify`   | Minify output                                    | `false` |
| `--sourcemap`    | Emit sourcemap                                   | `false` |
| `--watch`        | Watch mode — rebuild on file changes             | `false` |
| `--analyze`      | Output bundle size analysis (esbuild metafile)   | `false` |

### `blakron dev`

Start the dev server with live reload.

```bash
blakron dev [options]
```

| Option              | Description    | Default |
| ------------------- | -------------- | ------- |
| `-p, --port <port>` | Port to listen | `3000`  |
| `--sourcemap`       | Emit sourcemap | `false` |

### `blakron create`

Scaffold a new project from a template.

```bash
blakron create <name> [options]
```

| Option                  | Description                              | Default |
| ----------------------- | ---------------------------------------- | ------- |
| `--template <template>` | Template: `game` \| `eui` \| `empty`    | `game`  |

**Templates:**

| Template | Description |
|----------|-------------|
| `game`   | Standard game project with `@blakron/core` + `@blakron/game` |
| `eui`    | EUI project with `@blakron/ui`, 18 default EXML skins, and theme configuration |
| `empty`  | Minimal project with only `@blakron/core` |

### `blakron clean`

Remove the build output directory.

```bash
blakron clean
```

## Built-in EXML Compiler

The CLI includes the EXML skin file parser and code generator (previously `@blakron/exml-parser`, now merged). `.exml` files are automatically compiled to ESM JavaScript modules during the build.

### Features

- **XML parsing**: Parses EXML (XML-based skin description format)
- **AST / IR generation**: Converts to an intermediate representation (SkinIR)
- **Code generation**: Emits ESM-compatible JavaScript factory functions
- **Component registry**: Built-in `eui:*` / `egret:*` namespace mappings
- **State support**: Parses skin state definitions and property overrides
- **Percentage layout**: Auto-detects `100%` and converts to `percentWidth` / `percentHeight`
- **Data binding**: Parses `{expression}` binding syntax

### EXML Configuration

Configure EXML compilation in `blakron.config.ts`:

```ts
export default defineConfig({
	// ... other config
	exml: {
		publishPolicy: 'gjs',            // path | content | gjs | json
		themeFile: 'resource/default.thm.json',
	},
});
```

### Default Skins (EUI template)

The `eui` template ships with 18 default EXML skins for all `@blakron/ui` components:

| Component | Skin Parts |
|-----------|-----------|
| Button | bg, labelDisplay |
| CheckBox | box, labelDisplay |
| RadioButton | dot, labelDisplay |
| ToggleButton | bg, labelDisplay |
| ToggleSwitch | knob |
| Label | labelDisplay |
| Image | imageDisplay |
| Panel | titleDisplay, contentGroup |
| ProgressBar | thumb, labelDisplay |
| HSlider / VSlider | track, thumb |
| HScrollBar / VScrollBar | thumb |
| TextInput | textDisplay, promptDisplay |
| ComboBox | labelDisplay, dropDown, list |
| Scroller | viewport, horizontalScrollBar, verticalScrollBar |
| List | scroller, dataGroup |
| ItemRenderer | labelDisplay |
| TabBar | dataGroup |
| ViewStack / Group | contentGroup |

## Configuration

Create a `blakron.config.ts` in your project root:

```ts
import { defineConfig } from '@blakron/cli';

export default defineConfig({
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
		background: '#000000',
	},
});
```

### Options

| Field                | Type      | Description              |
| -------------------- | --------- | ------------------------ |
| `target`             | `'html5'` | Build target             |
| `entry`              | `string`  | Entry file path          |
| `output.dir`         | `string`  | Output directory         |
| `stage.width`        | `number`  | Stage width              |
| `stage.height`       | `number`  | Stage height             |
| `stage.scaleMode`    | `string`  | Scale mode               |
| `stage.orientation`  | `string`  | Screen orientation        |
| `stage.frameRate`    | `number`  | Frame rate               |
| `stage.background`   | `string`  | Background color         |
| `exml.publishPolicy` | `string`  | EXML output strategy     |
| `exml.themeFile`     | `string`  | Theme JSON file path     |

## Quick Start

```bash
# Scaffold a game project
blakron create my-game
cd my-game && pnpm install
blakron dev

# Or scaffold an EUI project with default skins
blakron create my-app --template eui
cd my-app && pnpm install
blakron build   # compiles EXML skins
blakron dev     # start dev server
```
