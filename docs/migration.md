# @blakron/cli 迁移状态

> 更新日期：2026-05-01

---

## 一、与旧 Egret CLI 的对比

| 维度       | 旧 Egret CLI                              | Blakron CLI                      | 状态                           |
| ---------- | ----------------------------------------- | -------------------------------- | ------------------------------ |
| CLI 框架   | 手写参数解析                              | commander.js                     | ✅                             |
| TS 编译器  | typescript-plus（魔改 tsc）               | esbuild                          | ✅                             |
| 配置文件   | egretProperties.json + index.html data-\* | blakron.config.ts                | ✅                             |
| 构建命令   | `egret build`                             | `blakron build`                  | ✅ html5 目标，开发/生产模式   |
| 创建项目   | `egret create`                            | `blakron create`                 | ✅ game / empty 模板可用       |
| 清理命令   | `egret clean`                             | `blakron clean`                  | ✅                             |
| 开发服务器 | `egret startserver`                       | `blakron dev`                    | ✅ esbuild watch + live reload |
| EXML 编译  | 内嵌在 tools/lib/eui/                     | 内嵌 EXML 编译管线             | ✅ XML → IR → CodeGen             |
| 模块系统   | CommonJS                                  | ESM                              | ✅                             |

---

## 二、已完成项

### 命令

- `blakron build`：html5 目标，开发/生产模式，sourcemap 支持
- `blakron create <name>`：从 `game` 模板脚手架新项目
- `blakron clean`：清理输出目录

### 配置

- `blakron.config.ts` 替代 `egretProperties.json` + `index.html data-*`
- `defineConfig()` 提供类型安全的配置定义
- 完整默认值，所有字段可选

### 编译

- esbuild 替代 typescript-plus，编译速度大幅提升
- 开发模式：转译保留文件结构
- 生产模式：单文件打包 + 压缩

### 模板生成

- html5：生成标准 `index.html`，canvas 配置通过 data-\* 属性传入

---

## 三、待完成项

### ~~⚠️ EXML 编译器（stub）~~ ✅ 已完成

EXML 编译管线已在 `src/core/exml/` 目录下完整实现：

- `xml-parser.ts`：轻量级 XML 解析器
- `ast.ts`：SkinIR 中间表示类型定义
- `registry.ts`：静态组件注册表
- `exml-parser.ts`：XML → SkinIR 解析器
- `codegen.ts`：SkinIR → ESM JavaScript 代码生成器

`exml-compiler.ts` 的 `exmlToGjs()` 已替换为调用 `compileEXML()` 完整实现。

支持所有 `publishPolicy`：`path`、`content`、`gjs`、`json`。

---

### ⬜ 缺失的项目模板

| 模板    | 状态          | 说明                                |
| ------- | ------------- | ----------------------------------- |
| `game`  | ✅ 可用       | 标准游戏项目                        |
| `empty` | ✅ 可用       | 最小化项目，直接使用 @blakron/core  |
| `eui`   | ✅ 可用       | 含 EUI 的项目，含 17 个默认 EXML 皮肤 |

---

### ~~⬜ 开发服务器~~ ✅ 已完成

`blakron dev` 命令已实现，基于 esbuild watch + SSE live reload。

### ~~⬜ 配置验证~~ ✅ 已完成

`loadConfig()` 现在验证 `stage.frameRate`、`stage.scaleMode`、`entry` 文件存在性。

### ~~⬜ `build --watch` / `build --analyze`~~ ✅ 已完成

`blakron build` 新增 `--watch`（文件监听自动重编译）和 `--analyze`（bundle 体积分析）选项。

---

## 四、不需要迁移的旧功能

| 旧功能                  | 原因                            |
| ----------------------- | ------------------------------- |
| `egret publish`         | 合并到 `blakron build --minify` |
| `egret run`             | 由 `blakron dev` 替代           |
| `egret upgrade`         | 不需要，用 pnpm 管理版本        |
| native 平台编译         | 不支持 native，Web only         |
| TypeScript 魔改编译器   | 用标准 esbuild 替代             |
| 旧版 manifest.json 生成 | 不需要，ESM 直接 import         |
