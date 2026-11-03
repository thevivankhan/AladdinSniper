/**
 * Aladdin AI - Next-Gen Web Audio Synthesizer & Jingles Engine
 * Zero external audio assets required; 100% resilient Web Audio API synthesis
 * with polyphonic chord progressions, dynamic envelope shaping, and custom sound packs.
 */

export type SoundToneStyle = 'sniper' | 'arcade' | 'zen' | 'cyberpunk';

export type SoundEventType =
  | 'click'
  | 'copy'
  | 'win'
  | 'loss'
  | 'streak'
  | 'target'
  | 'signal'
  | 'stage'
  | 'countdown'
  | 'firecracker';

export interface SoundCategorySettings {
  signals: boolean;
  wins: boolean;
  losses: boolean;
  milestones: boolean;
  clicks: boolean;
  countdown: boolean;
}

export const DEFAULT_CATEGORY_SETTINGS: SoundCategorySettings = {
  signals: true,
  wins: true,
  losses: true,
  milestones: true,
  clicks: true,
  countdown: true,
};

// Global AudioContext singleton to avoid multiple concurrent contexts and browser throttling
let sharedAudioContext: AudioContext | null = null;
const audioListeners: Set<(event: SoundEventType, style: SoundToneStyle) => void> = new Set();

export const subscribeAudioPlayback = (
  listener: (event: SoundEventType, style: SoundToneStyle) => void
): (() => void) => {
  audioListeners.add(listener);
  return () => {
    audioListeners.delete(listener);
  };
};

const notifyAudioPlayed = (event: SoundEventType, style: SoundToneStyle) => {
  audioListeners.forEach((fn) => {
    try {
      fn(event, style);
    } catch {
      // silent
    }
  });
};

/**
 * Ensures a valid and active Web AudioContext, resolving browser autoplay restrictions
 */
export const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
};

// Auto-unlock AudioContext on first user interaction in browser or iframe
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // silent
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Creates master output chain with limiter/compressor to eliminate clipping during multi-voice jingles
 */
const createMasterChain = (ctx: AudioContext, volume: number) => {
  const masterGain = ctx.createGain();
  // If muted or near zero, strictly mute
  if (volume <= 0.005) {
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
  } else {
    const v = Math.max(0.01, Math.min(1, volume));
    masterGain.gain.setValueAtTime(v, ctx.currentTime);
  }

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, ctx.currentTime);
  compressor.knee.setValueAtTime(12, ctx.currentTime);
  compressor.ratio.setValueAtTime(8, ctx.currentTime);
  compressor.attack.setValueAtTime(0.003, ctx.currentTime);
  compressor.release.setValueAtTime(0.2, ctx.currentTime);

  masterGain.connect(compressor);
  compressor.connect(ctx.destination);

  return masterGain;
};

// Musical note frequencies (Hz)
const NOTES = {
  C3: 130.81,
  E3: 164.81,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.00,
  B5: 987.77,
  C6: 1046.50,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093.00,
};

/**
 * 1. UI Click & Haptic Tone
 */
const playClickTone = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (style === 'arcade') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.04);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.04);
  } else if (style === 'zen') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.06);
  } else if (style === 'cyberpunk') {
    osc.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    osc.frequency.setValueAtTime(280, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.05);
  } else {
    // sniper default: crisp micro-tactile tick
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.035);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.035);
  }
};

/**
 * 2. Copy Clipboard Affirmation
 */
const playCopyTone = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  const baseFreq = style === 'arcade' ? 659.25 : style === 'zen' ? 440 : 587.33;
  osc1.type = style === 'arcade' ? 'square' : 'triangle';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(baseFreq, t);
  osc1.frequency.setValueAtTime(baseFreq * 1.5, t + 0.05);

  osc2.frequency.setValueAtTime(baseFreq * 2, t);
  osc2.frequency.setValueAtTime(baseFreq * 3, t + 0.05);

  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.12);
  osc2.stop(t + 0.12);
};

