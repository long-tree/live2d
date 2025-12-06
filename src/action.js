// action.js
// 负责：执行 mapping.resolve() 返回的 ActionSpec
// 不关心自然语言、不关心序号规则

function tryCallMotion(model, spec) {
  // pixi-live2d-display 的 motion API 在不同版本/模型上可能略有差异
  // 这里做“多策略兜底”

  // 1) 如果支持 group + index 的形式
  try {
    if (typeof model.motion === "function") {
      // 允许 group 为空字符串
      // 某些版本 group="" 可能不稳定，但我们仍尝试
      return model.motion(spec.group, spec.indexInGroup);
    }
  } catch (_) {}

  // 2) 退一步：只传 group（例如 Idle）
  try {
    if (typeof model.motion === "function" && spec.group) {
      return model.motion(spec.group);
    }
  } catch (_) {}

  // 3) 最后：尝试用 name 触发（不保证所有模型都支持）
  try {
    if (typeof model.motion === "function" && spec.name) {
      return model.motion(spec.name);
    }
  } catch (_) {}

  // 4) 再退：直接调用内部 motionManager（如果存在）
  try {
    const mm = model?.internalModel?.motionManager;
    if (mm && typeof mm.startMotion === "function") {
      // startMotion(group, index, priority?) 具体签名可能不同
      return mm.startMotion(spec.group, spec.indexInGroup);
    }
  } catch (_) {}

  console.warn("[action] Motion call failed:", spec);
  return null;
}

function tryCallExpression(model, spec) {
  try {
    if (typeof model.expression === "function") {
      return model.expression(spec.name);
    }
  } catch (_) {}

  // 某些版本可以通过 internalModel.expressionManager
  try {
    const em = model?.internalModel?.expressionManager;
    if (em && typeof em.setExpression === "function") {
      return em.setExpression(spec.name);
    }
  } catch (_) {}

  console.warn("[action] Expression call failed:", spec);
  return null;
}

export function createActionController(model, mapper) {
  if (!model) throw new Error("createActionController: model required");
  if (!mapper) throw new Error("createActionController: mapper required");

  function act(inputOrSpec) {
    // 允许两种调用方式：
    // 1) 直接传“用户输入”（由 mapper.resolve 解析）
    // 2) 直接传 ActionSpec（跳过映射）

    const spec =
      inputOrSpec?.kind
        ? inputOrSpec
        : mapper.resolve(inputOrSpec);

    if (!spec) {
      console.warn("[action] Unresolved input:", inputOrSpec);
      return null;
    }

    if (spec.kind === "expression") {
      return tryCallExpression(model, spec);
    }

    if (spec.kind === "motion") {
      return tryCallMotion(model, spec);
    }

    console.warn("[action] Unknown spec kind:", spec);
    return null;
  }

  // 给后续 AI/调试用的辅助能力
  function list() {
    return {
      mode: mapper.mode,
      expressions: mapper.expressions,
      motions: mapper.motions,
    };
  }

  return { act, list };
}
