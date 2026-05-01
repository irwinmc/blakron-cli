# @heron/cli 开发计划

> 更新日期：2026-05-01

---

## 当前状态速览

| 模块               | 状态    | 说明                                            |
| ------------------ | ------- | ----------------------------------------------- |
| `build` 命令       | ✅ 完成 | html5 / wxgame 双目标，开发/生产模式            |
| `create` 命令      | ✅ 完成 | game / empty 模板可用，eui 模板等 @heron/eui    |
| `clean` 命令       | ✅ 完成 |                                                 |
| `dev` 命令         | ✅ 完成 | esbuild watch + SSE live reload，默认端口 3000  |
| `config.ts`        | ✅ 完成 | defineConfig + loadConfig，完整类型             |
| `compiler.ts`      | ✅ 完成 | esbuild 封装，双模式                            |
| `dev-server.ts`    | ✅ 完成 | esbuild context + Node.js HTTP 代理             |
| `template.ts`      | ✅ 完成 | index.html / game.js 生成，资源复制             |
| `exml-compiler.ts` | ⚠️ stub | `exmlToGjs()` 是占位符，等待 @heron/exml-parser |
| 错误处理           | ✅ 完成 | BuildError / ConfigError                        |
| 日志               | ✅ 完成 | 彩色输出                                        |

---

## P1：高优先级 ✅ 全部完成

### ~~`heron dev` 命令（开发服务器）~~ ✅

新增 `src/commands/dev.ts` + `src/core/dev-server.ts`：

- esbuild `context.watch()` 监听文件变更自动重编译
- esbuild `context.serve()` 提供编译后 JS 的内存服务
- Node.js HTTP 代理层：静态文件（index.html / resource/）直接读磁盘，JS 请求转发到 esbuild
- SSE live reload：在 index.html 注入 `<script>` 订阅 `/esbuild` 端点，重编译后自动刷新浏览器
- 默认端口 3000，`-p/--port` 可自定义，`--sourcemap` 可选

### ~~`empty` 项目模板~~ ✅

新增 `templates/empty/`：最小化项目，直接使用 `@heron/core` 的 `createPlayer`，无 EUI 依赖。`game` 模板的 `package.json` 同步补充了 `dev` 脚本。

`templates/eui/` 等 @heron/eui 就绪后补充。

---

## P2：中优先级

### EXML 编译器（`exmlToGjs` 完整实现）

**现状**：`exmlToGjs()` 是最小化 stub，只提取类名，不解析 EXML 节点结构。注释写明 "replace with @heron/exml-parser when available"。

**依赖**：`@heron/exml-parser` 包（尚未实现）。

**方案**：`@heron/exml-parser` 实现后，替换 `exmlToGjs()` 的实现，调用 parser 将 EXML XML 节点树转换为 EUI 皮肤 JS 代码。

**改动范围**：`src/core/exml-compiler.ts` 的 `exmlToGjs()` 函数。

---

### 配置验证

**现状**：`loadConfig()` 直接合并用户配置和默认值，没有校验字段合法性。非法的 `scaleMode` / `target` 等值会在运行时才报错。

**方案**：在 `loadConfig()` 里加入基础校验，非法值抛 `ConfigError`：

- `target` 必须是 `'html5' | 'wxgame'`
- `stage.frameRate` 必须是正整数
- `stage.scaleMode` 必须是合法的 StageScaleMode 值
- `entry` 文件必须存在

---

### `heron build --watch` 模式

**现状**：`build` 命令是一次性构建，没有 watch 模式。

**方案**：在 `build` 命令加 `--watch` 选项，调用 esbuild 的 `context.watch()`，文件变更时自动重新编译（不含 dev server，只是文件输出）。

---

## P3：低优先级

### 增量构建缓存

esbuild 本身有缓存机制，但当前每次 `heron build` 都是全量构建。可以利用 esbuild 的 `incremental` 模式或文件 hash 缓存跳过未变更文件。

### `heron build --analyze`

输出 bundle 体积分析报告（esbuild metafile），帮助排查包体积问题。

### 多入口支持

当前 `entry` 只支持单个文件。部分项目需要多入口（如主游戏 + worker）。

---

## 搁置项

| 项目                                       | 原因                        |
| ------------------------------------------ | --------------------------- |
| `templates/eui/`                           | 等待 @heron/eui 实现        |
| EXML `path` / `content` 策略的运行时加载器 | 需要配合 assetsmanager 实现 |
| wxgame 平台完整适配                        | 需要真实微信小游戏环境验证  |
