// dialog-api.js
// 提供一键对话：文字 + 可选动作/表情 + 可选音频/口型，并在角色头顶绘制漫画风对话框。

import * as PIXI from "pixi.js";
import { initLive2d } from "./main.js";

// 生成柔和的渐变纹理，用作漫画气泡底色
function createGradientTexture(colors = ["#ffeefc", "#d6f0ff"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  colors.forEach((c, i) => {
    const stop = colors.length === 1 ? 0 : i / (colors.length - 1);
    gradient.addColorStop(stop, c);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = PIXI.Texture.from(canvas);
  tex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
  return tex;
}

const pastelTexture = createGradientTexture();

function wrapText(text = "", maxChars = 14, maxLines = 3) {
  const lines = [];
  for (let i = 0; i < text.length; i += maxChars) {
    lines.push(text.slice(i, i + maxChars));
    if (lines.length >= maxLines) {
      if (i + maxChars < text.length) {
        const last = lines.pop() || "";
        lines.push(last.replace(/.{0,2}$/, "") + "…");
      }
      break;
    }
  }
  return lines.join("\n");
}

// 将文本裁剪到气泡容量：超出时保留尾部，首字符替换为省略号，避免卡死在末尾
function layoutBubbleText(text = "", maxChars = 14, maxLines = 3) {
  const capacity = Math.max(1, maxChars * maxLines);
  if (text.length <= capacity) return wrapText(text, maxChars, maxLines);
  const tail = text.slice(-Math.max(1, capacity - 1));
  return wrapText("…" + tail, maxChars, maxLines);
}

function createBubble(app, model) {
  const container = new PIXI.Container();
  container.visible = false;
  container.eventMode = "none";

  const shadow = new PIXI.Graphics();
  const bg = new PIXI.Graphics();
  const deco = new PIXI.Graphics();
  const reveal = { active: false, fullText: "", start: 0, charsPerSec: 8, lastCount: 0 };
  let currentFontSize = 18;
  let currentMaxLines = 3;
  let currentMaxChars = 14;

  const text = new PIXI.Text("", {
    fontSize: 18,
    fill: 0x4f2f4a,
    fontWeight: "700",
    fontFamily: "Baloo 2, Fredoka, Arial",
    align: "left",
    letterSpacing: 0.6,
  });
  text.anchor.set(0.5);

  container.addChild(shadow);
  container.addChild(bg);
  container.addChild(deco);
  container.addChild(text);
  app.stage.addChild(container);

  function drawSparkle(g, x, y, size = 6, color = 0xffb7d5, alpha = 0.9) {
    g.beginFill(color, alpha);
    g.drawPolygon([
      x,
      y - size,
      x + size * 0.65,
      y,
      x,
      y + size,
      x - size * 0.65,
      y,
    ]);
    g.endFill();
  }

  function redraw() {
    const paddingX = 18;
    const paddingY = 14;
    const w = text.width + paddingX * 2;
    const h = text.height + paddingY * 2;
    const radius = 16;

    // 柔和的阴影
    shadow.clear();
    shadow.beginFill(0xffc6e8, 0.35);
    shadow.drawRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, radius + 2);
    shadow.endFill();

    bg.clear();
    const m = new PIXI.Matrix();
    m.scale(w / pastelTexture.width, h / pastelTexture.height);
    m.translate(-w / 2, -h / 2);
    bg.beginTextureFill({ texture: pastelTexture, matrix: m });
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, radius);
    // 尾巴填充
    const tailW = 18;
    const tailH = 12;
    const tailY = h / 2;
    bg.moveTo(-tailW / 2, tailY - 3);
    bg.lineTo(0, tailY + tailH);
    bg.lineTo(tailW / 2, tailY - 3);
    bg.endFill();

    bg.lineStyle(3, 0xff8fb1, 0.95);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.moveTo(-tailW / 2, tailY - 3);
    bg.lineTo(0, tailY + tailH);
    bg.lineTo(tailW / 2, tailY - 3);
    bg.closePath();

    deco.clear();
    // 顶部高光
    deco.beginFill(0xffffff, 0.35);
    deco.drawRoundedRect(-w / 2 + 12, -h / 2 + 10, w - 24, (h - 20) * 0.45, radius - 6);
    deco.endFill();
    // 小装饰
    drawSparkle(deco, w / 2 - 18, -h / 2 + 12, 7, 0xffaedb, 0.95);
    drawSparkle(deco, -w / 2 + 18, -h / 2 + 6, 5, 0xffcfe9, 0.75);
    deco.beginFill(0xff8fb1, 0.9);
    deco.drawCircle(-w / 2 + 22, h / 2 - 18, 3.5);
    deco.drawCircle(w / 2 - 20, h / 2 - 24, 2.8);
    deco.endFill();
    // 尾巴
    drawSparkle(deco, 0, tailY + tailH * 0.2, 4, 0xffd5e8, 0.8);
  }

  function setText(txt, fontSize = 18, maxLines = 3, maxChars = 14) {
    currentFontSize = fontSize;
    currentMaxLines = maxLines;
    currentMaxChars = maxChars;
    reveal.active = false;
    text.style = { ...text.style, fontSize: currentFontSize };
    text.text = layoutBubbleText(txt, currentMaxChars, currentMaxLines);
    redraw();
  }

  function animateText(txt, { fontSize = 18, maxLines = 3, maxChars = 14, charsPerSec = 8 } = {}) {
    currentFontSize = fontSize;
    currentMaxLines = maxLines;
    currentMaxChars = maxChars;
    text.style = { ...text.style, fontSize: currentFontSize };
    if (charsPerSec <= 0) {
      setText(txt, fontSize, maxLines, maxChars);
      return;
    }
    reveal.active = true;
    reveal.fullText = txt;
    reveal.start = performance.now();
    reveal.charsPerSec = charsPerSec;
    reveal.lastCount = 0;
    text.text = "";
    redraw();
  }

  // 跟随角色头顶
  const follow = () => {
    if (!model) return;
    const height = model.height || 300;
    container.x = model.x;
    container.y = model.y - height * 0.6 - container.height / 2;
  };

  const tick = () => {
    follow();
    if (!reveal.active) return;
    const elapsed = (performance.now() - reveal.start) / 1000;
    const count = Math.min(reveal.fullText.length, Math.floor(elapsed * reveal.charsPerSec));
    if (count !== reveal.lastCount) {
      reveal.lastCount = count;
      text.text = layoutBubbleText(reveal.fullText.slice(0, count), currentMaxChars, currentMaxLines);
      redraw();
    }
    if (count >= reveal.fullText.length) {
      reveal.active = false;
    }
  };

  app.ticker.add(tick);

  return { container, setText, animateText };
}

async function estimateDuration(text = "", audioUrl = null, cps = 8) {
  const textDuration = Math.max(1, text.length / Math.max(1, cps));
  let audioDuration = null;
  if (audioUrl) {
    try {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.crossOrigin = "anonymous";
      await new Promise((res, rej) => {
        audio.onloadedmetadata = () => res();
        audio.onerror = rej;
      });
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audioDuration = audio.duration;
      }
    } catch (_) {}
  }
  const duration = Math.max(textDuration, audioDuration ?? 0, 1.5);
  return { duration, audioDuration, textDuration };
}

