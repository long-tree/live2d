// 测试/桥接：调用 sayEnhanced（映射 NL + 透传音频），同时作为 iframe 的 postMessage 桥接入口。
import { initLive2dWithDialogue } from "/src/dialog-api.js";

const DEFAULT_AUDIO_URL =
  "https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_a8dc8637-1bd7-4c94-baf9-5914cd8ee2f4.mp3?lk3s=da27ec82&x-expires=1765273907&x-signature=f6bkb1%2Fmng8fj3nru3%2B5RZZNOiI%3D";

let apiReady = null;
async function ensureAPI() {
  if (!apiReady) {
    apiReady = initLive2dWithDialogue({ enablePanel: false });
    apiReady.then(({ sayEnhanced }) => {
      window.sayEnhanced = sayEnhanced;
      // 通知父窗口 Live2D 已就绪
      window.parent?.postMessage({ type: "live2d-ready" }, "*");
    });
  }
  return apiReady;
}

// 监听来自宿主的消息：ping / say_enhanced
window.addEventListener("message", async (event) => {
  const { type, data } = event.data || {};
  if (type === "live2d-ping") {
    window.parent?.postMessage({ type: "live2d-ready" }, "*");
    return;
  }
  if (type === "live2d-say-enhanced") {
    try {
      const { sayEnhanced } = await ensureAPI();
      const result = await sayEnhanced({ ...(data || {}), debug: true });
      event.source?.postMessage({ type: "live2d-say-result", success: true, result }, "*");
    } catch (err) {
      event.source?.postMessage(
        { type: "live2d-say-result", success: false, error: err?.message || String(err) },
        "*"
      );
    }
  }
});

function createPanel() {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: fixed;
    left: 12px;
    bottom: 12px;
    z-index: 2147483647;
    background: rgba(255,255,255,0.9);
    border: 1px solid #e4d8ff;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    padding: 12px;
    width: 320px;
    font-family: Arial, sans-serif;
    pointer-events: auto;
    user-select: auto;
  `;
  wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
  wrap.addEventListener("mousedown", (e) => e.stopPropagation());

  const title = document.createElement("div");
  title.textContent = "sayEnhanced 测试";
  title.style.cssText = "font-weight: 700; margin-bottom: 8px; color: #5a4c79;";
  wrap.appendChild(title);

  const row = (label, input) => {
    const line = document.createElement("div");
    line.style.cssText = "display: flex; align-items: center; margin-bottom: 8px; gap: 6px;";
    const lab = document.createElement("label");
    lab.textContent = label;
    lab.style.cssText = "width: 62px; font-size: 13px; color: #4d4660;";
    lab.htmlFor = input.id;
    line.appendChild(lab);
    line.appendChild(input);
    return line;
  };

  const select = document.createElement("select");
  select.id = "charSelect";
  select.style.cssText = "flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #d6c8ff;";
  ["mao", "hiyori"].forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    select.appendChild(opt);
  });
  wrap.appendChild(row("角色 id", select));

  const audio = document.createElement("input");
  audio.type = "text";
  audio.id = "audioInput";
  audio.value = DEFAULT_AUDIO_URL;
  audio.style.cssText = "flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #d6c8ff;";
  wrap.appendChild(row("音频 URL", audio));

  const text = document.createElement("textarea");
  text.id = "textInput";
  text.value = "（脸红）本魔女只告诉Baobab，调颜料时会偷加小兔的绒毛，说这样紫色音符会变蓬松～";
  text.rows = 3;
  text.style.cssText = "flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #d6c8ff; resize: vertical;";
  wrap.appendChild(row("带括号文", text));

  const cps = document.createElement("input");
  cps.type = "number";
  cps.id = "cpsInput";
  cps.value = "8";
  cps.style.cssText = "width: 80px; padding: 6px; border-radius: 6px; border: 1px solid #d6c8ff;";
  wrap.appendChild(row("chars/s", cps));

  const debug = document.createElement("label");
  debug.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 13px; color: #4d4660; margin-bottom: 8px;";
  const debugCheckbox = document.createElement("input");
  debugCheckbox.type = "checkbox";
  debugCheckbox.checked = true;
  debug.appendChild(debugCheckbox);
  debug.appendChild(document.createTextNode("debug 打印 payload"));
  wrap.appendChild(debug);

  const btn = document.createElement("button");
  btn.textContent = "调用 sayEnhanced";
  btn.style.cssText = `
    width: 100%;
    padding: 10px 12px;
    background: linear-gradient(135deg, #7f70ff, #c17cff);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  `;

  const log = document.createElement("div");
  log.style.cssText = "margin-top: 8px; font-size: 12px; color: #6a6285; max-height: 120px; overflow: auto;";

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    log.textContent = "调用中...";
    try {
      const { sayEnhanced } = await ensureAPI();
      const payload = {
        id: select.value,
        text: text.value,
        audioUrl: audio.value.trim() || null,
        charsPerSec: Number(cps.value) || 8,
        debug: debugCheckbox.checked,
        fontSize: 13,
        maxLines: 3,
        maxCharsPerLine: 10,
      };
      const res = await sayEnhanced(payload);
      log.textContent = `已调用 sayEnhanced，返回: ${JSON.stringify(res)}`;
    } catch (e) {
      console.error("[sayEnhanced panel] failed", e);
      log.textContent = `调用失败: ${e.message || e}`;
    } finally {
      btn.disabled = false;
    }
  });

  wrap.appendChild(btn);
  wrap.appendChild(log);
  document.body.appendChild(wrap);
}

// 仅在顶层窗口展示测试面板；iframe 嵌入模式只做桥接
document.addEventListener("DOMContentLoaded", () => {
  if (window.self === window.top) {
    createPanel();
  } else {
    ensureAPI();
  }
});
