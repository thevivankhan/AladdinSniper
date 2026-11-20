import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertTriangle, ChevronRight, Activity, CheckCircle2, Layers, Sparkles, Zap, ShieldCheck, Brain, Clock, Play, RotateCcw, BarChart3, MessageSquare, Smile, Meh, Frown, Plus, Calculator, FileDown, Download, Share2, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ParadoxStrategy } from './ParadoxStrategy';
import { PocketSniperApp } from './components/calculator/PocketSniperApp';
import { GenieTab } from './components/genie/GenieTab';
import { ParadoxShareModal } from './components/ParadoxShareModal';
import {
  ParadoxMode,
  ParadoxShareData,
  getParadoxModeConfig,
  getPlansForMode,
  exportParadoxCSV,
  exportParadoxPDF
} from './utils/paradoxEngine';

const POCKET_OPTION_AFFILIATE_URL = 'https://pocket-friends.co/r/mphdnyllo5';

interface JournalEntry {
  id: string;
  date: string;
  phase: string;
  planName: string;
  result: 'Success' | 'Fail';
  emotion: 'Confident' | 'Anxious' | 'Neutral' | 'Greedy' | 'Fearful' | 'Disciplined';
  marketCondition: 'Trending' | 'Ranging' | 'Volatile' | 'Slow';
  rating: number;
  notes: string;
  payout: number;
}

