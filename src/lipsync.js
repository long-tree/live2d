// lipsync.js

export function initLipSync(model, app) {

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


  async function playVoice() {
    if (currentSource) {
      try { currentSource.stop(); } catch (_) {}
      currentSource.disconnect();
      currentSource = null;
    }

    const response = await fetch(voiceUrl);
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


  // 每帧禁掉干扰嘴型的系统
  app.ticker.add(() => {
    model.internalModel.lipSync = false;
    model.internalModel.motionManager.stopAllMotions();
    model.tracking = null;
    model.pointerEvents = false;
  });


  // 嘴型驱动
  app.ticker.add(() => {
    if (!lipSyncEnabled) return;

    analyser.getByteTimeDomainData(waveform);

    let peak = 0;
    for (let i = 0; i < waveform.length; i++) {
      const v = Math.abs((waveform[i] - 128) / 128);
      peak = Math.max(peak, v);
    }

    const mouthOpen = Math.min(peak * 8, 1);
    model.internalModel.coreModel.setParameterValueById('ParamA', mouthOpen);
  });


  // 对外提供播放接口
  return {
    playVoice
  };
}
