# @blakron/cli

Blakron 游戏引擎的命令行构建工具，替代旧版 Egret CLI。基于 esbuild 实现快速编译打包，内置 EXML 皮肤文件解析与编译。

## 安装

```bash
pnpm add -D @blakron/cli
```

安装后可通过 `blakron` 命令使用。

## 命令

### `blakron build`

编译并打包项目。

```bash
blakron build [options]
```

| 选项           | 说明           | 默认值  |
| -------------- | -------------- | ------- |
| `-m, --minify` | 压缩输出       | `false` |
| `--sourcemap`  | 生成 sourcemap | `false` |

### `blakron dev`

启动开发服务器，支持 live reload。

```bash
blakron dev [options]
```

| 选项                | 说明           | 默认值  |
| ------------------- | -------------- | ------- |
| `-p, --port <port>` | 监听端口       | `3000`  |
| `--sourcemap`       | 生成 sourcemap | `false` |

### `blakron create`

从模板创建新项目。

```bash
blakron create <name> [options]
```

| 选项                    | 说明                        | 默认值 |
| ----------------------- | --------------------------- | ------ |
| `--template <template>` | 项目模板：`game` \| `empty` | `game` |

### `blakron clean`

删除构建输出目录。

```bash
blakron clean
```

## 内置 EXML 编译器

CLI 内置了 EXML 皮肤文件的解析器和代码生成器（原 `@blakron/exml-parser` 已合并），在构建时自动将 `.exml` 文件编译为 JavaScript 模块。

### 功能特性

- **XML 解析**：解析 EXML（基于 XML 的皮肤描述格式）
- **AST / IR 生成**：转换为中间表示（SkinIR）
- **代码生成**：输出 ESM 兼容的 JavaScript 工厂函数
- **组件注册表**：内置 `eui:*` / `egret:*` 命名空间映射
- **状态支持**：解析皮肤状态定义和状态属性覆盖
- **百分比布局**：自动识别 `100%` 并转换为 `percentWidth` / `percentHeight`
- **数据绑定**：解析 `{expression}` 绑定语法

### EXML 配置

在 `blakron.config.ts` 中配置 EXML 编译：

```ts
export default defineConfig({
	// ...其他配置
	exml: {
		// EXML 编译选项（可选）
	},
});
```

## 配置文件

项目根目录创建 `blakron.config.ts`：

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

### 配置项

| 字段                | 类型      | 说明                  |
| ------------------- | --------- | --------------------- |
| `target`            | `'html5'` | 构建目标平台          |
| `entry`             | `string`  | 入口文件路径          |
| `output.dir`        | `string`  | 输出目录              |
| `stage.width`       | `number`  | 舞台宽度              |
| `stage.height`      | `number`  | 舞台高度              |
| `stage.scaleMode`   | `string`  | 缩放模式              |
| `stage.orientation` | `string`  | 屏幕方向              |
| `stage.frameRate`   | `number`  | 帧率                  |
| `stage.background`  | `string`  | 背景色                |
| `exml`              | `object`  | EXML 编译配置（可选） |

## 快速开始

```bash
# 创建项目
blakron create my-game

# 进入项目
cd my-game
pnpm install

# 开发
blakron dev

# 构建
blakron build
```
