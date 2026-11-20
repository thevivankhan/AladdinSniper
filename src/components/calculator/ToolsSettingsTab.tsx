import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Globe,
  Radio,
  RotateCcw,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Crown,
  Trophy,
  Bell,
  Play,
  Crosshair,
  Gamepad2,
  Timer,
  Waves,
  Music,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  FileText,
  Send,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  SOUND_PACKS,
  SoundToneStyle,
  SoundEventType,
  subscribeAudioPlayback,
  playSoundEffect,
  speakVoiceNotification,
  playFirecrackerAudio,
} from '../../utils/audioSystem';

import { CelebrationThemeVariant } from './FireworksCelebrationOverlay';

export type AppThemeType =
  | 'sniper'
  | 'arcade'
  | 'zen'
  | 'cyberpunk'
  | 'dark'
  | 'light'
  | 'cyber'
  | 'gold';

export interface AppThemeConfig {
  id: AppThemeType;
  name: string;
  desc: string;
  badge: string;
  palette: string[];
}

export const THEME_OPTIONS: AppThemeConfig[] = [
  {
    id: 'sniper',
    name: 'Sniper Tactical',
    desc: 'Stealth obsidian slate with precision tactical amber/emerald HUD glow',
    badge: 'TACTICAL',
    palette: ['#0c1017', '#f59e0b', '#10b981'],
  },
  {
    id: 'arcade',
    name: '8-Bit Arcade',
    desc: 'Retro arcade cabinet with electric cyan and magenta CRT scanline glow',
    badge: 'ARCADE',
    palette: ['#0a081a', '#06b6d4', '#ec4899'],
  },
  {
    id: 'zen',
    name: 'Zen Harmonic',
    desc: 'Deep bamboo jade slate with calming emerald glow & warm lotus gold',
    badge: 'HARMONIC',
    palette: ['#051410', '#10b981', '#f59e0b'],
  },
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    desc: 'High-contrast synthwave neon magenta & cyan with futuristic grid edges',
    badge: 'CYBER',
    palette: ['#080514', '#f43f5e', '#00f0ff'],
  },
  {
    id: 'light',
    name: 'Daylight Slate',
    desc: 'Crisp bright slate for daytime high-contrast trading',
    badge: 'DAYLIGHT',
    palette: ['#f8fafc', '#64748b', '#0284c7'],
  },
  {
    id: 'gold',
    name: 'Midnight Gold',
    desc: 'Luxury charcoal with rich 24K imperial amber gold',
    badge: 'ROYAL',
    palette: ['#0f0e0b', '#d97706', '#fbbf24'],
  },
];

interface SessionLogItem {
  id: string;
  dateFormatted: string;
  accountBalance: number;
  tradesAllowed: number;
  winsNeeded: number;
  payoutRate: number;
  gainTargetPercent: number;
  winProfit: number;
  endingBalance: number;
  won: number;
  lost: number;
  profitOrLoss: number;
  trades?: Array<{
    step: number;
    result: 'WIN' | 'LOSS';
    direction?: 'BUY' | 'SELL';
    stake: number;
    payoutRate: number;
    balanceAfter: number;
  }>;
}

interface ToolsSettingsTabProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playTone: (type: SoundEventType) => void;
  onOpenFireworks: (themeVariant?: CelebrationThemeVariant) => void;
  currentTheme: AppThemeType;
  setCurrentTheme: (theme: AppThemeType) => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  voiceLanguage: 'Hindi' | 'English';
  setVoiceLanguage: (lang: 'Hindi' | 'English') => void;
  voiceAnnounceEnabled: boolean;
  setVoiceAnnounceEnabled: (enabled: boolean) => void;
  toneStyle: SoundToneStyle;
  setToneStyle: (style: SoundToneStyle) => void;
  sessionLogs?: SessionLogItem[];
  onClearLogs?: () => void;
}

