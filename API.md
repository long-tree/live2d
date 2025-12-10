# say_enhanced 使用说明与 Electron 集成指南

## say_enhanced 快速用法

```js
import { initLive2dWithDialogue } from "/src/dialog-api.js";

const { sayEnhanced } = await initLive2dWithDialogue();

await sayEnhanced({
  id: "mao",                         // 角色 id（例如 mao/hiyori）
  text: "(脸红) 本魔女只告诉Baobab...", // 带括号的文本，首个括号内容用于 NL 映射
  audioUrl: "https://example.com/a.mp3", // 可选音频，驱动口型
  charsPerSec: 8,
  fontSize: 13,
  maxLines: 3,
  maxCharsPerLine: 10,
  debug: true,                       // 控制台打印最终传给 say 的 payload
});
```


## 测试面板
- 路径：`public/test2.js`（浏览器侧浮层）。
- 运行：`npm install` → `npx vite --host` → 打开 `http://localhost:5173/`，左下角面板输入括号文本和音频 URL 后点击“调用 sayEnhanced”。
- 已关闭左右调试面板，`initLive2dWithDialogue` 在测试面板中传了 `enablePanel: false`。

## 整合到 Electron 项目

### 目录与打包建议
- 保持现有前端源码结构（`src/*`, `public/*`），将其作为 Electron 的 renderer 前端。
- 使用 Vite 继续产出静态资源，Electron 主进程通过 `loadURL` 或 `loadFile` 加载打包后的页面。

### 步骤示例
1. **引入依赖**：在 Electron 项目的前端部分复用当前 `package.json` 的依赖（`pixi-live2d-display-lipsyncpatch`, `@pixi/events`, `vite` 等）。主进程仍用 Electron 依赖，不冲突。
2. **构建 renderer**：
   - 开发：`npx vite --host --port 5173`，主进程 `win.loadURL("http://localhost:5173")`。
   - 生产：`npx vite build`，产物在 `dist/`，主进程 `win.loadFile("dist/index.html")`。
3. **静态资源**：将 `public/live2d/*`、`public/nl/*` 保持原路径，Vite 构建时会拷贝到 `dist/`，Electron 需允许访问这些静态文件。
4. **跨域与音频**：在 Electron 环境中音频加载通常无 CORS 限制，但如果使用在线音频，保持 `crossOrigin: "anonymous"` 以兼容浏览器环境；本地文件可用 `file://` 或打包内资源。
5. **自动初始化**：`initLive2dWithDialogue` 会在 `index.html` 的 renderer 侧自动运行（除非设置 `window.LIVE2D_AUTO_INIT = false`）。你可以在 renderer 中直接导入 `{ sayEnhanced }` 调用，逻辑与浏览器一致。

### 主进程示例（简化）
```js
import { app, BrowserWindow } from "electron";
import path from "node:path";

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (process.env.VITE_DEV_SERVER) {
    await win.loadURL(process.env.VITE_DEV_SERVER);
  } else {
    await win.loadFile(path.join(__dirname, "dist/index.html"));
  }
}

app.whenReady().then(createWindow);
```

### Renderer 调用示例（与浏览器一致）
```js
// renderer.js
import { initLive2dWithDialogue } from "./src/dialog-api.js";

const { sayEnhanced } = await initLive2dWithDialogue({ enablePanel: false });
await sayEnhanced({ id: "hiyori", text: "(害羞) 我来了～", audioUrl: "file:///..." });
```

## 相关文件索引
- `src/dialog-api.js`: 暴露 `say` / `sayEnhanced`，气泡展示、speak 回退逻辑。
- `src/say-enhanced-helpers.mjs`: 括号解析、NL 映射、payload 组装。
- `public/nl/*.json`: NL 映射表。
- `public/test2.js`: 浏览器测试面板（已关闭 panel-dev）。
- `index.html`: 入口，加载 live2d、测试面板。
