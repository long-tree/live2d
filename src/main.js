import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

window.PIXI = PIXI;

(async function () {
  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });

const model = await Live2DModel.from('/live2d/runtime/mao_pro.model3.json', {
  autoInteract: false
});




if (model._onPointerMove) {
  window.removeEventListener('pointermove', model._onPointerMove);
}


  app.stage.addChild(model);

  // 居中摆放
  model.anchor.set(0.5, 0.5);
  model.scale.set(1);

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

  // ★★最关键：嘴型最大化控制，无音频、无RMS、无自动覆盖★★
app.ticker.add(() => {
  model.internalModel.lipSync = false;
  model.internalModel.motionManager.stopAllMotions();
  model.tracking = null;

  model.internalModel.coreModel.setParameterValueById('ParamA', 1);
});


})();
