# Live2D 控制与集成说明（基于 pixi-live2d-display-lipsyncpatch）

本仓库提供一个简洁的初始化入口和控制器，支持：
- 动作/表情（`act`/`actAll`）；
- 动作+音频+口型同步（`actWithAudio`/`actAllWithAudio`，通过 motion 的 `sound` 选项驱动口型）；
- 自然语言/手动模式映射（`mapping.js`）；
- 调试面板（Panel Dev）。

## 快速开始（浏览器）
1. 资源放置  
   - 模型：`public/live2d/`，核心脚本：`public/Core/live2dcubismcore.js`。  
   - 自然语言词表：`public/nl/${id}_nl_map.json`（可选，作为初始映射）。  
2. 页面引用  
   ```html
   <canvas id="canvas"></canvas>
   <script src="/Core/live2dcubismcore.js"></script>
   <script type="module">
     import { initLive2d } from '/src/main.js';
     const ctl = await initLive2d({
       canvasId: 'canvas',
       characterConfigs: [
         { id: 'hiyori', modelJsonUrl: '/live2d/hiyori/hiyori_pro_t11.model3.json', scale: 0.32, position: { xRatio: 0.3, yRatio: 0.95 } },
         { id: 'mao', modelJsonUrl: '/live2d/mao/mao_pro.model3.json', scale: 0.42, position: { xRatio: 0.7, yRatio: 0.97 } },
       ],
       persist: true,     // 允许用户在 localStorage 覆盖 NL 映射
       enablePanel: true, // 调试面板
     });

// 纯动作/表情
ctl.act('hiyori', '挥手');
// 动作+音频+口型+表情（sound 通过 motion 传入；expression 支持索引或表情名）
ctl.actWithAudio('hiyori', '挥手', '/audios/hello.mp3', {
  volume: 1,
  crossOrigin: 'anonymous',
  expression: 0,
  resetExpression: true,
});
   </script>
   ```
   - 如果页面已有 `<canvas id="canvas">`，默认会自动初始化；如需关闭自动初始化：`window.LIVE2D_AUTO_INIT = false`。

## 控制器 API（`initLive2d` 返回值）
- `act(id, input, extra?)` / `actAll(input, extra?)`：触发表情或动作。`input` 可为自然语言或 `{ type:'motion'|'expression', index }` 等；`extra` 可包含 `priority` 等。
- `actWithAudio(id, input, soundUrl, extra?)` / `actAllWithAudio(...)`：动作+音频+口型，`sound` 通过 motion 选项传递，`extra` 支持 `volume/expression/resetExpression/crossOrigin/onFinish/onError` 等。
- `setMode(id, mode)`：1 手动（索引），2 自然语言。
- `list()`：返回角色列表及当前模式。
- `stopMotions(id)`：停止指定角色的动作。

> 说明：独立 `speak` 已移除，统一通过 `motion` 的 `sound` 选项实现口型同步。

## 调试面板（Panel Dev）
- 右下角浮层（默认开启，可 `initLive2d({ enablePanel:false })` 关闭）：
  - 选择角色；
  - 切换模式（手动/自然语言）；
  - 输入命令运行：`play key5` / `play M5` / `play E3`；
  - 打印列表（动作/表情/NL 映射）；
  - 绑定自然语言标签到最近一次动作/表情；
  - 导出 NL 映射 JSON（下载 `${id}_nl_map.json`）。
- 提示：在自然语言模式下可直接输入中文指令并点击 Run。

## 自然语言映射（mapping.js）
- 初始映射：从 `public/nl/${id}_nl_map.json` 读取。
- `persist: true`：用户绑定的 NL 标签会写入 localStorage，覆盖默认映射；`persist: false` 则只读。
- `setMode(1|2)`：1 手动索引解析，2 自然语言解析。
- `bindPhrases` / `exportNLMapJson`：面板会使用。

## Electron 提示
- 在渲染进程中引入，资源路径确保可通过 `file://` 访问（可用 `new URL('./live2d/...', import.meta.url)`）。
- 其它用法与浏览器一致。

## 最简演示（自动触发）
`public/test.js` 作为文档示例，点击按钮或加载后自动：
```js
import { initLive2d } from '/src/main.js';
const ctl = await initLive2d();
['hiyori','mao'].forEach(id => ctl.setMode(id, 2));
['hiyori','mao'].forEach(id =>
  ctl.actWithAudio(id, '打气', '/your/audio.mp3', {
    volume: 1,
    crossOrigin: 'anonymous',
    expression: 0,
    resetExpression: true,
  })
);
```
如浏览器阻拦自动播放，请先点击页面任意位置解锁音频。

## 可爱对话框封装
`src/dialog-api.js` 提供一键对话：文字 + 动作/表情 + 可选音频/口型 + 头顶漫画风气泡。
```js
import { initLive2dWithDialogue } from '/src/dialog-api.js';
const { say } = await initLive2dWithDialogue();

await say({
  id: 'hiyori',
  text: '你好，世界！',
  audioUrl: '/audios/hello.mp3',   // 可选，缺省则只有文字
  motion: '挥手',                 // 可选，缺省用 text 解析
  expression: 0,                  // 可选，索引或表情名
  crossOrigin: 'anonymous',
});
```
气泡跟随角色头顶，按文本/音频估算时长后自动隐藏；动作/表情解析失败会回退到默认动作/表情。
