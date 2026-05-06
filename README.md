# @blakron/cli

Blakron 游戏引擎命令行工具，替代旧版 Egret CLI。基于 esbuild 实现快速编译，内置 EXML 皮肤解析与代码生成。

> 从 Egret 迁移？参阅 [migration.md](docs/migration.md)

## 安装

```bash
pnpm add -D @blakron/cli
```

## 命令

### `blakron create`

从模板创建新项目。

```bash
blakron create <项目名> [选项]
```

| 选项                    | 说明                            | 默认值  |
| ----------------------- | ------------------------------- | ------- |
| `--template <template>` | 模板：`game` \| `eui` \| `empty` | `game` |

**模板说明：**

| 模板    | 继承        | 依赖                         | 说明                                       |
| ------- | ----------- | ---------------------------- | ------------------------------------------ |
| `empty` | `Sprite`    | `@blakron/core`              | 最小化项目，纯 Canvas 渲染，不含 UI 框架   |
| `game`  | `Sprite`    | `@blakron/core` + `@blakron/game` | 标准游戏项目，Shape/TextField 绘制场景 |
| `eui`   | `UILayer`   | `@blakron/core` + `@blakron/ui` | EUI 组件项目，含 21 个默认 EXML 皮肤 + 主题配置 |

**生命周期对比：**

| 模板    | 入口类         | 生命周期                                                               |
| ------- | -------------- | ---------------------------------------------------------------------- |
| `empty` | `Main extends Sprite`    | constructor → `ADDED_TO_STAGE` → `onAddToStage`             |
| `game`  | `Main extends Sprite`    | constructor → `ADDED_TO_STAGE` → `onAddToStage` → `runGame` → `createGameScene` |
| `eui`   | `Main extends UILayer`   | `createChildren` → 初始化 Theme → `runGame` → `loadResource` → `createGameScene` → `startAnimation` |

### `blakron build`

编译打包项目。

```bash
blakron build [选项]
```

| 选项           | 说明                                     | 默认值  |
| -------------- | ---------------------------------------- | ------- |
| `-m, --minify` | 压缩打包输出                             | `false` |
| `--sourcemap`  | 生成 sourcemap                           | `false` |
| `--watch`      | 监听模式，文件变更自动重编译              | `false` |
| `--analyze`    | 输出 bundle 体积分析（esbuild metafile） | `false` |

### `blakron dev`

启动开发服务器，文件变更自动重编译（浏览器需手动刷新）。

```bash
blakron dev [选项]
```

| 选项               | 说明         | 默认值 |
| ------------------ | ------------ | ------ |
| `-p, --port <port>` | 监听端口    | `3000` |
| `--sourcemap`      | 生成 sourcemap | `false` |

### `blakron clean`

删除构建输出目录。

```bash
blakron clean
```

## 配置文件

在项目根目录创建 `blakron.config.ts`：

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
	// 可选：启用 EXML 皮肤编译
	exml: {
		publishPolicy: 'gjs',                     // path | content | gjs | json
		themeFile: 'resource/default.thm.json',
	},
};
```

**配置选项：**

| 字段                 | 类型     | 说明                                          |
| -------------------- | -------- | --------------------------------------------- |
| `target`             | `string` | 构建目标，目前仅支持 `'html5'`                |
| `entry`              | `string` | 入口文件路径，默认 `'src/Main.ts'`            |
| `output.dir`         | `string` | 输出目录，默认 `'bin-debug'`                  |
| `stage.width`        | `number` | 舞台宽度                                      |
| `stage.height`       | `number` | 舞台高度                                      |
| `stage.scaleMode`    | `string` | 缩放模式：`showAll` / `noScale` / `exactFit` / `noBorder` / `fixedHeight` / `fixedWidth` / `fixedNarrow` / `fixedWide` |
| `stage.orientation`  | `string` | 屏幕方向：`auto` / `portrait` / `landscape`   |
| `stage.frameRate`    | `number` | 帧率，必须为正整数                            |
| `stage.background`   | `string` | 背景色（如 `'#000000'`）                      |
| `exml.publishPolicy` | `string` | EXML 输出策略：`path` / `content` / `gjs` / `json` |
| `exml.themeFile`     | `string` | 主题 JSON 文件路径                            |

## EXML 皮肤编译器

CLI 内置了完整的 EXML 皮肤解析与代码生成管线（XML → SkinIR → ESM JavaScript），`.exml` 文件在 `blakron build` 时自动编译。

### 特性

- **XML 解析**：轻量级 XML 解析器，支持命名空间、CDATA、注释
- **AST / IR 生成**：转换为中间表示（SkinIR）
- **代码生成**：输出 ESM 工厂函数
- **组件注册表**：内置 `eui:*` / `egret:*` 命名空间到 `@blakron/ui` / `@blakron/core` 的映射
- **视图状态**：解析 `<eui:State>` 及 `label.up="Down"` 形式的状态属性覆盖
- **百分比布局**：自动识别 `width="100%"` 并转为 `percentWidth`
- **数据绑定**：解析 `{expression}` 绑定语法，生成 `Binding.bindProperty` 调用

### 编译管线

```
src/skins/ButtonSkin.exml
        ↓ parseXML()
    XML Element Tree
        ↓ parseEXML()
       SkinIR
        ↓ generateCode()
    ButtonSkin.gjs.js (ESM factory)
