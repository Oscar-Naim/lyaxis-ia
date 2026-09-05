// Utility for cyberpunk audio feedback with sound mute toggle
let audioCtx: AudioContext | null = null;

export const isSoundMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  const mutedVal = localStorage.getItem('lyaxis_sound_muted');
  if (mutedVal !== null) {
    return mutedVal === 'true';
  }
  // Check legacy setting: if lyaxis_sound was set to false, it is muted
  const legacySound = localStorage.getItem('lyaxis_sound');
  if (legacySound !== null) {
    return legacySound !== 'true';
  }
  return false;
};

export const setSoundMuted = (muted: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lyaxis_sound_muted', String(muted));
  localStorage.setItem('lyaxis_sound', String(!muted));
};

export const playCyberClick = () => {
  if (isSoundMuted()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {
    // Ignore audio context errors gracefully
  }
};
