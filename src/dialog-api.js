// dialog-api.js
// 提供一键对话：文字 + 可选动作/表情 + 可选音频/口型，并在角色头顶绘制漫画风对话框。

import * as PIXI from "pixi.js";
import { initLive2d } from "./main.js";

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

function createBubble(app, model) {
  const container = new PIXI.Container();
  container.visible = false;
  container.eventMode = "none";

  const bg = new PIXI.Graphics();
  const text = new PIXI.Text("", {
    fontSize: 18,
    fill: 0x0f0f0f,
    fontWeight: "bold",
    fontFamily: "Arial",
    align: "left",
  });
  text.anchor.set(0.5);

  container.addChild(bg);
  container.addChild(text);
  app.stage.addChild(container);

  function redraw() {
    const padding = 10;
    const w = text.width + padding * 2;
    const h = text.height + padding * 2;
    bg.clear();
    bg.beginFill(0xffffff, 0.9);
    bg.lineStyle(2, 0x333333, 0.8);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.endFill();
    // 尾巴
    const tailW = 14;
    const tailH = 10;
    const tailY = h / 2;
    bg.moveTo(-tailW / 2, tailY - 2);
    bg.lineTo(0, tailY + tailH);
    bg.lineTo(tailW / 2, tailY - 2);
    bg.closePath();
  }

  function setText(txt, fontSize = 18, maxLines = 3, maxChars = 14) {
    text.style = { ...text.style, fontSize };
    text.text = wrapText(txt, maxChars, maxLines);
    redraw();
  }

  // 跟随角色头顶
  const follow = () => {
    if (!model) return;
    const height = model.height || 300;
    container.x = model.x;
    container.y = model.y - height * 0.6 - container.height / 2;
  };
  app.ticker.add(follow);

  return { container, setText };
}

async function estimateDuration(text = "", audioUrl = null, cps = 8) {
  let dur = Math.max(1, text.length / Math.max(1, cps));
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
        dur = Math.max(dur, audio.duration);
      }
    } catch (_) {}
  }
  return Math.max(dur, 1.5);
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

    bubble.setText(text, fontSize, maxLines, maxCharsPerLine);
    bubble.container.visible = true;

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

    const duration = await estimateDuration(text, audioUrl, charsPerSec);
    setTimeout(() => {
      bubble.container.visible = false;
    }, duration * 1000);

    return res;
  }

  return { controller, say };
}
