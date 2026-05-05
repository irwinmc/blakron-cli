# @blakron/cli 开发计划

> 更新日期：2026-05-02

---

## 当前状态速览

| 模块               | 状态    | 说明                                              |
| ------------------ | ------- | ------------------------------------------------- |
| `build` 命令       | ✅ 完成 | html5 目标，开发/生产模式                         |
| `create` 命令      | ✅ 完成 | game / empty 模板可用，eui 模板等 @blakron/eui    |
| `clean` 命令       | ✅ 完成 |                                                   |
| `dev` 命令         | ✅ 完成 | esbuild watch + SSE live reload，默认端口 3000    |
| `config.ts`        | ✅ 完成 | defineConfig + loadConfig，完整类型               |
| `compiler.ts`      | ✅ 完成 | esbuild 封装，双模式                              |
| `dev-server.ts`    | ✅ 完成 | esbuild context + Node.js HTTP 代理               |
| `template.ts`      | ✅ 完成 | index.html 生成，资源复制                         |
| `exml-compiler.ts` | ✅ 完成 | EXML → JS 完整编译管线（XML → AST → IR → CodeGen） |
| 错误处理           | ✅ 完成 | BuildError / ConfigError                          |
| 日志               | ✅ 完成 | 彩色输出                                          |
| 配置验证           | ✅ 完成 | frameRate / scaleMode / entry 校验               |
| `build --watch`    | ✅ 完成 | esbuild context.watch() 文件监听                  |
| `build --analyze`  | ✅ 完成 | esbuild metafile bundle 分析                     |
| EUI 项目模板       | ✅ 完成 | templates/eui/ + 默认皮肤 EXML                   |

---

## P1：高优先级 ✅ 全部完成

### ~~`blakron dev` 命令（开发服务器）~~ ✅

新增 `src/commands/dev.ts` + `src/core/dev-server.ts`：

- esbuild `context.watch()` 监听文件变更自动重编译
- esbuild `context.serve()` 提供编译后 JS 的内存服务
- Node.js HTTP 代理层：静态文件（index.html / resource/）直接读磁盘，JS 请求转发到 esbuild
- SSE live reload：在 index.html 注入 `<script>` 订阅 `/esbuild` 端点，重编译后自动刷新浏览器
- 默认端口 3000，`-p/--port` 可自定义，`--sourcemap` 可选

### ~~`empty` 项目模板~~ ✅

新增 `templates/empty/`：最小化项目，直接使用 `@blakron/core` 的 `createPlayer`，无 EUI 依赖。`game` 模板的 `package.json` 同步补充了 `dev` 脚本。

`templates/eui/` 等 @blakron/eui 就绪后补充。

---

## P2：中优先级 ✅ 全部完成

### ~~EXML 编译器（`exmlToGjs` 完整实现）~~ ✅

**已完成**：`src/core/exml/` 目录下实现了完整的 EXML 编译管线：

- `xml-parser.ts`：轻量级 XML 解析器
- `ast.ts`：SkinIR 中间表示类型定义
- `registry.ts`：静态组件注册表（eui:* / egret:* 命名空间映射）
- `exml-parser.ts`：XML → SkinIR 解析器
- `codegen.ts`：SkinIR → ESM JavaScript 代码生成器

`exml-compiler.ts` 的 `exmlToGjs()` 已替换为调用 `compileEXML()` 完整实现。

支持特性：
- 组件实例化与属性赋值
- 状态定义与状态属性覆盖（SetProperty / AddItems）
- 百分比布局（width="100%" → percentWidth）
- 数据绑定（{expression} 语法）
- 命名空间前缀（eui: / egret: / w: / e:）
- skin part 自动检测（id 属性）

### ~~配置验证~~ ✅

**已完成**：在 `loadConfig()` 里加入了基础校验，非法值抛 `ConfigError`：

- `stage.frameRate` 必须是正整数
- `stage.scaleMode` 必须是合法值（showAll / noScale / exactFit / noBorder / fixedHeight / fixedWidth / fixedNarrow / fixedWide）
- `entry` 文件必须存在

### ~~`blakron build --watch` 模式~~ ✅

**已完成**：`build` 命令新增 `--watch` 和 `--analyze` 选项。

- `--watch`：调用 esbuild 的 `context.watch()`，文件变更时自动重新编译（不含 dev server）。Ctrl+C 停止。
- `--analyze`：使用 esbuild metafile 输出 bundle 体积分析报告。

### ~~EUI 项目模板 + 默认皮肤~~ ✅

**已完成**：`templates/eui/` 目录包含完整的 EUI 项目模板。

包含 17 个默认 EXML 皮肤文件：

| 皮肤文件 | 组件 | 皮肤部件 |
|---|---|---|
| `ButtonSkin.exml` | Button | bg, labelDisplay |
| `CheckBoxSkin.exml` | CheckBox | box, labelDisplay |
| `RadioButtonSkin.exml` | RadioButton | dot, labelDisplay |
| `ToggleButtonSkin.exml` | ToggleButton | bg, labelDisplay |
| `ToggleSwitchSkin.exml` | ToggleSwitch | knob |
| `LabelSkin.exml` | Label | labelDisplay |
| `ImageSkin.exml` | Image | imageDisplay |
| `PanelSkin.exml` | Panel | titleDisplay, contentGroup |
| `ProgressBarSkin.exml` | ProgressBar | thumb, labelDisplay |
| `HSliderSkin.exml` | HSlider | track, thumb |
| `VSliderSkin.exml` | VSlider | track, thumb |
| `HScrollBarSkin.exml` | HScrollBar | thumb |
| `VScrollBarSkin.exml` | VScrollBar | thumb |
| `TextInputSkin.exml` | TextInput | textDisplay, promptDisplay |
| `ScrollerSkin.exml` | Scroller | viewport, horizontalScrollBar, verticalScrollBar |
| `ItemRendererSkin.exml` | ItemRenderer | labelDisplay |
| `ListSkin.exml` | List | scroller, dataGroup |
| `TabBarSkin.exml` | TabBar | dataGroup |
| `ViewStackSkin.exml` | ViewStack | contentGroup |
| `GroupSkin.exml` | Group | contentGroup |
| `ComboBoxSkin.exml` | ComboBox | labelDisplay, dropDown, list |

`resource/default.thm.json` 包含所有组件到皮肤的映射。

---

## P3：低优先级

### 增量构建缓存

esbuild 本身有缓存机制，但当前每次 `blakron build` 都是全量构建。可以利用 esbuild 的 `incremental` 模式或文件 hash 缓存跳过未变更文件。

### 多入口支持

当前 `entry` 只支持单个文件。部分项目需要多入口（如主游戏 + worker）。

---

## 搁置项

| 项目                                       | 原因                        |
| ------------------------------------------ | --------------------------- |
| EXML `path` / `content` 策略的运行时加载器 | 需要配合 assetsmanager 实现 |
