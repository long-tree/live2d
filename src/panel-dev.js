// panel-dev.js

function parsePlayCommand(text) {
  const t = String(text || "").trim();

  // 支持：
  // play key5  → 默认 motion 5
  // play M5    → motion 5
  // play E3    → expression 3
  const m = t.match(/play\s+(key|m|e)?\s*(\d+)/i);
  if (!m) return null;

  const tag = (m[1] || "key").toLowerCase();
  const num = Number(m[2]);

  if (!Number.isFinite(num) || num < 1) return null;

  if (tag === "e") return { type: "expression", index: num };
  // key / m 默认视为 motion
  return { type: "motion", index: num };
}

// 监测 motion 播放结束：
// 使用 motionManager.isFinished() 的“从运行到结束”边沿检测
function waitMotionFinished(character) {
  const { model, app } = character;
  const mm = model?.internalModel?.motionManager;
  if (!mm || typeof mm.isFinished !== "function") {
    // 没有可靠 API 时立即返回
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let seenRunning = false;

    const tick = () => {
      const finished = mm.isFinished();

      if (!finished) seenRunning = true;

      if (seenRunning && finished) {
        app.ticker.remove(tick);
        resolve();
      }
    };

    app.ticker.add(tick);
  });
}

export function createPanelDev(manager) {
  const characters = manager.list();
  if (!characters.length) return;

  let currentId = characters[0].id;
  let lastSpec = null;

  const root = document.createElement("div");
  root.style.cssText = `
    position: fixed;
    right: 12px;
    bottom: 12px;
    width: 320px;
    background: rgba(20,20,20,0.9);
    color: #fff;
    font-size: 12px;
    padding: 10px;
    border-radius: 8px;
    z-index: 99999;
  `;

  root.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div><b>Live2D Panel Dev</b></div>
      <div id="pd-mode"></div>
    </div>

    <div style="margin-top:8px;">
      <label>Character</label>
      <select id="pd-sel" style="width:100%; margin-top:4px;"></select>
    </div>

    <div style="margin-top:8px;">
      <label>模式</label>
      <select id="pd-mode-toggle" style="width:100%; margin-top:4px;">
        <option value="manual">手动（play key5/M5/E3）</option>
        <option value="nl">自然语言</option>
      </select>
    </div>

    <div style="margin-top:8px;">
      <label>Command</label>
      <input id="pd-cmd" placeholder="play key5 / play M5 / play E3"
             style="width:100%; margin-top:4px; padding:6px;" />
      <button id="pd-run" style="margin-top:6px; width:100%;">Run</button>
    </div>

    <div style="margin-top:10px;">
      <button id="pd-list" style="width:100%;">Print List</button>
    </div>

    <div style="margin-top:10px;">
      <label>Natural Language (after play)</label>
      <input id="pd-nl" placeholder="挥手, 打招呼"
             style="width:100%; margin-top:4px; padding:6px;" />
      <button id="pd-bind" style="margin-top:6px; width:100%;">Bind to Last</button>
    </div>

    <div style="margin-top:10px;">
      <button id="pd-export" style="width:100%;">Export NL_MAP JSON</button>
    </div>

    <div id="pd-hint" style="margin-top:8px; opacity:0.8;"></div>
  `;

  document.body.appendChild(root);

  const sel = root.querySelector("#pd-sel");
  const cmdInput = root.querySelector("#pd-cmd");
  const runBtn = root.querySelector("#pd-run");
  const listBtn = root.querySelector("#pd-list");
  const nlInput = root.querySelector("#pd-nl");
  const bindBtn = root.querySelector("#pd-bind");
  const exportBtn = root.querySelector("#pd-export");
  const hint = root.querySelector("#pd-hint");
  const modeBox = root.querySelector("#pd-mode");
  const modeSel = root.querySelector("#pd-mode-toggle");

  // 填充角色列表
  characters.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.id;
    sel.appendChild(opt);
  });

  function current() {
    return manager.get(currentId);
  }

  function refreshMode() {
    const c = current();
    const mode = c?.mapper?.mode === 2 ? "nl" : "manual";
    if (modeSel) modeSel.value = mode;
    modeBox.textContent = mode === "nl" ? "MODE: LLM" : "MODE: MANUAL";
  }

  sel.addEventListener("change", () => {
    currentId = sel.value;
    lastSpec = null;
    nlInput.value = "";
    hint.textContent = "";
    refreshMode();
  });

  modeSel?.addEventListener("change", () => {
    const c = current();
    if (!c?.mapper) return;
    c.mapper.setMode(modeSel.value === "nl" ? 2 : 1);
    refreshMode();
  });

  refreshMode();

  listBtn.addEventListener("click", () => {
    const c = current();
    console.log(`[Panel] ${c.id}`, c.actions.list());
    hint.textContent = "List printed to console.";
  });

  runBtn.addEventListener("click", async () => {
    const c = current();
    const useNL = modeSel?.value === "nl";

    let ok = false;
    let spec = null;

    if (useNL) {
      const text = cmdInput.value.trim();
      if (!text) {
        hint.textContent = "请输入自然语言指令。";
        return;
      }
      c.mapper.setMode(2);
      ({ ok, spec } = c.actions.act(text));
    } else {
      const parsed = parsePlayCommand(cmdInput.value);

      if (!parsed) {
        hint.textContent = "Invalid command. Use: play key5 / play M5 / play E3";
        return;
      }

      // 强制用手工解析来保证 keyN 可控
      c.mapper.setMode(1);

      ({ ok, spec } = c.actions.act(parsed));
    }
    refreshMode();

    if (!ok || !spec) {
      hint.textContent = "Play failed.";
      return;
    }

    lastSpec = spec;
    hint.textContent = `Played ${spec.kind}: ${spec.name}. Waiting finish...`;

    if (spec.kind === "motion") {
      await waitMotionFinished(c);
      hint.textContent = `Motion finished. Please input NL label.`;
    } else {
      hint.textContent = `Expression applied. Please input NL label.`;
    }
  });

  bindBtn.addEventListener("click", () => {
    const c = current();
    if (!lastSpec) {
      hint.textContent = "No last action to bind.";
      return;
    }

    const phrases = nlInput.value;
    const ok = c.mapper.bindPhrases(phrases, lastSpec);

    if (ok) {
      hint.textContent = "NL mapping saved to localStorage.";
      nlInput.value = "";
    } else {
      hint.textContent = "Bind failed. Check input.";
    }
  });

  exportBtn.addEventListener("click", () => {
    const c = current();
    const json = c.mapper.exportNLMapJson();

    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.id.replace(/\W+/g, "_")}_nl_map.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 延迟 revoke 避免部分浏览器未触发下载
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    hint.textContent = "Exported JSON.";
  });
}
