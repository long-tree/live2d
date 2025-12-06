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

  const seq = [
    { id: "hiyori", step: "play1" },
    { id: "mao", step: "play1" },
    { id: "hiyori", step: "act" },
    { id: "mao", step: "act" },
  ];

  for (const item of seq) {
    if (item.step === "play1") {
      console.log(`[test] ${item.id} 播放音频`);
      ctl.playVoice(item.id, VOICE_URL);
    } else if (item.step === "act") {
      console.log(`[test] ${item.id} 动作: 打气`);
      ctl.act(item.id, "打气");
    }
  }

  setTimeout(() => {
    console.log("[test] 10s 后再次播放音频 (各角色各一次)");
    ["hiyori", "mao"].forEach((id) => ctl.playVoice(id, VOICE_URL));
  }, 10000);
}

runTest().catch((e) => console.error("[test] failed:", e));
