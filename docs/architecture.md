# @blakron/cli 架构文档

> 版本：0.1.0 | 更新日期：2026-05-01

---

## 一、概述

`@blakron/cli` 是 Blakron 游戏引擎的命令行工具，替代旧 Egret 的 `egret` CLI。

| 维度      | 旧 Egret CLI                              | Blakron CLI                           |
| --------- | ----------------------------------------- | ------------------------------------- |
| CLI 框架  | 手写参数解析                              | commander.js                          |
| TS 编译器 | typescript-plus（魔改 tsc）               | esbuild                               |
| 配置文件  | egretProperties.json + index.html data-\* | blakron.config.ts                     |
| EXML 编译 | 内嵌在 tools/lib/eui/                     | 独立包 @blakron/exml-parser（待实现） |
| 模块系统  | CommonJS                                  | ESM                                   |

---

## 二、目录结构

```
packages/cli/
├── src/
│   ├── index.ts              # 入口（commander.js 注册命令）
│   ├── define.ts             # 对外导出 defineConfig + 类型
│   ├── commands/
│   │   ├── build.ts          # blakron build
│   │   ├── create.ts         # blakron create <name>
│   │   └── clean.ts          # blakron clean
│   ├── core/
│   │   ├── config.ts         # 配置加载与类型定义
│   │   ├── compiler.ts       # esbuild 编译封装
│   │   ├── exml-compiler.ts  # EXML 编译（当前为 stub）
│   │   ├── template.ts       # 模板生成与资源复制
│   │   └── errors.ts         # BuildError / ConfigError
│   └── utils/
│       ├── fs.ts             # 文件系统工具
│       └── logger.ts         # 彩色日志输出
├── templates/
│   └── game/                 # 默认游戏项目模板
│       ├── blakron.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/Main.ts
└── test-game/                # 本地测试用游戏项目
```

---

## 三、命令说明

### `blakron build`

```
blakron build [options]
  -t, --target <target>   构建目标: html5 | wxgame  (默认: html5)
  -m, --minify            打包并压缩输出
  --sourcemap             生成 sourcemap
```

**构建流程**：

```
loadConfig()
  → compileExml()        # 仅当 config.exml 存在时
  → compile()            # esbuild 编译 TypeScript
  → applyTarget()        # 生成 index.html (html5) 或 game.js+game.json (wxgame)
  → copyProjectAssets()  # 复制 resource/ 目录
```

**两种编译模式**：

| 模式     | 触发条件          | 行为                            |
| -------- | ----------------- | ------------------------------- |
| 开发模式 | `--minify` 未设置 | 转译保留文件结构，输出到 outDir |
| 生产模式 | `--minify`        | 单文件打包 → `main.js`          |

**目标平台差异**：

| 目标   | JS 格式 | ES 版本 | 平台    | 入口文件            |
| ------ | ------- | ------- | ------- | ------------------- |
| html5  | ESM     | ES2022  | browser | index.html          |
| wxgame | CJS     | ES2017  | node    | game.js + game.json |

---

### `blakron create <name>`

```
blakron create <name> [options]
  --template <template>   模板: game | eui | empty  (默认: game)
```

从 `templates/<template>/` 复制到 `./<name>/`，并将 `package.json` 的 `name` 字段替换为项目名。

---

### `blakron clean`

删除 `config.output.dir`（默认 `bin-debug/`）。

---

## 四、配置文件

`blakron.config.ts` 替代旧的 `egretProperties.json` + `index.html data-*`：

```typescript
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
	// 可选：EXML 配置
	exml: {
		publishPolicy: 'gjs', // path | content | gjs | json
		themeFile: 'resource/default.thm.json',
	},
});
```

**默认值**（所有字段均可省略）：

| 字段                | 默认值          |
| ------------------- | --------------- |
| `target`            | `'html5'`       |
| `entry`             | `'src/Main.ts'` |
| `output.dir`        | `'bin-debug'`   |
| `stage.width`       | `640`           |
| `stage.height`      | `1136`          |
| `stage.scaleMode`   | `'showAll'`     |
| `stage.orientation` | `'auto'`        |
| `stage.frameRate`   | `60`            |
| `stage.background`  | `'#000000'`     |

---

## 五、EXML 编译策略

`config.exml.publishPolicy` 控制 EXML 文件的输出方式：

| 策略      | 输出                           | 说明                   |
| --------- | ------------------------------ | ---------------------- |
| `path`    | JSON，exmls 为路径列表         | 运行时动态加载         |
| `content` | JSON，exmls 含完整文件内容     | 内嵌内容，无需额外请求 |
| `gjs`     | `.thm.js`，含 generateEUI 对象 | 编译为 JS，性能最好    |
| `json`    | 同 path                        | 别名                   |

**当前状态**：`gjs` 策略的核心转换函数 `exmlToGjs()` 是最小化 stub，等待 `@blakron/exml-parser` 实现后替换。

---

## 六、模板系统

当前只有 `game` 模板。`create` 命令支持 `--template eui` 和 `--template empty`，但对应目录尚未创建。

**game 模板内容**：

```
templates/game/
├── blakron.config.ts   # 标准配置
├── package.json      # 依赖 @blakron/cli (workspace:*)
├── tsconfig.json     # ES2022，路径别名
└── src/
    └── Main.ts       # 最小化入口类
```
