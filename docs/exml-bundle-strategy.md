# EXML 皮肤 Bundle + 代码拆分策略

## 背景

当前 gjs 策略将皮肤代码内联到 `default.thm.json`，且所有代码打包进单个 `Main.js`。两个问题：

1. **皮肤膨胀** — 几百个皮肤塞进 JSON，文件几 MB
2. **缓存浪费** — 引擎代码和游戏逻辑捆在一起，改一行游戏代码用户重下整个 bundle

## 目标

```
blakron.engine.js     ← core + ui + game，版本更新才变（永久缓存）
main.js               ← 游戏逻辑 + 皮肤 import，每次发版更新
default.res.json      ← 资源索引，加资源才变
default.thm.json      ← 皮肤映射表（几 KB），加皮肤才变
default.thm.js        ← 皮肤代码（独立 chunk），改皮肤才变
```

## 构建输出对比

| 文件 | 当前（gjs） | 新方案 |
|------|-----------|--------|
| `Main.js` | 引擎 + 游戏 + 皮肤 | — |
| `blakron.engine.js` | — | core + ui + game |
| `main.js` | — | 游戏逻辑 |
| `default.res.json` | ✅ | ✅ |
| `default.thm.json` | 映射 + 皮肤代码 | 仅映射表（几 KB） |
| `default.thm.js` | — | 皮肤代码（独立 chunk） |

## 实现

### 1. esbuild 代码拆分

```ts
// build.ts — minify/release 模式
await esbuild.build({
    entryPoints: {
        'blakron.engine': [],  // 引擎入口（预定义 vendor 列表）
        'main': config.entry,  // 游戏入口
        'default.thm': 'src/_generated/skins/index.ts',  // 皮肤入口
    },
    outdir: outDir,
    bundle: true,
    minify: true,
    splitting: true,          // ESM 代码拆分
    format: 'esm',
});
```

### 2. index.html

```html
<script type="module" src="blakron.engine.js"></script>
<script type="module" src="default.thm.js"></script>
<script type="module" src="main.js"></script>
```

### 3. 皮肤生成（bundle 策略）

```
resource/skins/*.exml
       │  exml-compiler
       ▼
src/_generated/skins/*.ts     ← ESM 皮肤工厂
src/_generated/skins/index.ts ← import 全部 + globalThis 注册
       │  esbuild
       ▼
bin-debug/default.thm.js     ← 独立 chunk
```

`default.thm.json` 只保留映射表，`exmls` 留空。

### 4. Dev 模式

Dev 模式下不拆分，全部 bundle 进一个文件（保持热更新简单）。

### 5. Theme 兼容

```ts
// Theme._onConfigLoaded
if (data.exmls?.length > 0 && data.exmls[0]['gjs']) {
    this._loadGjsSkins(data.exmls);  // 兼容旧 gjs 模式
}
// 新 bundle 模式：exmls 为空，皮肤已在 default.thm.js 中注册到 globalThis
```

## 配置

```ts
// blakron.config.ts
export default {
    exml: {
        publishPolicy: 'bundle',     // 'gjs' | 'bundle'
        themeFile: 'resource/default.thm.json',
    },
};
```

## 缓存策略（线上部署）

| 文件 | 缓存 | URL 示例 |
|------|------|---------|
| `blakron.engine.js` | `Cache-Control: max-age=31536000` | `/v0.6.0/blakron.engine.js` |
| `main.js` | `no-cache` 或带 hash | `/main.{hash}.js` |
| `default.res.json` | 带 hash | `/default.res.{hash}.json` |
| `default.thm.json` | 带 hash | `/default.thm.{hash}.json` |
| `default.thm.js` | 带 hash | `/default.thm.{hash}.js` |

引擎文件放版本号目录下，用户升级引擎版本后才重新下载。

## 迁移

1. 新增 `publishPolicy: 'bundle'`，与 `'gjs'` 并存
2. Theme 保持对 gjs 内联模式的兼容
3. 新项目默认 `'bundle'`，旧项目按需切换
4. `.gitignore` 添加 `src/_generated/`
