// mapping.js
// 负责：读取 model3.json → 解析 expressions/motions → 按“模式”把输入解析为统一 ActionSpec

// ============================
// 模式开关（写死）
// 1 = 人工测试模式
// 2 = 自然语言模式
// ============================
export const OP_MODE = 1;

// ============================
// 自然语言词表（模式 2 才使用）
// 你需要根据不同模型手工维护
// key = 你希望 AI/用户说的话
// value = { kind: 'motion'|'expression', name: '<fileBase or expName>' }
// motion 的 name 推荐用“文件名去扩展名”，例如 special_01、mtn_03
// expression 的 name 就是 model3.json 中的 Name，例如 exp_01
// ============================
const NL_MAP = {
  "挥手": { kind: "motion", name: "special_01" },
  "卖萌": { kind: "motion", name: "special_02" },
  "鞠躬": { kind: "motion", name: "special_03" },
  "放松": { kind: "motion", name: "mtn_02" },

  "微笑": { kind: "expression", name: "exp_08" },
  "惊讶": { kind: "expression", name: "exp_07" },
  "害羞": { kind: "expression", name: "exp_04" },
};

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
// 返回标准结构，供 action.js 使用
// ----------------------------
export function parseModelConfig(modelJson) {
  const fr = modelJson?.FileReferences || {};

  // Expressions
  const expressions = (fr.Expressions || []).map((e, i) => ({
    index: i,                 // 0-based
    name: e.Name,             // exp_01 ...
    file: e.File,
  }));

  // Motions
  // Motions 是一个对象： { Idle: [...], "": [...] }
  const motions = [];
  const motionGroups = fr.Motions || {};

  Object.keys(motionGroups).forEach((group) => {
    const arr = motionGroups[group] || [];
    arr.forEach((m, idxInGroup) => {
      const base = fileBaseName(m.File);
      motions.push({
        group,                // "Idle" 或 "" 等
        indexInGroup: idxInGroup,
        name: base,           // mtn_01 / special_01 ...
        file: m.File,
      });
    });
  });

  // 为人工测试模式做一个“扁平序号”
  // 用户输入 motion + 序号时用这个列表
  const flatMotions = motions.map((m, flatIndex) => ({
    ...m,
    flatIndex,               // 0-based
  }));

  // 便于自然语言按 name 查找
  const motionByName = new Map();
  flatMotions.forEach((m) => motionByName.set(m.name, m));

  // 便于人工测试按序号查找
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
// 初始化 Mapper
// - modelJsonUrl: 你的 model3.json 地址
// ----------------------------
export async function initMapping({ modelJsonUrl }) {
  const res = await fetch(modelJsonUrl);
  const modelJson = await res.json();

  const meta = parseModelConfig(modelJson);

  // ----------------------------
  // 统一 ActionSpec 格式：
  // Expression:
  //  { kind:'expression', name:'exp_01' }
  //
  // Motion:
  //  { kind:'motion', group:'', indexInGroup: 3, name:'special_01' }
  //
  // ----------------------------

  function resolveManual(input) {
    // 支持两种输入：
    // 1) 对象：{ type:'expression'|'motion', index: 1 }  // 1-based
    // 2) 字符串：'expression 3' / 'motion 2'

    let type, index;

    if (typeof input === "string") {
      const parts = input.trim().split(/\s+/);
      type = (parts[0] || "").toLowerCase();
      index = Number(parts[1]);
    } else if (typeof input === "object" && input) {
      type = (input.type || "").toLowerCase();
      index = Number(input.index);
    }

    if (!type || !Number.isFinite(index)) return null;

    const zeroBased = index - 1;

    if (type === "expression") {
      const e = meta.expressionByFlatIndex.get(zeroBased);
      if (!e) return null;
      return { kind: "expression", name: e.name };
    }

    if (type === "motion") {
      const m = meta.motionByFlatIndex.get(zeroBased);
      if (!m) return null;
      return {
        kind: "motion",
        name: m.name,
        group: m.group,
        indexInGroup: m.indexInGroup,
      };
    }

    return null;
  }

  function resolveNatural(text) {
    const key = String(text || "").trim();
    if (!key) return null;

    const rule = NL_MAP[key];
    if (!rule) return null;

    if (rule.kind === "expression") {
      return { kind: "expression", name: rule.name };
    }

    if (rule.kind === "motion") {
      // 用 name 去查真实 group/index
      const m = meta.motionByName.get(rule.name);
      if (!m) {
        // 词表写了但当前模型没有这个动作
        return null;
      }
      return {
        kind: "motion",
        name: m.name,
        group: m.group,
        indexInGroup: m.indexInGroup,
      };
    }

    return null;
  }

  function resolve(input) {
    if (OP_MODE === 1) return resolveManual(input);
    return resolveNatural(input);
  }

  // 暴露给 action.js 和 main.js 观察/调试
  return {
    mode: OP_MODE,
    modelJson,
    expressions: meta.expressions,
    motions: meta.flatMotions,

    // 关键：解析入口
    resolve,
  };
}
