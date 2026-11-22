// Velvet Heist — synthesized sound, no audio files.
// One clear job: every beep, chime, tick and siren, made with WebAudio.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sirenNodes = null;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; if (muted) this.stopSiren(); return muted; },
    get muted() { return muted; },
    pickup() { tone(880, 0.09, 'sine', 0.1); tone(1318, 0.14, 'sine', 0.1, 0.07); },
    safeOpen() { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 0.09); tone(784, 0.2, 'triangle', 0.12, 0.18); },
    tick() { tone(1400, 0.03, 'square', 0.05); },
    coin() { tone(1800, 0.05, 'square', 0.07); tone(1200, 0.06, 'square', 0.06, 0.05); },
    smoke() { tone(300, 0.35, 'sawtooth', 0.06, 0, 90); },
    hack() { tone(660, 0.08, 'square', 0.07); tone(990, 0.1, 'square', 0.07, 0.08); },
    spotted() { tone(220, 0.18, 'sawtooth', 0.14, 0, 440); tone(220, 0.18, 'sawtooth', 0.14, 0.2, 440); },
    caught() { tone(330, 0.5, 'sawtooth', 0.16, 0, 110); },
    levelClear() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11));
    },
    click() { tone(700, 0.05, 'sine', 0.08); },
    startSiren() {
      if (muted || sirenNodes) return;
      const ac = ensure();
      if (!ac) return;
      const osc = ac.createOscillator();
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      const gain = ac.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 620;
      lfo.type = 'sine';
      lfo.frequency.value = 1.4;
      lfoGain.gain.value = 220;
      gain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      lfo.start();
      sirenNodes = { osc, lfo, gain };
    },
    stopSiren() {
      if (!sirenNodes) return;
      try { sirenNodes.osc.stop(); sirenNodes.lfo.stop(); } catch { /* already stopped */ }
      sirenNodes = null;
    },
  };
}
