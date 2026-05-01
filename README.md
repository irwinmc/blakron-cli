# @blakron/cli

Blakron 游戏引擎的命令行构建工具，替代旧版 Egret CLI。基于 esbuild 实现快速编译打包。

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

| 选项                    | 说明                          | 默认值  |
| ----------------------- | ----------------------------- | ------- |
| `-t, --target <target>` | 构建目标：`html5` \| `wxgame` | `html5` |
| `-m, --minify`          | 压缩输出                      | `false` |
| `--sourcemap`           | 生成 sourcemap                | `false` |

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

| 字段                | 类型                  | 说明                  |
| ------------------- | --------------------- | --------------------- |
| `target`            | `'html5' \| 'wxgame'` | 构建目标平台          |
| `entry`             | `string`              | 入口文件路径          |
| `output.dir`        | `string`              | 输出目录              |
| `stage.width`       | `number`              | 舞台宽度              |
| `stage.height`      | `number`              | 舞台高度              |
| `stage.scaleMode`   | `string`              | 缩放模式              |
| `stage.orientation` | `string`              | 屏幕方向              |
| `stage.frameRate`   | `number`              | 帧率                  |
| `stage.background`  | `string`              | 背景色                |
| `exml`              | `object`              | EXML 编译配置（可选） |

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