const EMOTIONS = [
  { id: 'Confident', icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'Disciplined', icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'Neutral', icon: Meh, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  { id: 'Anxious', icon: Frown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'Fearful', icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'Greedy', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
] as const;

const MARKET_CONDITIONS = [
  { id: 'Trending', icon: TrendingUp },
  { id: 'Ranging', icon: Layers },
  { id: 'Volatile', icon: Activity },
  { id: 'Slow', icon: Clock },
] as const;

// Plans & multi-phase math imported from ./utils/paradoxEngine

const themeStyles = {
  emerald: {
    ring: 'ring-1 ring-emerald-500/60 hover:ring-emerald-500/80',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    shadow: 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]',
    neon: 'shadow-[0_0_25px_rgba(16,185,129,0.3),inset_0_0_10px_rgba(16,185,129,0.1)]',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-500/15'
  },
  cyan: {
    ring: 'ring-1 ring-cyan-500/60 hover:ring-cyan-500/80',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    shadow: 'shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]',
    neon: 'shadow-[0_0_25px_rgba(6,182,212,0.3),inset_0_0_10px_rgba(6,182,212,0.1)]',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    iconBg: 'bg-cyan-500/15'
  },
  purple: {
    ring: 'ring-1 ring-purple-500/60 hover:ring-purple-500/80',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    shadow: 'shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]',
    neon: 'shadow-[0_0_25px_rgba(168,85,247,0.3),inset_0_0_10px_rgba(168,85,247,0.1)]',
    gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
    iconBg: 'bg-purple-500/15'
  },
  amber: {
    ring: 'ring-1 ring-amber-500/60 hover:ring-amber-500/80',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    shadow: 'shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)]',
    neon: 'shadow-[0_0_25px_rgba(245,158,11,0.3),inset_0_0_10px_rgba(245,158,11,0.1)]',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-500/15'
  }
};

export const CompoundingPlans = () => {
  const [mainSection, setMainSection] = useState<'calculator' | 'paradox' | 'genie'>(() => {
    try {
      const host = window.location.hostname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      if (
        host.startsWith('app.') ||
        params.get('tab') === 'genie' ||
        params.get('view') === 'genie' ||
        hash === '#genie'
      ) {
        return 'genie';
      }
    } catch {}
    return 'calculator';
  });
  const [activeMode, setActiveMode] = useState<ParadoxMode | 'core'>(() => {
    const saved = localStorage.getItem('paradox_active_mode');
    return saved === '111' || saved === '222' || saved === '333' || saved === '444' || saved === 'core' ? saved : '111';
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [customSeedInput, setCustomSeedInput] = useState<string>('');
  const [customSeeds, setCustomSeeds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('paradox_custom_seeds');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerLeft, setTimerLeft] = useState<number>(0);
  const [timerType, setTimerType] = useState<'rest' | 'session'>('session');
  const [timerLabel, setTimerLabel] = useState<string>('');
  const [payoutRate, setPayoutRate] = useState(() => {
    const saved = localStorage.getItem('payout_rate');
    return saved ? Number(saved) : 0.92;
  });
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('compounding_steps');
    return saved ? JSON.parse(saved) : {};
  });
  const [vaultedTotal, setVaultedTotal] = useState<number>(() => {
    const saved = localStorage.getItem('paradox_vault_total');
    return saved ? Number(saved) || 0 : 0;
  });
  const [cyclesByPlan, setCyclesByPlan] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('paradox_cycles_by_plan');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [otmNotice, setOtmNotice] = useState<string>('');
  const [shareData, setShareData] = useState<ParadoxShareData | null>(null);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('journal_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<JournalEntry>>({
    result: 'Success',
    emotion: 'Confident',
    marketCondition: 'Trending',
    rating: 5,
    notes: ''
  });

  useEffect(() => {
    localStorage.setItem('paradox_active_mode', activeMode);
  }, [activeMode]);

  useEffect(() => {
    localStorage.setItem('compounding_steps', JSON.stringify(completedSteps));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem('paradox_vault_total', vaultedTotal.toString());
  }, [vaultedTotal]);

  useEffect(() => {
    localStorage.setItem('paradox_cycles_by_plan', JSON.stringify(cyclesByPlan));
  }, [cyclesByPlan]);

  useEffect(() => {
    localStorage.setItem('paradox_custom_seeds', JSON.stringify(customSeeds));
  }, [customSeeds]);

  useEffect(() => {
    localStorage.setItem('payout_rate', payoutRate.toString());
  }, [payoutRate]);

  useEffect(() => {
    localStorage.setItem('journal_entries', JSON.stringify(journalEntries));
  }, [journalEntries]);

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  };

  const paradoxMode: ParadoxMode = activeMode === 'core' ? '111' : activeMode;
  const currentPlans = React.useMemo(
    () => getPlansForMode(paradoxMode, payoutRate, customSeeds[paradoxMode]),
    [paradoxMode, payoutRate, customSeeds]
  );

  // Set initial selection and sync mode
  useEffect(() => {
    if (activeMode !== 'core') {
      const isValid = currentPlans.some(p => p.id === selectedPlanId);
      if (!isValid && currentPlans.length > 0) {
        setSelectedPlanId(currentPlans[0].id);
      }
    }
  }, [activeMode, currentPlans, selectedPlanId]);

  const activePlan = currentPlans.find(p => p.id === selectedPlanId) || currentPlans[0];
  const modeConfig = getParadoxModeConfig(paradoxMode);
  const planCycles = cyclesByPlan[activePlan.id] || 0;

  const addJournalEntry = () => {
    if (!newEntry.notes) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      phase: timerLabel === 'Active' ? 'Live Session' : `Post-Phase Review`,
      planName: activePlan.title,
      result: newEntry.result as any,
      emotion: newEntry.emotion as any,
      marketCondition: newEntry.marketCondition as any,
      rating: newEntry.rating || 5,
      notes: newEntry.notes,
      payout: payoutRate * 100
    };
    setJournalEntries([entry, ...journalEntries]);
    setNewEntry({ result: 'Success', emotion: 'Confident', marketCondition: 'Trending', rating: 5, notes: '' });
    setShowJournalForm(false);
  };

  const journalStats = React.useMemo(() => {
    if (journalEntries.length === 0) return null;
    const total = journalEntries.length;
    const successes = journalEntries.filter(e => e.result === 'Success').length;
    const winRate = (successes / total) * 100;

    const emotionStats = journalEntries.reduce((acc, curr) => {
      acc[curr.emotion] = (acc[curr.emotion] || 0) + (curr.result === 'Success' ? 1 : 0);
      acc[`${curr.emotion}_total`] = (acc[`${curr.emotion}_total`] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bestEmotion = Object.entries(EMOTIONS).map(([_, emp]) => {
      const totalEmp = emotionStats[`${emp.id}_total`] || 0;
      const successEmp = emotionStats[emp.id] || 0;
      return { id: emp.id, rate: totalEmp > 0 ? (successEmp / totalEmp) * 100 : 0, count: totalEmp };
    }).sort((a, b) => b.rate - a.rate)[0];

    return { winRate, total, bestEmotion };
  }, [journalEntries]);

  // Calculate session stats
  const sessionStats = React.useMemo(() => {
    let totalProfit = 0;
    let completedCount = 0;
    let totalStaked = 0;
    let totalLockedProfit = 0;

    activePlan.phases.forEach((phase, pIdx) => {
      const phaseTrades = phase.trades || [];
      const lastStepKey = `${activePlan.id}-${pIdx}-${phaseTrades.length - 1}`;
      const isPhaseFinished = phaseTrades.length > 0 && !!completedSteps[lastStepKey];

      phaseTrades.forEach((amount, tIdx) => {
        const stepKey = `${activePlan.id}-${pIdx}-${tIdx}`;
        if (completedSteps[stepKey]) {
          const profit = (amount * payoutRate);
          totalProfit += profit;
          totalStaked += amount;
          completedCount++;
        }
      });

      if (isPhaseFinished) {
        const lastTradeStake = phaseTrades[phaseTrades.length - 1];
        const lastTradeFinalValue = lastTradeStake * (1 + payoutRate);
        const nextPhase = activePlan.phases[pIdx + 1];

        if (nextPhase) {
          const lockedAmount = lastTradeFinalValue - nextPhase.start;
          if (lockedAmount > 0) totalLockedProfit += lockedAmount;
        } else {
          totalLockedProfit += Math.max(0, lastTradeFinalValue - (phaseTrades[0] || phase.start));
        }
      }
    });

    return { totalProfit, completedCount, totalStaked, totalLockedProfit };
  }, [completedSteps, activePlan, payoutRate]);

  const totalVaultCombined = Number((sessionStats.totalLockedProfit + vaultedTotal).toFixed(2));

  const startTimer = (id: string, initialSeconds: number, type: 'rest' | 'session', label: string = '') => {
    setActiveTimerId(id);
    setTimerLeft(initialSeconds);
    setTimerType(type);
    setTimerLabel(label);
  };

  const stopTimer = () => {
    setActiveTimerId(null);
    setTimerLabel('');
  };

  const toggleStep = (planId: string, pIndex: number, tIndex: number) => {
    const key = `${planId}-${pIndex}-${tIndex}`;
    const wasDone = !!completedSteps[key];
    const nextSteps = { ...completedSteps, [key]: !wasDone };
    const wasAllDone = activePlan.phases.every((ph, pi) =>
      (ph.trades || []).every((_, ti) => !!completedSteps[`${planId}-${pi}-${ti}`])
    );
    const isNowAllDone = activePlan.phases.every((ph, pi) =>
      (ph.trades || []).every((_, ti) => !!nextSteps[`${planId}-${pi}-${ti}`])
    );
    setCompletedSteps(nextSteps);

    if (!wasAllDone && isNowAllDone) {
      setCyclesByPlan(prev => ({ ...prev, [planId]: (prev[planId] || 0) + 1 }));
      setOtmNotice(`Cycle Complete! All ${activePlan.phases.length} phases cleared.`);
    }
  };

  // STRICT Phase 1 Full Reset (Vault 100% Protected + 30m OTM Cooldown Shield)
  const handleStrictP1LossReset = () => {
    const earnedLock = sessionStats.totalLockedProfit;
    if (earnedLock > 0) {
      setVaultedTotal(prev => Number((prev + earnedLock).toFixed(2)));
    }
    setCompletedSteps(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${activePlan.id}-`)) delete next[key];
      });
      return next;
    });
    startTimer(`${activePlan.id}_otm_shield`, 1800, 'rest', 'Wait');
    setOtmNotice(
      earnedLock > 0
        ? `Strict Phase 1 Full Reset triggered: +$${earnedLock.toFixed(2)} protected in Vault. 30m Cooldown Shield active.`
        : 'Strict Phase 1 Full Reset triggered: Vault stays 100% protected. 30m Cooldown Shield active.'
    );
  };

  const applyCustomSeed = () => {
    const parsed = Number(customSeedInput);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    const clean = Number(parsed.toFixed(2));
    setCustomSeeds(prev => ({ ...prev, [paradoxMode]: clean }));
    setSelectedPlanId(`custom-${paradoxMode}`);
  };

  const openParadoxShare = (phaseIdx: number | null) => {
    const payPct = Math.round(payoutRate * 100);
    const nowLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const seedAmt = activePlan.phases[0]?.start || activePlan.seed || 1.11;

    if (typeof phaseIdx === 'number' && activePlan.phases[phaseIdx]) {
      const ph = activePlan.phases[phaseIdx];
      const trades = ph.trades || [ph.start];
      const nextPh = activePlan.phases[phaseIdx + 1];
      const phDone = trades.filter((_, ti) => !!completedSteps[`${activePlan.id}-${phaseIdx}-${ti}`]).length;
      const phStart = trades[0] || seedAmt;
      const finalRet = (trades[trades.length - 1] || phStart) * (1 + payoutRate);
      const earnedProfit = trades.reduce(
        (acc, amt, ti) => (completedSteps[`${activePlan.id}-${phaseIdx}-${ti}`] ? acc + amt * payoutRate : acc),
        0
      );
      const dispProfit = phDone > 0 ? earnedProfit : (finalRet - phStart);
      const phLocked = nextPh ? Math.max(0, finalRet - nextPh.start) : Math.max(0, finalRet - phStart);

      setShareData({
        title: `Paradox ${paradoxMode} · ${activePlan.title} (${ph.title})`,
        shareHeadline: `ALADDINSNIPER PARADOX ${paradoxMode} · PHASE ${phaseIdx + 1} REPORT`,
        heroLabel: phDone === trades.length ? 'PHASE PROFIT SECURED' : phDone > 0 ? 'LIVE PHASE PROFIT' : 'PROJECTED PHASE GAIN',
        seedLabel: 'Phase Start Seed',
        engineLabel: `Paradox ${paradoxMode}`,
        profitOrLoss: Number(dispProfit.toFixed(2)),
        startingBalance: Number(phStart.toFixed(2)),
        endingBalance: Number((phDone > 0 ? phStart + dispProfit : finalRet).toFixed(2)),
        vaultedAmount: Number(phLocked.toFixed(2)),
        winsCount: phDone > 0 ? phDone : trades.length,
        lossesCount: 0,
        tradesCount: phDone > 0 ? phDone : trades.length,
        winRate: 100,
        payoutRate: payPct,
        strategyGoal: `P${phaseIdx + 1}/${activePlan.phases.length} (${phDone}/${trades.length}T · Lock $${phLocked.toFixed(2)})`,
        timestamp: nowLabel
      });
      return;
    }

    const totalSteps = activePlan.phases.reduce((a, p) => a + (p.trades?.length || 1), 0);
    const doneSteps = sessionStats.completedCount;
    const lastPh = activePlan.phases[activePlan.phases.length - 1];
    const lastTrades = lastPh?.trades || [seedAmt];
    const targetTopRet = (lastTrades[lastTrades.length - 1] || seedAmt) * (1 + payoutRate);
    const dispPnL = doneSteps > 0 ? sessionStats.totalProfit : Math.max(0, targetTopRet - seedAmt);
    const dispEnd = doneSteps > 0 ? (seedAmt + sessionStats.totalProfit + totalVaultCombined) : targetTopRet;

    setShareData({
      title: `Paradox ${paradoxMode} · ${activePlan.title}`,
      shareHeadline: `ALADDINSNIPER PARADOX ${paradoxMode} MASTER REPORT`,
      heroLabel: doneSteps > 0 ? 'PARADOX EARNED PROFIT' : 'PROJECTED FULL CYCLE GAIN',
      seedLabel: 'Phase 1 Seed',
      engineLabel: `Paradox ${paradoxMode} (${modeConfig.phasesCount}×${modeConfig.stepsPerPhase})`,
      profitOrLoss: Number(dispPnL.toFixed(2)),
      startingBalance: Number(seedAmt.toFixed(2)),
      endingBalance: Number(dispEnd.toFixed(2)),
      vaultedAmount: totalVaultCombined,
      winsCount: doneSteps > 0 ? doneSteps : totalSteps,
      lossesCount: 0,
      tradesCount: doneSteps > 0 ? doneSteps : totalSteps,
      winRate: 100,
      payoutRate: payPct,
      strategyGoal: `${doneSteps}/${totalSteps}T · Cycles ×${planCycles}`,
      timestamp: nowLabel
    });
  };

  useEffect(() => {
    if(!activeTimerId) return;
    const intv = setInterval(() => {
      setTimerLeft(prev => {
        if(timerType === 'rest') {
          if(prev <= 1) {
            clearInterval(intv);
            setActiveTimerId(null);
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }, 1000);
    return () => clearInterval(intv);
  }, [activeTimerId, timerType]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const ss = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const activeStyles = themeStyles[activePlan.theme];
  const totalPlanSteps = activePlan.phases.reduce((acc, p) => acc + (p.trades?.length || 1), 0);

  return (
    <div className="flex-1 flex flex-col gap-5 text-zinc-100 overflow-hidden pb-4 sm:pb-6 px-1 sm:px-3 pt-2 bg-[#0a0a0b]">
      {/* Unified Section Switcher: Row 1 Trade Manager, Row 2 Paradox Strategy (Left) + Aladdin Genie (Right) */}
      <div className="flex flex-col bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-[8px] gap-1.5 shadow-lg shrink-0">
        <button
          onClick={() => setMainSection('calculator')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            mainSection === 'calculator'
              ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-cyan-950/85 text-cyan-300 border border-cyan-500/45 shadow-[0_0_16px_rgba(6,182,212,0.22)] ring-1 ring-cyan-500/25'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
          }`}
        >
          <Calculator className={`w-3.5 h-3.5 ${mainSection === 'calculator' ? 'text-cyan-400 drop-shadow-[0_0_7px_rgba(34,211,238,0.5)]' : 'text-zinc-500'}`} />
          <span>Aladdin AI Trade Manager</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setMainSection('paradox')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-3 rounded-[6px] text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap overflow-hidden ${
              mainSection === 'paradox'
                ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-cyan-950/85 text-cyan-300 border border-cyan-500/45 shadow-[0_0_16px_rgba(6,182,212,0.22)] ring-1 ring-cyan-500/25'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${mainSection === 'paradox' ? 'text-cyan-400 drop-shadow-[0_0_7px_rgba(34,211,238,0.5)]' : 'text-zinc-500'}`} />
            <span className="truncate">Paradox Strategy</span>
          </button>

          <button
            onClick={() => setMainSection('genie')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-3 rounded-[6px] text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap overflow-hidden ${
              mainSection === 'genie'
                ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-cyan-950/85 text-cyan-300 border border-cyan-500/45 shadow-[0_0_16px_rgba(6,182,212,0.22)] ring-1 ring-cyan-500/25'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
            }`}
          >
            <span
              className={`text-sm leading-none shrink-0 transition-all duration-200 ${
                mainSection === 'genie'
                  ? 'drop-shadow-[0_0_7px_rgba(34,211,238,0.55)] opacity-100'
                  : 'opacity-70 grayscale-[45%]'
              }`}
            >
              🧞‍♂️
            </span>
            <span className="truncate">Aladdin Genie</span>
          </button>
        </div>
      </div>

      {mainSection === 'calculator' ? (
        <PocketSniperApp />
      ) : mainSection === 'genie' ? (
        <GenieTab />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 text-zinc-100 overflow-hidden">
          {/* 1. UNIFIED PARADOX PLAN SELECTOR SIDEBAR */}
          <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto hide-scrollbar shrink-0">
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-zinc-900/40 ring-1 ring-white/5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Paradox Mode</h3>
                <span className="text-[10px] font-mono font-bold text-indigo-400">
                  {activeMode === 'core' ? 'CORE ENGINE' : modeConfig.label}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {(['111', '222', '333', '444', 'core'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                      activeMode === mode ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {activeMode !== 'core' ? (
                <>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      placeholder="Custom Seed $"
                      value={customSeedInput}
                      onChange={(e) => setCustomSeedInput(e.target.value)}
                      className="flex-1 min-w-0 bg-black/50 ring-1 ring-white/10 rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:ring-amber-500/60"
                    />
                    <button
                      onClick={applyCustomSeed}
                      className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shrink-0"
                    >
                      Set Seed
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto hide-scrollbar pr-0.5">
                    {currentPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-all duration-200 group ${
                          activePlan.id === plan.id
                            ? 'bg-indigo-500/15 ring-1 ring-indigo-500/40'
                            : 'bg-black/25 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${themeStyles[plan.theme].text === 'text-emerald-400' ? 'bg-emerald-500' : themeStyles[plan.theme].text === 'text-cyan-400' ? 'bg-cyan-500' : themeStyles[plan.theme].text === 'text-amber-400' ? 'bg-amber-500' : 'bg-purple-500'}`}></div>
                          <div className="min-w-0">
                            <div className={`text-[12.5px] font-semibold truncate ${activePlan.id === plan.id ? 'text-white' : 'text-zinc-300'}`}>{plan.title}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">{plan.dailyTarget}</div>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activePlan.id === plan.id ? 'text-indigo-400 translate-x-0.5' : 'text-zinc-600'}`} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-3 text-center bg-black/30 rounded-lg ring-1 ring-white/5">
                  <p className="text-xs text-zinc-400">Paradox Core Console Active</p>
                </div>
              )}
            </div>

            {/* Global Stats Widget */}
            <div className="p-5 rounded-xl bg-zinc-900/40 ring-1 ring-white/5 backdrop-blur-sm space-y-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded bg-indigo-500/10"><BarChart3 className="w-4 h-4 text-indigo-400" /></div>
                 <div>
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Live Market Payout</h4>
                   <div className="flex items-center gap-2 mt-1">
                     <input
                       type="number"
                       min={50}
                       max={99}
                       value={(payoutRate * 100).toFixed(0)}
                       onChange={(e) => setPayoutRate(Math.max(0.5, Math.min(0.99, Number(e.target.value) / 100)))}
                       className="w-16 bg-black/40 ring-1 ring-white/10 rounded px-2 py-1 text-lg font-mono font-bold text-white focus:ring-indigo-500/50 outline-none tabular-nums"
                     />
                     <span className="text-lg font-mono font-bold text-zinc-500">%</span>
                   </div>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3 pt-2">
                 <div className="p-3 bg-black/40 rounded-lg ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <span className="block text-[8px] uppercase tracking-[0.2em] text-emerald-500/60 mb-1 font-black">Gross Profit</span>
                    <span className="text-sm font-black text-emerald-400 tabular-nums">
                       ${sessionStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="p-3 bg-black/40 rounded-lg ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    <span className="block text-[8px] uppercase tracking-[0.2em] text-cyan-500/60 mb-1 font-black">Vault Safe</span>
                    <span className="text-sm font-black text-cyan-400 tabular-nums">
                       ${totalVaultCombined.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
                 <div className="p-3 bg-black/40 rounded-lg ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] col-span-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="block text-[8px] uppercase tracking-[0.2em] text-zinc-500 mb-1 font-black">Trade Volume</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-300 tabular-nums">${sessionStats.totalStaked.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] uppercase tracking-[0.2em] text-amber-400/70 mb-1 font-black">Wins / Cycles</span>
                        <span className="text-sm font-black text-amber-400 tabular-nums">
                          {sessionStats.completedCount} · ×{planCycles}
                        </span>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* 2. MAIN ACTIVE VIEW */}
          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6 min-w-0">
            <AnimatePresence mode="wait">
              {activeMode === 'core' ? (
                <motion.div key="paradox-core" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <ParadoxStrategy />
                </motion.div>
              ) : (
                <motion.div key={activePlan.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-12">

                  {/* Active Plan Dashboard Header */}
                  <div className={`relative p-4 sm:p-6 rounded-xl bg-zinc-900/60 ring-1 ${activeStyles.ring} overflow-hidden shadow-2xl backdrop-blur-md ${activeStyles.neon}`}>
                     <div className={`absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none`}></div>

                     <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
                        <div className="space-y-3 flex-1">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-white/5 ring-1 ring-white/10 shadow-lg`}>
                                 <Target className={`w-5 h-5 ${activeStyles.text}`} />
                              </div>
                              <div>
                                 <div className="flex flex-wrap items-center gap-2">
                                   <h2 className="text-xl font-black tracking-tight text-white leading-tight">{activePlan.title}</h2>
                                   <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[10px] font-bold text-amber-300 font-mono">
                                     <Trophy className="w-3 h-3" /> ×{planCycles}
                                   </span>
                                 </div>
                                 <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${activeStyles.text}`}>{activePlan.subtitle}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{modeConfig.lockLabel}</span>
                                 </div>
                              </div>
                           </div>

                           {/* Overall Plan Progress */}
                           <div className="space-y-1.5 max-w-sm">
                              <div className="flex justify-between items-center px-1">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Execution Progress</span>
                                 <span className={`text-[10px] font-black font-mono tabular-nums ${activeStyles.text}`}>
                                   {totalPlanSteps > 0 ? Math.round((sessionStats.completedCount / totalPlanSteps) * 100) : 0}%
                                 </span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[0.5px]">
                                 <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${totalPlanSteps > 0 ? (sessionStats.completedCount / totalPlanSteps) * 100 : 0}%` }}
                                   className={`h-full rounded-full bg-gradient-to-r ${activePlan.theme === 'emerald' ? 'from-emerald-500 to-emerald-400' : activePlan.theme === 'cyan' ? 'from-cyan-500 to-cyan-400' : activePlan.theme === 'purple' ? 'from-purple-500 to-purple-400' : 'from-amber-500 to-amber-400'}`}
                                 />
                              </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-2 pt-1">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 ring-1 ring-white/5">
                                 <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                 <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">{activePlan.withdrawalRule}</span>
                              </div>

                              <button
                                onClick={() => exportParadoxCSV({
                                  mode: paradoxMode,
                                  plan: activePlan,
                                  payoutRate,
                                  completedSteps,
                                  vaultedTotal: totalVaultCombined,
                                  cyclesCount: planCycles
                                })}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 ring-1 ring-white/15 text-zinc-200 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                <FileDown className="w-3.5 h-3.5 text-cyan-400" /> CSV
                              </button>

                              <button
                                onClick={() => exportParadoxPDF({
                                  mode: paradoxMode,
                                  plan: activePlan,
                                  payoutRate,
                                  completedSteps,
                                  sessionStats,
                                  vaultedTotal,
                                  cyclesCount: planCycles,
                                  journalEntries
                                })}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" /> PDF
                              </button>

                              <button
                                onClick={() => openParadoxShare(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                <Share2 className="w-3.5 h-3.5" /> Share
                              </button>

                              <button
                                onClick={handleStrictP1LossReset}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 ring-1 ring-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Loss · P1 Reset
                              </button>

                              <button
                                onClick={() => {
                                  if (sessionStats.totalLockedProfit > 0) {
                                    setVaultedTotal(prev => Number((prev + sessionStats.totalLockedProfit).toFixed(2)));
                                  }
                                  setCompletedSteps(prev => {
                                    const next = { ...prev };
                                    Object.keys(next).forEach(key => {
                                      if (key.startsWith(`${activePlan.id}-`)) delete next[key];
                                    });
                                    return next;
                                  });
                                  stopTimer();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-white/10 ring-1 ring-white/10 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                 <RotateCcw className="w-3 h-3" /> Clear
                              </button>

                              {!confirmResetAll ? (
                                <button
                                  onClick={() => setConfirmResetAll(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/20 ring-1 ring-white/10 text-zinc-400 hover:text-rose-300 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                >
                                  <Zap className="w-3 h-3" /> Reset All
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setCompletedSteps({});
                                      setVaultedTotal(0);
                                      setCyclesByPlan({});
                                      setJournalEntries([]);
                                      setPayoutRate(0.92);
                                      localStorage.removeItem('compounding_steps');
                                      localStorage.removeItem('paradox_vault_total');
                                      localStorage.removeItem('paradox_cycles_by_plan');
                                      localStorage.removeItem('journal_entries');
                                      localStorage.removeItem('payout_rate');
                                      stopTimer();
                                      setConfirmResetAll(false);
                                      setOtmNotice('All Paradox Matrix progress, vault, and audits cleared.');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold uppercase"
                                  >
                                    Confirm?
                                  </button>
                                  <button
                                    onClick={() => setConfirmResetAll(false)}
                                    className="px-2 py-1.5 rounded-lg bg-white/10 text-zinc-300 text-[10px] font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                           </div>

                           {otmNotice && (
                             <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                               <span>{otmNotice}</span>
                               <button onClick={() => setOtmNotice('')} className="text-amber-300 font-bold text-xs">Dismiss</button>
                             </div>
                           )}
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl ring-1 ring-indigo-500/20 md:w-64 backdrop-blur-md flex flex-col justify-center shrink-0">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Session Status</span>
                              {activeTimerId && <span className="text-[9px] font-bold text-emerald-400">RUNNING</span>}
                           </div>
                           <div className="flex items-end gap-3 mb-4">
                              <span className="text-3xl font-mono font-black text-white tabular-nums tracking-tight">
                                {activeTimerId ? formatTime(timerLeft) : '00:00'}
                              </span>
                              <span className={`text-[10px] font-bold mb-1.5 px-2 py-0.5 rounded ${
                                timerLabel === 'Wait' ? 'bg-rose-500/10 text-rose-400' :
                                timerLabel === 'Rest' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-indigo-500/10 text-indigo-400'
                              }`}>
                                {timerLabel === 'Wait' ? '30m OTM Shield' : timerLabel || 'Standby'}
                              </span>
                           </div>
                           <button
                             onClick={() => {
                               const journalEl = document.getElementById('session-journal');
                               if (journalEl) journalEl.scrollIntoView({ behavior: 'smooth' });
                               setShowJournalForm(true);
                             }}
                             className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10"
                           >
                             <MessageSquare className="w-3.5 h-3.5" /> Log Reflection
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Phases Roadmap */}
                  <div className="space-y-4">
                    {activePlan.phases.map((phase, pIndex) => {
                      const trades = phase.trades || [];
                      const phaseCompletedSteps = trades.filter((_, tIndex) => completedSteps[`${activePlan.id}-${pIndex}-${tIndex}`]).length;
                      const phaseProgress = trades.length > 0 ? (phaseCompletedSteps / trades.length) * 100 : 0;

                      return (
                        <div key={`${activePlan.id}-${pIndex}`} id={`phase-container-${pIndex}`} className="relative group">
                           <div className="relative z-10 flex flex-col gap-3">
                              <div className="bg-zinc-900/80 ring-1 ring-white/10 rounded-xl overflow-hidden transition-all duration-300 hover:ring-white/20 shadow-2xl relative">
                                 <div className="h-0.5 w-full bg-white/5 relative z-20">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${phaseProgress}%` }}
                                      className={`h-full bg-gradient-to-r ${activePlan.theme === 'emerald' ? 'from-emerald-500 to-emerald-400' : activePlan.theme === 'cyan' ? 'from-cyan-500 to-cyan-400' : activePlan.theme === 'purple' ? 'from-purple-500 to-purple-400' : 'from-amber-500 to-amber-400'}`}
                                    />
                                 </div>

                                 <div className="p-3 sm:p-4">
                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                                      <div className="flex items-center gap-3">
                                         <div className={`w-8 h-8 rounded flex items-center justify-center ring-1 ${activeStyles.neon} ${activeStyles.ring} ${activeStyles.iconBg} shrink-0 shadow-lg`}>
                                            <span className={`text-sm font-black ${activeStyles.text}`}>{pIndex + 1}</span>
                                         </div>
                                         <div>
                                            <h4 className="text-base font-bold text-white tracking-tight leading-tight">{phase.title}</h4>
                                            <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                                              Start ${phase.start.toFixed(2)} · {phaseCompletedSteps}/{trades.length} Paid
                                            </span>
                                         </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                         <button
                                           onClick={() => openParadoxShare(pIndex)}
                                           className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 ring-1 ring-amber-500/35 text-amber-300 text-[9px] font-bold uppercase tracking-wider"
                                           title="Share Phase P&L"
                                         >
                                           <Share2 className="w-3 h-3" /> Share
                                         </button>
                                         <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg ring-1 ring-white/5">
                                            <button
                                               onClick={() => startTimer(`${activePlan.id}-${pIndex}`, 0, 'session', 'Active')}
                                               className="p-1.5 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors"
                                               title="Start Session"
                                            >
                                               <Play className="w-3.5 h-3.5" fill="currentColor" />
                                            </button>
                                            <button
                                               onClick={() => startTimer(`${activePlan.id}-${pIndex}_rest`, 1800, 'rest', 'Wait')}
                                               className="px-2 py-1 hover:bg-white/5 rounded text-[9px] font-bold text-zinc-400"
                                            >
                                               30m
                                            </button>
                                            <button
                                               onClick={() => startTimer(`${activePlan.id}-${pIndex}_rest`, 3600, 'rest', 'Rest')}
                                               className="px-2 py-1 hover:bg-white/5 rounded text-[9px] font-bold text-zinc-400"
                                            >
                                               1h
                                            </button>
                                            <button onClick={stopTimer} className="p-1.5 hover:bg-white/5 rounded text-zinc-500" title="Stop Timer">
                                               <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                         </div>

                                         <button
                                           onClick={() => {
                                             setCompletedSteps(prev => {
                                               const next = { ...prev };
                                               Object.keys(next).forEach(key => {
                                                 if (key.startsWith(`${activePlan.id}-${pIndex}-`)) delete next[key];
                                               });
                                               return next;
                                             });
                                           }}
                                           className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-wider"
                                         >
                                            <RotateCcw className="w-3 h-3" /> Clear Phase
                                         </button>
                                      </div>
                                   </div>

                                   {/* Step Execution Grid */}
                                   <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                                      {trades.map((amount, tIndex) => {
                                        const isLast = tIndex === trades.length - 1;
                                        const isFirst = tIndex === 0;
                                        const stepKey = `${activePlan.id}-${pIndex}-${tIndex}`;
                                        const isDone = completedSteps[stepKey];

                                        return (
                                          <motion.button
                                            key={tIndex}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => toggleStep(activePlan.id, pIndex, tIndex)}
                                            className={`group/step relative p-2.5 rounded-lg text-left transition-all duration-200 border ring-1 ${
                                              isDone
                                                ? 'bg-emerald-500/20 ring-emerald-500/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                                : isLast
                                                  ? `${activeStyles.bg} ${activeStyles.ring} border-indigo-500/40`
                                                  : 'bg-black/80 ring-white/15 border-transparent hover:ring-white/30'
                                            }`}
                                          >
                                             <div className="flex items-center justify-between mb-1">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${
                                                  isDone ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400'
                                                }`}>
                                                  {isDone ? <CheckCircle2 className="w-3 h-3" /> : tIndex + 1}
                                                </div>
                                                <span className={`text-[8px] font-bold uppercase ${isDone ? 'text-emerald-400' : isLast ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                                  {isFirst ? 'Entry' : isLast ? 'Peak' : 'Next'}
                                                </span>
                                             </div>
                                             <div className="flex flex-col">
                                                <span className={`text-xs font-mono font-black tabular-nums ${isDone ? 'text-emerald-300' : 'text-zinc-100'}`}>
                                                  ${amount.toFixed(2)}
                                                </span>
                                                <span className={`text-[9px] font-mono tabular-nums ${isDone ? 'text-emerald-400/80' : 'text-zinc-500'}`}>
                                                  +${(amount * payoutRate).toFixed(2)}
                                                </span>
                                             </div>
                                          </motion.button>
                                        );
                                      })}
                                   </div>

                                   {/* Phase Direct Trade Action Bar */}
                                   <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/5">
                                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold truncate">{phase.title} · Pocket Option</span>
                                      <a
                                        href={POCKET_OPTION_AFFILIATE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 whitespace-nowrap"
                                      >
                                         <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0" />
                                         <span>Trade Now</span>
                                      </a>
                                   </div>

                                   {/* Phase Outcome Summary */}
                                   {(() => {
                                     const lastStepDone = completedSteps[`${activePlan.id}-${pIndex}-${trades.length - 1}`];
                                     if (!lastStepDone) return null;

                                     const lastAmount = trades[trades.length - 1];
                                     const finalVal = lastAmount * (1 + payoutRate);
                                     const nextPhase = activePlan.phases[pIndex + 1];
                                     const reserved = nextPhase ? Math.max(0, finalVal - nextPhase.start) : Math.max(0, finalVal - (trades[0] || phase.start));

                                     return (
                                       <motion.div
                                         initial={{ opacity: 0, scale: 0.97 }}
                                         animate={{ opacity: 1, scale: 1 }}
                                         className="mt-4 p-4 rounded-xl bg-black/50 ring-1 ring-emerald-500/35 space-y-3"
                                       >
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Phase Target Hit · Vault Updated</span>
                                            <span className="text-sm font-black text-white font-mono tabular-nums">${finalVal.toFixed(2)} Return</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                             <div>
                                                <span className="block text-[9px] uppercase text-zinc-500">Capital Vaulted</span>
                                                <span className="text-sm font-black text-emerald-400 font-mono tabular-nums">+${reserved.toFixed(2)}</span>
                                             </div>
                                             {nextPhase ? (
                                               <button
                                                 onClick={() => {
                                                   const nextEl = document.getElementById(`phase-container-${pIndex + 1}`);
                                                   if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                 }}
                                                 className="text-right hover:opacity-80"
                                               >
                                                  <span className="block text-[9px] uppercase text-zinc-500">Next Phase Start</span>
                                                  <span className="text-sm font-black text-indigo-400 font-mono tabular-nums">${nextPhase.start.toFixed(2)} →</span>
                                               </button>
                                             ) : (
                                               <div className="text-right">
                                                  <span className="block text-[9px] uppercase text-zinc-500">Exit Result</span>
                                                  <span className="text-sm font-black text-amber-400 font-mono">CYCLE COMPLETE 🏆</span>
                                               </div>
                                             )}
                                          </div>
                                       </motion.div>
                                     );
                                   })()}
                                 </div>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Protocol Footnotes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-5 rounded-2xl bg-black/25 ring-1 ring-white/5 space-y-2">
                        <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                           <AlertTriangle className="w-3.5 h-3.5" /> Strict Phase 1 Full Reset
                        </h5>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          On any OTM loss, <strong className="text-zinc-200">Reset strictly to Phase 1 Step 1</strong> and trigger the 30-min Cooldown Shield. All Vaulted profits from cleared phases stay 100% safe.
                        </p>
                     </div>
                     <div className="p-5 rounded-2xl bg-black/25 ring-1 ring-white/5 space-y-2">
                        <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                           <Brain className="w-3.5 h-3.5" /> Auto Vault Discipline ({paradoxMode})
                        </h5>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {paradoxMode === '111'
                            ? '111 Mode runs 10 phases × 1 sniper shot, locking 30% net profit into your Vault on every win while rolling 70% profit + stake.'
                            : paradoxMode === '222'
                              ? '222 Mode runs 6 phases × 2 compounded trades, locking 40% total return into your Vault per phase cleanly.'
                              : 'Clear each phase sequentially and lock capital automatically so only isolated seed capital remains at risk.'}
                        </p>
                     </div>
                  </div>

              {/* SMART TRADING JOURNAL */}
              <div id="session-journal" className="bg-zinc-900/40 ring-1 ring-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none`}></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-white tracking-tight">Advanced Session Audit</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Mindset Analytics & Performance Tracking</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowJournalForm(!showJournalForm)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ring-1 ${
                        showJournalForm ? 'bg-zinc-800 text-zinc-300 ring-white/10' : 'bg-amber-500 text-black ring-amber-500/20 hover:scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      }`}
                    >
                      {showJournalForm ? 'Discard Draft' : <><Plus className="w-4 h-4" /> New Audit</>}
                    </button>
                  </div>
                </div>

                {/* Journal Analytics Quick Bar */}
                {journalStats && !showJournalForm && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                     <div className="p-4 rounded-xl bg-black/40 ring-1 ring-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Session Win Rate</span>
                        <div className="flex items-baseline gap-2">
                           <span className={`text-2xl font-mono font-black ${journalStats.winRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{journalStats.winRate.toFixed(0)}%</span>
                           <span className="text-[10px] text-zinc-600 font-bold uppercase">Average</span>
                        </div>
                     </div>
                     <div className="p-4 rounded-xl bg-black/40 ring-1 ring-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Emotional Edge</span>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-black text-white">{journalStats.bestEmotion.id}</span>
                           <span className="text-[10px] text-emerald-400/60 font-bold uppercase">({journalStats.bestEmotion.rate.toFixed(0)}% WR)</span>
                        </div>
                     </div>
                     <div className="p-4 rounded-xl bg-black/40 ring-1 ring-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Total Audits</span>
                        <span className="text-2xl font-mono font-black text-white">{journalStats.total}</span>
                     </div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {showJournalForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-8"
                    >
                      <div className="bg-black/60 rounded-2xl p-6 ring-1 ring-white/10 space-y-6 shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Protocol Result</label>
                             <div className="flex bg-zinc-900/50 p-1 rounded-lg ring-1 ring-white/5">
                               {['Success', 'Fail'].map(r => (
                                 <button 
                                  key={r}
                                  onClick={() => setNewEntry({...newEntry, result: r as any})}
                                  className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${newEntry.result === r ? (r === 'Success' ? 'bg-emerald-500 text-black shadow-lg' : 'bg-rose-500 text-black shadow-lg') : 'text-zinc-500 hover:text-zinc-300'}`}
                                 >
                                   {r}
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Market State</label>
                             <div className="flex bg-zinc-900/50 p-1 rounded-lg ring-1 ring-white/5 gap-1">
                               {MARKET_CONDITIONS.map(m => (
                                 <button 
                                  key={m.id}
                                  onClick={() => setNewEntry({...newEntry, marketCondition: m.id as any})}
                                  title={m.id}
                                  className={`flex-1 py-2 flex items-center justify-center rounded-md transition-all ${newEntry.marketCondition === m.id ? 'bg-indigo-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                                 >
                                   <m.icon className="w-3.5 h-3.5" />
                                 </button>
                               ))}
                             </div>
                          </div>

                          <div className="space-y-3 md:col-span-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Dominant Emotion</label>
                             <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                               {EMOTIONS.map(e => (
                                 <button 
                                  key={e.id}
                                  onClick={() => setNewEntry({...newEntry, emotion: e.id as any})}
                                  className={`py-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ring-1 ${newEntry.emotion === e.id ? 'bg-white/10 ring-white/20 scale-105' : 'bg-zinc-900/40 ring-white/5 text-zinc-500'}`}
                                 >
                                   <e.icon className={`w-3.5 h-3.5 ${newEntry.emotion === e.id ? e.color : 'text-zinc-600'}`} />
                                   <span className="text-[7px] font-black uppercase tracking-tighter">{e.id}</span>
                                 </button>
                               ))}
                             </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Execution Quality Rating</label>
                            <span className="text-[10px] font-mono font-black text-amber-400">{newEntry.rating || 5}/5</span>
                          </div>
                          <div className="flex gap-2 justify-center py-2 bg-zinc-900/30 rounded-xl ring-1 ring-white/5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setNewEntry({ ...newEntry, rating: star })}
                                className="transition-transform active:scale-90"
                              >
                                <Sparkles className={`w-6 h-6 transition-colors ${star <= (newEntry.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-800'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Deep Reflection & Tactical Notes</label>
                          <textarea 
                            value={newEntry.notes}
                            onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                            placeholder="Detail your setups, mistakes, and tactical wins..."
                            className="w-full bg-zinc-900/50 ring-1 ring-white/10 p-5 rounded-2xl text-sm text-zinc-200 placeholder:text-zinc-700 focus:ring-amber-500/50 outline-none transition-all min-h-[120px] resize-none"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                           <button onClick={() => setShowJournalForm(false)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300">Cancel Audit</button>
                           <button onClick={addJournalEntry} className="px-10 py-3 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/20 active:scale-95 transition-all">
                             <CheckCircle2 className="w-4 h-4" /> Commit to Journal
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Journal Feed */}
                <div className="space-y-6">
                  {journalEntries.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                       <div className="w-20 h-20 bg-zinc-900 ring-1 ring-white/5 rounded-full flex items-center justify-center mb-6 opacity-30">
                          <MessageSquare className="w-10 h-10 text-zinc-500" />
                       </div>
                       <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Silence in the Audit Log</p>
                       <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px] leading-relaxed">Systematic reflection leads to legendary compounding. Log your first session.</p>
                    </div>
                  ) : (
                    journalEntries.map((entry) => {
                      const entryEmotion = EMOTIONS.find(e => e.id === entry.emotion) || EMOTIONS[0];
                      const marketIco = MARKET_CONDITIONS.find(m => m.id === entry.marketCondition) || MARKET_CONDITIONS[0];

                      return (
                        <motion.div 
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-zinc-900/60 p-6 rounded-2xl ring-1 ring-white/5 group hover:ring-white/10 transition-all shadow-xl relative overflow-hidden"
                        >
                           <div className={`absolute left-0 top-0 w-1 h-full ${entry.result === 'Success' ? 'bg-emerald-500' : 'bg-rose-500 opacity-50'}`}></div>
                           
                           <div className="flex flex-col gap-5">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                 <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${entryEmotion.bg} ${entryEmotion.color.replace('text-', 'ring-')}`}>
                                       <entryEmotion.icon className={`w-5 h-5 ${entryEmotion.color}`} />
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2 mb-0.5">
                                          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{entry.planName}: {entry.phase}</h5>
                                          <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                          <div className="flex items-center gap-1">
                                             {[...Array(5)].map((_, i) => (
                                                <Sparkles key={i} className={`w-2.5 h-2.5 ${i < entry.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-800'}`} />
                                             ))}
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                          <span className={`text-lg font-black tracking-tight ${entry.result === 'Success' ? 'text-emerald-400' : 'text-rose-400 opacity-80'}`}>{entry.result}</span>
                                          <span className="text-[10px] font-mono text-zinc-600 font-bold">{entry.date}</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-2">
                                    <div className="px-3 py-1.5 bg-black/40 rounded-lg ring-1 ring-white/5 flex items-center gap-2">
                                       <marketIco.icon className="w-3 h-3 text-indigo-400" />
                                       <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{entry.marketCondition}</span>
                                    </div>
                                    <div className="px-3 py-1.5 bg-black/40 rounded-lg ring-1 ring-white/5 flex items-center gap-2">
                                       <Activity className="w-3 h-3 text-cyan-400" />
                                       <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{entry.payout}% Rate</span>
                                    </div>
                                    <button 
                                      onClick={() => deleteJournalEntry(entry.id)}
                                      className="p-2 hover:bg-rose-500/10 rounded-lg text-zinc-600 hover:text-rose-400 transition-colors"
                                    >
                                       <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                 </div>
                              </div>

                              <div className="relative">
                                 <div className="absolute -left-6 top-0 w-12 h-12 bg-white/5 blur-[20px] rounded-full pointer-events-none"></div>
                                 <p className="text-sm text-zinc-300 leading-relaxed font-medium whitespace-pre-wrap">
                                    {entry.notes}
                                 </p>
                              </div>
                           </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
      )}

      <ParadoxShareModal data={shareData} onClose={() => setShareData(null)} />
    </div>
  );
};

