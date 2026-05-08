# EXML 皮肤 Bundle + 代码拆分策略

## 背景

当前 gjs 策略将皮肤代码内联到 `default.thm.json`，且所有代码打包进单个 `Main.js`。两个问题：

1. **皮肤膨胀** — 几百个皮肤塞进 JSON，文件几 MB
2. **缓存浪费** — 引擎代码和游戏逻辑捆在一起，改一行游戏代码用户重下整个 bundle

## 目标

```
bin-release/
├── blakron.engine.{hash}.js   # 引擎自包含，内容哈希（永久缓存）
├── default.thm.{hash}.js      # 皮肤代码，内容哈希（改皮肤才变）
├── default.thm.{hash}.json    # 皮肤映射表，内容哈希
├── default.res.{hash}.json    # 资源索引，内容哈希
├── main.{hash}.js             # 游戏逻辑，内容哈希
└── index.html                 # 不缓存，引用上述带 hash 的文件
```

## 构建输出对比

| 文件 | 当前（gjs/dev） | 新方案（bundle/release） |
|------|----------------|------------------------|
| `Main.js` | 引擎 + 游戏 + 皮肤 | — |
| `blakron.engine.js` | — | 引擎自包含 |
| `main.js` | — | 游戏逻辑 |
| `default.res.json` | 无 hash | 带 hash |
| `default.thm.json` | 映射 + 皮肤代码 | 仅映射表 |
| `default.thm.js` | — | 皮肤代码（独立） |
| 目录 | `bin-release/{timestamp}/` | `bin-release/`（固定） |

## 实现

### 构建流程（两遍 esbuild）

```
第一遍：引擎独立打包
  src/_generated/engine.ts → blakron.engine.{hash}.js
  自包含，无外部依赖，内容哈希

第二遍：游戏 + 皮肤
  entry: 'main' → config.entry
  entry: 'default.thm' → src/_generated/skins/index.ts
  external: @blakron/core, @blakron/ui, @blakron/game
  → main.{hash}.js, default.thm.{hash}.js
```

### 两遍构建代码

```ts
// compiler.ts — release mode
const hash = '[hash]';

// Pass 1: engine (self-contained, no external deps)
const engineResult = await esbuild.build({
    entryPoints: { 'blakron.engine': engineStubPath },
    outdir: outDir,
    entryNames: `[name].${hash}`,
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    metafile: true,
});

// Pass 2: game + skins (external engine packages)
const appResult = await esbuild.build({
    entryPoints: {
        'main': path.resolve(config.entry),
        'default.thm': skinIndex,
    },
    outdir: outDir,
    entryNames: `[name].${hash}`,
    bundle: true,
    minify: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['@blakron/core', '@blakron/ui', '@blakron/game'],
    metafile: true,
});
```

### 生成 index.html（运行时拼接文件名）

```ts
// 从 metafile 提取实际文件名
function getOutputFiles(result: esbuild.BuildResult): Record<string, string> {
    const files: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.metafile!.outputs)) {
        const name = path.basename(key);
        if (name.startsWith('blakron.engine')) files['engine'] = name;
        else if (name.startsWith('default.thm')) files['thm'] = name;
        else if (name.startsWith('main')) files['main'] = name;
    }
    return files;
}

// template.ts 接收实际文件名
function generateReleaseHtml(config, files: Record<string, string>): string {
    return `...
    <script type="module" src="${files.engine}"></script>
    <script type="module" src="${files.thm}"></script>
    <script type="module" src="${files.main}"></script>
...`;
}
```

### 资源文件 hash

```ts
// 构建完成后，给 res.json 和 thm.json 加 hash
async function hashStaticFile(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
    const hashedPath = filePath.replace(/\.(\w+)$/, `.${hash}.$1`);
    await fs.rename(filePath, hashedPath);
    return hashedPath;
}
```

### 皮肤生成（bundle 策略）

```
resource/skins/*.exml
       │  exml-compiler (format: 'esm')
       ▼
src/_generated/skins/*.ts     ← ESM 皮肤工厂
src/_generated/skins/index.ts ← import 全部 + globalThis 注册
       │  esbuild pass 2
       ▼
bin-release/default.thm.{hash}.js
```

`default.thm.json` 只保留映射表，`exmls` 留空。

### index.html

```html
<script type="module" src="blakron.engine.a1b2c3d4.js"></script>
<script type="module" src="default.thm.e5f6g7h8.js"></script>
<script type="module" src="main.i9j0k1l2.js"></script>
```

## Dev 模式 vs Release 模式

| | Dev | Release |
|---|---|---|
| 输出 | `bin-debug/Main.js`（单文件） | `bin-release/`（多文件 + hash） |
| 皮肤 | gjs 内联到 thm.json | bundle 独立 thm.js |
| splitting | 无 | 两遍构建 |
| 缓存 | 不缓存 | 引擎永久缓存，其余 hash |

## 缓存策略（线上部署）

| 文件 | Cache-Control |
|------|---------------|
| `blakron.engine.{hash}.js` | `max-age=31536000, immutable` |
| `default.thm.{hash}.js` | `max-age=31536000, immutable` |
| `main.{hash}.js` | `max-age=31536000, immutable` |
| `default.*.{hash}.json` | `max-age=31536000, immutable` |
| `index.html` | `no-cache` |

## 迁移

1. 新增 `publishPolicy: 'bundle'`，与 `'gjs'` 并存
2. Theme 保持对 gjs 内联模式的兼容
3. 新项目默认 `'bundle'`，旧项目按需切换
4. `.gitignore` 添加 `src/_generated/`
