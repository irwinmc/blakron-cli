# Changelog

All notable changes to `@blakron/cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.7.1 — 2026-08-06

### Changed

- **HSliderSkin / VSliderSkin**: tracks now use `width="100%"` / `height="100%"` instead of inset `left`/`right` / `top`/`bottom` constraints, aligning with the `@blakron/ui` 1.1.0 fix that positions the thumb relative to the track's layout bounds.
- **TextInputSkin**: `textDisplay` and `promptDisplay` now use explicit `width`/`height` with `verticalCenter` instead of stretch-to-fill `left`/`right`/`top`/`bottom`. `promptDisplay` sets `multiline="false"` / `wordWrap="false"` to prevent accidental wrapping of placeholder text.

## 0.7.0 - 2026-08-06

### Added

- Support for root `Skin` properties such as `minWidth` and `minHeight` during EXML compilation.
- Support for shorthand `states="up,down,disabled"` declarations and root state-specific properties.
- Support for `excludeFrom` as well as `includeIn` when generating state overrides.
- Parser and code-generation coverage for every EXML skin included in the game template.

### Changed

- Updated the default game-template skins to follow Egret EUI state and sizing conventions more closely.
- Made control, container, slider, and scrollbar skins responsive through constraints and minimum dimensions.

## 0.6.1 - 2026-07-16

### Added

- Support for project-defined EXML namespace prefixes through `exml.namespaces`.
- Shared namespace chunks so classes referenced by both game code and EXML retain the same module identity.

## 0.6.0 - 2026-06-08

### Changed

- Compiled all EXML skins into a bundled ESM theme module loaded dynamically by the runtime.
- Stopped shipping source `.exml` files in release output.

## 0.5.1 - 2026-06-07

### Changed

- Added npm publishing configuration and package metadata updates.

## 0.5.0 - 2026-06-07

### Added

- Split Blakron engine packages into independent browser chunks.
- Generated import maps and manifests to connect application, engine, and theme modules without duplication.

## 0.4.0 - 2026-06-06

### Changed

- Reworked the build system around an extensible plugin pipeline.

## 0.3.11 - 2026-05-08

### Changed

- Switched release builds to two-pass bundling with content-hashed filenames.

## 0.3.0 - 2026-05-07

### Added

- Bundled development builds and EXML code generation.
- Game and empty project templates with local CLI scripts.

### Changed

- Moved default skins and resource configuration into the game template.

## 0.2.0 - 2026-05-05

### Added

- Built-in EXML parsing, code generation, view states, watch mode, and bundle analysis.

## 0.1.0 - 2026-05-01

### Added

- Initial `@blakron/cli` release with project creation, HTML5 builds, development server, and cleaning commands.