export async function initLive2dWithDialogue(options = {}) {
  const controller = await initLive2d(options);
  const app = controller.app;
  const bubbles = new Map();

  function getBubble(id) {
    if (bubbles.has(id)) return bubbles.get(id);
    const c = controller.manager.get(id);
    if (!c?.model) return null;
    const bubble = createBubble(app, c.model);
    bubbles.set(id, bubble);
    return bubble;
  }

  /**
   * 说话：文字 + 可选音频 + 动作/表情（解析失败则用默认动作/表情）
   * params:
   *  - id: 角色 id
   *  - text: 对话文字
   *  - audioUrl: 可选音频
   *  - motion: 可选动作指令/自然语言，缺省则用 text 解析
   *  - expression: 可选表情（索引或名称）
   *  - charsPerSec/fontSize/maxLines/maxCharsPerLine: 对话框展示参数
   *  - priority: 可选动作优先级
   */
  async function say({
    id,
    text = "",
    audioUrl = null,
    motion = null,
    expression = undefined,
    charsPerSec = 8,
    fontSize = 18,
    maxLines = 3,
    maxCharsPerLine = 14,
    priority,
  }) {
    const bubble = getBubble(id);
    const character = controller.manager.get(id);
    if (!bubble || !character?.model) return { ok: false, spec: null };

    // 确保自然语言模式，便于用文字解析
    controller.setMode?.(id, 2);

    const motionInput = motion ?? text;
    const extra = {};
    if (audioUrl) {
      extra.sound = audioUrl;
      extra.crossOrigin = "anonymous";
    }
    if (priority !== undefined) extra.priority = priority;
    if (expression !== undefined) {
      extra.expression = expression;
      extra.resetExpression = true;
    }

    let res = controller.actWithAudio
      ? controller.actWithAudio(id, motionInput, audioUrl, extra)
      : controller.act(id, motionInput, extra);

    // 若未成功，尝试兜底第一个 motion，继续带音频
    if (!res?.ok && character.model?.motion) {
      try {
        character.model.motion("", 0, 2, extra.sound ? { sound: extra.sound, crossOrigin: "anonymous" } : undefined);
        res = { ok: true, spec: { kind: "motion", group: "", indexInGroup: 0 } };
      } catch (_) {}
    }

    const { duration, textDuration } = await estimateDuration(text, audioUrl, charsPerSec);
    // 若有音频且耗时更长，则按音频节奏减慢文字滚动
    const revealCps =
      charsPerSec <= 0 || text.length === 0
        ? charsPerSec
        : Math.max(0, Math.min(charsPerSec, text.length / duration));

    bubble.animateText(text, {
      fontSize,
      maxLines,
      maxChars: maxCharsPerLine,
      charsPerSec: revealCps || charsPerSec,
    });
    bubble.container.visible = true;

    setTimeout(() => {
      bubble.container.visible = false;
    }, duration * 1000);

    return res;
  }

  return { controller, say };
}