/**
 * 3. Trade Win Jingle: Triumphant ascending harmonic flourish
 */
const playWinJingle = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;

  if (style === 'arcade') {
    // Classic 8-bit fast arpeggio coin fanfare
    const notes = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6, NOTES.G6];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);

      gain.gain.setValueAtTime(0.08, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.14);

      osc.connect(gain);
      gain.connect(master);

      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.15);
    });
  } else if (style === 'zen') {
    // Rich acoustic Tibetan singing bowl / Rhodes warm chime
    const chords = [
      { freq: NOTES.C4, delay: 0, dur: 0.8 },
      { freq: NOTES.G4, delay: 0.08, dur: 0.9 },
      { freq: NOTES.C5, delay: 0.16, dur: 1.1 },
      { freq: NOTES.E5, delay: 0.24, dur: 1.2 },
      { freq: NOTES.B5, delay: 0.32, dur: 1.4 },
    ];
    chords.forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.08, t + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

      osc.connect(gain);
      gain.connect(master);

      osc.start(t + delay);
      osc.stop(t + delay + dur);
    });
  } else if (style === 'cyberpunk') {
    // Fat filtered synth stab with detuned chorus
    const chord = [NOTES.C4, NOTES.G4, NOTES.C5, NOTES.Eb5, NOTES.G5];
    chord.forEach((freq, idx) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, t + idx * 0.04);
      osc2.frequency.setValueAtTime(freq * 1.008, t + idx * 0.04); // subtle lush detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t + idx * 0.04);
      filter.frequency.exponentialRampToValueAtTime(800, t + idx * 0.04 + 0.6);

      gain.gain.setValueAtTime(0.001, t + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.06, t + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.6);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc1.start(t + idx * 0.04);
      osc2.start(t + idx * 0.04);
      osc1.stop(t + idx * 0.04 + 0.65);
      osc2.stop(t + idx * 0.04 + 0.65);
    });
  } else {
    // 'sniper' default: crisp holographic triumph arpeggio + bell finish
    const notes = [
      { f: NOTES.C5, delay: 0 },
      { f: NOTES.E5, delay: 0.07 },
      { f: NOTES.G5, delay: 0.14 },
      { f: NOTES.B5, delay: 0.21 },
      { f: NOTES.C6, delay: 0.28 },
    ];
    notes.forEach(({ f, delay }, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t + delay);

      const hold = idx === notes.length - 1 ? 0.6 : 0.25;
      gain.gain.setValueAtTime(0.09, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + hold);

      osc.connect(gain);
      gain.connect(master);

      osc.start(t + delay);
      osc.stop(t + delay + hold);
    });
  }
};

/**
 * 4. Trade Loss / Recovery Cue: Calming, gentle, non-punishing resolve chord
 */
const playLossCue = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;

  if (style === 'arcade') {
    const notes = [NOTES.Eb4, NOTES.D4, NOTES.C4];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);
      gain.gain.setValueAtTime(0.06, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.19);
    });
  } else if (style === 'zen') {
    // Deep peaceful resonant gong fade
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(165, t + 0.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.85);
  } else if (style === 'cyberpunk') {
    // Dark analog sub bass swell
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.6);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.6);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.65);
  } else {
    // Gentle mellow warm chime focusing trader on disciplined recovery
    const notes = [
      { f: NOTES.F4, delay: 0, dur: 0.4 },
      { f: NOTES.C4, delay: 0.12, dur: 0.55 },
    ];

    notes.forEach(({ f, delay, dur }) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + delay);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.linearRampToValueAtTime(0.07, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(t + delay);
      osc.stop(t + delay + dur);
    });
  }
};

/**
 * 5. Streak on Fire Jingle: Fast ascending pentatonic run with glittering shimmer
 */
