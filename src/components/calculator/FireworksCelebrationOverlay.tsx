import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  X,
  ShieldCheck,
  Rocket,
  Gamepad2,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import {
  playFirecrackerAudio,
  speakVoiceNotification,
  SoundToneStyle,
} from '../../utils/audioSystem';

export { playFirecrackerAudio, speakVoiceNotification };

export type CelebrationThemeVariant = 'golden_royal' | 'rockets' | 'dolls' | 'arcade';

export interface FireworksCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  winProfit?: number;
  winRate?: number;
  voiceLanguage?: 'Hindi' | 'English';
  soundVolume?: number;
  toneStyle?: SoundToneStyle;
  initialThemeVariant?: CelebrationThemeVariant;
  onThemeChange?: (variant: CelebrationThemeVariant) => void;
  // Real session trade performance stats
  currentBalance?: number;
  startBalance?: number;
  targetGoal?: number;
  winsCount?: number;
  lossesCount?: number;
  totalTrades?: number;
  assetName?: string;
  payoutRate?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  size: number;
  prevX: number;
  prevY: number;
  twinkle: number;
  shape?: 'circle' | 'star' | 'square';
}

interface RocketItem {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  colorPalette: string[];
}

export const THEME_VARIANTS_CONFIG: Record<
  CelebrationThemeVariant,
  {
    id: CelebrationThemeVariant;
    label: string;
    icon: string;
    bgGradient: string;
    cardBorder: string;
    cardGlow: string;
    badgeText: string;
    badgeStyle: string;
    title: string;
    titleGradient: string;
    tagline: string;
    soundTone: SoundToneStyle;
    buttonLabel: string;
    buttonGradient: string;
    profitGlow: string;
  }
> = {
  golden_royal: {
    id: 'golden_royal',
    label: 'Royal Gold',
    icon: '👑',
    bgGradient: 'linear-gradient(180deg, #131008 0%, #0c0a06 55%, #050402 100%)',
    cardBorder: '1px solid rgba(245, 158, 11, 0.4)',
    cardGlow: '0 0 40px rgba(245, 158, 11, 0.25)',
    badgeText: 'DISCIPLINED PLAN EXECUTED',
    badgeStyle: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    title: 'TARGET ACHIEVED',
    titleGradient: 'from-amber-200 via-yellow-300 to-amber-100',
    tagline: 'Trading plan target achieved with disciplined execution & risk control.',
    soundTone: 'sniper',
    buttonLabel: 'Launch Fireworks FX',
    buttonGradient: 'from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black',
    profitGlow: 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.45)]',
  },
  rockets: {
    id: 'rockets',
    label: 'Cosmic Rockets',
    icon: '🚀',
    bgGradient: 'linear-gradient(180deg, #091122 0%, #060b17 55%, #020409 100%)',
    cardBorder: '1px solid rgba(6, 182, 212, 0.4)',
    cardGlow: '0 0 40px rgba(6, 182, 212, 0.25)',
    badgeText: 'PROFIT TARGET LOCKED',
    badgeStyle: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    title: 'PROFIT GOAL LOCKED',
    titleGradient: 'from-cyan-200 via-sky-300 to-cyan-100',
    tagline: 'Precision trajectory confirmed. Profit goal secured safely.',
    soundTone: 'cyberpunk',
    buttonLabel: 'Launch Fireworks FX',
    buttonGradient: 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white',
    profitGlow: 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.45)]',
  },
  dolls: {
    id: 'dolls',
    label: 'Festive Dolls',
    icon: '🎎',
    bgGradient: 'linear-gradient(180deg, #180916 0%, #0f050e 55%, #070207 100%)',
    cardBorder: '1px solid rgba(236, 72, 153, 0.4)',
    cardGlow: '0 0 40px rgba(236, 72, 153, 0.25)',
    badgeText: 'GOAL COMPLETED',
    badgeStyle: 'bg-pink-500/10 border-pink-500/30 text-pink-300',
    title: 'SESSION GOAL REACHED',
    titleGradient: 'from-pink-200 via-rose-300 to-amber-200',
    tagline: 'Strategic patience and steady compounding yielded target profit.',
    soundTone: 'zen',
    buttonLabel: 'Launch Fireworks FX',
    buttonGradient: 'from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white',
    profitGlow: 'text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.45)]',
  },
  arcade: {
    id: 'arcade',
    label: '8-Bit Arcade',
    icon: '👾',
    bgGradient: 'linear-gradient(180deg, #0f0920 0%, #080514 55%, #040209 100%)',
    cardBorder: '1px solid rgba(168, 85, 247, 0.4)',
    cardGlow: '0 0 40px rgba(168, 85, 247, 0.25)',
    badgeText: 'STAGE CLEARED',
    badgeStyle: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    title: 'STAGE CLEARED',
    titleGradient: 'from-purple-200 via-fuchsia-300 to-cyan-200',
    tagline: 'Strict risk control parameters maintained across all trade steps.',
    soundTone: 'arcade',
    buttonLabel: 'Launch Fireworks FX',
    buttonGradient: 'from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white',
    profitGlow: 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.45)]',
  },
};

