// action.js
import { MotionPriority } from "pixi-live2d-display-lipsyncpatch/cubism4";

function tryCallMotion(model, spec) {
  // 默认用 NORMAL，除非显式传入 priority
  const priority = spec.priority ?? MotionPriority.NORMAL;

  // 优先 group+index
  try {
    if (typeof model.motion === "function") {
      const r = model.motion(spec.group, spec.indexInGroup, priority);
      if (r) return r;
    }
  } catch (_) {}

  // 再按 name
  try {
    if (typeof model.motion === "function" && spec.name) {
      return model.motion(spec.name, undefined, priority);
    }
  } catch (_) {}

  // 兜底 internal
  try {
    const mm = model?.internalModel?.motionManager;
    if (mm && typeof mm.startMotion === "function") {
      return mm.startMotion(spec.group, spec.indexInGroup, priority);
    }
  } catch (_) {}

  return false;
}

function tryCallExpression(model, spec) {
  try {
    if (typeof model.expression === "function") {
      return model.expression(spec.name);
    }
  } catch (_) {}

  try {
    const em = model?.internalModel?.expressionManager;
    if (em && typeof em.setExpression === "function") {
      return em.setExpression(spec.name);
    }
  } catch (_) {}

  return false;
}

export function createActionController(model, mapper) {
  function act(inputOrSpec) {
    const spec = inputOrSpec?.kind ? inputOrSpec : mapper.resolve(inputOrSpec);
    if (!spec) {
      console.warn("[action] Unresolved input:", inputOrSpec);
      return { ok: false, spec: null };
    }

    if (!model?.internalModel) {
      console.warn("[action] Model not ready, skip action.");
      return { ok: false, spec };
    }

    if (spec.kind === "expression") {
      const ok = !!tryCallExpression(model, spec);
      return { ok, spec };
    }

    if (spec.kind === "motion") {
      const ok = !!tryCallMotion(model, spec);
      return { ok, spec };
    }

    return { ok: false, spec };
  }

  function list() {
    return {
      mode: mapper.mode,
      expressions: mapper.expressions,
      motions: mapper.motions,
      nlMap: mapper.getNLMap?.() ?? {},
    };
  }

  return { act, list };
}