const playStreakJingle = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;
  const notes = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.A5, NOTES.C6, NOTES.E6, NOTES.G6];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = style === 'arcade' ? 'square' : style === 'zen' ? 'sine' : style === 'cyberpunk' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, t + idx * 0.05);

    const isLast = idx === notes.length - 1;
    const dur = isLast ? 0.7 : 0.18;
    const volume = isLast ? 0.1 : 0.07;

    gain.gain.setValueAtTime(0.001, t + idx * 0.05);
    gain.gain.linearRampToValueAtTime(volume, t + idx * 0.05 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + dur);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t + idx * 0.05);
    osc.stop(t + idx * 0.05 + dur);
  });
};

/**
 * 6. Target / Jackpot Achieved Fanfare: Grand multi-phase celebratory fanfare!
 */
const playTargetFanfare = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;

  // Phase 1: Ascending herald trumpet fanfare (C - G - C5 - E5)
  const herald = [
    { f: NOTES.C4, delay: 0.0, dur: 0.12 },
    { f: NOTES.C4, delay: 0.12, dur: 0.12 },
    { f: NOTES.C4, delay: 0.24, dur: 0.12 },
    { f: NOTES.G4, delay: 0.36, dur: 0.28 },
    { f: NOTES.C5, delay: 0.65, dur: 0.4 },
    { f: NOTES.E5, delay: 0.95, dur: 0.3 },
    { f: NOTES.G5, delay: 1.25, dur: 0.8 },
  ];

  herald.forEach(({ f, delay, dur }) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = style === 'arcade' ? 'square' : style === 'zen' ? 'sine' : 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(f, t + delay);
    osc2.frequency.setValueAtTime(f * 2, t + delay);

    gain.gain.setValueAtTime(0.001, t + delay);
    gain.gain.linearRampToValueAtTime(0.08, t + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(master);

    osc1.start(t + delay);
    osc2.start(t + delay);
    osc1.stop(t + delay + dur);
    osc2.stop(t + delay + dur);
  });

  // Phase 2: Shimmering high bells ringing on the grand victory resolve
  const bells = [NOTES.C6, NOTES.E6, NOTES.G6, NOTES.C7];
  bells.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const delay = 1.35 + idx * 0.08;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + delay);
    gain.gain.setValueAtTime(0.06, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.2);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t + delay);
    osc.stop(t + delay + 1.3);
  });
};

/**
 * 7. Aladdin AI Radar Signal Detected: Futuristic quant radar lock chime
 */
const playSignalDetectedJingle = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;

  if (style === 'arcade') {
    // Retro sonar ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.1);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.22);
    return;
  }

  if (style === 'zen') {
    // Waterdrop crystal bell ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, t);
    osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.06);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.46);
    return;
  }

  // Pulse 1: Sub-radar ping
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = style === 'cyberpunk' ? 'sawtooth' : 'sine';
  osc1.frequency.setValueAtTime(880, t);
  osc1.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
  gain1.gain.setValueAtTime(0.08, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc1.connect(gain1);
  gain1.connect(master);
  osc1.start(t);
  osc1.stop(t + 0.13);

  // Pulse 2: Resonant crystalline lock ping
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc2.type = 'triangle';
  osc3.type = 'sine';
  osc2.frequency.setValueAtTime(NOTES.Fs5, t + 0.11);
  osc3.frequency.setValueAtTime(NOTES.B5, t + 0.11);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1500, t + 0.11);
  filter.Q.setValueAtTime(4, t + 0.11);

  gain2.gain.setValueAtTime(0.09, t + 0.11);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.11 + 0.45);

  osc2.connect(filter);
  osc3.connect(filter);
  filter.connect(gain2);
  gain2.connect(master);

  osc2.start(t + 0.11);
  osc3.start(t + 0.11);
  osc2.stop(t + 0.11 + 0.46);
  osc3.stop(t + 0.11 + 0.46);
};

/**
 * 8. Stage Advance Chime (Next compounding tier unlocked)
 */
