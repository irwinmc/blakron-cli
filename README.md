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

| Option           | Description    | Default |
| ---------------- | -------------- | ------- |
| `-m, --minify`   | Minify output  | `false` |
| `--sourcemap`    | Emit sourcemap | `false` |

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

| Option                  | Description                   | Default |
| ----------------------- | ----------------------------- | ------- |
| `--template <template>` | Template: `game` \| `empty`   | `game`  |

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
		// EXML compiler options (optional)
	},
});
```

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
| `exml`               | `object`  | EXML compiler options    |

## Quick Start

```bash
# Scaffold a project
blakron create my-game

# Enter the directory
cd my-game
pnpm install

# Development
blakron dev

# Build
blakron build
```
