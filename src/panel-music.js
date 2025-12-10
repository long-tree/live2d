// debug-music.panel.js
// Quick UI to drive TetrisFlow.syncMusic and related visual controls.
(() => {
  if (window.__musicPanelLoaded) return;
  window.__musicPanelLoaded = true;

  const waitForFlow = () => {
    if (window.TetrisFlow && typeof window.TetrisFlow.set === "function") {
      initPanel();
    } else {
      setTimeout(waitForFlow, 500);
    }
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function initPanel() {
    const flow = window.TetrisFlow;
    const root = document.createElement("div");
    root.style.cssText = `
      position: fixed;
      left: 12px;
      bottom: 12px;
      width: 320px;
      background: rgba(10,10,14,0.9);
      color: #fff;
      font-size: 12px;
      padding: 10px;
      border-radius: 8px;
      z-index: 99998;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      backdrop-filter: blur(6px);
      font-family: "Segoe UI", system-ui, sans-serif;
    `;

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <b>Debug Music Panel</b>
        <span id="dmp-status" style="opacity:0.7;font-size:11px;">ready</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <label style="display:flex;flex-direction:column;gap:4px;">Density (0-1)
          <input id="dmp-density" type="number" step="0.05" min="0" max="1" value="0.8"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Brightness (0-1)
          <input id="dmp-brightness" type="number" step="0.05" min="0" max="1" value="0.5"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Duration (s)
          <input id="dmp-duration" type="number" step="5" min="10" value="180"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Visual Style
          <select id="dmp-style"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
            <option>matrix</option>
            <option>heart</option>
            <option>wave</option>
            <option>plasma</option>
            <option>fire</option>
            <option>scanline</option>
            <option>sparkle</option>
            <option>none</option>
          </select>
        </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">
        <label style="display:flex;flex-direction:column;gap:4px;">BPM
          <input id="dmp-bpm" type="number" step="10" min="30" max="800" value="120"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Flow Speed
          <input id="dmp-flow" type="number" step="0.2" min="0" max="6" value="2"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Temperature
          <input id="dmp-temp" type="number" step="0.05" min="0" max="1" value="0.5"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">Opacity
          <input id="dmp-opacity" type="number" step="0.05" min="0" max="1" value="0.9"
            style="padding:6px;border-radius:6px;border:1px solid #333;background:#111;color:#fff;">
        </label>
      </div>

      <div style="display:flex;gap:6px;margin-top:10px;">
        <button id="dmp-sync" style="flex:1;padding:8px;border:none;border-radius:6px;background:#7c3aed;color:#fff;cursor:pointer;">Sync Music</button>
        <button id="dmp-apply" style="flex:1;padding:8px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;">Apply Direct</button>
      </div>

      <div style="margin-top:8px;font-size:11px;opacity:0.8;">事件监听：堆满时触发 reset</div>
    `;

    document.body.appendChild(root);

    const qs = (id) => root.querySelector(id);
    const densityInput = qs("#dmp-density");
    const brightInput = qs("#dmp-brightness");
    const durationInput = qs("#dmp-duration");
    const styleSel = qs("#dmp-style");
    const bpmInput = qs("#dmp-bpm");
    const flowInput = qs("#dmp-flow");
    const tempInput = qs("#dmp-temp");
    const opacityInput = qs("#dmp-opacity");
    const status = qs("#dmp-status");

    qs("#dmp-sync")?.addEventListener("click", () => {
      if (!flow?.syncMusic) return;
      flow.syncMusic({
        density: clamp(Number(densityInput.value) || 0, 0, 1),
        brightness: clamp(Number(brightInput.value) || 0, 0, 1),
        expectedDuration: Math.max(1, Number(durationInput.value) || 0)
      });
      status.textContent = "synced";
    });

    qs("#dmp-apply")?.addEventListener("click", () => {
      if (!flow?.set) return;
      flow.bulkUpdate?.({
        bpm: Math.max(10, Number(bpmInput.value) || 60),
        flowSpeed: clamp(Number(flowInput.value) || 0, 0, 6),
        temperature: clamp(Number(tempInput.value) || 0, 0, 1),
        opacity: clamp(Number(opacityInput.value) || 0, 0, 1)
      });
      flow.set("visualStyle", styleSel.value);
      status.textContent = "applied";
    });

    if (flow?.on) {
      const resetListener = () => {
        status.textContent = "reset event";
        setTimeout(() => (status.textContent = "ready"), 2000);
      };
      flow.on("reset", resetListener);
      // Optional cleanup on unload
      window.addEventListener("beforeunload", () => flow.off?.("reset", resetListener));
    }
  }

  waitForFlow();
})();
