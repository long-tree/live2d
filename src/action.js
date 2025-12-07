// action.js
// 仅使用新版 motion API，支持动作/表情，其中动作可附带 sound 实现口型同步；不再提供独立 speak。
import { MotionPriority } from "pixi-live2d-display-lipsyncpatch/cubism4";

function normalizeSpec(mapper, inputOrSpec) {
  if (inputOrSpec?.kind) return inputOrSpec;
  return mapper.resolve(inputOrSpec);
}

function buildOptions(spec, model) {
  const opt = { ...(spec.options || {}) };
  if (spec.sound) opt.sound = spec.sound;
  if (spec.volume !== undefined) opt.volume = spec.volume;
  if (spec.expression !== undefined) opt.expression = spec.expression;
  if (spec.resetExpression !== undefined) opt.resetExpression = spec.resetExpression;
  if (spec.crossOrigin) opt.crossOrigin = spec.crossOrigin;
  if (spec.onFinish) opt.onFinish = spec.onFinish;
  if (spec.onError) opt.onError = spec.onError;

  // 如果指定了表情且未设置 resetExpression，默认 true
  if (opt.expression !== undefined && opt.resetExpression === undefined) {
    opt.resetExpression = true;
  }

  // 默认播完回 Idle，除非已指定 onFinish 或本身是 Idle 组
  if (!opt.onFinish && spec.group !== "Idle") {
    opt.onFinish = () => {
      try {
        model.motion?.("Idle", undefined, MotionPriority.IDLE);
      } catch (_) {}
    };
  }

  return opt;
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
  function act(inputOrSpec, extra = {}) {
    const baseSpec = normalizeSpec(mapper, inputOrSpec);
    if (!baseSpec) {
      console.warn("[action] Unresolved input:", inputOrSpec);
      return { ok: false, spec: null };
    }

    if (!model?.internalModel) {
      console.warn("[action] Model not ready, skip action.");
      return { ok: false, spec: baseSpec };
    }

    // 合并额外参数（如 sound/volume/priority 等）
    const spec = { ...baseSpec, ...extra };

    if (spec.kind === "expression") {
      const ok = !!tryCallExpression(model, spec);
      return { ok, spec };
    }

    if (spec.kind === "motion") {
      const priority = spec.priority ?? MotionPriority.NORMAL;
      const options = buildOptions(spec, model);

      try {
        if (typeof model.motion === "function") {
          const r = model.motion(spec.group, spec.indexInGroup, priority, options);
          return { ok: !!r, spec };
        }
      } catch (e) {
        console.warn("[action] Motion call failed:", e);
      }
      return { ok: false, spec };
    }

    console.warn("[action] Unsupported spec kind:", spec.kind);
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