const VARIANT_CYCLE: CelebrationThemeVariant[] = ['golden_royal', 'rockets', 'dolls', 'arcade'];

export const FireworksCelebrationOverlay: React.FC<FireworksCelebrationProps> = ({
  isOpen,
  onClose,
  title,
  winProfit = 0,
  winRate = 100,
  voiceLanguage = 'English',
  soundVolume = 0.8,
  toneStyle = 'sniper',
  initialThemeVariant = 'golden_royal',
  onThemeChange,
  currentBalance,
  startBalance,
  winsCount,
  lossesCount,
  assetName = 'Pocket Option OTC',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [salvoCount, setSalvoCount] = useState(1);
  const [activeTheme, setActiveTheme] = useState<CelebrationThemeVariant>(initialThemeVariant);

  // Sync initial theme
  useEffect(() => {
    if (initialThemeVariant) {
      setActiveTheme(initialThemeVariant);
    }
  }, [initialThemeVariant]);

  const currentCfg = THEME_VARIANTS_CONFIG[activeTheme] || THEME_VARIANTS_CONFIG.golden_royal;

  // Play peaceful sound & deferred speech on opening
  useEffect(() => {
    if (!isOpen) return;

    // Trigger theme-specific audio tone
    const audioTone = currentCfg.soundTone || toneStyle;
    playFirecrackerAudio(soundVolume, audioTone);

    // Smooth deferred voice announcement so UI opening is 100% stutter-free
    const timer = setTimeout(() => {
      let voiceMessage = '';
      if (voiceLanguage === 'Hindi') {
        if (activeTheme === 'rockets') {
          voiceMessage = 'रॉकेट लॉन्च सफल! बहुत-बहुत बधाई, अंतरिक्ष जैसा शानदार प्रॉफिट!';
        } else if (activeTheme === 'dolls') {
          voiceMessage = 'डॉल पार्टी शुरू! बहुत-बहुत बधाई, आपका लक्ष्य पूरी तरह हासिल हुआ!';
        } else if (activeTheme === 'arcade') {
          voiceMessage = 'आर्केड जैकपॉट अनलॉक! शानदार 100 प्रतिशत जीत मुबारक!';
        } else {
          voiceMessage = 'टारगेट पूरा हुआ! बहुत-बहुत बधाई, आपने अपना प्रॉफिट लक्ष्य हासिल कर लिया है!';
        }
      } else {
        if (activeTheme === 'rockets') {
          voiceMessage = 'Cosmic Rocket Launch! Congratulations, orbit locked and target secured!';
        } else if (activeTheme === 'dolls') {
          voiceMessage = 'Festive Doll Celebration! Target reached with master discipline!';
        } else if (activeTheme === 'arcade') {
          voiceMessage = '8-Bit Arcade Jackpot! Stage 100% cleared!';
        } else {
          voiceMessage = 'Target Achieved! Congratulations, profit goal secured!';
        }
      }
      speakVoiceNotification(voiceMessage, voiceLanguage, soundVolume);
    }, 450);

    return () => clearTimeout(timer);
  }, [isOpen, activeTheme, currentCfg.soundTone, soundVolume, voiceLanguage, toneStyle]);

  // High Performance 60FPS Fireworks Canvas Engine with Theme Palettes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Theme-specific color palettes
    const PALETTES_BY_THEME: Record<CelebrationThemeVariant, string[][]> = {
      golden_royal: [
        ['#f59e0b', '#fbbf24', '#fef08a', '#ffffff'],
        ['#eab308', '#f59e0b', '#fde047', '#ffffff'],
        ['#10b981', '#34d399', '#6ee7b7', '#fef08a'],
      ],
      rockets: [
        ['#06b6d4', '#38bdf8', '#f97316', '#ffedd5', '#ffffff'],
        ['#f97316', '#fb923c', '#fdba74', '#fef08a'],
        ['#38bdf8', '#818cf8', '#c084fc', '#ffffff'],
      ],
      dolls: [
        ['#ec4899', '#f43f5e', '#fb7185', '#fef08a', '#ffffff'],
        ['#10b981', '#34d399', '#6ee7b7', '#fef08a'],
        ['#fbbf24', '#f59e0b', '#fb7185', '#a78bfa'],
      ],
      arcade: [
        ['#06b6d4', '#22d3ee', '#ec4899', '#facc15', '#ffffff'],
        ['#a855f7', '#d946ef', '#22d3ee', '#facc15'],
        ['#facc15', '#eab308', '#22d3ee', '#ffffff'],
      ],
    };

    const palettes = PALETTES_BY_THEME[activeTheme] || PALETTES_BY_THEME.golden_royal;
    const particles: Particle[] = [];
    const rockets: RocketItem[] = [];

    // Launch a rocket rising from bottom
    const launchRocket = (startX: number, targetY: number) => {
      const palette = palettes[Math.floor(Math.random() * palettes.length)];
      rockets.push({
        x: startX,
        y: height + 10,
        targetY: targetY,
        vy: -(Math.random() * 3 + 11),
        color: palette[0],
        colorPalette: palette,
      });
    };

    // Burst firework
    const explodeFirework = (targetX: number, targetY: number, palette?: string[]) => {
      const chosenPalette = palette || palettes[Math.floor(Math.random() * palettes.length)];
      const count = 75 + Math.floor(Math.random() * 25);

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        const speed = Math.random() * 5.5 + 1.8;
        const color = chosenPalette[Math.floor(Math.random() * chosenPalette.length)];

        particles.push({
          x: targetX,
          y: targetY,
          prevX: targetX,
          prevY: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: Math.random() * 0.016 + 0.012,
          color,
          size: Math.random() * 2.2 + 1.4,
          twinkle: Math.random() * Math.PI,
          shape: activeTheme === 'arcade' ? 'square' : activeTheme === 'rockets' ? 'star' : 'circle',
        });
      }
    };

    // Initial bursts
    setTimeout(() => {
      explodeFirework(width * 0.25, height * 0.3);
      explodeFirework(width * 0.75, height * 0.32);
      launchRocket(width * 0.5, height * 0.25);
    }, 100);

    // Periodic gentle bursts (relaxing & pleasant)
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      const rx = width * 0.2 + Math.random() * (width * 0.6);
      const ry = height * 0.18 + Math.random() * (height * 0.28);
      launchRocket(rx, ry);
    }, 1600);

    // Interactive Click-to-Burst
    const handleCanvasClick = (e: MouseEvent) => {
      explodeFirework(e.clientX, e.clientY);
      if (e.isTrusted) {
        playFirecrackerAudio(soundVolume, currentCfg.soundTone);
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    // 60FPS Render Loop
    let lastTime = performance.now();
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // 1. Update & draw rising rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy;
        r.vy *= 0.99;

        // Spark tail
        ctx.beginPath();
        ctx.arc(r.x + (Math.random() * 2 - 1), r.y + 4, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 230, 160, 0.7)';
        ctx.fill();

        // Rocket head
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -1) {
          explodeFirework(r.x, r.y, r.colorPalette);
          rockets.splice(i, 1);
        }
      }

      // 2. Update & draw blooming particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.055; // Gentle gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.alpha -= p.decay;
        p.twinkle += 0.15;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const twinkleFactor = Math.sin(p.twinkle) * 0.25 + 0.75;
        ctx.save();
        ctx.globalAlpha = p.alpha * twinkleFactor;

        if (p.shape === 'square') {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();

          // Starburst trail
          ctx.beginPath();
          ctx.moveTo(p.prevX, p.prevY);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.7;
          ctx.stroke();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [isOpen, activeTheme, soundVolume, currentCfg.soundTone]);

  // Cycle celebration theme on button click as requested!
  const handleLaunchAndCycle = useCallback(() => {
    setSalvoCount((c) => c + 1);

    // Pick next theme variant in cycle
    const currentIndex = VARIANT_CYCLE.indexOf(activeTheme);
    const nextIndex = (currentIndex + 1) % VARIANT_CYCLE.length;
    const nextTheme = VARIANT_CYCLE[nextIndex];

    setActiveTheme(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }

    // Play celebration audio with the new theme style
    const nextCfg = THEME_VARIANTS_CONFIG[nextTheme];
    playFirecrackerAudio(soundVolume, nextCfg.soundTone);

    // Trigger canvas bursts
    const canvas = canvasRef.current;
    if (canvas) {
      const w = canvas.width;
      const h = canvas.height;
      const event = new MouseEvent('click', {
        clientX: w * 0.35 + Math.random() * (w * 0.3),
        clientY: h * 0.22 + Math.random() * (h * 0.25),
      });
      canvas.dispatchEvent(event);
    }
  }, [activeTheme, onThemeChange, soundVolume]);

  const handleSelectTheme = (theme: CelebrationThemeVariant) => {
    setActiveTheme(theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
    const cfg = THEME_VARIANTS_CONFIG[theme];
    playFirecrackerAudio(soundVolume, cfg.soundTone);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 38%, rgba(13, 20, 36, 0.94) 0%, rgba(5, 8, 15, 0.98) 100%)',
      }}
    >
      {/* 60FPS Interactive Canvas Background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-auto z-0 cursor-crosshair" />

      {/* Dynamic Themed Celebration Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-5 sm:p-6 text-center overflow-hidden transition-all duration-300 transform animate-[celebrationPop_0.32s_cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: currentCfg.bgGradient,
          border: currentCfg.cardBorder,
          boxShadow: currentCfg.cardGlow,
        }}
      >
        {/* Subtle Ambient Shimmer Corner Accents */}
        <div className="absolute top-0 left-0 w-36 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 z-20"
          title="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimal Theme Switcher Tabs */}
        <div className="flex items-center justify-center gap-1.5 mb-4 relative z-20">
          {VARIANT_CYCLE.map((variantId) => {
            const vCfg = THEME_VARIANTS_CONFIG[variantId];
            const isActive = activeTheme === variantId;
            return (
              <button
                key={variantId}
                type="button"
                onClick={() => handleSelectTheme(variantId)}
                className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-white/20 border-white/40 text-white shadow-sm'
                    : 'bg-black/30 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-black/50'
                }`}
              >
                <span>{vCfg.icon}</span>
                <span className="hidden sm:inline text-[9.5px]">{vCfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Centerpiece Icon */}
        <div className="relative mx-auto mb-3 flex items-center justify-center">
          {activeTheme === 'rockets' && (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-transparent border border-cyan-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.25)]">
              <Rocket className="w-8 h-8 text-cyan-300 -rotate-45" />
            </div>
          )}

          {activeTheme === 'dolls' && (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-transparent border border-pink-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(236,72,153,0.25)]">
              <span className="text-3xl">🎎</span>
            </div>
          )}

          {activeTheme === 'arcade' && (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.25)]">
              <Gamepad2 className="w-8 h-8 text-cyan-300" />
            </div>
          )}

          {activeTheme === 'golden_royal' && (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              <Trophy className="w-8 h-8 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />
            </div>
          )}
        </div>

        {/* Minimal Discipline Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[9.5px] font-mono font-bold uppercase tracking-wider mb-2 shadow-sm ${currentCfg.badgeStyle}`}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{currentCfg.badgeText}</span>
        </div>

        {/* Main Title */}
        <h2
          className={`text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentCfg.titleGradient} uppercase tracking-tight mb-1 font-sans`}
        >
          {title || currentCfg.title}
        </h2>

        {/* Subtitle / Tagline */}
        <p className="text-xs text-slate-400 font-medium mb-3.5 max-w-sm mx-auto">
          {currentCfg.tagline}
        </p>

        {/* Real Trade Session Results Card */}
        <div className="relative bg-[#070c14]/95 border border-white/10 rounded-xl p-3.5 mb-3.5 shadow-xl text-center">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              NET SESSION PROFIT
            </span>
            {assetName && (
              <span className="text-[9.5px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {assetName}
              </span>
            )}
          </div>

          {/* Big Profit Display */}
          <div className={`text-4xl sm:text-5xl font-mono font-black tracking-tight py-0.5 ${currentCfg.profitGlow}`}>
            +${winProfit > 0 ? winProfit.toFixed(2) : '2.02'}
          </div>

          {/* 4-Stat Real Trading Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-white/5 text-left font-mono">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <span className="text-[8.5px] text-slate-500 uppercase block font-sans">Final Balance</span>
              <span className="text-xs font-bold text-white block mt-0.5">
                ${(currentBalance ?? (startBalance ? startBalance + winProfit : 2133.91)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <span className="text-[8.5px] text-slate-500 uppercase block font-sans">Start Capital</span>
              <span className="text-xs font-bold text-slate-300 block mt-0.5">
                ${(startBalance ?? 2131.89).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <span className="text-[8.5px] text-slate-500 uppercase block font-sans">Win Rate</span>
              <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                {winRate}%
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <span className="text-[8.5px] text-slate-500 uppercase block font-sans">Trades Record</span>
              <span className="text-xs font-bold text-slate-200 block mt-0.5">
                <span className="text-emerald-400">{winsCount ?? 2}W</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-rose-400">{lossesCount ?? 0}L</span>
              </span>
            </div>
          </div>
        </div>

        {/* Clean Action Buttons */}
        <div className="space-y-2">
          {/* Primary: Continue Trading */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Claim Profit & Continue</span>
          </button>

          {/* Secondary: Launch Fireworks (Theme Cycle) */}
          <button
            type="button"
            onClick={handleLaunchAndCycle}
            className="w-full py-2 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Launch Fireworks ({currentCfg.label})</span>
            <RefreshCw className="w-3 h-3 opacity-60 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