const playStageAdvance = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;
  const chords = [NOTES.C5, NOTES.F5, NOTES.A5, NOTES.C6];

  chords.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = style === 'arcade' ? 'square' : style === 'zen' ? 'sine' : style === 'cyberpunk' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, t + idx * 0.07);

    const dur = idx === chords.length - 1 ? 0.5 : 0.2;
    gain.gain.setValueAtTime(0.08, t + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + dur);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t + idx * 0.07);
    osc.stop(t + idx * 0.07 + dur);
  });
};

/**
 * 9. Precision Countdown Tick (Tactical radar clock tick for expiring trades)
 */
const playCountdownTick = (ctx: AudioContext, master: GainNode, style: SoundToneStyle) => {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = style === 'arcade' ? 'square' : style === 'zen' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(style === 'zen' ? 700 : style === 'arcade' ? 1200 : 1500, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.025);

  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

  osc.connect(gain);
  gain.connect(master);

  osc.start(t);
  osc.stop(t + 0.025);
};

/**
 * 10. Firecracker / Fireworks Audio Synthesis (Soothing, Peaceful, Harmonious Celebratory Chime)
 */
export const playFirecrackerAudio = (
  volume: number = 0.8,
  style: SoundToneStyle | string = 'sniper'
) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const master = createMasterChain(ctx, volume);
    const now = ctx.currentTime;
    const activeStyle: SoundToneStyle =
      style === 'arcade' || style === 'zen' || style === 'cyberpunk'
        ? style
        : 'sniper';

    // 1. Soft Aerial Rise Whoosh (Gentle breath, zero harsh noise)
    const riseOsc = ctx.createOscillator();
    const riseGain = ctx.createGain();
    riseOsc.type = style === 'arcade' ? 'triangle' : 'sine';
    riseOsc.frequency.setValueAtTime(220, now);
    riseOsc.frequency.exponentialRampToValueAtTime(560, now + 0.28);
    riseGain.gain.setValueAtTime(0.04, now);
    riseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    riseOsc.connect(riseGain);
    riseGain.connect(master);
    riseOsc.start(now);
    riseOsc.stop(now + 0.3);

    // 2. Warm Velvet Sub-Bloom (Deep, satisfying, lowpass-muffled distant bloom)
    const boomTime = now + 0.26;
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subFilter = ctx.createBiquadFilter();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, boomTime);
    subOsc.frequency.exponentialRampToValueAtTime(38, boomTime + 0.45);

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(180, boomTime);

    subGain.gain.setValueAtTime(0.18, boomTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.45);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(master);

    subOsc.start(boomTime);
    subOsc.stop(boomTime + 0.46);

    // 3. Soothing Golden Victory Chimes (Celestial C-Major9 pentatonic cascade: C5, E5, G5, B5, D6, E6)
    // Pure, soothing, melodious bell tones that bring peace and dopamine
    const chordFrequencies = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51];
    chordFrequencies.forEach((freq, idx) => {
      const noteTime = boomTime + 0.04 + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = style === 'arcade' ? 'square' : style === 'zen' ? 'sine' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.09, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(master);

      osc.start(noteTime);
      osc.stop(noteTime + 0.68);
    });

    notifyAudioPlayed('firecracker', activeStyle);
  } catch {
    // silent catch
  }
};

/**
 * Category filter check from localStorage
 */
export const isCategoryEnabled = (event: SoundEventType): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem('aladdin_sound_categories');
    if (!saved) return true;
    const cats = JSON.parse(saved);
    switch (event) {
      case 'win':
      case 'streak':
        return cats.wins !== false;
      case 'loss':
        return cats.losses !== false;
      case 'signal':
        return cats.signals !== false;
      case 'target':
      case 'stage':
        return cats.milestones !== false;
      case 'countdown':
        return cats.countdown !== false;
      case 'click':
      case 'copy':
        return cats.clicks !== false;
      default:
        return true;
    }
  } catch {
    return true;
  }
};

