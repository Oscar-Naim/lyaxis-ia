export function playCyberClick() {
  playKeyClick();
}

export function playKeyClick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.035);
    setTimeout(() => ctx.close(), 100);
  } catch {}
}

export function playVaultUnlock() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Sub-bass drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.9);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.9);

    // Mechanical vault click / depressurization
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now + 0.1);
    whiteNoise.stop(now + 0.25);

    // Harmonic chime chords: C5 -> E5 -> G5 -> C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'triangle';
      const chimeTime = now + 0.12 + idx * 0.12;
      chime.frequency.setValueAtTime(freq, chimeTime);
      chimeGain.gain.setValueAtTime(0.18, chimeTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.8);
      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(chimeTime);
      chime.stop(chimeTime + 0.8);
    });

    setTimeout(() => ctx.close(), 1400);
  } catch {}
}

export function playDenialBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(120, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}
