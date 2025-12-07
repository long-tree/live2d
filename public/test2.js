// 对话封装测试：点击按钮触发 say（动作+音频+表情+气泡）
import { initLive2dWithDialogue } from "/src/dialog-api.js";

const VOICE_URL =
  "https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_6a1edae9-eb07-4f11-a5f3-ff4a48b991af.mp3?lk3s=da27ec82&x-expires=1765191487&x-signature=hBF1xPUHwVbqO3VO4I0dwhCXrN4%3D";

let apiReady = null;
function ensureAPI() {
  if (apiReady) return apiReady;
  apiReady = initLive2dWithDialogue();
  return apiReady;
}

async function runDemo() {
  const { say } = await ensureAPI();

  await say({
    id: "mao",
    text: "分析关于CORS的问题用户提到之前的自制lipsync基于频谱分析，可能曾通过AudioCont域配置，问题可能会解决于频谱分析，可能曾之前的自制lipsync基于频谱分析，可能",
    audioUrl: VOICE_URL,
    motion: "打气",
    expression: 2,
    crossOrigin: "anonymous",
      charsPerSec: 8,
  fontSize: 13,
  maxLines: 3,
  maxCharsPerLine: 10,
  });

  // await say({
  //   id: "hiyori",
  //   text: "我也来了～",
  //   audioUrl: VOICE_URL,
  //   motion: "打气",
  //   expression: 1,
  //   crossOrigin: "anonymous",
  // });
}

// 用户手势触发，避免自动播放限制
const btn = document.createElement("button");
btn.textContent = "测试对话：动作+音频+表情+气泡";
btn.style.cssText = `
  position: fixed;
  left: 12px;
  bottom: 12px;
  padding: 8px 12px;
  z-index: 99999;
`;
btn.addEventListener("click", () => {
  btn.disabled = true;
  runDemo().catch((e) => {
    console.error("[demo] failed", e);
    btn.disabled = false;
  });
});
document.body.appendChild(btn);
