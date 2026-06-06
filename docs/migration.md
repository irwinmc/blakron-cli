# 从 Egret 迁移到 Blakron

本指南帮助 Egret 项目迁移到 Blakron CLI。

---

## 一、命令对照

| Egret                 | Blakron                   | 说明                 |
| --------------------- | ------------------------- | -------------------- |
| `egret create <name>` | `blakron create <name>`   | 创建新项目           |
| `egret build`         | `blakron build`           | 开发模式编译         |
| `egret build -e`      | `blakron build --release` | 生产模式打包压缩     |
| `egret startserver`   | `blakron dev`             | 开发服务器           |
| `egret clean`         | `blakron clean`           | 清理输出目录         |
| `egret publish`       | `blakron build --release` | 合并为单文件打包     |
| `egret run`           | `blakron dev`             | 已替代               |
| `egret upgrade`       | `pnpm update`             | 通过包管理器管理版本 |

### 新增选项

| 选项          | 命令             | 说明                            |
| ------------- | ---------------- | ------------------------------- |
| `--watch`     | `blakron build`  | 文件变更自动重编译              |
| `--analyze`   | `blakron build`  | 输出 bundle 体积分析            |
| `--sourcemap` | `blakron build`  | 生成 sourcemap                  |
| `-p, --port`  | `blakron dev`    | 指定开发服务器端口（默认 3000） |
| `--sourcemap` | `blakron dev`    | 生成 sourcemap                  |
| `--template`  | `blakron create` | 项目模板：`game` \| `empty`     |

---

## 二、配置文件迁移

Egret 使用 `egretProperties.json` + `index.html` 中的 `data-*` 属性分两处配置。Blakron 合并为单个 `blakron.config.ts`。

### Egret（旧）

**egretProperties.json：**

```json
{
	"engineVersion": "5.4.x",
	"modules": [{ "name": "egret" }, { "name": "eui" }, { "name": "tween" }],
	"target": { "current": "web" }
}
```

**index.html：**

```html
<canvas
	id="gameCanvas"
	data-orientation="auto"
	data-scale-mode="showAll"
	data-frame-rate="60"
	data-content-width="640"
	data-content-height="1136"
></canvas>
```

### Blakron（新）

**blakron.config.ts：**

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
	// 可选：EXML 皮肤编译
	exml: {
		publishPolicy: 'gjs',
		themeFile: 'resource/default.thm.json',
	},
};
```

### 字段对照

| Egret                 | Blakron              | 说明                |
| --------------------- | -------------------- | ------------------- |
| `modules`             | `package.json` 依赖  | 模块改为 npm 包管理 |
| `target.current`      | `target`             | 目前仅支持 `html5`  |
| —                     | `entry`              | 默认 `src/Main.ts`  |
| `data-content-width`  | `stage.width`        | 舞台宽度            |
| `data-content-height` | `stage.height`       | 舞台高度            |
| `data-scale-mode`     | `stage.scaleMode`    | 缩放模式            |
| `data-orientation`    | `stage.orientation`  | 屏幕方向            |
| `data-frame-rate`     | `stage.frameRate`    | 帧率                |
| —                     | `stage.background`   | 背景色              |
| —                     | `output.dir`         | 输出目录            |
| —                     | `exml.publishPolicy` | EXML 输出策略       |
| —                     | `exml.themeFile`     | 主题文件路径        |

---

## 三、模块系统

Egret 使用 CommonJS + 自定义模块加载器，Blakron 使用标准 ESM：

| 变化      | Egret                       | Blakron         |
| --------- | --------------------------- | --------------- |
| 模块系统  | CommonJS                    | ESM             |
| 包管理    | egret 内置模块              | npm / pnpm      |
| 导入方式  | `require()` / 全局变量      | `import` 语句   |
| TS 编译器 | typescript-plus（魔改 tsc） | esbuild（标准） |

### 包名对照

| Egret 模块 | Blakron 包      | 说明                            |
| ---------- | --------------- | ------------------------------- |
| `egret`    | `@blakron/core` | 核心引擎：Sprite、TextField 等  |
| `eui`      | `@blakron/ui`   | UI 组件：Button、Panel、Skin 等 |
| `tween`    | `@blakron/game` | Tween / Ease 动画               |

### 导入示例

```ts
// Egret（旧）
class Main extends egret.Sprite { ... }

