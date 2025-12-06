import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';


// expose PIXI to window so that this plugin is able to
// reference window.PIXI.Ticker to automatically update Live2D models
window.PIXI = PIXI;

(async function () {
  const app = new PIXI.Application({
    view: document.getElementById('canvas'),
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
  });
  
  const model = await Live2DModel.from('/live2d/runtime/mao_pro.model3.json');

  model.internalModel.motionManager.stopAllMotions();
//  model.internalModel.expressionManager.setExpression(null); 当前模型没有表情
  model.tracking = null;


  app.stage.addChild(model);

  // place model at center, scale to fit viewport with padding
  model.anchor.set(0.5, 0.5);
  model.scale.set(1);

  const modelBaseWidth = model.width;
  const modelBaseHeight = model.height;

  // simple HTTPS WAV source; swap this with your own URL when needed
  // You can use mp3 or wav; this demo uses an mp3 URL
  const voiceUrl = 'https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/speech_7426720361753903141_6a1edae9-eb07-4f11-a5f3-ff4a48b991af.mp3?lk3s=da27ec82&x-expires=1765191487&x-signature=hBF1xPUHwVbqO3VO4I0dwhCXrN4%3D';

  // Web Audio setup for playback + lip-sync analysis
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.connect(audioContext.destination);
  const waveform = new Uint8Array(analyser.fftSize);
  let currentSource = null;
  let lipSyncEnabled = false;

  // browsers block audio until user interacts; resume once then drop listener
  const tryResumeAudio = () => audioContext.resume();
  window.addEventListener('pointerdown', tryResumeAudio, { once: true });
  window.addEventListener('keydown', tryResumeAudio, { once: true });

  async function playVoiceFromUrl(url) {
    if (currentSource) {
      try {
        currentSource.stop();
      } catch (_) {
        // ignore if already stopped
      }
      currentSource.disconnect();
      currentSource = null;
    }

    const response = await fetch(url);
    const audioData = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(audioData);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    // chain: source -> analyser -> destination
    source.connect(analyser);

    source.start(0);
    lipSyncEnabled = true;
    currentSource = source;

    

    source.onended = () => {
      lipSyncEnabled = false;
      currentSource = null;
      // reset mouth after playback
      model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);
    };
  }

  function resizeModel() {
    const padding = 0.9; // keep a bit of breathing room
    const scale = Math.min(
      (app.screen.width / modelBaseWidth) * padding,
      (app.screen.height / modelBaseHeight) * padding
    );

    model.scale.set(scale);
    model.position.set(app.screen.width / 2, app.screen.height / 2);
  }

  resizeModel();
  window.addEventListener('resize', resizeModel);

  // lip sync: drive mouth parameter from analyser RMS
  app.ticker.add(() => {
    if (!lipSyncEnabled) return;

    analyser.getByteTimeDomainData(waveform);
    let sumSquares = 0;
    for (let i = 0; i < waveform.length; i++) {
      const normalized = (waveform[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / waveform.length);
    const mouthOpen = Math.min(rms * 8, 1); // scale to Live2D mouth range
    model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen);
  });

  // start demo playback; swap the URL or call playVoiceFromUrl() manually to change audio
  playVoiceFromUrl(voiceUrl).catch((error) => console.error('Audio playback failed:', error));

  // interaction
  model.on('hit', (hitAreas) => {
    if (hitAreas.includes('body')) {
      model.motion('tap_body');
    }
  });
})();
