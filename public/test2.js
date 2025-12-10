// 对话封装测试：点击按钮触发 say（动作+音频+表情+气泡）
import { initLive2dWithDialogue } from "/src/dialog-api.js";

const VOICE_URL =
  "https://lf26-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_a8dc8637-1bd7-4c94-baf9-5914cd8ee2f4.mp3?lk3s=da27ec82&x-expires=1765273907&x-signature=f6bkb1%2Fmng8fj3nru3%2B5RZZNOiI%3D";

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
    text: "亲爱的听众朋友们，欢迎来到我们的音乐时光。在这个宁静的时刻，让我们一同沉浸在具有中国民间音乐独特魅力的旋律之中。 今天要为大家带来的这首歌曲《小白马》，它仿佛是从古老的民间故事里缓缓走来。想象一下，那匹灵动的小白马，在广袤的原野上悠然驰骋，带着一种难以言说的温柔与诗意。 我们以每分钟 90 拍的舒缓节奏，为大家营造出一种舒缓而惬意的氛围。就像轻柔的微风，轻轻拂过脸颊，让人的心也随之沉静下来。 它有着琵琶般悠扬的旋律，那一声声拨弦，好似在诉说着一段段古老的故事，充满了怀旧的味道。旋律中带着一丝忧郁，却又不失温婉，就像月光洒在古老的庭院里，静谧而美好。 接下来，就让我们一同聆听这首《小白马》，感受中国民间音乐那独特的韵味和无穷的魅力",
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
