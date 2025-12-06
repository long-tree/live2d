// mapping.js
// 每个模型一个 mapper 实例：自动解析 + 两模式 + 动态 NL 词表 + 本地保存

// ----------------------------
// 工具：提取文件 baseName
// motions/special_01.motion3.json -> special_01
// ----------------------------
function fileBaseName(path = "") {
  const last = path.split("/").pop() || "";
  return last
    .replace(".motion3.json", "")
    .replace(".json", "");
}

// ----------------------------
// 解析 model3.json → expressions & motions
// ----------------------------
export function parseModelConfig(modelJson) {
  const fr = modelJson?.FileReferences || {};

  const expressions = (fr.Expressions || []).map((e, i) => ({
    index: i, // 0-based
    name: e.Name,
    file: e.File,
  }));

  const motions = [];
  const motionGroups = fr.Motions || {};

  Object.keys(motionGroups).forEach((group) => {
    const arr = motionGroups[group] || [];
    arr.forEach((m, idxInGroup) => {
      const base = fileBaseName(m.File);
      motions.push({
        group, // 可能是 "" 或 "Idle"
        indexInGroup: idxInGroup,
        name: base,
        file: m.File,
      });
    });
  });

  const flatMotions = motions.map((m, flatIndex) => ({
    ...m,
    flatIndex,
  }));

  const motionByName = new Map();
  flatMotions.forEach((m) => motionByName.set(m.name, m));

  const expressionByFlatIndex = new Map();
  expressions.forEach((e) => expressionByFlatIndex.set(e.index, e));

  const motionByFlatIndex = new Map();
  flatMotions.forEach((m) => motionByFlatIndex.set(m.flatIndex, m));

  return {
    expressions,
    flatMotions,
    motionByName,
    expressionByFlatIndex,
    motionByFlatIndex,
  };
}

// ----------------------------
// localStorage 持久化
// ----------------------------
function storageKey(modelJsonUrl) {
  return `live2d:nlmap:${modelJsonUrl}`;
}

function loadNLMap(modelJsonUrl) {
  try {
    const raw = localStorage.getItem(storageKey(modelJsonUrl));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNLMap(modelJsonUrl, mapObj) {
  try {
    localStorage.setItem(storageKey(modelJsonUrl), JSON.stringify(mapObj));
  } catch {}
}

// ----------------------------
// 初始化 Mapper（实例）
// options:
// - modelJsonUrl 必填
// - mode: 1 手工 / 2 自然语言
// - initialNLMap: 覆盖或预置
// - persist: 是否启用 localStorage
// ----------------------------
export async function initMapping({
  modelJsonUrl,
  mode = 1,
  initialNLMap = null,
  persist = true,
}) {
  const res = await fetch(modelJsonUrl);
  const modelJson = await res.json();
  const meta = parseModelConfig(modelJson);

  const persisted = persist ? loadNLMap(modelJsonUrl) : {};
  const nlMap = {
    ...persisted,
    ...(initialNLMap || {}),
  };

  // 统一 spec 结构
  function toExpressionSpecByIndex1(index1) {
    const e = meta.expressionByFlatIndex.get(index1 - 1);
    if (!e) return null;
    return { kind: "expression", name: e.name };
  }

  function toMotionSpecByIndex1(index1) {
    const m = meta.motionByFlatIndex.get(index1 - 1);
    if (!m) return null;
    return {
      kind: "motion",
      name: m.name,
      group: m.group,
      indexInGroup: m.indexInGroup,
      flatIndex: m.flatIndex,
    };
  }

  function resolveManual(input) {
    let type, index;

    if (typeof input === "string") {
      const parts = input.trim().split(/\s+/);
      type = (parts[0] || "").toLowerCase();
      index = Number(parts[1]);
    } else if (typeof input === "object" && input) {
      type = (input.type || "").toLowerCase();
      index = Number(input.index);
    }

    if (!type || !Number.isFinite(index) || index < 1) return null;

    if (type === "expression") return toExpressionSpecByIndex1(index);
    if (type === "motion") return toMotionSpecByIndex1(index);

    return null;
  }

  function resolveNatural(text) {
    const key = String(text || "").trim();
    if (!key) return null;

    // 1) 完全匹配
    if (nlMap[key]) {
      const rule = nlMap[key];
      if (rule.kind === "expression") return { kind: "expression", name: rule.name };
      if (rule.kind === "motion") {
        const m = meta.motionByName.get(rule.name);
        if (!m) return null;
        return {
          kind: "motion",
          name: m.name,
          group: m.group,
          indexInGroup: m.indexInGroup,
          flatIndex: m.flatIndex,
        };
      }
    }

    // 2) 简单 contains 兜底（可选）
    for (const k of Object.keys(nlMap)) {
      if (key.includes(k)) {
        const rule = nlMap[k];
        if (rule.kind === "expression") return { kind: "expression", name: rule.name };
        if (rule.kind === "motion") {
          const m = meta.motionByName.get(rule.name);
          if (!m) return null;
          return {
            kind: "motion",
            name: m.name,
            group: m.group,
            indexInGroup: m.indexInGroup,
            flatIndex: m.flatIndex,
          };
        }
      }
    }

    return null;
  }

  function resolve(input) {
    return mode === 1 ? resolveManual(input) : resolveNatural(input);
  }

  // 绑定自然语言词 → spec（panel-dev 会用）
  function bindPhrase(phrase, spec) {
    const p = String(phrase || "").trim();
    if (!p || !spec?.kind) return false;

    if (spec.kind === "expression") {
      nlMap[p] = { kind: "expression", name: spec.name };
    } else if (spec.kind === "motion") {
      nlMap[p] = { kind: "motion", name: spec.name };
    } else {
      return false;
    }

    if (persist) saveNLMap(modelJsonUrl, nlMap);
    return true;
  }

  function bindPhrases(phrases, spec) {
    const arr = Array.isArray(phrases)
      ? phrases
      : String(phrases || "")
          .split(/[，,]/)
          .map((s) => s.trim())
          .filter(Boolean);

    let ok = false;
    for (const p of arr) {
      ok = bindPhrase(p, spec) || ok;
    }
    return ok;
  }

  function getNLMap() {
    return { ...nlMap };
  }

  function setMode(newMode) {
    mode = newMode === 2 ? 2 : 1;
  }

  function exportNLMapJson() {
    return JSON.stringify(getNLMap(), null, 2);
  }

  return {
    mode,
    setMode,

    modelJsonUrl,
    modelJson,

    expressions: meta.expressions,
    motions: meta.flatMotions,

    resolve,
    bindPhrase,
    bindPhrases,
    getNLMap,
    exportNLMapJson,

    // 手工模式辅助：把 index 转 spec
    toExpressionSpecByIndex1,
    toMotionSpecByIndex1,
  };
}
