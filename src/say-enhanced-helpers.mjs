// Helper utilities for mapping bracketed text to say() inputs.

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function extractFirstTag(text = "") {
  const raw = String(text ?? "");
  const match = raw.match(/[（(]([^()（）]+)[）)]/);
  if (!match) {
    return { tag: null, cleanText: raw.trim(), raw };
  }
  const tag = match[1].trim();
  const cleanText = (raw.slice(0, match.index) + raw.slice(match.index + match[0].length)).trim();
  return { tag: tag || null, cleanText: cleanText || raw.trim(), raw };
}

export function resolveActionFromNLMap(id, tag, nlMap = {}) {
  if (!tag || !nlMap || !hasOwn(nlMap, tag)) {
    return { motion: undefined, expression: undefined, entry: null };
  }

  const entry = nlMap[tag];
  if (id === "hiyori") {
    return {
      motion: entry?.kind === "motion" ? tag : undefined,
      expression: undefined,
      entry,
    };
  }

  const isMotion = entry?.kind === "motion";
  const isExpression = entry?.kind === "expression";

  return {
    motion: isMotion ? tag : undefined,
    expression: isExpression ? entry.name : undefined,
    entry,
  };
}

export function createSayEnhanced({ say, getNLMap = () => ({}) }) {
  if (typeof say !== "function") {
    throw new Error("[say_enhanced] say function is required.");
  }

  return async function sayEnhanced(options = {}) {
    const { id, text = "", debug = false, ...rawRest } = options;
    const { motion: _ignoredMotion, expression: _ignoredExpression, ...rest } = rawRest;

    const { tag, cleanText } = extractFirstTag(text);
    const nlMap = typeof getNLMap === "function" ? getNLMap(id) || {} : {};
    const action = resolveActionFromNLMap(id, tag, nlMap);

    const payload = {
      ...rest,
      id,
      text: cleanText,
    };

    if (action.motion) payload.motion = action.motion;
    if (id !== "hiyori" && action.expression !== undefined) {
      payload.expression = action.expression;
    }

    if (debug) {
      console.debug("[say_enhanced] calling say with:", { tag, entry: action.entry, payload });
    }

    return say(payload);
  };
}