/**
 * Primary dispatch function to play synthesized dynamic sound effects & jingles
 */
export const playSoundEffect = (
  event: SoundEventType,
  volume: number = 0.85,
  style: SoundToneStyle | string = 'sniper'
) => {
  try {
    if (volume <= 0.005) return;
    if (!isCategoryEnabled(event)) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const master = createMasterChain(ctx, volume);
    const activeStyle: SoundToneStyle =
      style === 'arcade' || style === 'zen' || style === 'cyberpunk'
        ? style
        : 'sniper';

    switch (event) {
      case 'click':
        playClickTone(ctx, master, activeStyle);
        break;
      case 'copy':
        playCopyTone(ctx, master, activeStyle);
        break;
      case 'win':
        playWinJingle(ctx, master, activeStyle);
        break;
      case 'loss':
        playLossCue(ctx, master, activeStyle);
        break;
      case 'streak':
        playStreakJingle(ctx, master, activeStyle);
        break;
      case 'target':
        playTargetFanfare(ctx, master, activeStyle);
        break;
      case 'signal':
        playSignalDetectedJingle(ctx, master, activeStyle);
        break;
      case 'stage':
        playStageAdvance(ctx, master, activeStyle);
        break;
      case 'countdown':
        playCountdownTick(ctx, master, activeStyle);
        break;
      case 'firecracker':
        playFirecrackerAudio(volume, activeStyle);
        return;
    }

    notifyAudioPlayed(event, activeStyle);
  } catch {
    // Audio may be blocked before initial user interaction
  }
};

/**
 * Speech synthesis reference guard to prevent GC cancellation bug in Chrome
 */
let currentSpeechUtterance: SpeechSynthesisUtterance | null = null;

// Preload voices in background on Chromium browsers
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  } catch {
    // silent
  }
}

export const speakVoiceNotification = (
  text: string,
  language: 'Hindi' | 'English' | string = 'English',
  volume: number = 0.85
) => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (volume <= 0.005) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0.1, Math.min(1, volume));
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    if (language === 'Hindi') {
      utterance.lang = 'hi-IN';
      const hiVoice = voices.find((v) => v.lang.startsWith('hi') || v.lang.includes('HI'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      utterance.lang = 'en-US';
      const enVoice = voices.find((v) => v.lang === 'en-US' || v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    currentSpeechUtterance = utterance;
    utterance.onend = () => {
      currentSpeechUtterance = null;
    };
    utterance.onerror = () => {
      currentSpeechUtterance = null;
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech synthesis fallback
  }
};

/**
 * Default sound pack metadata for settings UI & theme selection
 */
export const SOUND_PACKS: {
  id: SoundToneStyle;
  name: string;
  badge: string;
  desc: string;
  color: string;
  iconName: string;
}[] = [
  {
    id: 'sniper',
    name: 'Sniper Tactical',
    badge: 'Pro Default',
    desc: 'High-precision cyber chimes, crisp clicks & futuristic radar pulses',
    color: 'from-amber-500 to-yellow-400',
    iconName: 'Crosshair',
  },
  {
    id: 'arcade',
    name: '8-Bit Arcade',
    badge: 'Retro',
    desc: 'Nostalgic chiptune arpeggios, coin cascades & energetic game fanfare',
    color: 'from-cyan-400 to-blue-500',
    iconName: 'Gamepad2',
  },
  {
    id: 'zen',
    name: 'Zen Harmonic',
    badge: 'Luxury',
    desc: 'Warm Rhodes chords, singing bowl resonance & calm low-pass cues',
    color: 'from-emerald-400 to-teal-500',
    iconName: 'Sparkles',
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    badge: 'Synthwave',
    desc: 'Detuned analog saw stabs, low-pass filter sweeps & neon pulses',
    color: 'from-purple-400 to-pink-500',
    iconName: 'Zap',
  },
];
