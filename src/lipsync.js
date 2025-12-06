// lipsync.js

export function initLipSync(model, app) {

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


  async function playVoice(voiceUrl) {
    if (!voiceUrl) {
      console.warn("[lipsync] voiceUrl is required.");
      return false;
    }

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

    return true;
  }


  // 每帧禁掉干扰嘴型的系统
  app.ticker.add(() => {
    if (!lipSyncEnabled) return;

    model.internalModel.lipSync = false;
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

    const mouthOpen = Math.min(peak * 9, 1);
    model.internalModel.coreModel.setParameterValueById('ParamA', mouthOpen);
  });


  // 对外提供播放接口
  return {
    playVoice
  };
}
