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
│   │   │   ├── compile-engine.ts  #   @blakron/* → js/ 独立 chunk
│   │   │   ├── compile-source.ts  #   esbuild 打包用户源码
│   │   │   ├── generate-html.ts   #   生成 index.html（含 import map）
│   │   │   ├── manifest.ts        #   release 写 manifest.json
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
  compile engine    → 每个 @blakron/* 包打成 js/blakron.<name>.js 独立 chunk
  compile source    → esbuild 打包用户源码，回填 outputs.entryScript
  generate index.html → import map(引擎) + 入口脚本
  write manifest.json → 仅 release：{ initial:[引擎], game:[main] }
  copy assets       → 复制 resource/（跳过主题文件）
```

引擎包与源码互为外部依赖（`external`），引擎只在自己的 chunk 里出现一次，靠 HTML
import map 把裸 `@blakron/*` 解析到对应 chunk——既对齐 Egret 的拆分模块布局，又保持
ESM / npm 路线，引擎代码不会重复进 app bundle。

`build` 与 `dev` 命令复用同一组插件，只是 `dev` 额外挂上 HTTP 服务与
`resource/` 监听。

---

## 四、产物结构（对齐 Egret 形状）

**development（`bin-debug/`）—— 逐文件、保留目录**

```
bin-debug/
├── index.html              # import map + <script type=module src=Main.js>
├── Main.js                 # src/Main.ts，保留目录结构
├── com/akakata/LoadingUI.js
├── js/                     # 引擎 chunk（external 互引）
│   ├── blakron.core.js
│   ├── blakron.ui.js
│   └── blakron.game.js
└── resource/...            # 资源树 + default.thm.json（内嵌 gjs）
```

**release（`bin-release/web/<timestamp>/`）—— 压缩、hash、manifest**

```
bin-release/web/260607010725/
├── index.html
├── manifest.json           # { initial:[引擎 chunk...], game:[main] }
├── js/
│   ├── blakron.core.min_<hash>.js
│   ├── blakron.ui.min_<hash>.js
│   ├── blakron.game.min_<hash>.js
│   └── main.min_<hash>.js  # 用户源码合并压缩
└── resource/...
```

与 Egret 的差异：脚本是 ESM module（非经典全局脚本），启动用用户代码里的
`createPlayer()`（非 `data-entry-class` 自举），皮肤内嵌在 `default.thm.json`
（运行时由 `Theme` 加载，不单独出 `default.thm.js`）。`resource/`、`default.res.json`、
`default.thm.json` 保持固定名（被源码硬编码路径引用），不加 hash。

---

## 五、命令说明

### `blakron build [-r|--release] [--sourcemap] [--watch] [--analyze]`

| 模式           | 产物布局                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| development    | `bin-debug/`：逐文件 `.js` + `js/` 引擎 chunk                                          |
| release (`-r`) | `bin-release/web/<timestamp>/`：`js/main.min_<hash>.js` + 引擎 chunk + `manifest.json` |

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
