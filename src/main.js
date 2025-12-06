import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';


// expose PIXI to window so that this plugin is able to
// reference window.PIXI.Ticker to automatically update Live2D models
window.PIXI = PIXI;

(async function () {
  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });

  const model = await Live2DModel.from('/live2d/runtime/mao_pro.model3.json');

  app.stage.addChild(model);

  // place model at center, scale to fit viewport with padding
  model.anchor.set(0.5, 0.5);
  model.scale.set(1);

  const modelBaseWidth = model.width;
  const modelBaseHeight = model.height;

  function resizeModel() {
    const padding = 0.9; // keep a bit of breathing room
    const scale = Math.min(
      (app.screen.width / modelBaseWidth) * padding,
      (app.screen.height / modelBaseHeight) * padding
    );

    model.scale.set(scale);
    model.position.set(app.screen.width / 2, app.screen.height / 2);
  }

  resizeModel();
  window.addEventListener('resize', resizeModel);

  // interaction
  model.on('hit', (hitAreas) => {
    if (hitAreas.includes('body')) {
      model.motion('tap_body');
    }
  });
})();
