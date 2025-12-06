import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

window.PIXI = PIXI;

(async function () {
  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });

  // 禁用鼠标追踪交互
  const model = await Live2DModel.from('/live2d/runtime/mao_pro.model3.json', {
    autoInteract: false
  });

  if (model._onPointerMove) {
    window.removeEventListener('pointermove', model._onPointerMove);
  }

  app.stage.addChild(model);

  model.anchor.set(0.5, 0.5);

  const modelBaseWidth = model.width;
  const modelBaseHeight = model.height;

  function resizeModel() {
    const padding = 0.9;
    const scale = Math.min(
      (app.screen.width / modelBaseWidth) * padding,
      (app.screen.height / modelBaseHeight) * padding
    );
    model.scale.set(scale);
    model.position.set(app.screen.width / 2, app.screen.height / 2);
  }
  resizeModel();
  window.addEventListener('resize', resizeModel);


  // =============================================================
  //                       音频系统
  // =============================================================

  const voiceUrl = 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_6a1edae9-eb07-4f11-a5f3-ff4a48b991af.mp3?lk3s=da27ec82&x-expires=1765191487&x-signature=hBF1xPUHwVbqO3VO4I0dwhCXrN4%3D';

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;

  const waveform = new Uint8Array(analyser.fftSize);
  let currentSource = null;
  let lipSyncEnabled = false;

  const tryResumeAudio = () => audioContext.resume();
  window.addEventListener('pointerdown', tryResumeAudio, { once: true });
  window.addEventListener('keydown', tryResumeAudio, { once: true });

  async function playVoiceFromUrl(url) {
    if (currentSource) {
      try { currentSource.stop(); } catch (_) {}
      currentSource.disconnect();
      currentSource = null;
    }

    const response = await fetch(url);
    const audioData = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(audioData);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    const splitter = audioContext.createGain();
    source.connect(splitter);
    splitter.connect(analyser);
    splitter.connect(audioContext.destination);

    source.start(0);
    lipSyncEnabled = true;
    currentSource = source;

    source.onended = () => {
      lipSyncEnabled = false;
      currentSource = null;
      model.internalModel.coreModel.setParameterValueById('ParamA', 0);
    };
  }


  // =============================================================
  //      1号 ticker：每帧强制禁用所有会复写嘴型的系统
  // =============================================================
  app.ticker.add(() => {
    model.internalModel.lipSync = false;
    model.internalModel.motionManager.stopAllMotions();
    model.tracking = null;
    model.pointerEvents = false;

    // 视情况开启或关闭：
    // 如果仍有覆盖现象，再加入以下禁用：
    // model.internalModel.expressionManager = null;
    // model.internalModel.poseManager = null;
    // model.internalModel.physics = null;
  });


  // =============================================================
  //      2号 ticker：嘴型实时驱动（峰值极限模式）
  // =============================================================
  app.ticker.add(() => {
    if (!lipSyncEnabled) return;

    analyser.getByteTimeDomainData(waveform);

    let peak = 0;
    for (let i = 0; i < waveform.length; i++) {
      const v = Math.abs((waveform[i] - 128) / 128);
      if (v > peak) peak = v;
    }

    // 极限放大 任何声音都张嘴
    const mouthOpen = Math.min(peak * 8, 1);

    model.internalModel.coreModel.setParameterValueById('ParamA', mouthOpen);
  });

  // 自动开始播放音频
  playVoiceFromUrl(voiceUrl).catch(err => console.error(err));

})();
