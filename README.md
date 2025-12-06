# Live2D 控制与集成说明

本仓库提供了可在浏览器/Electron 中复用的 Live2D 初始化与控制入口，只需两个函数：

- `initLive2d({ canvasId, characterConfigs, persist, enablePanel })`：初始化到指定 canvas。
- 控制器方法：`act/actAll/setMode/playVoice/playVoiceAll/list`。

## 快速开始

1. 静态资源
   - 将模型放在 `public/live2d/`，核心脚本 `public/Core/live2dcubismcore.js`。
   - 将 NL 词表放在 `public/nl/`，命名 `${id}_nl_map.json`，例如 `hiyori_nl_map.json`。
2. 页面
   ```html
   <canvas id="canvas"></canvas>
   <script src="/Core/live2dcubismcore.js"></script>
   <script type="module">
     import { initLive2d } from '/src/main.js';
     const controller = await initLive2d({
       canvasId: 'canvas',
       characterConfigs: [
         { id: 'hiyori', modelJsonUrl: '/live2d/hiyori/hiyori_pro_t11.model3.json', scale: 0.32, position: { xRatio: 0.3, yRatio: 0.95 } },
         { id: 'mao', modelJsonUrl: '/live2d/mao/mao_pro.model3.json', scale: 0.42, position: { xRatio: 0.7, yRatio: 0.97 } },
       ],
       persist: true,   // 允许覆盖 NL 映射（localStorage）
       enablePanel: true, // 调试面板
     });
   </script>
   ```
   - 如仅需要默认配置且页面已有 `<canvas id="canvas">`，不调用也会自动初始化（可设置 `window.LIVE2D_AUTO_INIT = false` 关闭）。

## 控制器 API

```js
const ctl = await initLive2d({ canvasId: 'live2d-canvas' });

ctl.setMode('hiyori', 2);         // 1: 手动索引，2: 自然语言
ctl.act('hiyori', '挥手');        // 自然语言触发
ctl.act('mao', { type: 'motion', index: 3 }); // 手动索引

ctl.playVoice('hiyori', '/audios/hello.mp3'); // 播放并口型同步
ctl.playVoiceAll('/audios/broadcast.mp3');    // 所有角色口型

ctl.list(); // [{id, mode, hasLipSync}, ...]
```

## Electron 集成要点
- 在渲染进程中引入本模块，确保资源路径在 `file://` 下可访问（可使用 `new URL('./live2d/...', import.meta.url)`）。
- 只要提供 `canvasId` 和模型配置即可；其它逻辑与浏览器相同。

## 调试面板
- 默认开启，右下角浮层可切换角色、模式（手动/自然语言）、执行动作、绑定短语、导出 NL JSON。
- 关闭：`initLive2d({ enablePanel: false })`。

## 词表策略
- 固定只读：`persist: false`，完全依赖 `public/nl/${id}_nl_map.json`。
- 可覆盖：`persist: true`，用户绑定的自然语言存入 localStorage，优先级高于内置表。
