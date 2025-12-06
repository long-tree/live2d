import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { initMapping } from "./mapping.js";
import { createActionController } from "./action.js";
import { createCharacterManager } from "./character-manager.js";
import { createPanelDev } from "./panel-dev.js";

window.PIXI = PIXI;

const characterConfigs = [
  {
    id: "hiyori",
    modelJsonUrl: "/live2d/hiyori/hiyori_pro_t11.model3.json",
    scale: 0.2,
    position: { xRatio: 0.3, yRatio: 0.5 },
    zIndex: 1,
  },
  {
    id: "mao",
    modelJsonUrl: "/live2d/mao/mao_pro.model3.json",
    scale: 0.1,
    position: { xRatio: 0.7, yRatio: 0.5 },
    zIndex: 2,
  },
];

(async function () {
  Live2DModel.registerTicker(PIXI.Ticker);

  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });

  app.stage.sortableChildren = true;

  const manager = createCharacterManager();
  const loaded = [];

  const placeModel = (model, cfg) => {
    const { xRatio = 0.5, yRatio = 0.5, x, y } = cfg.position || {};
    model.x = x ?? app.renderer.width * xRatio;
    model.y = y ?? app.renderer.height * yRatio;
  };

  async function setupCharacter(cfg) {
    const model = await Live2DModel.from(cfg.modelJsonUrl);

    model.anchor.set(0.5, 0.5);
    model.scale.set(cfg.scale ?? 0.4);
    model.zIndex = cfg.zIndex ?? 0;
    placeModel(model, cfg);

    app.stage.addChild(model);

    const mapper = await initMapping({ modelJsonUrl: cfg.modelJsonUrl });
    const actions = createActionController(model, mapper);

    const character = { id: cfg.id, model, mapper, actions, app, config: cfg };
    manager.register(character);
    loaded.push(character);
    return character;
  }

  await Promise.all(characterConfigs.map(setupCharacter));

  window.addEventListener("resize", () => {
    loaded.forEach((c) => placeModel(c.model, c.config));
  });

  createPanelDev(manager);

  window.live2d = {
    manager,
    act(id, input) {
      const c = manager.get(id);
      if (!c) {
        console.warn("[live2d] Character not found:", id);
        return { ok: false, spec: null };
      }
      return c.actions.act(input);
    },
    actAll(input) {
      return manager.list().map((c) => ({ id: c.id, ...c.actions.act(input) }));
    },
    list() {
      return manager.list().map((c) => ({ id: c.id, mode: c.mapper.mode }));
    },
  };
})();
