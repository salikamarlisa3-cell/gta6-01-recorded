// Procedural WebAudio sound: no audio files, everything is synthesised.
// A soft two-note music loop, an engine hum pitched by speed, two-tone sirens
// when police are close, and short blips for pickups, cash, horns and shots.
// Browsers refuse audio before a user gesture, so the context is created
// lazily on the first sound after input and every call fails silently.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = 0;
  let musicStep = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, seconds, type, volume, slideTo) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(volume || 0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + seconds);
  }

  return {
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
    pickup() { blip(880, 0.12, 'square', 0.05, 1320); },
    cash() { blip(660, 0.1, 'triangle', 0.07); setTimeout(() => blip(990, 0.16, 'triangle', 0.07), 70); },
    ui() { blip(440, 0.06, 'square', 0.03); },
    horn() { blip(370, 0.22, 'sawtooth', 0.04); },
    shot() { blip(160, 0.09, 'sawtooth', 0.09, 60); },
    punch() { blip(120, 0.07, 'triangle', 0.08, 70); },
    sirenTick(step) { blip(step % 2 ? 960 : 720, 0.16, 'sine', 0.018); },
    /** Continuous engine hum; call every frame with the player's speed. */
    engine(speed, dt) {
      if (muted || !ensure()) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain).connect(ctx.destination);
        engineOsc.start();
      }
      const level = Math.min(1, Math.abs(speed) / 480);
      engineOsc.frequency.value = 55 + level * 130;
      engineGain.gain.value = level * 0.028;
      // A lazy music loop: a warm note every half second while driving or not.
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 0.5;
        const notes = [262, 330, 392, 330, 294, 349, 440, 349];
        blip(notes[musicStep % notes.length], 0.34, 'triangle', 0.012);
        musicStep += 1;
      }
    },
    stopEngine() {
      if (engineGain) engineGain.gain.value = 0;
    },
  };
}
