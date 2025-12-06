import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { initMapping } from "./mapping.js";
import { createActionController } from "./action.js";
import { createCharacterManager } from "./character-manager.js";
import { createPanelDev } from "./panel-dev.js";
import { initLipSync } from "./lipsync.js";

window.PIXI = PIXI;

export const defaultCharacterConfigs = [
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

let tickerRegistered = false;
function ensureTickerRegistered() {
  if (!tickerRegistered) {
    Live2DModel.registerTicker(PIXI.Ticker);
    tickerRegistered = true;
  }
}

async function loadInitialNLMap(id) {
  try {
    const res = await fetch(`/nl/${id}_nl_map.json`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[live2d] NL map not loaded for ${id}:`, e);
    return {};
  }
}

function createController(manager) {
  const get = (id) => manager.get(id);

  return {
    manager,
    act(id, input) {
      const c = get(id);
      if (!c) return { ok: false, spec: null };
      return c.actions.act(input);
    },
    actAll(input) {
      return manager.list().map((c) => ({ id: c.id, ...c.actions.act(input) }));
    },
    setMode(id, mode) {
      const c = get(id);
      if (!c?.mapper) return false;
      c.mapper.setMode(mode === 2 ? 2 : 1);
      return true;
    },
    list() {
      return manager.list().map((c) => ({
        id: c.id,
        mode: c.mapper.mode,
        hasLipSync: !!c.lipSync,
      }));
    },
    playVoice(id, voiceUrl) {
      const c = get(id);
      if (!c?.lipSync) {
        console.warn("[live2d] lipSync not ready:", id);
        return false;
      }
      return c.lipSync.playVoice(voiceUrl);
    },
    playVoiceAll(voiceUrl) {
      return manager.list().map((c) => ({
        id: c.id,
        ok: !!c.lipSync?.playVoice(voiceUrl),
      }));
    },
  };
}

export async function initLive2d({
  canvasId = "canvas",
  characterConfigs = defaultCharacterConfigs,
  persist = true,
  enablePanel = true,
} = {}) {
  ensureTickerRegistered();

  const view = document.getElementById(canvasId);
  if (!view) throw new Error(`Canvas element not found: ${canvasId}`);

  const app = new PIXI.Application({
    view,
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

    const initialNLMap = await loadInitialNLMap(cfg.id);
    const mapper = await initMapping({
      modelJsonUrl: cfg.modelJsonUrl,
      initialNLMap,
      persist,
    });
    const actions = createActionController(model, mapper);
    const lipSync = initLipSync(model, app);

    const character = { id: cfg.id, model, mapper, actions, app, config: cfg, lipSync };
    manager.register(character);
    loaded.push(character);
    return character;
  }

  await Promise.all(characterConfigs.map(setupCharacter));

  window.addEventListener("resize", () => {
    loaded.forEach((c) => placeModel(c.model, c.config));
  });

  if (enablePanel) createPanelDev(manager);

  const controller = createController(manager);
  window.live2d = controller;
  controller.app = app;

  return controller;
}

// 浏览器示例自动初始化：如需关闭，设置 window.LIVE2D_AUTO_INIT = false
if (typeof window !== "undefined" && window.LIVE2D_AUTO_INIT !== false) {
  const autoCanvas = document.getElementById("canvas");
  if (autoCanvas) {
    initLive2d().catch((e) => console.error("[live2d] Auto init failed:", e));
  }
}
