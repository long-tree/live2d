const VOICE_URL = "https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_6a1edae9-eb07-4f11-a5f3-ff4a48b991af.mp3?lk3s=da27ec82&x-expires=1765191487&x-signature=hBF1xPUHwVbqO3VO4I0dwhCXrN4%3D";

async function ensureLive2d() {
  if (window.live2d) return window.live2d;

  // 尝试主动初始化（避免页面未自动 init）
  try {
    const { initLive2d } = await import("/src/main.js");
    const ctl = await initLive2d();
    return ctl;
  } catch (e) {
    console.warn("[test] initLive2d import failed, fallback to poll", e);
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.live2d) {
        clearInterval(timer);
        resolve(window.live2d);
      } else if (Date.now() - start > 10000) {
        clearInterval(timer);
        reject(new Error("live2d not ready within 10s"));
      }
    }, 200);
  });
}

async function runTest() {
  const ctl = await ensureLive2d();
  console.log("[test] live2d ready");

  // 切到自然语言模式
  ["hiyori", "mao"].forEach((id) => ctl.setMode(id, 2));

  for (const id of ["hiyori", "mao"]) {
    const m = ctl.manager.get(id)?.model;
    if (!m?.motion) {
      console.warn(`[test] motion not available on ${id}`);
      continue;
    }
    console.log(`[test] ${id} 动作+音频`);
    // MotionPriority.NORMAL === 2
    m.motion("", 0, 2, {
      sound: VOICE_URL,
      volume: 1,
      crossOrigin: "anonymous",
    }).then(() => console.log(`[test] ${id} motion+audio finished`))
      .catch((e) => console.error(`[test] ${id} motion+audio error`, e));
  }
}

// 由于浏览器自动播放限制，改为点击触发
const btn = document.createElement("button");
btn.textContent = "Run Live2D Test";
btn.style.cssText = `
  position: fixed;
  left: 12px;
  bottom: 12px;
  padding: 8px 12px;
  z-index: 99999;
`;
btn.addEventListener("click", () => {
  btn.disabled = true;
  runTest().catch((e) => {
    console.error("[test] failed:", e);
    btn.disabled = false;
  });
});
document.body.appendChild(btn);
