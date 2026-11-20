import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  Calendar,
  FileText,
  Copy,
  Share2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Award,
  Sparkles,
  Zap,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Info,
  Maximize2,
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  Timer,
  Check,
  ExternalLink,
  ArrowLeftRight,
  Wrench,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicCalculator } from './DynamicCalculator';
import { PocketSniperLiveChart, ActiveTradeOrder } from './PocketSniperLiveChart';
import { PnLShareCardModal, PnLShareData } from './PnLShareCardModal';
import { ToolsSettingsTab, AppThemeType } from './ToolsSettingsTab';
import { GenieTab } from '../genie/GenieTab';
import {
  FireworksCelebrationOverlay,
  CelebrationThemeVariant,
  speakVoiceNotification,
} from './FireworksCelebrationOverlay';
import {
  calculateSniperPlan,
  calculateNextStake,
  SniperPlanMetrics,
  StakeStepInfo,
} from '../../utils/sniperAlgorithm';
import {
  AladdinTradeEngine,
  LiveNextStakeResult,
  ScheduleMatrixResult,
  CapitalRequiredInfo,
} from '../../utils/aladdinTradeEngine';
import {
  playSoundEffect,
  SoundToneStyle,
  SoundEventType,
  SOUND_PACKS,
} from '../../utils/audioSystem';

export interface LoggedSession {
  id: string;
  date: string;
  dateFormatted: string;
  dayString: string;
  accountBalance: number;
  tradesAllowed: number;
  winsNeeded: number;
  payoutRate: number;
  capitalGoal: number;
  gainTargetPercent: number;
  winProfit: number;
  endingBalance: number;
  won: number;
  lost: number;
  profitOrLoss: number;
  trades: Array<{
    step: number;
    result: 'WIN' | 'LOSS';
    direction?: 'BUY' | 'SELL';
    stake: number;
    payoutRate: number;
    balanceAfter: number;
  }>;
}

const OTC_ASSETS = [
  'AUD/CHF OTC',
  'AUD/USD OTC',
  'EUR/USD OTC',
  'USD/SGD OTC',
  'GBP/USD OTC',
  'USD/JPY OTC',
  'NZD/USD OTC',
  'USD/CAD OTC',
  'EUR/JPY OTC',
  'GBP/JPY OTC',
  'AUD/CAD OTC',
];

// Pocket Option verified original broker link
const POCKET_OPTION_AFFILIATE_URL = 'https://pocket-friends.co/r/mphdnyllo5';

// Aladdin Blue Genie App Icon Component (Edge-to-edge transparent diamond badge)
const LampIcon = ({ className }: { className?: string }) => (
  <img
    src="/aladdin-blue-genie-icon.png"
    alt="Aladdin Blue Genie Icon"
    className={`object-contain select-none pointer-events-none block drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] ${className || 'w-5 h-5'}`}
  />
);

// Dynamic audio synthesis delegated to audioSystem engine
const playDynamicTone = (
  type: SoundEventType,
  volume: number = 0.85,
  style: SoundToneStyle = 'sniper'
) => {
  playSoundEffect(type, volume, style);
};