// Blakron（新）
import { Sprite } from '@blakron/core';
class Main extends Sprite { ... }
```

---

## 四、EXML 皮肤迁移

EXML 文件格式完全兼容，无需修改。但编译方式和输出格式有变化：

| 维度     | Egret                   | Blakron                                     |
| -------- | ----------------------- | ------------------------------------------- |
| 编译器   | 内嵌在 `tools/lib/eui/` | CLI 内置编译管线                            |
| 编译时机 | `egret build` 时编译    | `blakron build` 时自动编译                  |
| 输出策略 | 固定格式                | 可配置：`path` / `content` / `gjs` / `json` |
| 命名空间 | `eui:*` / `egret:*`     | 相同，兼容                                  |

EXML 中的命名空间前缀会自动映射到对应的 Blakron 包：

- `eui:*` → `@blakron/ui`
- `egret:*` → `@blakron/core`

### 迁移步骤

1. 将 `.exml` 文件放到 `resource/` 目录下（如 `resource/skins/`）
2. 将主题 JSON 文件放到 `resource/` 目录（如 `resource/default.thm.json`）
3. 在 `blakron.config.ts` 中启用 EXML 编译：

```ts
export default {
	// ...其他配置
	exml: {
		publishPolicy: 'gjs', // 推荐：编译为 JS，性能最好
		themeFile: 'resource/default.thm.json',
	},
};
```

4. 运行 `blakron build`，EXML 文件会自动编译

### 输入格式兼容（重要）

资源类输入文件**沿用 Egret 原格式**，可直接平移，无需改写：

| 文件               | 兼容说明                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `default.res.json` | 完全兼容：`groups[].keys` / `resources[].{name,type,url,subkeys}` 原样解析                        |
| `.exml`            | 完全兼容：任意命名空间前缀（`e:` / `eui:` / `w:`）+ `http://ns.egret.com/eui`，按标签名解析       |
| `default.thm.json` | 兼容 Egret 写法：`skins` 值可为皮肤**路径**，支持 `autoGenerateExmlsList`，`exmls` 可为根相对路径 |

`default.thm.json` 既接受 Egret 原格式，也接受 Blakron 简写：

```jsonc
// Egret 原格式（路径值 + 显式 exmls 列表）——可直接使用
{
	"skins": { "eui.Button": "resource/eui_skins/ButtonSkin.exml" },
	"autoGenerateExmlsList": false,
	"exmls": ["resource/eui_skins/ButtonSkin.exml"]
}

// Blakron 简写（类名值 + 自动扫描）——亦可
{
	"skins": { "eui.Button": "skins.ButtonSkin" },
	"exmls": []
}
```

**输出可以不同**：构建后写入 `bin-debug/` 的 `default.thm.json` 会把 `skins` 路径值
统一解析为皮肤类名，并按 `publishPolicy`（默认 `gjs`）内嵌皮肤工厂代码，供运行时
直接加载。源文件无需改动。

---

## 五、项目结构对照

### Egret（旧）

```
my-project/
├── egretProperties.json
├── index.html
├── tsconfig.json
├── bin-debug/
└── src/
    └── Main.ts
```

### Blakron（新）

```
my-project/
├── blakron.config.ts        # 替代 egretProperties.json + index.html 配置
├── package.json             # 依赖管理（新增）
├── tsconfig.json
├── bin-debug/               # blakron build 自动生成
├── resource/                # 资源文件（可选）
│   └── default.res.json     # 资源配置
└── src/
    └── Main.ts
```

### 建议的迁移流程

1. **创建新项目**：`blakron create my-project`
2. **迁移源码**：将旧 `src/` 下的代码复制到新项目
3. **迁移配置**：将 `egretProperties.json` 和 `index.html` 中的配置转为 `blakron.config.ts`
4. **迁移 EXML**：将皮肤文件放到 `resource/skins/`，主题 JSON 放到 `resource/`
5. **更新导入**：将 `egret.xxx` 替换为对应的 `@blakron/*` 导入
6. **安装依赖**：`pnpm install`
7. **构建测试**：`blakron dev` 启动开发服务器验证

---

## 六、不再需要的功能

| Egret 功能           | 说明                                  |
| -------------------- | ------------------------------------- |
| `egret publish`      | 使用 `blakron build --release`        |
| native 平台编译      | Blakron 仅支持 Web                    |
| `manifest.json` 生成 | ESM 直接 import，无需清单             |
| RES 资源管理器       | 由 `@blakron/core` 的 `Resource` 替代 |
| `typescript-plus`    | 使用标准 esbuild 编译                 |
