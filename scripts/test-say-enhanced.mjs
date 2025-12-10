#!/usr/bin/env node
// Command-line harness to exercise sayEnhanced mapping without the browser runtime.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSayEnhanced } from "../src/say-enhanced-helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadMap(filename) {
  const filePath = path.join(root, "public", "nl", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

const nlMaps = {
  hiyori: loadMap("hiyori_nl_map.json"),
  mao: loadMap("mao_nl_map.json"),
};

const mockCalls = [];
async function mockSay(payload) {
  mockCalls.push(payload);
  return { ok: true, spec: payload };
}

const sayEnhanced = createSayEnhanced({
  say: mockSay,
  getNLMap: (id) => nlMaps[id] ?? {},
});

async function run() {
  const VOICE_URL = "https://example.com/audio.mp3";
  const cases = [
    { id: "hiyori", text: "（害羞）本魔女只告诉Baobab，调颜料时会偷加小兔的绒毛，说这样紫色音符会变蓬松～", audioUrl: VOICE_URL },
    { id: "mao", text: "(脸红) 本魔女只告诉Baobab，调颜料时会偷加小兔的绒毛，说这样紫色音符会变蓬松～", audioUrl: VOICE_URL },
    { id: "mao", text: "（待机）动作匹配测试", audioUrl: VOICE_URL },
    { id: "mao", text: "(不存在) 将跳过动作和表情", audioUrl: VOICE_URL },
  ];

  for (const c of cases) {
    await sayEnhanced({ ...c, debug: true });
  }

  console.log("\n[say_enhanced] mock say calls:");
  console.log(JSON.stringify(mockCalls, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