```

### EUI 模板默认皮肤（21 个）

`blakron create --template eui` 生成的项目包含以下默认 EXML 皮肤：

| 皮肤              | 组件          | 皮肤部件                                    |
| ----------------- | ------------- | ------------------------------------------- |
| `ButtonSkin`      | Button        | bg, labelDisplay                            |
| `CheckBoxSkin`    | CheckBox      | box, labelDisplay                           |
| `RadioButtonSkin` | RadioButton   | dot, labelDisplay                           |
| `ToggleButtonSkin`| ToggleButton  | bg, labelDisplay                            |
| `ToggleSwitchSkin`| ToggleSwitch  | knob                                        |
| `LabelSkin`       | Label         | labelDisplay                                |
| `ImageSkin`       | Image         | imageDisplay                                |
| `PanelSkin`       | Panel         | titleDisplay, contentGroup                  |
| `ProgressBarSkin` | ProgressBar   | thumb, labelDisplay                         |
| `HSliderSkin`     | HSlider       | track, thumb                                |
| `VSliderSkin`     | VSlider       | track, thumb                                |
| `HScrollBarSkin`  | HScrollBar    | thumb                                       |
| `VScrollBarSkin`  | VScrollBar    | thumb                                       |
| `TextInputSkin`   | TextInput     | textDisplay, promptDisplay                  |
| `ComboBoxSkin`    | ComboBox      | labelDisplay, dropDown, list                |
| `ScrollerSkin`    | Scroller      | viewport, horizontalScrollBar, verticalScrollBar |
| `ListSkin`        | List          | scroller, dataGroup                         |
| `ItemRendererSkin`| ItemRenderer  | labelDisplay                                |
| `TabBarSkin`      | TabBar        | dataGroup                                   |
| `ViewStackSkin`   | ViewStack     | contentGroup                                |
| `GroupSkin`       | Group         | contentGroup                                |

### EUI 项目结构

使用 `--template eui` 创建的项目结构如下：

```
my-app/
├── blakron.config.ts          # 项目配置（含 exml 编译选项）
├── package.json
├── tsconfig.json
├── resource/
│   ├── default.thm.json       # 主题文件：组件名 → 皮肤名映射
│   └── skins/                 # EXML 皮肤目录
│       ├── ButtonSkin.exml
│       ├── CheckBoxSkin.exml
│       ├── ComboBoxSkin.exml
│       ├── ...（共 21 个）
│       └── ViewStackSkin.exml
└── src/
    └── Main.ts                # 入口：class Main extends UILayer
```

## 快速开始

```bash
# 创建标准游戏项目
blakron create my-game
cd my-game && pnpm install
blakron dev

# 创建 EUI 组件项目
blakron create my-app --template eui
cd my-app && pnpm install
blakron build   # 编译 EXML 皮肤
blakron dev     # 启动开发服务器

# 创建最小化项目
blakron create my-lib --template empty
cd my-lib && pnpm install
blakron dev
```