export const PocketSniperApp: React.FC = () => {
  // Navigation tabs matching PocketSniper screenshots (added 'tools' & 'genie')
  const [activeTab, setActiveTab] = useState<'trade' | 'settings' | 'session_log' | 'calendar' | 'schedule' | 'matrix' | 'tools' | 'genie'>('trade');
  const [accountType, setAccountType] = useState<'REAL' | 'DEMO'>('REAL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const s = localStorage.getItem('aladdin_sound_enabled');
    return s !== null ? s === 'true' : true;
  });

  // Tools & System Settings State
  const [currentTheme, setCurrentTheme] = useState<AppThemeType>(() => {
    const saved = localStorage.getItem('aladdin_app_theme');
    if (saved === 'dark') return 'sniper';
    if (saved === 'cyber') return 'cyberpunk';
    return (saved as AppThemeType) || 'sniper';
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const v = localStorage.getItem('aladdin_sound_vol');
    return v ? parseFloat(v) : 0.85;
  });
  const [voiceLanguage, setVoiceLanguage] = useState<'Hindi' | 'English'>(() => {
    const saved = localStorage.getItem('aladdin_voice_lang');
    return saved === 'Hindi' ? 'Hindi' : 'English';
  });
  const [voiceAnnounceEnabled, setVoiceAnnounceEnabled] = useState<boolean>(() => {
    const v = localStorage.getItem('aladdin_voice_on');
    return v !== null ? v === 'true' : true;
  });
  const [toneStyle, setToneStyle] = useState<SoundToneStyle>(() => {
    return (localStorage.getItem('aladdin_sound_pack') as SoundToneStyle) || 'sniper';
  });
  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const [fireworksThemeVariant, setFireworksThemeVariant] =
    useState<CelebrationThemeVariant>('golden_royal');

  // Hooked playTone wrapper with volume & style
  const playTone = useCallback(
    (type: SoundEventType) => {
      if (!soundEnabled) return;
      playSoundEffect(type, soundVolume, toneStyle);
    },
    [soundEnabled, soundVolume, toneStyle]
  );

  // Persist theme and sound settings
  useEffect(() => {
    localStorage.setItem('aladdin_app_theme', currentTheme);
  }, [currentTheme]);
  useEffect(() => {
    localStorage.setItem('aladdin_sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);
  useEffect(() => {
    localStorage.setItem('aladdin_sound_vol', soundVolume.toString());
  }, [soundVolume]);
  useEffect(() => {
    localStorage.setItem('aladdin_sound_pack', toneStyle);
  }, [toneStyle]);
  useEffect(() => {
    localStorage.setItem('aladdin_voice_lang', voiceLanguage);
  }, [voiceLanguage]);
  useEffect(() => {
    localStorage.setItem('aladdin_voice_on', voiceAnnounceEnabled.toString());
  }, [voiceAnnounceEnabled]);

  // Core configuration
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('ps_balance');
    return saved ? Number(saved) : 2131.89;
  });
  const [tradesAllowed, setTradesAllowed] = useState<number>(() => {
    const saved = localStorage.getItem('ps_trades');
    return saved ? Number(saved) : 14;
  });
  const [winsNeeded, setWinsNeeded] = useState<number>(() => {
    const saved = localStorage.getItem('ps_wins');
    return saved ? Number(saved) : 2;
  });
  const [payoutRate, setPayoutRate] = useState<number>(() => {
    const saved = localStorage.getItem('ps_payout');
    return saved ? Number(saved) : 92;
  });
  const [riskAmountPercent, setRiskAmountPercent] = useState<number>(100);
  const [selectedAsset, setSelectedAsset] = useState<string>('AUD/CHF OTC');
  const [minStakeLimit, setMinStakeLimit] = useState<number>(1.0);

  // Aladdin Engine Core Configuration
  const [engineMode, setEngineMode] = useState<'ALADDIN_TIERED' | 'ALADDIN_DP' | 'SNIPER_CORE'>('ALADDIN_TIERED');
  const [selectedPreset, setSelectedPreset] = useState<'10/2' | '10/3' | '12/2' | '14/2' | 'CUSTOM'>('14/2');
  const [scheduleViewMode, setScheduleViewMode] = useState<'ALADDIN_DP' | 'STEP_RECOVERY'>('ALADDIN_DP');

  // Live session management
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [sessionStartBalance, setSessionStartBalance] = useState<number>(balance);
  const [currentBalance, setCurrentBalance] = useState<number>(balance);
  const [sessionTrades, setSessionTrades] = useState<
    Array<{
      step: number;
      result: 'WIN' | 'LOSS';
      direction?: 'BUY' | 'SELL';
      stake: number;
      payoutRate: number;
      balanceAfter: number;
    }>
  >([]);

  // Trade Execution Style: 'WIN_LOSS' (Screenshot 6) or 'BUY_SELL' (Screenshot 2 & 4 & 7)
  const [tradeActionMode, setTradeActionMode] = useState<'WIN_LOSS' | 'BUY_SELL'>('BUY_SELL');

  // Live Chart & Real-Time Connected Order State
  const [activeLiveOrder, setActiveLiveOrder] = useState<ActiveTradeOrder | null>(null);
  const [activeOrderSecondsLeft, setActiveOrderSecondsLeft] = useState<number>(15);
  const [selectedChartDuration, setSelectedChartDuration] = useState<number>(15); // Default 15s expiry as requested
  const chartLivePriceRef = useRef<number>(0);
  const lastCountdownTickRef = useRef<number>(-1);
  const poChannelRef = useRef<BroadcastChannel | null>(null);

  const handlePriceChange = useCallback((price: number) => {
    chartLivePriceRef.current = price;
  }, []);

  // Active Trade Execution Countdown (fallback)
  const [pendingTrade, setPendingTrade] = useState<{
    direction: 'BUY' | 'SELL';
    stake: number;
    duration: number; // seconds
    remaining: number;
  } | null>(null);

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [payoutShiftAlert, setPayoutShiftAlert] = useState<string | null>(null);

  // Historical Session Logs
  const [sessionLogs, setSessionLogs] = useState<LoggedSession[]>(() => {
    try {
      const saved = localStorage.getItem('ps_session_logs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'seed-1',
        date: new Date().toISOString(),
        dateFormatted: 'Oct 23, 2026 08:43',
        dayString: new Date().toISOString().slice(0, 10),
        accountBalance: 2131.89,
        tradesAllowed: 14,
        winsNeeded: 2,
        payoutRate: 92,
        capitalGoal: 2133.05,
        gainTargetPercent: 0.0544,
        winProfit: 1.16,
        endingBalance: 2132.41,
        won: 1,
        lost: 2,
        profitOrLoss: 0.52,
        trades: [
          { step: 1, result: 'LOSS', direction: 'SELL', stake: 1.1, payoutRate: 92, balanceAfter: 2130.79 },
          { step: 2, result: 'LOSS', direction: 'SELL', stake: 2.12, payoutRate: 92, balanceAfter: 2128.67 },
          { step: 3, result: 'WIN', direction: 'BUY', stake: 4.06, payoutRate: 92, balanceAfter: 2132.41 },
        ],
      },
    ];
  });

  // Calendar controls
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('ps_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('ps_trades', tradesAllowed.toString());
  }, [tradesAllowed]);

  useEffect(() => {
    localStorage.setItem('ps_wins', winsNeeded.toString());
  }, [winsNeeded]);

  useEffect(() => {
    localStorage.setItem('ps_payout', payoutRate.toString());
  }, [payoutRate]);

  useEffect(() => {
    localStorage.setItem('ps_session_logs', JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  // Active Trade Execution Countdown Timer
  useEffect(() => {
    if (!pendingTrade) return;

    if (pendingTrade.remaining <= 0) {
      // Auto prompt completion or trader confirms WIN/LOSS
      return;
    }

    const timer = setInterval(() => {
      setPendingTrade((prev) => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(timer);
          return { ...prev, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingTrade]);

  // Algorithmic Plan Calculation
  const planMetrics: SniperPlanMetrics = useMemo(() => {
    return calculateSniperPlan({
      balance: sessionStartBalance,
      tradesAllowed,
      winsNeeded,
      payoutRate,
      riskPercent: riskAmountPercent,
      minStake: minStakeLimit,
    });
  }, [sessionStartBalance, tradesAllowed, winsNeeded, payoutRate, riskAmountPercent, minStakeLimit]);

  // Real-time Session Calculations
  const currentStep = sessionTrades.length + 1;
  const winsCount = sessionTrades.filter((t) => t.result === 'WIN').length;
  const lossesCount = sessionTrades.filter((t) => t.result === 'LOSS').length;
  const winsLeft = Math.max(0, winsNeeded - winsCount);
  const tradesRemaining = Math.max(0, tradesAllowed - sessionTrades.length);
  const currentPL = Number((currentBalance - sessionStartBalance).toFixed(2));

  // Count consecutive losses from end of trades list
  const consecutiveLosses = useMemo(() => {
    let count = 0;
    for (let i = sessionTrades.length - 1; i >= 0; i--) {
      if (sessionTrades[i].result === 'LOSS') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [sessionTrades]);

  // 1. Aladdin 3-Stage Tiered Recovery Engine Calculation
  const aladdinLiveStake = useMemo<LiveNextStakeResult>(() => {
    if (!sessionActive) {
      return {
        nextStake: 0,
        phase: 'PROFIT',
        drawdown: 0,
        winsRemaining: winsLeft,
        tradesLeft: tradesRemaining,
        message: 'Session Inactive',
        isBelowMin: false,
      };
    }
    return AladdinTradeEngine.getLiveNextStake({
      initialCapital: sessionStartBalance,
      currentBalance,
      totalTrades: tradesAllowed,
      winsNeeded,
      winsAchieved: winsCount,
      tradesDone: sessionTrades.length,
      payoutPercent: payoutRate,
      baseStake: planMetrics.firstStake || 1.10,
      minStake: minStakeLimit,
      consecutiveLosses,
    });
  }, [
    sessionActive,
    sessionStartBalance,
    currentBalance,
    tradesAllowed,
    winsNeeded,
    winsCount,
    sessionTrades.length,
    payoutRate,
    planMetrics.firstStake,
    minStakeLimit,
    consecutiveLosses,
    winsLeft,
    tradesRemaining,
  ]);

  // 2. Aladdin Dynamic Programming (DP) Memoization Matrix Stake
  const aladdinDPStake = useMemo<number>(() => {
    if (!sessionActive) return 0;
    return AladdinTradeEngine.calculateDPStake({
      totalTrades: tradesAllowed,
      winsNeeded,
      payoutPercent: payoutRate,
      currentBalance,
      tradesDone: sessionTrades.length,
      winsAchieved: winsCount,
      minStake: minStakeLimit,
    });
  }, [
    sessionActive,
    tradesAllowed,
    winsNeeded,
    payoutRate,
    currentBalance,
    sessionTrades.length,
    winsCount,
    minStakeLimit,
  ]);

  // 3. Aladdin Pre-Calculated Schedule Matrix (10/2, 10/3, 10/4, 12/2, 12/3, 14/2 Presets)
  const aladdinScheduleMatrix = useMemo<ScheduleMatrixResult>(() => {
    return AladdinTradeEngine.generateScheduleMatrix({
      preset: selectedPreset,
      capital: sessionStartBalance,
      payoutPercent: payoutRate,
      totalTrades: tradesAllowed,
      winsNeeded,
    });
  }, [selectedPreset, sessionStartBalance, payoutRate, tradesAllowed, winsNeeded]);

  // 4. Exact Capital Required Calculator for any combination of Trades, Wins, and Payout
  const capitalRequiredInfo = useMemo<CapitalRequiredInfo>(() => {
    return AladdinTradeEngine.calculateCapitalRequired({
      totalTrades: tradesAllowed,
      winsNeeded,
      payoutPercent: payoutRate,
      baseStake: planMetrics.firstStake || 1.10,
      minStake: minStakeLimit,
    });
  }, [tradesAllowed, winsNeeded, payoutRate, planMetrics.firstStake, minStakeLimit]);

  // Unified dynamic next stake calculated via chosen real algorithm engine
  const nextStakeCalc = useMemo(() => {
    const drawdown = Math.max(0, sessionStartBalance - currentBalance);
    const inProfit = currentBalance > sessionStartBalance;

    let dynamicPhase: 'STAGE_1_BASE' | 'STAGE_2_CUSHION' | 'STAGE_2_RECOVERY' | 'STAGE_3_PROFIT_LOCK' | 'GOAL_ACHIEVED';

    if (!sessionActive) {
      dynamicPhase = 'STAGE_1_BASE';
      return {
        stake: planMetrics.firstStake || 1.10,
        isBelowMin: false,
        isTargetHit: false,
        reason: 'Session Inactive',
        phase: dynamicPhase,
      };
    }

    if (winsLeft <= 0 || currentBalance >= planMetrics.capitalGoal) {
      dynamicPhase = 'GOAL_ACHIEVED';
      return {
        stake: 0,
        isBelowMin: false,
        isTargetHit: true,
        reason: 'Session Target Reached',
        phase: dynamicPhase,
      };
    }

    // Dynamic Real-Time Stage Transition Algorithm
    if (consecutiveLosses >= 2 || (drawdown > 2.5 && winsLeft === 1)) {
      // Multiple consecutive losses: Stage 2 Aggressive Recovery
      dynamicPhase = 'STAGE_2_RECOVERY';
    } else if (consecutiveLosses === 1 || drawdown > 0.01) {
      // 1 loss or minor drawdown: Stage 2 52% Cushion Defense
      dynamicPhase = 'STAGE_2_CUSHION';
    } else if (winsLeft === 1 || (inProfit && winsCount > 0)) {
      // Closing in on target or in net profit: Stage 3 Profit Lock
      dynamicPhase = 'STAGE_3_PROFIT_LOCK';
    } else {
      // Normal starting sequence: Stage 1 Base Growth
      dynamicPhase = 'STAGE_1_BASE';
    }

    if (engineMode === 'ALADDIN_TIERED') {
      const stake = aladdinLiveStake.nextStake;
      const isBelow = stake < minStakeLimit;
      return {
        stake,
        isBelowMin: isBelow,
        isTargetHit: false,
        reason: isBelow
          ? `The plan now calls for $${stake.toFixed(2)}, below Pocket Option's $${minStakeLimit.toFixed(2)} minimum.`
          : aladdinLiveStake.message,
        phase: dynamicPhase,
      };
    }

    if (engineMode === 'ALADDIN_DP') {
      const stake = aladdinDPStake;
      const isBelow = stake < minStakeLimit;
      return {
        stake,
        isBelowMin: isBelow,
        isTargetHit: false,
        reason: isBelow
          ? `The plan now calls for $${stake.toFixed(2)}, below Pocket Option's $${minStakeLimit.toFixed(2)} minimum.`
          : 'Aladdin Dynamic Programming Stake Active',
        phase: dynamicPhase,
      };
    }

    // Classic SniperCORE algorithm fallback
    const classic = calculateNextStake(
      sessionStartBalance,
      currentBalance,
      planMetrics.capitalGoal,
      winsLeft,
      tradesRemaining,
      payoutRate,
      minStakeLimit,
      sessionTrades.length,
      consecutiveLosses
    );
    return {
      stake: classic.stake,
      isBelowMin: classic.isBelowMin,
      isTargetHit: classic.isTargetHit,
      reason: classic.reason,
      phase: dynamicPhase,
    };
  }, [
    sessionActive,
    winsLeft,
    currentBalance,
    planMetrics.capitalGoal,
    planMetrics.firstStake,
    engineMode,
    aladdinLiveStake,
    minStakeLimit,
    aladdinDPStake,
    sessionStartBalance,
    tradesRemaining,
    payoutRate,
    sessionTrades.length,
    consecutiveLosses,
    winsCount,
  ]);

  const nextStake = Math.max(minStakeLimit, Number((nextStakeCalc.stake || planMetrics.firstStake || 1.10).toFixed(2)));

  // Handle mid-session payout shift (matching Screenshot 5)
  const handlePayoutChange = (newRate: number) => {
    const old = payoutRate;
    setPayoutRate(newRate);
    if (newRate !== old) {
      setPayoutShiftAlert(
        `Payout moved from ${old}% to ${newRate}%. Remaining stakes re-sized, target now $${planMetrics.capitalGoal.toFixed(2)}.`
      );
      if (soundEnabled) playTone('click');
      setTimeout(() => setPayoutShiftAlert(null), 5000);
    }
  };

  // Trade Execution: Record WIN or LOSS
  const recordTradeOutcome = (result: 'WIN' | 'LOSS', direction?: 'BUY' | 'SELL') => {
    if (!sessionActive || winsLeft === 0 || tradesRemaining === 0) return;

    if (soundEnabled) {
      if (result === 'WIN') {
        const lastTwo = sessionTrades.slice(-2);
        const isStreak = lastTwo.length >= 2 && lastTwo.every((t) => t.result === 'WIN');
        if (isStreak) {
          playTone('streak');
        } else {
          playTone('win');
        }
      } else {
        playTone('loss');
      }
    }

    const stake = nextStake;
    let newBal = currentBalance;
    const P = payoutRate / 100;

    if (result === 'WIN') {
      const profit = Number((stake * P).toFixed(2));
      newBal = Number((currentBalance + profit).toFixed(2));
    } else {
      newBal = Number((currentBalance - stake).toFixed(2));
    }

    const tradeRecord = {
      step: currentStep,
      result,
      direction,
      stake,
      payoutRate,
      balanceAfter: newBal,
    };

    const updated = [...sessionTrades, tradeRecord];
    setSessionTrades(updated);
    setCurrentBalance(newBal);
    setPendingTrade(null);

    const updatedWins = updated.filter((t) => t.result === 'WIN').length;

    // Check if target is achieved or trades exhausted
    if (updatedWins >= winsNeeded || newBal >= planMetrics.capitalGoal || updated.length >= tradesAllowed) {
      if (soundEnabled) playTone('target');
      endSession(newBal, updated);
    }
  };

  // Trigger BUY / SELL order from live chart widget with real-time price & duration
  const handleChartOrderTrigger = (dir: 'BUY' | 'SELL', durationSec: number, currentPrice: number) => {
    if (!sessionActive || winsLeft === 0 || tradesRemaining === 0 || activeLiveOrder) return;
    if (soundEnabled) playTone('click');
    const order: ActiveTradeOrder = {
      id: Date.now().toString(),
      direction: dir,
      stake: nextStake,
      entryPrice: currentPrice,
      entryTime: Date.now(),
      durationSec,
      expiryTime: Date.now() + durationSec * 1000,
      asset: selectedAsset,
    };
    setActiveOrderSecondsLeft(durationSec);
    lastCountdownTickRef.current = -1;
    setActiveLiveOrder(order);

    // Dispatch order to Pocket Option broker tab/extension
    if (poChannelRef.current) {
      poChannelRef.current.postMessage({
        target: 'POCKET_OPTION',
        action: 'PLACE_ORDER',
        direction: dir,
        stake: nextStake,
        duration: durationSec,
        asset: selectedAsset,
        timestamp: Date.now(),
      });
    }
  };

  // Two-Way Sync BroadcastChannel Listener with Pocket Option Floating Extension
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('aladdin_pocket_bridge');
      poChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'POCKET_PONG') {
          if (data.asset && typeof data.asset === 'string') {
            const cleanAsset = data.asset.trim();
            if (cleanAsset && cleanAsset !== selectedAsset) {
              const matched = OTC_ASSETS.find((a) => a.toLowerCase().includes(cleanAsset.toLowerCase())) || cleanAsset;
              setSelectedAsset(matched);
            }
          }
        }
      };

      return () => {
        channel.close();
      };
    } catch (e) {
      console.warn('Pocket Option BroadcastChannel notice:', e);
    }
  }, [selectedAsset]);

  // Real-time active order seconds countdown ticker (15, 14, 13, 12, 11... 0)
  useEffect(() => {
    if (!activeLiveOrder) {
      setActiveOrderSecondsLeft(0);
      lastCountdownTickRef.current = -1;
      return;
    }

    const tick = () => {
      const now = Date.now();
      const diff = activeLiveOrder.expiryTime - now;
      const sec = Math.max(0, Math.ceil(diff / 1000));
      setActiveOrderSecondsLeft(sec);

      // Tactical precision countdown tick audio for final 3 seconds
      if (sec <= 3 && sec > 0 && lastCountdownTickRef.current !== sec) {
        lastCountdownTickRef.current = sec;
        if (soundEnabled) playTone('countdown');
      }

      // Graceful fallback auto-settlement if chart tick didn't settle
      if (diff <= -300 && activeLiveOrder) {
        const exitPrice = chartLivePriceRef.current > 0 ? chartLivePriceRef.current : activeLiveOrder.entryPrice;
        const isWin =
          activeLiveOrder.direction === 'BUY'
            ? exitPrice > activeLiveOrder.entryPrice
            : exitPrice < activeLiveOrder.entryPrice;
        handleTradeSettled(isWin ? 'WIN' : 'LOSS', activeLiveOrder, exitPrice);
      }
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [activeLiveOrder, soundEnabled, playTone]);

  // Real-time trade settlement callback from live chart ("sab kuch real time katega ok")
  const handleTradeSettled = (result: 'WIN' | 'LOSS', order: ActiveTradeOrder, _exitPrice: number) => {
    setActiveLiveOrder(null);
    setActiveOrderSecondsLeft(0);
    recordTradeOutcome(result, order.direction);
  };

  // Primary trigger BUY / SELL order connected with real-time chart and 15s default expiry
  const handleExecuteOrder = (dir: 'BUY' | 'SELL') => {
    if (!sessionActive || winsLeft === 0 || tradesRemaining === 0 || activeLiveOrder || currentBalance < minStakeLimit) return;
    const price = chartLivePriceRef.current > 0 ? chartLivePriceRef.current : 1.08450;
    handleChartOrderTrigger(dir, selectedChartDuration, price);
  };

  // Fallback trigger BUY / SELL order
  const triggerOrder = (dir: 'BUY' | 'SELL') => {
    handleExecuteOrder(dir);
  };

  const endSession = (
    endBal: number = currentBalance,
    tradesList = sessionTrades
  ) => {
    setSessionActive(false);
    setActiveLiveOrder(null);
    setPendingTrade(null);
    const pl = Number((endBal - sessionStartBalance).toFixed(2));
    const now = new Date();

    const logged: LoggedSession = {
      id: Date.now().toString(),
      date: now.toISOString(),
      dateFormatted: now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      dayString: now.toISOString().slice(0, 10),
      accountBalance: sessionStartBalance,
      tradesAllowed,
      winsNeeded,
      payoutRate,
      capitalGoal: planMetrics.capitalGoal,
      gainTargetPercent: planMetrics.accountGainPercent,
      winProfit: planMetrics.targetProfit,
      endingBalance: endBal,
      won: tradesList.filter((t) => t.result === 'WIN').length,
      lost: tradesList.filter((t) => t.result === 'LOSS').length,
      profitOrLoss: pl,
      trades: tradesList,
    };

    setSessionLogs((prev) => [logged, ...prev]);
    setBalance(endBal);
    setShowCompleteModal(true);
    if (pl > 0) {
      setShowFireworks(true);
      if (voiceAnnounceEnabled) {
        speakVoiceNotification(
          voiceLanguage === 'Hindi'
            ? 'टारगेट पूरा हुआ! बहुत-बहुत बधाई, आपने अपना प्रॉफिट लक्ष्य हासिल कर लिया है!'
            : 'Target Achieved! Congratulations, profit goal secured!',
          voiceLanguage
        );
      }
    }
  };

  const startNewSession = () => {
    if (soundEnabled) playTone('click');
    setSessionStartBalance(currentBalance);
    setSessionTrades([]);
    setActiveLiveOrder(null);
    setPendingTrade(null);
    setSessionActive(true);
    setShowCompleteModal(false);
    setActiveTab('trade');
  };

  const resetEntireSession = (startBal: number = balance) => {
    if (soundEnabled) playTone('click');
    setSessionStartBalance(startBal);
    setCurrentBalance(startBal);
    setSessionTrades([]);
    setActiveLiveOrder(null);
    setPendingTrade(null);
    setSessionActive(true);
    setShowCompleteModal(false);
  };

  const resetToFactoryDefaults = () => {
    if (soundEnabled) playTone('click');
    const defBal = 2131.89;
    setBalance(defBal);
    setTradesAllowed(14);
    setWinsNeeded(2);
    setPayoutRate(92);
    setSelectedPreset('14/2');
    resetEntireSession(defBal);
  };

  const copyStake = () => {
    if (soundEnabled) playTone('copy');
    navigator.clipboard.writeText(nextStake.toFixed(2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Calendar stats computation
  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const dayMap: Record<number, { profit: number; sessions: number; wins: number; losses: number }> = {};
    sessionLogs.forEach((log) => {
      const d = new Date(log.date);
      if (d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
        const dayNum = d.getDate();
        if (!dayMap[dayNum]) {
          dayMap[dayNum] = { profit: 0, sessions: 0, wins: 0, losses: 0 };
        }
        dayMap[dayNum].profit += log.profitOrLoss;
        dayMap[dayNum].sessions += 1;
        if (log.profitOrLoss > 0) dayMap[dayNum].wins += 1;
        else dayMap[dayNum].losses += 1;
      }
    });

    const monthTotal = Object.values(dayMap).reduce((acc, d) => acc + d.profit, 0);
    const daysTraded = Object.keys(dayMap).length;

    return {
      firstDay,
      daysInMonth,
      dayMap,
      monthTotal: Number(monthTotal.toFixed(2)),
      daysTraded,
    };
  }, [sessionLogs, calendarMonth, calendarYear]);

  // Session Log Stats
  const logStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySessions = sessionLogs.filter((s) => s.dayString === todayStr);
    const todayProfit = todaySessions.reduce((acc, s) => acc + s.profitOrLoss, 0);
    const allTimeProfit = sessionLogs.reduce((acc, s) => acc + s.profitOrLoss, 0);

    const totalWon = sessionLogs.filter((s) => s.profitOrLoss > 0).length;
    const totalLost = sessionLogs.filter((s) => s.profitOrLoss <= 0).length;
    const winRate = sessionLogs.length > 0 ? (totalWon / sessionLogs.length) * 100 : 100;

    return {
      todaySessionsCount: todaySessions.length,
      todayProfit: Number(todayProfit.toFixed(2)),
      allTimeProfit: Number(allTimeProfit.toFixed(2)),
      totalWon,
      totalLost,
      winRate: Number(winRate.toFixed(0)),
      totalSessions: sessionLogs.length,
    };
  }, [sessionLogs]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Real-time P&L Share Card Modal State & Handlers
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareModalData, setShareModalData] = useState<PnLShareData | null>(null);

  const openLiveSessionShareModal = useCallback(() => {
    if (soundEnabled) playTone('click');
    const pl = currentPL;
    const wins = sessionTrades.filter((t) => t.result === 'WIN').length;
    const losses = sessionTrades.filter((t) => t.result === 'LOSS').length;
    const total = sessionTrades.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 100;
    const roi = sessionStartBalance > 0 ? Number(((pl / sessionStartBalance) * 100).toFixed(2)) : 0;

    const data: PnLShareData = {
      title: 'Current Live Session P&L',
      subtitle: `${selectedAsset} • Real-Time Trade Manager`,
      profitOrLoss: pl,
      returnPercent: roi,
      asset: selectedAsset,
      accountType,
      startingBalance: sessionStartBalance,
      endingBalance: currentBalance,
      tradesCount: total,
      winsCount: wins,
      lossesCount: losses,
      winRate,
      payoutRate,
      strategyGoal: `${tradesAllowed}T / ${winsNeeded}W Goal`,
      timestamp: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setShareModalData(data);
    setShareModalOpen(true);
  }, [
    soundEnabled,
    currentPL,
    sessionTrades,
    selectedAsset,
    accountType,
    sessionStartBalance,
    currentBalance,
    payoutRate,
    tradesAllowed,
    winsNeeded,
  ]);

  const openTodayShareModal = useCallback(() => {
    if (soundEnabled) playTone('click');
    const data: PnLShareData = {
      title: "Today's Total P&L Snapshot",
      subtitle: `${logStats.todaySessionsCount} Sessions Logged Today`,
      profitOrLoss: logStats.todayProfit,
      returnPercent: balance > 0 ? Number(((logStats.todayProfit / balance) * 100).toFixed(2)) : 0,
      asset: selectedAsset,
      accountType,
      startingBalance: balance - logStats.todayProfit,
      endingBalance: balance,
      tradesCount: logStats.totalWon + logStats.totalLost,
      winsCount: logStats.totalWon,
      lossesCount: logStats.totalLost,
      winRate: logStats.winRate,
      payoutRate,
      strategyGoal: `Daily Target`,
      timestamp: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    setShareModalData(data);
    setShareModalOpen(true);
  }, [soundEnabled, logStats, balance, selectedAsset, accountType, payoutRate]);

  const openMonthShareModal = useCallback(() => {
    if (soundEnabled) playTone('click');
    const data: PnLShareData = {
      title: `${monthNames[calendarMonth]} ${calendarYear} P&L`,
      subtitle: `${calendarData.daysTraded} Trading Days`,
      profitOrLoss: calendarData.monthTotal,
      returnPercent: balance > 0 ? Number(((calendarData.monthTotal / balance) * 100).toFixed(2)) : 0,
      asset: selectedAsset,
      accountType,
      startingBalance: balance - calendarData.monthTotal,
      endingBalance: balance,
      tradesCount: sessionLogs.length,
      winsCount: logStats.totalWon,
      lossesCount: logStats.totalLost,
      winRate: logStats.winRate,
      payoutRate,
      strategyGoal: `Monthly Target`,
      timestamp: `${monthNames[calendarMonth]} ${calendarYear}`,
    };
    setShareModalData(data);
    setShareModalOpen(true);
  }, [soundEnabled, calendarMonth, calendarYear, calendarData, balance, selectedAsset, accountType, sessionLogs.length, logStats, payoutRate, monthNames]);

  const openSessionLogShareModal = useCallback((log: LoggedSession) => {
    if (soundEnabled) playTone('click');
    const data: PnLShareData = {
      title: `Session Result P&L`,
      subtitle: log.dateFormatted,
      profitOrLoss: log.profitOrLoss,
      returnPercent: Number(log.gainTargetPercent),
      asset: selectedAsset,
      accountType,
      startingBalance: log.accountBalance,
      endingBalance: log.endingBalance,
      tradesCount: log.won + log.lost,
      winsCount: log.won,
      lossesCount: log.lost,
      winRate: log.won + log.lost > 0 ? Math.round((log.won / (log.won + log.lost)) * 100) : 100,
      payoutRate: log.payoutRate,
      strategyGoal: `${log.tradesAllowed}T / ${log.winsNeeded}W`,
      timestamp: log.dateFormatted,
    };
    setShareModalData(data);
    setShareModalOpen(true);
  }, [soundEnabled, selectedAsset, accountType]);

  return (
    <div className="w-full flex justify-center text-slate-100 font-sans pb-10">
      {/* 
        SQUARE SHAPE CONTAINER WITH SUBTLE CORNER CURVE (rounded-[6px])
        Strictly avoiding rounded-full / circular pills as requested by user.
      */}
      {/* 
        SQUARE SHAPE CONTAINER WITH SUBTLE CORNER CURVE (rounded-[6px])
        Strictly avoiding rounded-full / circular pills as requested by user.
      */}
      <div className={`w-full max-w-[480px] sm:max-w-[540px] rounded-[6px] overflow-hidden relative flex flex-col min-h-[760px] transition-colors duration-300 ${
        currentTheme === 'light'
          ? 'bg-[#f8fafc] border border-slate-300 text-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.15)]'
          : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
          ? 'bg-[#080514] border border-fuchsia-500/50 text-pink-50 shadow-[0_4px_40px_rgba(236,72,153,0.35)]'
          : currentTheme === 'arcade'
          ? 'bg-[#0a081a] border border-cyan-400/50 text-cyan-100 shadow-[0_4px_35px_rgba(6,182,212,0.3)]'
          : currentTheme === 'zen'
          ? 'bg-[#051410] border border-emerald-600/50 text-emerald-100 shadow-[0_4px_35px_rgba(16,185,129,0.25)]'
          : currentTheme === 'gold'
          ? 'bg-[#0f0e0b] border border-amber-900/60 text-amber-50 shadow-[0_4px_30px_rgba(245,158,11,0.2)]'
          : 'bg-[#0c1017] border border-[#1e2330] text-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
      }`}>
        
        {/* 1. TOP HEADER (ALADDINSNIPER logo, REAL/DEMO badge, Sound, Controls) */}
        <div className={`border-b px-3.5 py-2.5 flex items-center justify-between select-none transition-colors duration-300 ${
          currentTheme === 'light'
            ? 'bg-slate-200 border-slate-300 text-slate-900'
            : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
            ? 'bg-[#120924] border-fuchsia-500/40 text-fuchsia-300'
            : currentTheme === 'arcade'
            ? 'bg-[#100d28] border-cyan-500/40 text-cyan-300'
            : currentTheme === 'zen'
            ? 'bg-[#0a1f18] border-emerald-700/40 text-emerald-300'
            : currentTheme === 'gold'
            ? 'bg-[#181611] border-amber-900/60 text-amber-200'
            : 'bg-[#0f141f] border-[#1b2233] text-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[5px] shrink-0 overflow-hidden flex items-center justify-center">
              <LampIcon className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-black tracking-widest uppercase">
              ALADDINSNIPER
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Real / Demo Toggle Badge (Square shape, rounded-[2px], switching type) */}
            <button
              onClick={() => {
                if (soundEnabled) playTone('click');
                setAccountType((prev) => (prev === 'REAL' ? 'DEMO' : 'REAL'));
                window.open(POCKET_OPTION_AFFILIATE_URL, '_blank', 'noopener,noreferrer');
              }}
              title="Toggle REAL / DEMO"
              className={`px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer select-none ${
                accountType === 'REAL'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 hover:bg-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                  : 'bg-amber-500/15 border-amber-500 text-amber-400 hover:bg-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
              }`}
            >
              {accountType}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1 text-slate-500 hover:text-slate-300"
              title={soundEnabled ? 'Mute sound FX' : 'Enable sound FX'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* 2. TAB NAVIGATION (Trade, Settings, Log, P&L, Schedule, Matrix, Tools) */}
        <div className={`border-b px-1 flex items-center justify-between text-xs font-bold overflow-x-auto hide-scrollbar transition-colors duration-300 ${
          currentTheme === 'light'
            ? 'bg-slate-100 border-slate-300 text-slate-700'
            : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
            ? 'bg-[#0e071c] border-fuchsia-500/30 text-fuchsia-400'
            : currentTheme === 'arcade'
            ? 'bg-[#0c0920] border-cyan-500/30 text-cyan-400'
            : currentTheme === 'zen'
            ? 'bg-[#071813] border-emerald-700/30 text-emerald-400'
            : currentTheme === 'gold'
            ? 'bg-[#12100d] border-amber-900/60 text-amber-300'
            : 'bg-[#0c1017] border-[#1b2233] text-slate-400'
        }`}>
          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('trade');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'trade'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Trade</span>
            {activeTab === 'trade' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('settings');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'settings'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
            {activeTab === 'settings' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('session_log');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'session_log'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Log</span>
            {activeTab === 'session_log' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('calendar');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'calendar'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>P&L</span>
            {activeTab === 'calendar' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('schedule');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'schedule'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Schedule</span>
            {activeTab === 'schedule' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('matrix');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'matrix'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matrix</span>
            {activeTab === 'matrix' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('tools');
            }}
            className={`flex items-center gap-1 py-2.5 px-2.5 transition-colors relative whitespace-nowrap ${
              activeTab === 'tools'
                ? currentTheme === 'arcade'
                  ? 'text-cyan-400'
                  : currentTheme === 'zen'
                  ? 'text-emerald-400'
                  : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                  ? 'text-fuchsia-400'
                  : 'text-[#f59e0b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools</span>
            {activeTab === 'tools' && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                  currentTheme === 'arcade'
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : currentTheme === 'zen'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : currentTheme === 'cyber' || currentTheme === 'cyberpunk'
                    ? 'bg-fuchsia-500 shadow-[0_0_8px_#ec4899]'
                    : 'bg-[#f59e0b]'
                }`}
              />
            )}
          </button>

          {/* TAB 8: ALADDIN GENIE BOT SUITE (JUST NEXT TO TOOLS) */}
          <button
            onClick={() => {
              if (soundEnabled) playTone('click');
              setActiveTab('genie');
            }}
            className={`flex items-center gap-1.5 py-2.5 px-3 transition-colors relative whitespace-nowrap cursor-pointer rounded-[2px] ${
              activeTab === 'genie'
                ? 'text-cyan-300 font-bold bg-cyan-950/30'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <span className="text-sm leading-none">🧞‍♂️</span>
            <span className="flex items-center gap-1">
              <span>Genie</span>
              <span className="text-[8px] px-1 py-0.2 rounded-[2px] bg-cyan-500/20 text-cyan-300 font-mono font-black border border-cyan-500/40">
                BOT
              </span>
            </span>
            {activeTab === 'genie' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            )}
          </button>
        </div>

        {/* 3. MAIN BODY CONTAINER */}
        <div className="flex-1 p-3.5 overflow-y-auto hide-scrollbar flex flex-col justify-between">
          
          {/* TAB 1: LIVE TRADE VIEW (EXACT SCREENSHOTS 1, 2, 4, 6, 7, 10, 17) */}
          {activeTab === 'trade' && (
            <div className="space-y-3.5">
              {/* Dynamic Payout Shift Warning Toast */}
              <AnimatePresence>
                {payoutShiftAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-[#241a06] border border-[#78350f] p-2.5 rounded-[4px] text-[11px] text-[#fbbf24] leading-relaxed shadow-lg"
                  >
                    {payoutShiftAlert}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* NEXT STAKE DISPLAY (Big bold block with copy icon) */}
              <div className="text-center pt-1 pb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-0.5">
                  NEXT STAKE
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                    ${nextStake.toFixed(2)}
                  </span>
                  <button
                    onClick={copyStake}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title="Copy stake to clipboard"
                  >
                    {isCopied ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {/* Real-Time Dynamic Algorithm Stage Indicator */}
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  {nextStakeCalc.phase === 'STAGE_1_BASE' && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                      Stage 1: Base Growth (${planMetrics.firstStake.toFixed(2)})
                    </span>
                  )}
                  {nextStakeCalc.phase === 'STAGE_2_CUSHION' && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                      Stage 2: Drawdown Defense (52% Cushion)
                    </span>
                  )}
                  {nextStakeCalc.phase === 'STAGE_2_RECOVERY' && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[9px] font-mono font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                      Stage 2: Capital Recovery ({consecutiveLosses}L Defense)
                    </span>
                  )}
                  {nextStakeCalc.phase === 'STAGE_3_PROFIT_LOCK' && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold tracking-wider uppercase shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                      Stage 3: Profit Target Lock
                    </span>
                  )}
                  {nextStakeCalc.phase === 'GOAL_ACHIEVED' && (
                    <span className="px-2.5 py-0.5 rounded-[2px] bg-emerald-500/25 border border-emerald-400 text-emerald-200 text-[9px] font-mono font-black tracking-wider uppercase shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                      Target Achieved 🎯
                    </span>
                  )}
                </div>
              </div>

              {/* SQUARE STEP BOXES (7 Across per Row, e.g. 1..14 with subtle rounded-[3px]) */}
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: tradesAllowed }).map((_, idx) => {
                  const stepNum = idx + 1;
                  const trade = sessionTrades.find((t) => t.step === stepNum);
                  const isCurrent = stepNum === currentStep && sessionActive;

                  let borderStyle = 'bg-[#121620] border-[#1b2233] text-slate-600';
                  if (trade?.result === 'WIN') {
                    borderStyle = 'bg-[#064e3b]/30 border-emerald-500 text-emerald-400 font-bold';
                  } else if (trade?.result === 'LOSS') {
                    borderStyle = 'bg-[#4c0519]/30 border-rose-500 text-rose-400 font-bold';
                  } else if (isCurrent) {
                    borderStyle = 'bg-[#181f2f] border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.4)] font-black ring-1 ring-white/50';
                  }

                  return (
                    <div
                      key={stepNum}
                      className={`h-9 rounded-[3px] border flex items-center justify-center text-xs font-mono transition-all select-none ${borderStyle}`}
                    >
                      {stepNum}
                    </div>
                  );
                })}
              </div>

              {/* 6-GRID MATRIX CARD (Square borders, rounded-[4px]) */}
              <div className="bg-[#10141e] border border-[#1b2233] rounded-[4px] overflow-hidden divide-y divide-[#1b2233]">
                {/* Row 1: Balance & Target */}
                <div className="grid grid-cols-2 divide-x divide-[#1b2233] p-2.5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      BALANCE
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pl-3">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      TARGET
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      ${planMetrics.capitalGoal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Row 2: P/L & Wins / Left */}
                <div className="grid grid-cols-2 divide-x divide-[#1b2233] p-2.5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      P/L
                    </span>
                    <span
                      className={`text-sm font-mono font-black ${
                        currentPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentPL >= 0 ? `+$${currentPL.toFixed(2)}` : `-$${Math.abs(currentPL).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="pl-3">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      WINS / LEFT
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {winsCount} / {tradesRemaining}
                    </span>
                  </div>
                </div>

                {/* Row 3: Payout & Asset */}
                <div className="grid grid-cols-2 divide-x divide-[#1b2233] p-2.5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      PAYOUT
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <select
                        value={payoutRate}
                        onChange={(e) => handlePayoutChange(Number(e.target.value))}
                        className="bg-black/60 border border-white/10 rounded-[2px] px-1.5 py-0.5 text-xs font-mono font-bold text-white outline-none cursor-pointer"
                      >
                        {[80, 82, 85, 88, 90, 92, 95].map((p) => (
                          <option key={p} value={p}>
                            {p}%
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="pl-3">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      ASSET
                    </span>
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-[2px] px-1.5 py-0.5 text-xs font-bold text-white outline-none w-full truncate mt-0.5 cursor-pointer"
                    >
                      {OTC_ASSETS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Minimum Stake Warning Alert Box (Screenshot 1 & 10) */}
              {nextStakeCalc.isBelowMin && (
                <div className="bg-[#241a06] border border-[#78350f] p-2.5 rounded-[4px] space-y-1">
                  <p className="text-[11px] text-[#fbbf24] leading-relaxed">
                    The plan now calls for ${nextStake.toFixed(2)}, below Pocket Option's ${minStakeLimit.toFixed(2)} minimum. Trading on would break the sequence.
                  </p>
                </div>
              )}


              {/* ACTION ROW: LOG & MATRIX (LEFT = BUY WIDTH), CENTER SPACER (MATCHES CIRCLE), TRADE NOW (RIGHT = SELL WIDTH) */}
              <div className="flex items-center gap-2">
                {/* Left Side: Log & Matrix buttons together filling the exact width of BUY button */}
                <div className="flex-1 flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (soundEnabled) playTone('click');
                      setActiveTab('session_log');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[3px] bg-[#121622] hover:bg-[#1a2130] border border-amber-500/40 hover:border-amber-400 text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors shadow-sm cursor-pointer"
                    title="Direct to Session Log"
                  >
                    <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Log</span>
                  </button>

                  <button
                    onClick={() => {
                      if (soundEnabled) playTone('click');
                      setActiveTab('matrix');
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-[3px] bg-[#121622] hover:bg-[#1a2130] border border-cyan-500/40 hover:border-cyan-400 text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors shadow-sm cursor-pointer"
                    title="Direct to Compounding Matrix"
                  >
                    <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Matrix</span>
                  </button>
                </div>

                {/* Center alignment spacer matching the circular button's exact w-10 width */}
                <div className="w-10 shrink-0 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60" />
                </div>

                {/* Right Side: Trade Now button stretched to match the exact width of SELL button */}
                <a
                  href={POCKET_OPTION_AFFILIATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (soundEnabled) playTone('click');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-[3px] bg-[#121622] hover:bg-[#1a2130] border border-emerald-500/40 hover:border-emerald-400 text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors shadow-sm cursor-pointer touch-manipulation select-none"
                  title="Launch Pocket Option Broker Terminal"
                >
                  <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/30 shrink-0" />
                  <span className="whitespace-nowrap">Trade Now</span>
                </a>
              </div>

              {/* ACTIVE LIVE ORDER HUD OR PRIMARY ACTION BUTTONS */}
              {activeLiveOrder ? (
                /* Glowing Neon Active Order HUD (Screenshot 2, 4, 7) */
                <div
                  className={`p-3 rounded-[4px] border ${
                    activeLiveOrder.direction === 'BUY'
                      ? 'bg-emerald-950/30 border-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                      : 'bg-rose-950/30 border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
                  } space-y-2.5 transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-wider ${
                          activeLiveOrder.direction === 'BUY'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {activeLiveOrder.direction} • ${activeLiveOrder.stake.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {activeLiveOrder.asset}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-black/70 border border-amber-400/40 text-amber-300 font-mono font-black text-xs shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                      <Timer className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span className="tabular-nums font-mono text-xs font-black tracking-wider">
                        {activeOrderSecondsLeft}s
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-0.5 text-slate-300">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Entry Price</span>
                      <span className="font-bold text-white">{activeLiveOrder.entryPrice.toFixed(5)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase">Estimated Payout</span>
                      <span className="font-bold text-emerald-400">
                        +${(activeLiveOrder.stake * (payoutRate / 100)).toFixed(2)} ({payoutRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Manual Quick Settlement Controls */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                    <button
                      onClick={() => handleTradeSettled('WIN', activeLiveOrder, activeLiveOrder.entryPrice)}
                      className="py-1.5 px-2 rounded-[3px] bg-emerald-600/80 hover:bg-emerald-500 text-white font-mono font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-400 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Force WIN</span>
                    </button>
                    <button
                      onClick={() => handleTradeSettled('LOSS', activeLiveOrder, activeLiveOrder.entryPrice)}
                      className="py-1.5 px-2 rounded-[3px] bg-rose-600/80 hover:bg-rose-500 text-white font-mono font-black text-xs flex items-center justify-center gap-1.5 border border-rose-400 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Force LOSS</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Trading Action Buttons (BUY/SELL or WIN/LOSS with Center Mode Switch Button) */
                <div className="space-y-2">
                  {tradeActionMode === 'BUY_SELL' ? (
                    <div key="mode-buy-sell" className="flex items-center gap-2">
                      {/* BUY / CALL BUTTON */}
                      <button
                        key="btn-buy"
                        onClick={() => handleExecuteOrder('BUY')}
                        disabled={!sessionActive || winsLeft === 0 || tradesRemaining === 0 || currentBalance < minStakeLimit}
                        className="flex-1 py-3 px-2 rounded-[4px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none touch-manipulation"
                      >
                        <TrendingUp className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span className="truncate">BUY ${nextStake.toFixed(2)}</span>
                      </button>

                      {/* CIRCULAR GLOWING MODE SWITCH BUTTON */}
                      <button
                        key="btn-switch-to-winloss"
                        onClick={() => {
                          if (soundEnabled) playTone('click');
                          setTradeActionMode((m) => (m === 'BUY_SELL' ? 'WIN_LOSS' : 'BUY_SELL'));
                        }}
                        className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#1c2438] via-[#101624] to-[#0a0e18] border-2 border-amber-400/80 hover:border-amber-300 text-amber-300 hover:text-white flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.5)] hover:shadow-[0_0_22px_rgba(245,158,11,0.8)] active:scale-95 transition-transform shrink-0 cursor-pointer group select-none touch-manipulation"
                        title="Switch to WIN / LOSS mode"
                      >
                        <span className="absolute -inset-1 rounded-full border border-amber-400/30 animate-pulse pointer-events-none" />
                        <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300 text-amber-300" />
                      </button>

                      {/* SELL / PUT BUTTON */}
                      <button
                        key="btn-sell"
                        onClick={() => handleExecuteOrder('SELL')}
                        disabled={!sessionActive || winsLeft === 0 || tradesRemaining === 0 || currentBalance < minStakeLimit}
                        className="flex-1 py-3 px-2 rounded-[4px] bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-400/80 shadow-[0_0_15px_rgba(244,63,94,0.35)] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none touch-manipulation"
                      >
                        <TrendingDown className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span className="truncate">SELL ${nextStake.toFixed(2)}</span>
                      </button>
                    </div>
                  ) : (
                    <div key="mode-win-loss" className="flex items-center gap-2">
                      {/* WIN OUTCOME BUTTON */}
                      <button
                        key="btn-win"
                        onClick={() => recordTradeOutcome('WIN')}
                        disabled={!sessionActive || winsLeft === 0 || tradesRemaining === 0}
                        className="flex-1 py-3 px-2 rounded-[4px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none touch-manipulation"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">WIN (+${(nextStake * (payoutRate / 100)).toFixed(2)})</span>
                      </button>

                      {/* CIRCULAR GLOWING MODE SWITCH BUTTON */}
                      <button
                        key="btn-switch-to-buysell"
                        onClick={() => {
                          if (soundEnabled) playTone('click');
                          setTradeActionMode((m) => (m === 'BUY_SELL' ? 'WIN_LOSS' : 'BUY_SELL'));
                        }}
                        className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#1c2438] via-[#101624] to-[#0a0e18] border-2 border-cyan-400/80 hover:border-cyan-300 text-cyan-300 hover:text-white flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.5)] hover:shadow-[0_0_22px_rgba(6,182,212,0.8)] active:scale-95 transition-transform shrink-0 cursor-pointer group select-none touch-manipulation"
                        title="Switch to BUY / SELL mode"
                      >
                        <span className="absolute -inset-1 rounded-full border border-cyan-400/30 animate-pulse pointer-events-none" />
                        <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300 text-cyan-300" />
                      </button>

                      {/* LOSS OUTCOME BUTTON */}
                      <button
                        key="btn-loss"
                        onClick={() => recordTradeOutcome('LOSS')}
                        disabled={!sessionActive || winsLeft === 0 || tradesRemaining === 0}
                        className="flex-1 py-3 px-2 rounded-[4px] bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-rose-400/80 shadow-[0_0_12px_rgba(244,63,94,0.3)] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none touch-manipulation"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="truncate">LOSS (-${nextStake.toFixed(2)})</span>
                      </button>
                    </div>
                  )}

                  {/* SESSION CONTROLS: END SESSION & RESET SESSION */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      onClick={() => endSession()}
                      className={`py-2 px-2 rounded-[4px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        currentPL > 0
                          ? 'bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.85)] animate-pulse'
                          : 'bg-[#141924] hover:bg-[#1b2230] border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">End {currentPL > 0 ? `(+$${currentPL.toFixed(0)})` : ''}</span>
                    </button>

                    <button
                      onClick={() => resetEntireSession()}
                      className="py-2 px-2 rounded-[4px] bg-[#141924] hover:bg-[#1b2230] border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Reset</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SLIM REAL-TIME SESSION TRADE LOG */}
              {sessionTrades.length > 0 && (
                <div className="space-y-0.5 pt-1 max-h-24 overflow-y-auto hide-scrollbar">
                  {sessionTrades
                    .slice()
                    .reverse()
                    .map((t) => (
                      <div
                        key={t.step}
                        className="flex items-center justify-between text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-[#0d111a] border border-white/[0.04] leading-tight"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[9px] w-3">#{t.step}</span>
                          <span
                            className={`font-black text-[10px] w-9 ${
                              t.result === 'WIN' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {t.result}
                          </span>
                          <span className="text-slate-200 font-bold">${t.stake.toFixed(2)}</span>
                          {t.direction && (
                            <span
                              className={`text-[8px] font-bold px-1 rounded-[1px] ${
                                t.direction === 'BUY'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {t.direction}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px]">
                          {t.result === 'WIN' && (
                            <span className="text-slate-500">{t.payoutRate}%</span>
                          )}
                          <span className="text-slate-400 font-medium">
                            ${t.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* LIVE CHART (SCREENSHOT MATCH: MINIMAL & CLEAN) */}
              <div className="pt-2">
                <PocketSniperLiveChart
                  asset={selectedAsset}
                  onAssetChange={setSelectedAsset}
                  payoutRate={payoutRate}
                  nextStake={nextStake}
                  activeOrder={activeLiveOrder}
                  onTradeSettled={handleTradeSettled}
                  onPriceChange={handlePriceChange}
                  onOrderTrigger={handleChartOrderTrigger}
                  selectedDuration={selectedChartDuration}
                  onDurationChange={setSelectedChartDuration}
                  isSessionActive={sessionActive && winsLeft > 0 && tradesRemaining > 0 && currentBalance >= minStakeLimit}
                />
              </div>
            </div>
          )}

          {/* TAB 2: SETTINGS (EXACT MATCH TO SCREENSHOTS 3 & 19) */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5">
              {/* Account Balance Banner */}
              <div className="bg-[#121622] border border-[#1b2233] p-3 rounded-[4px] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Balance ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500">from Pocket Option</span>
                </div>
                <input
                  type="number"
                  step={0.01}
                  value={balance}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    setBalance(b);
                    setCurrentBalance(b);
                    setSessionStartBalance(b);
                  }}
                  className="w-28 bg-black/60 border border-white/10 rounded-[3px] px-2 py-1 text-xs font-mono text-right text-emerald-400 outline-none"
                />
              </div>

              {/* Aladdin Matrix Presets */}
              <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 block">
                    ALADDIN MATRIX PRESETS
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">{tradesAllowed}T / {winsNeeded}W</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {(['10/2', '10/3', '10/4', '12/2', '12/3', '14/2'] as const).map((p) => {
                    const [t, w] = p.split('/').map(Number);
                    const isSelected = tradesAllowed === t && winsNeeded === w;
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          if (soundEnabled) playTone('click');
                          setSelectedPreset(p);
                          setTradesAllowed(t);
                          setWinsNeeded(w);
                        }}
                        className={`py-1.5 rounded-[3px] text-[10px] font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                            : 'bg-[#121622] border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2-Column Grid (Square Boxes rounded-[4px]) */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Risk Amount */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    RISK AMOUNT
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={riskAmountPercent}
                      onChange={(e) => setRiskAmountPercent(Number(e.target.value))}
                      className="w-14 bg-transparent font-mono font-bold text-white outline-none"
                    />
                    <span className="text-slate-500 text-xs font-bold">%</span>
                  </div>
                </div>

                {/* Max Liquidation */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    MAX LIQUIDATION
                  </span>
                  <span className="font-mono font-bold text-white block">
                    ${planMetrics.maxLiquidation.toFixed(2)}
                  </span>
                </div>

                {/* Trades Allowed */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    TRADES
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={tradesAllowed}
                      onChange={(e) => setTradesAllowed(Number(e.target.value))}
                      className="w-14 bg-transparent font-mono font-bold text-white outline-none"
                    />
                    <div className="flex flex-col text-[10px] text-slate-500">
                      <button
                        onClick={() => setTradesAllowed((t) => t + 1)}
                        className="hover:text-white"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => setTradesAllowed((t) => Math.max(2, t - 1))}
                        className="hover:text-white"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wins Needed */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    WINS NEEDED
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      min={1}
                      max={tradesAllowed}
                      value={winsNeeded}
                      onChange={(e) => setWinsNeeded(Number(e.target.value))}
                      className="w-14 bg-transparent font-mono font-bold text-white outline-none"
                    />
                    <div className="flex flex-col text-[10px] text-slate-500">
                      <button
                        onClick={() => setWinsNeeded((w) => Math.min(tradesAllowed, w + 1))}
                        className="hover:text-white"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => setWinsNeeded((w) => Math.max(1, w - 1))}
                        className="hover:text-white"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payout */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    PAYOUT
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={payoutRate}
                      onChange={(e) => setPayoutRate(Number(e.target.value))}
                      className="w-14 bg-transparent font-mono font-bold text-white outline-none"
                    />
                    <span className="text-slate-500 text-xs font-bold">%</span>
                  </div>
                </div>

                {/* First Stake */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    FIRST STAKE
                  </span>
                  <span className="font-mono font-bold text-white block">
                    ${planMetrics.firstStake.toFixed(2)}
                  </span>
                </div>

                {/* Final Capital */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    FINAL CAPITAL
                  </span>
                  <span className="font-mono font-bold text-white block">
                    ${planMetrics.capitalGoal.toFixed(2)}
                  </span>
                </div>

                {/* Account Gain */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    ACCOUNT GAIN
                  </span>
                  <span className="font-mono font-bold text-white block">
                    {planMetrics.accountGainPercent.toFixed(2)}%
                  </span>
                </div>

                {/* Win Profit */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    WIN PROFIT
                  </span>
                  <span className="font-mono font-bold text-emerald-400 block">
                    ${planMetrics.targetProfit.toFixed(2)}
                  </span>
                </div>

                {/* Trade Loss Limit */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    TRADE LOSS LIMIT
                  </span>
                  <span className="font-mono font-bold text-white block">
                    {planMetrics.tradeLossLimit}
                  </span>
                </div>

                {/* Capital Required Box */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    CAPITAL REQUIRED
                  </span>
                  <span className="font-mono font-bold text-amber-400 block text-sm">
                    ${capitalRequiredInfo.capitalRequired.toFixed(2)}
                  </span>
                </div>

                {/* Available Balance Box */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    YOUR BALANCE
                  </span>
                  <span className={`font-mono font-bold block text-sm ${
                    currentBalance >= capitalRequiredInfo.capitalRequired ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ${currentBalance.toFixed(2)}
                  </span>
                </div>

                {/* Initial Deposit Box */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    INITIAL DEPOSIT
                  </span>
                  <span className="font-mono font-bold text-white block text-sm">
                    ${sessionStartBalance.toFixed(2)}
                  </span>
                </div>

                {/* Cycle Safety Buffer Box */}
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    SAFETY BUFFER
                  </span>
                  <span className={`font-mono font-bold block text-sm ${
                    currentBalance >= capitalRequiredInfo.capitalRequired ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {currentBalance - capitalRequiredInfo.capitalRequired >= 0 ? '+' : ''}${(currentBalance - capitalRequiredInfo.capitalRequired).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Start New Session Button (Square rounded-[4px]) */}
              <button
                onClick={startNewSession}
                className="w-full py-3.5 rounded-[4px] bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-[0.98] mt-3 cursor-pointer"
              >
                Start new session
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={resetToFactoryDefaults}
                  className="py-2.5 rounded-[4px] border border-rose-500/30 hover:border-rose-400/60 bg-[#1e1014] hover:bg-[#28141a] text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Factory Reset</span>
                </button>
                <button
                  onClick={() => setActiveTab('session_log')}
                  className="py-2.5 rounded-[4px] border border-white/5 bg-[#0e121a] hover:bg-[#131822] text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Session Log
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SESSION LOG (EXACT MATCH TO SCREENSHOTS 8 & 13) */}
          {activeTab === 'session_log' && (
            <div className="space-y-3.5">
              {/* Today's Snapshot Card */}
              <div className="bg-[#10141e] border border-[#1b2233] rounded-[4px] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                    <h3 className="text-base font-black text-white tracking-tight">
                      Today's Snapshot
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      {logStats.todaySessionsCount} sessions logged today
                    </span>
                  </div>
                  <button
                    onClick={openTodayShareModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-cyan-500/40 text-cyan-300 text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors shadow-sm cursor-pointer"
                    title="Share Today's Real-time P&L Card"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share Today P&L</span>
                  </button>
                </div>

                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500 block">
                    TODAY'S PROFIT
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-mono font-black ${
                        logStats.todayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {logStats.todayProfit >= 0 ? `+$${logStats.todayProfit.toFixed(2)}` : `-$${Math.abs(logStats.todayProfit).toFixed(2)}`}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      All time {logStats.allTimeProfit >= 0 ? `+$${logStats.allTimeProfit.toFixed(2)}` : `-$${Math.abs(logStats.allTimeProfit).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 KPI Cards (Square rounded-[4px]) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">
                    🏆 SESSION WIN / LOSS
                  </span>
                  <span className="text-lg font-mono font-black text-white">
                    {logStats.totalWon} / {logStats.totalLost}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {logStats.totalLost} losing sessions
                  </span>
                </div>

                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">
                    📈 SESSION WIN RATE
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    {logStats.winRate}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {logStats.totalWon} of {logStats.totalSessions} sessions won
                  </span>
                </div>

                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">
                    📋 TOTAL SESSIONS
                  </span>
                  <span className="text-lg font-mono font-black text-white">
                    {logStats.totalSessions}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    1 daily sessions on avg
                  </span>
                </div>

                <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">
                    🏦 ACCOUNT GAIN
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    {planMetrics.accountGainPercent.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    Current Cycle Target
                  </span>
                </div>
              </div>

              {/* Session Results Table */}
              <div className="bg-[#10141e] border border-[#1b2233] rounded-[4px] p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Session Results</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSessionLogs((prev) => prev.slice(1))}
                      className="text-[9px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-[2px] bg-white/5"
                    >
                      Clear Last
                    </button>
                    <button
                      onClick={() => setSessionLogs([])}
                      className="text-[9px] font-bold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded-[2px] bg-rose-500/10"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto hide-scrollbar -mx-2 px-2 max-h-60">
                  <table className="w-full text-left text-[10px] font-mono whitespace-nowrap min-w-[580px]">
                    <thead>
                      <tr className="border-b border-[#1b2233] text-slate-500 text-[8px] uppercase tracking-wider">
                        <th className="py-2 px-2">Session</th>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Account Bal.</th>
                        <th className="py-2 px-2">Trades</th>
                        <th className="py-2 px-2">Wins</th>
                        <th className="py-2 px-2">Payout</th>
                        <th className="py-2 px-2">Capital Goal</th>
                        <th className="py-2 px-2">Gain Target</th>
                        <th className="py-2 px-2">Ending Bal.</th>
                        <th className="py-2 px-2">Won</th>
                        <th className="py-2 px-2">Lost</th>
                        <th className="py-2 px-2 text-right">Profit/Loss</th>
                        <th className="py-2 px-2 text-center">Card</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2233]">
                      {sessionLogs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-white/[0.02] text-slate-300">
                          <td className="py-2 px-2 font-bold text-white">#{sessionLogs.length - idx}</td>
                          <td className="py-2 px-2 text-slate-400">{log.dateFormatted}</td>
                          <td className="py-2 px-2">${log.accountBalance.toFixed(2)}</td>
                          <td className="py-2 px-2">{log.tradesAllowed}</td>
                          <td className="py-2 px-2">{log.winsNeeded}</td>
                          <td className="py-2 px-2">{log.payoutRate}%</td>
                          <td className="py-2 px-2 text-slate-300">${log.capitalGoal.toFixed(2)}</td>
                          <td className="py-2 px-2">{log.gainTargetPercent}%</td>
                          <td className="py-2 px-2 font-bold text-white">${log.endingBalance.toFixed(2)}</td>
                          <td className="py-2 px-2 text-emerald-400 font-bold">{log.won}</td>
                          <td className="py-2 px-2 text-rose-400 font-bold">{log.lost}</td>
                          <td
                            className={`py-2 px-2 text-right font-black ${
                              log.profitOrLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {log.profitOrLoss >= 0
                              ? `+$${log.profitOrLoss.toFixed(2)}`
                              : `-$${Math.abs(log.profitOrLoss).toFixed(2)}`}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => openSessionLogShareModal(log)}
                              className="p-1 rounded-[2px] bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                              title="Share this Session P&L Card"
                            >
                              <Share2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: P&L CALENDAR (EXACT MATCH TO SCREENSHOTS 6 & 11) */}
          {activeTab === 'calendar' && (
            <div className="space-y-3.5">
              <div className="bg-[#10141e] border border-[#1b2233] p-3.5 rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">P&L Calendar</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear((y) => y - 1);
                        } else {
                          setCalendarMonth((m) => m - 1);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-white font-mono">
                      {monthNames[calendarMonth]} {calendarYear}
                    </span>
                    <button
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear((y) => y + 1);
                        } else {
                          setCalendarMonth((m) => m + 1);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">
                      Month total
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl font-mono font-black ${
                          calendarData.monthTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {calendarData.monthTotal >= 0
                          ? `+$${calendarData.monthTotal.toFixed(2)}`
                          : `-$${Math.abs(calendarData.monthTotal).toFixed(2)}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {calendarData.daysTraded} days traded
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={openMonthShareModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-cyan-500/40 text-cyan-300 text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors shadow-sm cursor-pointer"
                    title="Share Monthly P&L Card"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share Month</span>
                  </button>
                </div>
              </div>

              {/* Square Calendar Grid (rounded-[3px]) */}
              <div className="bg-[#10141e] border border-[#1b2233] p-2.5 rounded-[4px]">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500 uppercase mb-2">
                  <span>S</span>
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-13 rounded-[2px] bg-[#0e121a]/20" />
                  ))}

                  {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayRecord = calendarData.dayMap[dayNum];
                    const isTraded = !!dayRecord;
                    const isProfit = dayRecord ? dayRecord.profit >= 0 : false;

                    let bgStyle = 'bg-[#121622] border-white/5 text-slate-500';
                    if (isTraded) {
                      bgStyle = isProfit
                        ? 'bg-[#064e3b]/25 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.15)] ring-1 ring-white/50'
                        : 'bg-[#4c0519]/25 border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.15)] ring-1 ring-white/50';
                    }

                    return (
                      <div
                        key={dayNum}
                        className={`h-13 p-1 rounded-[3px] border flex flex-col justify-between select-none ${bgStyle}`}
                      >
                        <span className="text-[9px] font-mono font-bold leading-none">
                          {dayNum}
                        </span>

                        {isTraded && (
                          <div className="text-center font-mono">
                            <span
                              className={`text-[10px] font-black leading-tight block ${
                                isProfit ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfit ? `+$${dayRecord.profit.toFixed(0)}` : `-$${Math.abs(dayRecord.profit).toFixed(0)}`}
                            </span>
                            <span className="text-[7px] text-slate-400 block leading-tight">
                              {dayRecord.sessions}s
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALGORITHMIC STAKE SCHEDULE INSPECTOR */}
          {activeTab === 'schedule' && (
            <div className="space-y-3.5">
              {/* Presets and View Switcher Header */}
              <div className="bg-[#10141e] border border-[#1b2233] p-3 rounded-[4px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Pre-Calculated Schedule Engine
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {scheduleViewMode === 'ALADDIN_DP' ? 'Aladdin DP Memoization Matrix' : 'SniperCORE Step Loss Recovery'} • {tradesAllowed} Trades, {winsNeeded} Wins
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setScheduleViewMode('ALADDIN_DP')}
                      className={`px-2 py-1 rounded-[2px] text-[10px] font-mono font-bold uppercase transition-colors ${
                        scheduleViewMode === 'ALADDIN_DP'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-[#121622] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      DP Matrix
                    </button>
                    <button
                      onClick={() => setScheduleViewMode('STEP_RECOVERY')}
                      className={`px-2 py-1 rounded-[2px] text-[10px] font-mono font-bold uppercase transition-colors ${
                        scheduleViewMode === 'STEP_RECOVERY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-[#121622] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      Step Recovery
                    </button>
                  </div>
                </div>

                {/* Presets */}
                <div className="flex items-center justify-between pt-1 border-t border-[#1b2233]/60">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Presets:</span>
                  <div className="flex gap-1">
                    {(['10/2', '10/3', '12/2', '14/2'] as const).map((p) => {
                      const [t, w] = p.split('/').map(Number);
                      const isSelected = tradesAllowed === t && winsNeeded === w;
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            if (soundEnabled) playTone('click');
                            setSelectedPreset(p);
                            setTradesAllowed(t);
                            setWinsNeeded(w);
                          }}
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold transition-all border ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-[#121622] border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Table Render */}
              <div className="overflow-x-auto hide-scrollbar max-h-96">
                {scheduleViewMode === 'ALADDIN_DP' ? (
                  <table className="w-full text-left text-xs font-mono whitespace-nowrap bg-[#10141e] border border-[#1b2233] rounded-[4px]">
                    <thead>
                      <tr className="border-b border-[#1b2233] text-slate-500 text-[8px] uppercase tracking-wider bg-black/40">
                        <th className="py-2 px-2">Step</th>
                        <th className="py-2 px-2">DP Stake</th>
                        <th className="py-2 px-2">Balance Before</th>
                        <th className="py-2 px-2">Profit If Won</th>
                        <th className="py-2 px-2">Balance If Won</th>
                        <th className="py-2 px-2 text-right">Balance If Lost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2233]">
                      {aladdinScheduleMatrix.schedule.map((s) => (
                        <tr
                          key={s.step}
                          className={`hover:bg-white/[0.02] ${
                            s.step === currentStep && sessionActive
                              ? 'bg-amber-500/10 font-bold text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-2 font-bold">{s.step}</td>
                          <td className="py-2 px-2 text-white font-bold">${s.stake.toFixed(2)}</td>
                          <td className="py-2 px-2 text-slate-400">${s.balanceBefore.toFixed(2)}</td>
                          <td className="py-2 px-2 text-emerald-400">+${s.profitIfWon.toFixed(2)}</td>
                          <td className="py-2 px-2 text-cyan-300 font-bold">${s.balanceIfWon.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-rose-400">${s.balanceIfLost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs font-mono whitespace-nowrap bg-[#10141e] border border-[#1b2233] rounded-[4px]">
                    <thead>
                      <tr className="border-b border-[#1b2233] text-slate-500 text-[8px] uppercase tracking-wider bg-black/40">
                        <th className="py-2 px-2">Step</th>
                        <th className="py-2 px-2">Stake</th>
                        <th className="py-2 px-2">Cumulative Risk</th>
                        <th className="py-2 px-2">Payout If Won</th>
                        <th className="py-2 px-2 text-right">Net If Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b2233]">
                      {planMetrics.stakeSchedule.map((s) => (
                        <tr
                          key={s.step}
                          className={`hover:bg-white/[0.02] ${
                            s.step === currentStep && sessionActive
                              ? 'bg-amber-500/10 font-bold text-amber-300'
                              : 'text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-2 font-bold">{s.step}</td>
                          <td className="py-2 px-2 text-white font-bold">${s.stake.toFixed(2)}</td>
                          <td className="py-2 px-2 text-rose-400/80">-${s.cumulativeLossIfLost.toFixed(2)}</td>
                          <td className="py-2 px-2 text-cyan-400">${s.payoutIfWon.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right font-black text-emerald-400">
                            +${s.netPLIfWon.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: DYNAMIC COMPOUNDING MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <DynamicCalculator />
            </div>
          )}

          {/* TAB 7: TOOLS & SYSTEM SETTINGS */}
          {activeTab === 'tools' && (
            <ToolsSettingsTab
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              playTone={playTone}
              onOpenFireworks={(variant) => {
                if (variant) setFireworksThemeVariant(variant);
                setShowFireworks(true);
              }}
              currentTheme={currentTheme}
              setCurrentTheme={setCurrentTheme}
              soundVolume={soundVolume}
              setSoundVolume={setSoundVolume}
              voiceLanguage={voiceLanguage}
              setVoiceLanguage={setVoiceLanguage}
              voiceAnnounceEnabled={voiceAnnounceEnabled}
              setVoiceAnnounceEnabled={setVoiceAnnounceEnabled}
              toneStyle={toneStyle}
              setToneStyle={setToneStyle}
              sessionLogs={sessionLogs}
              onClearLogs={() => {
                setSessionLogs([]);
                localStorage.removeItem('ps_session_logs');
              }}
            />
          )}

          {/* TAB 8: ALADDIN GENIE BOT COMMAND SUITE */}
          {activeTab === 'genie' && (
            <GenieTab />
          )}
        </div>
      </div>

      {/* SESSION TARGET REACHED CELEBRATION MODAL (SCREENSHOT 14 & 16) */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0f1420] border border-[#1b2233] rounded-[6px] p-6 w-full max-w-sm text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-[4px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3.5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Award className="w-7 h-7" />
              </div>

              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Target reached
              </span>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">
                SESSION RESULT
              </span>

              <div className="text-4xl font-mono font-black text-emerald-400 mb-5 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                +${Math.max(0, currentBalance - sessionStartBalance).toFixed(2)}
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#141926] p-2.5 rounded-[4px] border border-white/5 mb-5 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Balance</span>
                  <span className="text-white font-bold">${currentBalance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Won</span>
                  <span className="text-emerald-400 font-bold">{winsCount}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Lost</span>
                  <span className="text-rose-400 font-bold">{lossesCount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    openLiveSessionShareModal();
                  }}
                  className="w-full py-2.5 rounded-[4px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share P&L Card</span>
                </button>

                <button
                  onClick={startNewSession}
                  className="w-full py-3 rounded-[4px] bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
                >
                  Repeat Session
                </button>
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setActiveTab('settings');
                  }}
                  className="w-full py-2.5 rounded-[4px] border border-white/10 bg-[#121622] hover:bg-[#181d2c] text-xs font-bold text-slate-400 transition-colors cursor-pointer"
                >
                  Change plan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REAL-TIME P&L SHARE CARD MODAL */}
      {shareModalData && (
        <PnLShareCardModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          data={shareModalData}
        />
      )}

      {/* REAL-TIME CRACKER & FIREWORKS CELEBRATION OVERLAY */}
      <FireworksCelebrationOverlay
        isOpen={showFireworks}
        onClose={() => setShowFireworks(false)}
        title="TARGET ACHIEVED"
        winProfit={Math.max(0, currentBalance - sessionStartBalance)}
        winRate={
          sessionTrades.length > 0
            ? Math.round((winsCount / sessionTrades.length) * 100)
            : 100
        }
        currentBalance={currentBalance}
        startBalance={sessionStartBalance}
        targetGoal={planMetrics.capitalGoal}
        winsCount={winsCount}
        lossesCount={lossesCount}
        totalTrades={sessionTrades.length}
        assetName={selectedAsset}
        payoutRate={payoutRate}
        voiceLanguage={voiceLanguage}
        soundVolume={soundVolume}
        toneStyle={toneStyle}
        initialThemeVariant={fireworksThemeVariant}
        onThemeChange={(v) => setFireworksThemeVariant(v)}
      />
    </div>
  );
};
