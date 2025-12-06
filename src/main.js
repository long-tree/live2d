import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { initLipSync } from './lipsync.js';
import { initMapping } from "./mapping.js";
import { createActionController } from "./action.js";

window.PIXI = PIXI;

(async function () {
  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });
  const modelJsonUrl='/live2d/hiyori/hiyori_pro_t11.model3.json';
  const model = await Live2DModel.from(modelJsonUrl, {
    autoInteract: false
  });

  if (model._onPointerMove) {
    window.removeEventListener('pointermove', model._onPointerMove);
  }

  app.stage.addChild(model);

  model.anchor.set(0.5, 0.5);

  const modelBaseWidth = model.width;
  const modelBaseHeight = model.height;

  function resizeModel() {
    const padding = 0.9;
    const scale = Math.min(
      (app.screen.width / modelBaseWidth) * padding,
      (app.screen.height / modelBaseHeight) * padding
    );
    model.scale.set(scale);
    model.position.set(app.screen.width / 2, app.screen.height / 2);
  }
  resizeModel();
  window.addEventListener('resize', resizeModel);

  // 初始化嘴型 / 音频系统
//   const lip = initLipSync(model, app);

//   // 自动播放音频
//   lip.playVoice();

   const mapper = await initMapping({ modelJsonUrl });

  // 2) 初始化 action 控制器
  const actions = createActionController(model, mapper);
// 手工测试入口：
window.testAct = (input) => actions.act(input);
window.listAct = () => console.log(actions.list());

console.log("测试命令如下：");
console.log("testAct({ type: 'expression', index: 1 })");
console.log("testAct({ type: 'motion', index: 3 })");
console.log("listAct()");



})();
