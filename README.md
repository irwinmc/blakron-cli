# @blakron/cli

CLI tool for the Blakron game engine — a modern replacement for the legacy Egret CLI. Powered by esbuild for fast compilation, with a built-in EXML skin parser and code generator.

> Migrating from Egret? See [migration.md](docs/migration.md)

## Usage

`@blakron/cli` does **not** require a global install.

### Creating a project

Use `npx` to scaffold a new project — no installation needed:

```bash
npx @blakron/cli create my-game
npx @blakron/cli create my-lib --template empty
```

### In-project commands

Scaffolded projects include `@blakron/cli` as a devDependency and expose commands via npm scripts:

```bash
cd my-game
pnpm install
pnpm build    # build
pnpm dev      # dev server
pnpm clean    # clean output
```

You can also add it to an existing project manually:

```bash
pnpm add -D @blakron/cli
```

## Commands

### `blakron create`

Scaffold a new project from a template.

```bash
blakron create <name> [options]
```

| Option                  | Description                 | Default |
| ----------------------- | --------------------------- | ------- |
| `--template <template>` | Template: `game` \| `empty` | `game`  |

**Templates:**

| Template | Extends  | Dependencies                                      | Description                                                                      |
| -------- | -------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `game`   | `Sprite` | `@blakron/core` + `@blakron/game` + `@blakron/ui` | Full-featured project with resource loading, scene building, and Tween animation |
| `empty`  | `Sprite` | `@blakron/core`                                   | Minimal project — pure Canvas rendering, no extra dependencies                   |

**Lifecycle:**

| Template | Entry class           | Lifecycle                                                                                                           |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `game`   | `Main extends Sprite` | constructor → `ADDED_TO_STAGE` → `onAddToStage` → `runGame` → `loadResource` → `createGameScene` → `startAnimation` |
| `empty`  | `Main extends Sprite` | constructor → `ADDED_TO_STAGE` → `onAddToStage`                                                                     |

### `blakron build`

Compile and bundle the project into a single self-contained ESM bundle.

```bash
blakron build [options]
```

| Option          | Description                                            | Default |
| --------------- | ------------------------------------------------------ | ------- |
| `-r, --release` | Minified, content-hashed release build (→ bin-release) | `false` |
| `--sourcemap`   | Generate sourcemaps                                    | `false` |
| `--watch`       | Rebuild source on file changes                         | `false` |
| `--analyze`     | Print bundle size analysis (esbuild metafile)          | `false` |

**Output (Egret-aligned shape, ESM under the hood):**

| Mode           | Layout                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| development    | `bin-debug/` — per-file `.js` mirroring `src/` (`Main.js`, `com/.../X.js`) + engine chunks in `js/`       |
| release (`-r`) | `bin-release/web/<timestamp>/` — `js/main.min_<hash>.js` + `js/blakron.*.min_<hash>.js` + `manifest.json` |

Engine packages (`@blakron/*`) are bundled into separate `js/blakron.<name>.js`
chunks and wired up through an HTML **import map**, so the app bundle and engine
resolve bare specifiers (`import { Sprite } from '@blakron/core'`) in the browser
without duplicating engine code. `resource/` (including the compiled
`default.thm.json`) is copied with fixed names, since user code references those
paths directly. The entry script bootstraps via your own `createPlayer()` call.

### `blakron dev`

Start a development server with auto-recompilation on file changes (manual browser refresh required).

```bash
blakron dev [options]
```

| Option              | Description         | Default |
| ------------------- | ------------------- | ------- |
| `-p, --port <port>` | Port to listen      | `3000`  |
| `--sourcemap`       | Generate sourcemaps | `false` |

### `blakron clean`

Remove the build output directories (`bin-debug` and `bin-release`).

```bash
blakron clean
```

## Configuration

Create a `blakron.config.ts` in your project root:

```ts
export default {
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
	// Optional: enable EXML skin compilation
	exml: {
		themeFile: 'resource/default.thm.json',
	},
};
```

**Options:**

| Field               | Type     | Description                                                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `target`            | `string` | Build target — currently only `'html5'`                                                                                  |
| `entry`             | `string` | Entry file path, default `'src/Main.ts'`                                                                                 |
| `output.dir`        | `string` | Output directory, default `'bin-debug'`                                                                                  |
| `stage.width`       | `number` | Stage width                                                                                                              |
| `stage.height`      | `number` | Stage height                                                                                                             |
| `stage.scaleMode`   | `string` | Scale mode: `showAll` / `noScale` / `exactFit` / `noBorder` / `fixedHeight` / `fixedWidth` / `fixedNarrow` / `fixedWide` |
| `stage.orientation` | `string` | Orientation: `auto` / `portrait` / `landscape`                                                                           |
| `stage.frameRate`   | `number` | Frame rate — must be a positive integer                                                                                  |
| `stage.background`  | `string` | Background color (e.g. `'#000000'`)                                                                                      |
| `exml.themeFile`    | `string` | Theme JSON file path                                                                                                     |

## EXML Skin Compiler

The CLI includes a complete EXML skin parsing and code generation pipeline (XML → SkinIR → ESM JavaScript). `.exml` files placed in the `resource/` directory are compiled automatically during `blakron build`.

### Features

- **XML Parsing** — lightweight parser with namespace, CDATA, and comment support
- **AST / IR Generation** — converts to an intermediate representation (SkinIR)
- **Code Generation** — outputs ESM factory functions
- **Component Registry** — built-in `eui:*` / `egret:*` namespace mapping to `@blakron/ui` / `@blakron/core`
- **View States** — parses `<eui:State>` and state-specific property overrides like `label.up="Down"`
- **Percent Layout** — auto-detects `width="100%"` and converts to `percentWidth`
- **Data Binding** — parses `{expression}` binding syntax and generates `Binding.bindProperty` calls

### Compilation Pipeline

All `.exml` skins compile into a single ESM module — `js/default.thm.js` (dev)
or `js/default.thm.min_<hash>.js` (release) — that registers each skin factory.
`default.thm.json` keeps only the component→skin mapping plus a `skinsJs`
pointer to that module, which the runtime `Theme` imports. No `.exml` is shipped.

```
resource/skins/*.exml
        ↓ parseXML()
    XML Element Tree
        ↓ parseEXML()
       SkinIR
        ↓ generateCode({ format: 'esm' })
    per-skin ESM factories
        ↓ esbuild bundle (+ minify in release)
    js/default.thm[.min_<hash>].js   (skins register on globalThis)
```

## Project Structure

A project created with the default template (`game`) has the following structure:

```
my-game/
├── blakron.config.ts          # Project config (includes exml options)
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
├── resource/
│   ├── default.res.json       # Resource config
│   ├── default.thm.json       # Theme file: component → skin mapping
│   └── skins/                 # EXML skin directory (21 default skins)
│       ├── ButtonSkin.exml
│       ├── ...
│       └── ViewStackSkin.exml
└── src/
    ├── Main.ts                # Entry: class Main extends Sprite
    └── LoadingUI.ts           # Loading progress display
```

## Quick Start

```bash
# Full-featured game project (default)
npx @blakron/cli create my-game
cd my-game && pnpm install
pnpm dev

# Minimal project
npx @blakron/cli create my-lib --template empty
cd my-lib && pnpm install
pnpm dev
```
