# @blakron/cli 架构文档

> 更新日期：2026-06-06

---

## 一、概述

`@blakron/cli` 是 Blakron 游戏引擎的命令行工具，替代旧 Egret 的 `egret` CLI。

| 维度      | 旧 Egret CLI                              | Blakron CLI                |
| --------- | ----------------------------------------- | -------------------------- |
| CLI 框架  | 手写参数解析                              | commander.js               |
| TS 编译器 | typescript-plus（魔改 tsc）               | esbuild                    |
| 配置文件  | egretProperties.json + index.html data-\* | blakron.config.ts          |
| 构建编排  | publish.js 插件管线                       | BuildPlugin 管线（同思路） |
| 模块系统  | CommonJS                                  | ESM                        |

设计上沿用了 Egret CLI `publish.js` 的核心思路——**可组合的插件管线**：构建过程
被拆成若干具名步骤，依次在共享的上下文上执行。区别在于全程 TypeScript + ESM +
async/await，并以 esbuild 取代魔改版 tsc。

---

## 二、目录结构

```
packages/cli/
├── src/
│   ├── index.ts              # 入口（commander 注册命令）
│   ├── define.ts             # 对外导出配置类型
│   ├── commands/             # 命令层：解析参数 → 组装管线
│   │   ├── build.ts          #   blakron build
│   │   ├── dev.ts            #   blakron dev
│   │   ├── create.ts         #   blakron create <name>
│   │   └── clean.ts          #   blakron clean
│   ├── core/
│   │   ├── config.ts         # 加载并校验 blakron.config
│   │   ├── project.ts        # Project 模型：解析配置 + 绝对路径
│   │   ├── pipeline.ts       # BuildContext / BuildPlugin / runPipeline
│   │   ├── dev-server.ts     # 开发服务器（复用管线 + 文件监听）
│   │   ├── template.ts       # 项目脚手架
│   │   ├── errors.ts         # BuildError / ConfigError
│   │   ├── plugins/          # 构建步骤（每个一个具名插件）
│   │   │   ├── index.ts          #   defaultPlugins() 标准顺序
│   │   │   ├── compile-exml.ts    #   EXML → 主题输出
│   │   │   ├── compile-source.ts  #   esbuild 打包
│   │   │   ├── generate-html.ts   #   生成 index.html
│   │   │   └── copy-assets.ts     #   复制 resource/
│   │   └── exml/             # EXML 解析与代码生成（XML → SkinIR → JS）
│   └── utils/
│       ├── fs.ts             # 文件系统工具
│       └── logger.ts         # 彩色日志输出
└── templates/
    ├── game/                 # 默认游戏模板（含 EXML 皮肤）
    └── empty/                # 最小化模板（纯 @blakron/core）
```

---

## 三、构建管线

构建被建模为 `BuildPlugin[]`，由 `runPipeline()` 依次执行。每个插件读取不可变的
`project` / 选项，并通过 `ctx.outputs` 把结果传递给后续插件。

```
BuildContext { project, sourcemap, analyze, watch, outputs, disposers }

defaultPlugins():
  compile EXML      → 编译 .exml，写入主题文件
  compile source    → esbuild 打包，回填 outputs.entryScript
  generate index.html → 引用 entryScript
  copy assets       → 复制 resource/（跳过主题文件）
```

顺序很关键：`compile source` 在 release 模式下会产出带 hash 的入口名，
`generate index.html` 必须在其后才能引用到正确文件名。

`build` 与 `dev` 命令复用同一组插件，只是 `dev` 额外挂上 HTTP 服务与
`resource/` 监听。

---

## 四、命令说明

### `blakron build [-r|--release] [--sourcemap] [--watch] [--analyze]`

| 模式           | 入口文件         | 输出目录      | 说明                   |
| -------------- | ---------------- | ------------- | ---------------------- |
| development    | `main.js`        | `bin-debug`   | 单文件、不压缩         |
| release (`-r`) | `main.[hash].js` | `bin-release` | 单文件、压缩、内容哈希 |

两种模式都把引擎 + 游戏 + 皮肤打进**一个**可直接在浏览器运行的 ESM bundle，
不存在裸 `@blakron/*` 外部依赖。`resource/` 下文件保持固定名（源码里以硬编码
路径引用），只有入口脚本带 hash。

### `blakron dev [-p|--port <port>] [--sourcemap]`

运行一次构建管线（esbuild watch 持续重编译 `main.js`），并启动静态文件服务器。
`resource/` 下 `.exml` 变更会触发主题重编译。浏览器不自动刷新，手动刷新即可。

### `blakron create <name> [--template game|empty]`

从 `templates/<template>/` 复制到 `./<name>/`，并写入 `package.json` 的 `name`。

### `blakron clean`

删除 `bin-debug` 与 `bin-release`。

---

## 五、配置文件

`blakron.config.ts` 替代旧的 `egretProperties.json` + `index.html data-*`：

```typescript
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
	// 可选：EXML 配置
	exml: {
		publishPolicy: 'gjs', // path | content | gjs | json
		themeFile: 'resource/default.thm.json',
	},
};
```

所有字段均有默认值，可整体省略。

---

## 六、EXML 编译策略

`config.exml.publishPolicy` 控制 EXML 文件如何写入主题文件：

| 策略      | 主题文件中的 `exmls`       | 说明                   |
| --------- | -------------------------- | ---------------------- |
| `path`    | 皮肤文件路径列表           | 运行时动态加载         |
| `json`    | 同 `path`                  | 别名                   |
| `content` | 内嵌原始 EXML 文本         | 无需额外请求           |
| `gjs`     | 内嵌生成的 JS 工厂（IIFE） | 运行时性能最好（默认） |

EXML 解析与代码生成位于 `core/exml/`，管线（`xml-parser → exml-parser →
codegen`）独立于 CLI，可单独测试。