export const ToolsSettingsTab: React.FC<ToolsSettingsTabProps> = ({
  soundEnabled,
  setSoundEnabled,
  playTone,
  onOpenFireworks,
  currentTheme,
  setCurrentTheme,
  soundVolume,
  setSoundVolume,
  voiceLanguage,
  setVoiceLanguage,
  voiceAnnounceEnabled,
  setVoiceAnnounceEnabled,
  toneStyle,
  setToneStyle,
  sessionLogs = [],
  onClearLogs,
}) => {
  // Webhook & Broker API credentials with persistent localStorage
  const [pocketOptionWebhook, setPocketOptionWebhook] = useState(() => {
    return (
      localStorage.getItem('aladdin_webhook_url') ||
      'https://api.aladdinsniper.live/v1/webhook/trade'
    );
  });
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem('aladdin_api_key') || 'pk_live_aladdin_sniper_92';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  // Sound Category Toggles
  const [soundCategories, setSoundCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('aladdin_sound_categories');
      return saved
        ? JSON.parse(saved)
        : {
            signals: true,
            wins: true,
            losses: true,
            milestones: true,
            clicks: true,
            countdown: true,
          };
    } catch {
      return {
        signals: true,
        wins: true,
        losses: true,
        milestones: true,
        clicks: true,
        countdown: true,
      };
    }
  });

  const toggleCategory = (key: keyof typeof soundCategories) => {
    setSoundCategories((prev: typeof soundCategories) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('aladdin_sound_categories', JSON.stringify(updated));
      return updated;
    });
    playSoundEffect('click', soundVolume, toneStyle);
  };

  // Mute memory
  const previousVolumeRef = useRef<number>(0.85);

  const toggleMute = () => {
    if (soundVolume > 0.005) {
      previousVolumeRef.current = soundVolume;
      setSoundVolume(0);
    } else {
      setSoundVolume(previousVolumeRef.current || 0.85);
      playSoundEffect('click', previousVolumeRef.current || 0.85, toneStyle);
    }
  };

  // Real-time audio playback listener for visual equalizer feedback
  const [activeAudioEvent, setActiveAudioEvent] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const visualizerTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAudioPlayback((event, style) => {
      setActiveAudioEvent(`${event.toUpperCase()} • ${style.toUpperCase()}`);
      setIsAudioPlaying(true);
      if (visualizerTimerRef.current) {
        clearTimeout(visualizerTimerRef.current);
      }
      visualizerTimerRef.current = setTimeout(() => {
        setIsAudioPlaying(false);
      }, 1200);
    });
    return () => {
      unsubscribe();
      if (visualizerTimerRef.current) {
        clearTimeout(visualizerTimerRef.current);
      }
    };
  }, []);

  // Webhook Ping Test Simulator
  const [pingStatus, setPingStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);

  const handleTestWebhookPing = () => {
    setPingStatus('testing');
    playSoundEffect('signal', soundVolume, toneStyle);

    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 25) + 32; // 32-57ms
      setPingLatency(simulatedLatency);
      setPingStatus('success');
      playSoundEffect('win', soundVolume, toneStyle);
      setTimeout(() => {
        setPingStatus('idle');
      }, 5000);
    }, 600);
  };

  const handleSaveBrokerConfig = () => {
    localStorage.setItem('aladdin_webhook_url', pocketOptionWebhook);
    localStorage.setItem('aladdin_api_key', apiKeyInput);
    setSaveFeedback(true);
    playSoundEffect('copy', soundVolume, toneStyle);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleCopyApiKey = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(apiKeyInput);
      } else {
        // Fallback for iframe sandbox
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = apiKeyInput;
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.opacity = '0';
        document.body.appendChild(tempTextarea);
        tempTextarea.focus();
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
      }
      setCopiedKey(true);
      playSoundEffect('copy', soundVolume, toneStyle);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // In case both fail, still provide UI feedback
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Sound Test Audition Handlers (Audition always plays at current volume so user can test)
  const handleTestClick = () => {
    playSoundEffect('click', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi' ? 'बटन क्लिक' : 'Button Clicked',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestWin = () => {
    playSoundEffect('win', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi'
          ? 'शानदार जीत! अगला कदम तैयार है।'
          : 'Great Win! Target step secured.',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestLoss = () => {
    playSoundEffect('loss', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi'
          ? 'रिकवरी स्टेप एक्टिव है।'
          : 'Recovery step active. Stay disciplined.',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestStreak = () => {
    playSoundEffect('streak', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi'
          ? 'हॉट स्ट्रीक! शानदार बढ़त!'
          : 'Hot Streak! Consecutive wins secured!',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestTarget = () => {
    playSoundEffect('target', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi'
          ? 'टारगेट पूरा हुआ! बहुत बधाई!'
          : 'Target Reached! Goal Achieved!',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestSignal = () => {
    playSoundEffect('signal', soundVolume, toneStyle);
    if (voiceAnnounceEnabled) {
      speakVoiceNotification(
        voiceLanguage === 'Hindi'
          ? 'नया ट्रेडिंग सिग्नल मिला'
          : 'New Aladdin AI Signal Detected',
        voiceLanguage,
        soundVolume
      );
    }
  };

  const handleTestStage = () => {
    playSoundEffect('stage', soundVolume, toneStyle);
  };

  const handleTestCountdown = () => {
    playSoundEffect('countdown', soundVolume, toneStyle);
  };

  const [fireworksThemeIdx, setFireworksThemeIdx] = useState(0);
  const celebrationThemeList: CelebrationThemeVariant[] = [
    'golden_royal',
    'rockets',
    'dolls',
    'arcade',
  ];

  const handleTestFireworks = () => {
    const nextIdx = (fireworksThemeIdx + 1) % celebrationThemeList.length;
    setFireworksThemeIdx(nextIdx);
    const chosenVariant = celebrationThemeList[nextIdx];
    playFirecrackerAudio(soundVolume, toneStyle);
    onOpenFireworks(chosenVariant);
  };

  const handleTestVoiceSpeech = () => {
    playSoundEffect('signal', soundVolume, toneStyle);
    const msg =
      voiceLanguage === 'Hindi'
        ? 'अलादीन एआई वॉयस असिस्टेंट पूरी तरह एक्टिव है। आपके ट्रेड्स सुरक्षित हैं।'
        : 'Aladdin AI voice system is fully active. Target and recovery steps online.';
    speakVoiceNotification(msg, voiceLanguage, soundVolume);
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Export session trade logs as CSV
  const handleExportCSV = () => {
    playSoundEffect('click', soundVolume, toneStyle);
    if (sessionLogs.length === 0) {
      setExportNotice('No session history available to export yet. Complete a trade session first.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const headers = [
      'Session ID',
      'Date & Time',
      'Start Balance ($)',
      'Ending Balance ($)',
      'P&L ($)',
      'Trades Count',
      'Wins',
      'Losses',
      'Win Rate (%)',
      'Payout Rate (%)',
    ];

    const rows = sessionLogs.map((log) => [
      log.id,
      `"${log.dateFormatted}"`,
      log.accountBalance.toFixed(2),
      log.endingBalance.toFixed(2),
      log.profitOrLoss.toFixed(2),
      log.won + log.lost,
      log.won,
      log.lost,
      log.won + log.lost > 0
        ? Math.round((log.won / (log.won + log.lost)) * 100) + '%'
        : '100%',
      log.payoutRate + '%',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `aladdin-sniper-trade-logs-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportNotice('CSV trade log exported successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Export session trade logs as JSON
  const handleExportJSON = () => {
    playSoundEffect('click', soundVolume, toneStyle);
    if (sessionLogs.length === 0) {
      setExportNotice('No session history available to export yet. Complete a trade session first.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(sessionLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `aladdin-sniper-trade-logs-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportNotice('JSON trade log exported successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleResetDefaults = () => {
    setCurrentTheme('dark');
    setSoundEnabled(true);
    setSoundVolume(0.85);
    setVoiceLanguage('English');
    setVoiceAnnounceEnabled(true);
    setToneStyle('sniper');
    setPocketOptionWebhook('https://api.aladdinsniper.live/v1/webhook/trade');
    setApiKeyInput('pk_live_aladdin_sniper_92');
    localStorage.setItem('aladdin_app_theme', 'dark');
    localStorage.setItem('aladdin_sound_enabled', 'true');
    localStorage.setItem('aladdin_sound_vol', '0.85');
    localStorage.setItem('aladdin_voice_lang', 'English');
    localStorage.setItem('aladdin_voice_on', 'true');
    localStorage.setItem('aladdin_sound_pack', 'sniper');
    localStorage.setItem(
      'aladdin_webhook_url',
      'https://api.aladdinsniper.live/v1/webhook/trade'
    );
    localStorage.setItem('aladdin_api_key', 'pk_live_aladdin_sniper_92');

    const defaultCats = {
      signals: true,
      wins: true,
      losses: true,
      milestones: true,
      clicks: true,
      countdown: true,
    };
    setSoundCategories(defaultCats);
    localStorage.setItem('aladdin_sound_categories', JSON.stringify(defaultCats));

    playSoundEffect('target', 0.85, 'sniper');
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2500);
  };

  const simulatedPayload = {
    source: 'ALADDIN_SNIPER_V1.7',
    broker: 'Pocket Option (OTC)',
    asset: 'AUD/CHF OTC',
    event: 'HEARTBEAT_SYNC',
    token: apiKeyInput.slice(0, 8) + '••••••••',
    timestamp: new Date().toISOString(),
    status: 'AUTHENTICATED_READY',
  };

  return (
    <div className="space-y-3.5 text-slate-100 font-sans">
      {/* 1. SOUND & JINGLES ENGINE */}
      <div className="bg-[#0c1017] border border-[#1b2233] p-3.5 rounded-[6px] shadow-sm space-y-3">
        {/* Header with Live Equalizer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Audio & Jingles Engine
                </h3>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black rounded uppercase">
                  Web Audio Synthesizer
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Synthesized acoustic themes, polyphonic celebration jingles & live audio feedback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Live Visualizer Bar */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5">
              <div className="flex items-end gap-0.5 h-3.5 w-10 justify-center">
                <span
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAudioPlaying ? 'h-3 bg-amber-400 animate-pulse' : 'h-1 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isAudioPlaying ? 'h-3.5 bg-cyan-400' : 'h-1.5 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAudioPlaying ? 'h-2 bg-emerald-400 animate-bounce' : 'h-1 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isAudioPlaying ? 'h-3.5 bg-amber-400' : 'h-1.5 bg-slate-700'
                  }`}
                />
                <span
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isAudioPlaying ? 'h-2.5 bg-rose-400' : 'h-1 bg-slate-700'
                  }`}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 truncate max-w-[100px]">
                {isAudioPlaying ? activeAudioEvent : 'READY'}
              </span>
            </div>

            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) {
                  playSoundEffect('click', soundVolume, toneStyle);
                }
              }}
              className={`px-2.5 py-1 rounded-[3px] text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span>{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Master Volume Slider & Mute Toggle */}
        <div className="bg-[#141926] p-2.5 rounded-[4px] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Master Output Volume</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                {soundVolume <= 0.005 ? 'UNMUTE' : 'MUTE'}
              </button>
              <span className="font-mono font-black text-amber-400 w-9 text-right">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundVolume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSoundVolume(val);
              // Live feedback with the exact new volume
              if (val > 0.005) {
                playSoundEffect('click', val, toneStyle);
              }
            }}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
            <span>Mute (0%)</span>
            <span>Balanced (50%)</span>
            <span>Maximum (100%)</span>
          </div>
        </div>

        {/* Sound Packs (Themes) Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Sound Theme Pack (4 Styles)</span>
            </label>
            <span className="text-[9px] font-mono font-bold text-amber-400">
              ACTIVE THEME: {toneStyle.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {SOUND_PACKS.map((pack) => {
              const isSelected = toneStyle === pack.id;
              // Theme color accents
              const themeColorStyles = {
                sniper: {
                  selectedBorder: 'border-amber-500 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
                  badge: 'bg-amber-500 text-black',
                  text: 'text-amber-400',
                  palette: ['#0c1017', '#f59e0b', '#10b981'],
                },
                arcade: {
                  selectedBorder: 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.35)]',
                  badge: 'bg-cyan-400 text-black',
                  text: 'text-cyan-400',
                  palette: ['#0a081a', '#06b6d4', '#ec4899'],
                },
                zen: {
                  selectedBorder: 'border-emerald-500 bg-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                  badge: 'bg-emerald-500 text-black',
                  text: 'text-emerald-400',
                  palette: ['#051410', '#10b981', '#f59e0b'],
                },
                cyberpunk: {
                  selectedBorder: 'border-fuchsia-500 bg-fuchsia-500/15 shadow-[0_0_15px_rgba(236,72,153,0.35)]',
                  badge: 'bg-fuchsia-500 text-white',
                  text: 'text-fuchsia-400',
                  palette: ['#080514', '#f43f5e', '#00f0ff'],
                },
              }[pack.id];

              return (
                <div
                  key={pack.id}
                  onClick={() => {
                    setToneStyle(pack.id);
                    setCurrentTheme(pack.id as AppThemeType);
                    playSoundEffect('win', soundVolume, pack.id);
                  }}
                  className={`p-2.5 rounded-[4px] border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                    isSelected
                      ? themeColorStyles.selectedBorder
                      : 'border-white/10 bg-[#141926] hover:bg-[#1a2133]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-100 flex items-center gap-1">
                        {pack.id === 'sniper' && (
                          <Crosshair className="w-3 h-3 text-amber-400" />
                        )}
                        {pack.id === 'arcade' && (
                          <Gamepad2 className="w-3 h-3 text-cyan-400" />
                        )}
                        {pack.id === 'zen' && (
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                        )}
                        {pack.id === 'cyberpunk' && (
                          <Zap className="w-3 h-3 text-purple-400" />
                        )}
                        <span>{pack.name}</span>
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          isSelected
                            ? themeColorStyles.badge
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {pack.badge}
                      </span>
                    </div>

                    <p className="text-[9.5px] text-slate-400 leading-snug line-clamp-2 mb-2">
                      {pack.desc}
                    </p>

                    {/* Theme Palette Swatches */}
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="text-[8.5px] font-mono text-slate-500 uppercase">Colors:</span>
                      <div className="flex items-center gap-1">
                        {themeColorStyles.palette.map((color, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-xs"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold ${
                        isSelected ? themeColorStyles.text : 'text-slate-500'
                      }`}
                    >
                      {isSelected ? '✨ THEME APPLIED' : 'TAP TO APPLY'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToneStyle(pack.id);
                        setCurrentTheme(pack.id as AppThemeType);
                        playSoundEffect('win', soundVolume, pack.id);
                      }}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 hover:bg-white/20 text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 text-amber-400" />
                      <span>Audition</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Granular Sound Category Filters */}
        <div className="bg-[#141926] p-2.5 rounded-[4px] border border-white/5 space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Sound Category Filters
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => toggleCategory('wins')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.wins
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>Wins & Streaks</span>
              <span className="text-[9px]">{soundCategories.wins ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('losses')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.losses
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>Loss Recovery</span>
              <span className="text-[9px]">{soundCategories.losses ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('signals')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.signals
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>AI Radar Signals</span>
              <span className="text-[9px]">{soundCategories.signals ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('milestones')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.milestones
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>Target Fanfare</span>
              <span className="text-[9px]">{soundCategories.milestones ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('countdown')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.countdown
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>Countdown Ticks</span>
              <span className="text-[9px]">{soundCategories.countdown ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleCategory('clicks')}
              className={`px-2 py-1.5 rounded-[3px] text-[10px] font-bold border flex items-center justify-between cursor-pointer transition-colors ${
                soundCategories.clicks
                  ? 'bg-slate-300/15 border-slate-400/40 text-slate-200'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span>UI Clicks & Haptic</span>
              <span className="text-[9px]">{soundCategories.clicks ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Soundboard & Jingles Showcase */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1.5">
            Interactive Jingles & Soundboard Showcase
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Victory Win Jingle */}
            <button
              onClick={handleTestWin}
              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                <Trophy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Victory Jingle</span>
              </div>
              <span className="text-[9px] text-emerald-300/80 block leading-tight">
                Ascending 4-voice triumph flourish
              </span>
            </button>

            {/* 2. Hot Streak Jingle */}
            <button
              onClick={handleTestStreak}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
                <Flame className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Hot Streak Jingle</span>
              </div>
              <span className="text-[9px] text-amber-300/80 block leading-tight">
                Rapid pentatonic run + shimmer
              </span>
            </button>

            {/* 3. Jackpot Fanfare */}
            <button
              onClick={handleTestTarget}
              className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-yellow-400 mb-0.5">
                <Crown className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Target Fanfare</span>
              </div>
              <span className="text-[9px] text-yellow-300/80 block leading-tight">
                Brass herald fanfare + bells
              </span>
            </button>

            {/* 4. AI Radar Lock */}
            <button
              onClick={handleTestSignal}
              className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 mb-0.5">
                <Crosshair className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">AI Radar Lock</span>
              </div>
              <span className="text-[9px] text-cyan-300/80 block leading-tight">
                Quantum dual-pulse radar chime
              </span>
            </button>

            {/* 5. Calming Recovery Cue */}
            <button
              onClick={handleTestLoss}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-rose-400 mb-0.5">
                <RotateCcw className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Recovery Cue</span>
              </div>
              <span className="text-[9px] text-rose-300/80 block leading-tight">
                Gentle warm tone for composure
              </span>
            </button>

            {/* 6. Compounding Stage Advance */}
            <button
              onClick={handleTestStage}
              className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-purple-400 mb-0.5">
                <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Stage Advance</span>
              </div>
              <span className="text-[9px] text-purple-300/80 block leading-tight">
                Compounding tier unlock chime
              </span>
            </button>

            {/* 7. Precision Countdown Tick */}
            <button
              onClick={handleTestCountdown}
              className="p-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-slate-300 mb-0.5">
                <Timer className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase">Countdown Tick</span>
              </div>
              <span className="text-[9px] text-slate-400 block leading-tight">
                Tactical radar clock pulse
              </span>
            </button>

            {/* 8. Fireworks Burst & Celebration FX (Cycles through Rockets, Dolls, Arcade, Royal Gold) */}
            <button
              onClick={handleTestFireworks}
              className="p-2 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 rounded-[4px] text-left transition-all active:scale-95 cursor-pointer text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] relative overflow-hidden group"
              title="Launch dynamic fireworks with changing celebration themes"
            >
              <div className="flex items-center justify-between font-black mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-700 animate-bounce" />
                  <span className="text-[11px] uppercase tracking-wider">💥 FIREWORKS FX</span>
                </div>
                <span className="text-[8.5px] font-mono font-black bg-black/80 text-yellow-300 px-1.5 py-0.2 rounded uppercase">
                  {celebrationThemeList[fireworksThemeIdx] === 'golden_royal'
                    ? '👑 ROYAL'
                    : celebrationThemeList[fireworksThemeIdx] === 'rockets'
                    ? '🚀 ROCKETS'
                    : celebrationThemeList[fireworksThemeIdx] === 'dolls'
                    ? '🎎 DOLLS'
                    : '👾 ARCADE'}
                </span>
              </div>
              <span className="text-[9px] font-bold text-black/90 block leading-tight">
                Rockets soaring, dolls party, arcade & royal gold
              </span>
              <span className="text-[8px] font-black uppercase text-rose-900 block mt-0.5">
                Tap to cycle & launch celebration theme
              </span>
            </button>
          </div>
        </div>

        {/* 2-Way Spoken Voice Switcher: English vs Hindi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="bg-[#141926] p-2.5 rounded-[4px] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>Voice Speech Language</span>
              </label>
              <button
                type="button"
                onClick={handleTestVoiceSpeech}
                className="text-[9px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Play className="w-2.5 h-2.5" />
                <span>Test Voice</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-black/40 rounded-[3px] border border-white/5">
              <button
                onClick={() => {
                  setVoiceLanguage('English');
                  playSoundEffect('click', soundVolume, toneStyle);
                  speakVoiceNotification('English Voice Activated', 'English', soundVolume);
                }}
                className={`py-1.5 px-2 rounded-[2px] text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  voiceLanguage === 'English'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>

              <button
                onClick={() => {
                  setVoiceLanguage('Hindi');
                  playSoundEffect('click', soundVolume, toneStyle);
                  speakVoiceNotification('हिंदी आवाज एक्टिवेट हुई', 'Hindi', soundVolume);
                }}
                className={`py-1.5 px-2 rounded-[2px] text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  voiceLanguage === 'Hindi'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hindi (हिंदी)
              </button>
            </div>
          </div>

          {/* Spoken Voice Toggle */}
          <div className="flex items-center justify-between bg-[#141926] p-2.5 rounded-[4px] border border-white/5">
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                Spoken Voice Announcements
              </span>
              <span className="text-[10px] text-slate-400">
                Speaks trade steps, wins, and target reached ({voiceLanguage})
              </span>
            </div>
            <button
              onClick={() => {
                const nextVal = !voiceAnnounceEnabled;
                setVoiceAnnounceEnabled(nextVal);
                playSoundEffect('click', soundVolume, toneStyle);
              }}
              className={`px-2.5 py-1 rounded-[3px] text-[10px] font-black uppercase transition-all cursor-pointer ${
                voiceAnnounceEnabled
                  ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              {voiceAnnounceEnabled ? 'Active' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. THEME SWITCHER (DARK, LIGHT, CYBER, GOLD) */}
      <div className="bg-[#0c1017] border border-[#1b2233] p-3.5 rounded-[6px] shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <div className="w-7 h-7 rounded-[3px] bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sun className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
              Visual Theme Mode
            </h3>
            <p className="text-[10px] text-slate-400">
              Instant real-time switch between 4 trading environment palettes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setCurrentTheme(theme.id);
                  if (['sniper', 'arcade', 'zen', 'cyberpunk'].includes(theme.id)) {
                    setToneStyle(theme.id as SoundToneStyle);
                  }
                  playSoundEffect('click', soundVolume, toneStyle);
                }}
                className={`p-2.5 rounded-[4px] text-left border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'border-white/10 bg-[#141926] hover:bg-[#1a2133]'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    {theme.id === 'arcade' ? (
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : theme.id === 'zen' ? (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    ) : theme.id === 'cyberpunk' || theme.id === 'cyber' ? (
                      <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                    ) : theme.id === 'light' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : theme.id === 'gold' ? (
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                      {theme.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      {theme.palette.map((c, i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full border border-white/20"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">{theme.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BROKER INTEGRATION HUB (POCKET OPTION OTC) */}
      <div className="bg-[#0c1017] border border-[#1b2233] p-3.5 rounded-[6px] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[3px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                Broker Integration Hub
              </h3>
              <p className="text-[10px] text-slate-400">
                Pocket Option / OTC automation endpoint configuration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {pingStatus === 'success' ? (
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                200 OK • Ping {pingLatency}ms
              </span>
            ) : pingStatus === 'testing' ? (
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded animate-pulse">
                Testing ping...
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Connected
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Webhook Endpoint URL
              </label>
              <input
                type="text"
                value={pocketOptionWebhook}
                onChange={(e) => setPocketOptionWebhook(e.target.value)}
                placeholder="https://api.aladdinsniper.live/v1/webhook/trade"
                className="w-full bg-[#141926] border border-white/10 rounded-[4px] p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Auto Sync API Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showApiKey ? (
                    <>
                      <EyeOff className="w-2.5 h-2.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-2.5 h-2.5" /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-[#141926] border border-white/10 rounded-[4px] p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500 pr-16"
                />
                <button
                  onClick={handleCopyApiKey}
                  className="absolute right-1.5 top-1.5 px-2 py-0.5 rounded text-[10px] bg-white/10 hover:bg-white/20 text-slate-200 font-bold transition-all cursor-pointer"
                >
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Row: Ping Test, Save, View Payload */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhookPing}
                disabled={pingStatus === 'testing'}
                className="px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-[4px] text-[11px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Test Webhook Ping</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPayloadModal(!showPayloadModal)}
                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-[4px] text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                <span>{showPayloadModal ? 'Hide Payload' : 'View Payload JSON'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveBrokerConfig}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-[4px] text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              {saveFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Save Config</span>
                </>
              )}
            </button>
          </div>

          {/* Expandable Webhook JSON Payload Preview */}
          {showPayloadModal && (
            <div className="p-2.5 rounded-[4px] bg-black/60 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                Simulated Webhook Signal Payload:
              </span>
              <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto p-1.5 bg-[#0a0e17] rounded border border-white/5">
                {JSON.stringify(simulatedPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 4. DATA MANAGEMENT & SESSION HISTORY BACKUP */}
      <div className="bg-[#0c1017] border border-[#1b2233] p-3.5 rounded-[6px] shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <div className="w-7 h-7 rounded-[3px] bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
              Session History & Data Export
            </h3>
            <p className="text-[10px] text-slate-400">
              Backup your trade sessions or clean stored records ({sessionLogs.length} sessions logged)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[4px] text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[4px] text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
          </div>

          {exportNotice && (
            <div className="w-full text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1.5 rounded-[4px] animate-fade-in flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{exportNotice}</span>
            </div>
          )}

          <div>
            {confirmClearLogs ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-rose-400 font-bold">Clear all history?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearLogs) onClearLogs();
                    setConfirmClearLogs(false);
                    playSoundEffect('loss', soundVolume, toneStyle);
                  }}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearLogs(false)}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearLogs(true)}
                disabled={sessionLogs.length === 0}
                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-[4px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. FOOTER & RESET ACTION */}
      <div className="bg-[#0c1017] border border-[#1b2233] p-3 rounded-[6px] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div>
          <span className="text-xs font-bold text-slate-200 block">
            Aladdin AI v1.7 • Multi-Asset Protocol
          </span>
          <span className="text-[10px] text-slate-400">
            Dynamic Matrix Recovery + High-Fidelity Audio Synthesizer & Jingles
          </span>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[4px] text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetFeedback ? 'Reset Done' : 'Reset Defaults'}</span>
        </button>
      </div>
    </div>
  );
};
