// 极简演示：加载后立刻初始化并播放一次动作+音频（口型同步）。
// 如浏览器拦截自动播放，请先点击页面任意位置解锁音频。

const VOICE_URL =
  "https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_6a1edae9-eb07-4f11-a5f3-ff4a48b991af.mp3?lk3s=da27ec82&x-expires=1765191487&x-signature=hBF1xPUHwVbqO3VO4I0dwhCXrN4%3D";


(async () => {
  const { initLive2d } = await import("/src/main.js");
  const ctl = await initLive2d();

  // 切自然语言模式，演示 actWithAudio：一行搞定动作+音频+口型
  ["hiyori", "mao"].forEach((id) => ctl.setMode(id, 2));
  ["hiyori", "mao"].forEach((id) =>
    ctl.actWithAudio(id, "打气", VOICE_URL, {
      volume: 1,
      crossOrigin: "anonymous",
      expression: 3, // 示例：同时套用表情（索引或名称）
      resetExpression: true,
    })
  );

  console.log("[demo] 动作+音频已触发");
})();
