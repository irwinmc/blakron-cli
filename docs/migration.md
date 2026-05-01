# @blakron/cli 迁移状态

> 更新日期：2026-05-01

---

## 一、与旧 Egret CLI 的对比

| 维度       | 旧 Egret CLI                              | Blakron CLI                      | 状态                           |
| ---------- | ----------------------------------------- | ------------------------------ | ------------------------------ |
| CLI 框架   | 手写参数解析                              | commander.js                   | ✅                             |
| TS 编译器  | typescript-plus（魔改 tsc）               | esbuild                        | ✅                             |
| 配置文件   | egretProperties.json + index.html data-\* | blakron.config.ts                | ✅                             |
| 构建命令   | `egret build`                             | `blakron build`                  | ✅                             |
| 创建项目   | `egret create`                            | `blakron create`                 | ✅ game / empty 模板可用       |
| 清理命令   | `egret clean`                             | `blakron clean`                  | ✅                             |
| 开发服务器 | `egret startserver`                       | `blakron dev`                    | ✅ esbuild watch + live reload |
| EXML 编译  | 内嵌在 tools/lib/eui/                     | `@blakron/exml-parser`（独立包） | ⚠️ stub                        |
| 模块系统   | CommonJS                                  | ESM                            | ✅                             |

---

## 二、已完成项

### 命令

- `blakron build`：html5 / wxgame 双目标，开发/生产模式，sourcemap 支持
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
- wxgame：生成 `game.js` + `game.json`

---

## 三、待完成项

### ⚠️ EXML 编译器（stub）

`src/core/exml-compiler.ts` 中的 `exmlToGjs()` 函数是最小化占位符：

```typescript
// 当前实现：只提取类名，不解析 EXML 节点结构
function exmlToGjs(exmlFile: ExmlFile): { code: string; className: string } {
	const classMatch = exmlFile.contents.match(/exmlName="([^"]+)"/);
	const className = classMatch ? classMatch[1] : path.basename(exmlFile.filename, '.exml');
	const code = `(function(){\n  var e = new eui.Skin();\n  // generated from ${path.basename(exmlFile.filename)}\n  return e;\n})`;
	return { code, className };
}
```

**影响**：使用 `publishPolicy: 'gjs'` 的项目无法正确编译 EXML 皮肤。`path` / `content` / `json` 策略不受影响（只做文件收集，不解析内容）。

**解决方案**：等待 `@blakron/exml-parser` 包实现后替换此函数。

---

### ⬜ 缺失的项目模板

| 模板    | 状态          | 说明                              |
| ------- | ------------- | --------------------------------- |
| `game`  | ✅ 可用       | 标准游戏项目                      |
| `empty` | ✅ 可用       | 最小化项目，直接使用 @blakron/core  |
| `eui`   | ⬜ 目录不存在 | 含 EUI 的项目，等 @blakron/eui 就绪 |

---

### ~~⬜ 开发服务器~~ ✅ 已完成

`blakron dev` 命令已实现，基于 esbuild watch + SSE live reload。

---

## 四、不需要迁移的旧功能

| 旧功能                  | 原因                          |
| ----------------------- | ----------------------------- |
| `egret publish`         | 合并到 `blakron build --minify` |
| `egret run`             | 由 `blakron dev`（待实现）替代  |
| `egret upgrade`         | 不需要，用 pnpm 管理版本      |
| native 平台编译         | 不支持 native，Web only       |
| TypeScript 魔改编译器   | 用标准 esbuild 替代           |
| 旧版 manifest.json 生成 | 不需要，ESM 直接 import       |
