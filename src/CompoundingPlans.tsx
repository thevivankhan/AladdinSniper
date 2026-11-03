import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertTriangle, ChevronRight, Activity, DollarSign, Wallet, CheckCircle2, Layers, Sparkles, Zap, ShieldCheck, Brain, Timer, Clock, Play, RotateCcw, BarChart3, MessageSquare, Smile, Meh, Frown, Plus, Calendar, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ParadoxStrategy } from './ParadoxStrategy';
import { PocketSniperApp } from './components/calculator/PocketSniperApp';

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

interface Phase {
  title: string;
  start: number;
  trades?: number[]; // Make trades optional as we'll generate them
}

const generateTrades = (start: number, count: number, payoutRate: number) => {
  const trades: number[] = [];
  let current = start;
  for (let i = 0; i < count; i++) {
    trades.push(Number(current.toFixed(2)));
    current = current * (1 + payoutRate);
  }
  return trades;
};

interface Plan {
  id: string;
  title: string;
  subtitle: string;
  phases: Phase[];
  theme: 'emerald' | 'cyan' | 'purple' | 'amber';
  withdrawalRule?: string;
  dailyTarget?: string;
}

const plans333: Plan[] = [
  {
    id: 'plan-100',
    title: 'Nano Builder',
    subtitle: 'Start: $100 / $250 - 92% Ratio',
    theme: 'cyan',
    withdrawalRule: 'Lock 50% post Phase 2',
    dailyTarget: 'Complete 1 Phase/Day',
    phases: [
      { title: 'Phase 1', start: 2.11, trades: [2.11, 4.05, 7.78] },
      { title: 'Phase 2', start: 10.11, trades: [10.11, 19.41, 37.27] },
      { title: 'Phase 3', start: 30.11, trades: [30.11, 57.81, 110.99] }
    ]
  },
  {
    id: 'plan-250',
    title: 'Micro Builder',
    subtitle: 'Start: $250 / $500 - 92% Ratio',
    theme: 'purple',
    withdrawalRule: 'Full withdrawal post Phase 3',
    dailyTarget: 'Max 2 Sessions/Day',
    phases: [
      { title: 'Phase 1', start: 5.11, trades: [5.11, 9.81, 18.84] },
      { title: 'Phase 2', start: 20.11, trades: [20.11, 38.61, 74.13] },
      { title: 'Phase 3', start: 100.11, trades: [100.11, 192.21, 369.04] }
    ]
  },
  {
    id: 'plan-500',
    title: 'Beginner Builder',
    subtitle: 'Start: $500 / $1000 - 92% Ratio',
    theme: 'emerald',
    withdrawalRule: 'Lock 50% of Phase 2',
    dailyTarget: 'Strictly 1 Phase/Day',
    phases: [
      { title: 'Phase 1', start: 10.11, trades: [10.11, 19.41, 37.27] },
      { title: 'Phase 2', start: 50.11, trades: [50.11, 96.21, 184.72] },
      { title: 'Phase 3', start: 300.11, trades: [300.11, 576.21, 1106.32] }
    ]
  },
  {
    id: 'plan-2000',
    title: 'Advanced Accelerator',
    subtitle: 'Start: $2000 / $3000 - 92% Ratio',
    theme: 'cyan',
    withdrawalRule: 'Lock 60% post Phase 3',
    dailyTarget: 'Paced Execution (1/Day)',
    phases: [
      { title: 'Phase 1', start: 20.11, trades: [20.11, 38.61, 74.13] },
      { title: 'Phase 2', start: 100.11, trades: [100.11, 192.21, 369.04] },
      { title: 'Phase 3', start: 600.11, trades: [600.11, 1152.21, 2212.24] }
    ]
  },
  {
    id: 'plan-5000',
    title: 'Elite Capital',
    subtitle: 'Start: $5000 - 92% Ratio',
    theme: 'purple',
    withdrawalRule: 'Lock Initial post Phase 1',
    dailyTarget: 'High Capital Focus',
    phases: [
      { title: 'Phase 1', start: 50.11, trades: [50.11, 96.21, 184.72] },
      { title: 'Phase 2', start: 300.11, trades: [300.11, 576.21, 1106.32] },
      { title: 'Phase 3', start: 2000.11, trades: [2000.11, 3840.21, 7373.20] }
    ]
  },
  {
    id: 'plan-10000',
    title: 'Master Capital',
    subtitle: 'Start: $10000 - 92% Ratio',
    theme: 'amber',
    withdrawalRule: 'Systematic Withdrawal',
    dailyTarget: 'Institutional Pace',
    phases: [
      { title: 'Phase 1', start: 100.11, trades: [100.11, 192.21, 369.04] },
      { title: 'Phase 2', start: 600.11, trades: [600.11, 1152.21, 2212.24] },
      { title: 'Phase 3', start: 4000.11, trades: [4000.11, 7680.21, 14746.00] }
    ]
  },
  {
    id: 'plan-100k',
    title: 'Legendary Target',
    subtitle: 'Start: $500.11 - 92% Ratio',
    theme: 'cyan',
    withdrawalRule: '1 Lakh Target Lock',
    dailyTarget: 'Ultimate Consistency',
    phases: [
      { title: 'Phase 1', start: 500.11, trades: [500.11, 960.21, 1843.60] },
      { title: 'Phase 2', start: 2000.11, trades: [2000.11, 3840.21, 7373.20] },
      { title: 'Phase 3', start: 14156.54, trades: [14156.54, 27180.55, 52186.66] }
    ]
  }
];

const plans444: Plan[] = [
  {
    id: 'plan-1-11',
    title: 'Micro Starter',
    subtitle: 'Start: $1.11 - 92% Ratio (4x4)',
    theme: 'cyan',
    withdrawalRule: 'Withdraw risk after P2',
    dailyTarget: '1 Phase Completion',
    phases: [
      { title: 'Phase 1', start: 1.11, trades: [1.11, 2.13, 4.09, 7.85] },
      { title: 'Phase 2', start: 10.11, trades: [10.11, 19.41, 37.27, 71.56] },
      { title: 'Phase 3', start: 100.11, trades: [100.11, 192.21, 369.04, 708.56] },
      { title: 'Phase 4', start: 1000.11, trades: [1000.11, 1920.21, 3686.80, 7078.66] }
    ]
  },
  {
    id: 'plan-2-11',
    title: 'Mini Starter',
    subtitle: 'Start: $2.11 - 92% Ratio (4x4)',
    theme: 'purple',
    withdrawalRule: 'Withdraw $100 at P2',
    dailyTarget: 'Max 2 Paced Sessions',
    phases: [
      { title: 'Phase 1', start: 2.11, trades: [2.11, 4.05, 7.78, 14.94] },
      { title: 'Phase 2', start: 20.11, trades: [20.11, 38.61, 74.13, 142.33] },
      { title: 'Phase 3', start: 200.11, trades: [200.11, 384.21, 737.68, 1416.35] },
      { title: 'Phase 4', start: 2000.11, trades: [2000.11, 3840.21, 7373.20, 14156.54] }
    ]
  },
  {
    id: 'plan-5-11',
    title: 'Pro Starter',
    subtitle: 'Start: $5.11 - 92% Ratio (4x4)',
    theme: 'emerald',
    withdrawalRule: 'Lock 50% post Phase 2',
    dailyTarget: 'Optimal Scaling (1/Day)',
    phases: [
      { title: 'Phase 1', start: 5.11, trades: [5.11, 9.81, 18.83, 36.15] },
      { title: 'Phase 2', start: 50.11, trades: [50.11, 96.21, 184.72, 354.66] },
      { title: 'Phase 3', start: 500.11, trades: [500.11, 960.21, 1843.60, 3539.71] },
      { title: 'Phase 4', start: 5000.11, trades: [5000.11, 9600.21, 18432.40, 35390.21] }
    ]
  },
  {
    id: 'plan-10-11',
    title: 'Elite Starter',
    subtitle: 'Start: $10.11 - 92% Ratio (4x4)',
    theme: 'amber',
    withdrawalRule: 'Strict 40% lock post P2',
    dailyTarget: 'Advanced Capital Mgmt',
    phases: [
      { title: 'Phase 1', start: 10.11, trades: [10.11, 19.41, 37.27, 71.56] },
      { title: 'Phase 2', start: 100.11, trades: [100.11, 192.21, 369.04, 708.56] },
      { title: 'Phase 3', start: 1000.11, trades: [1000.11, 1920.21, 3686.80, 7078.66] },
      { title: 'Phase 4', start: 10000.11, trades: [10000.11, 19200.21, 36864.40, 70779.65] }
    ]
  },
  {
    id: 'plan-50-11',
    title: 'God Starter',
    subtitle: 'Start: $50.11 - 92% Ratio (4x4)',
    theme: 'cyan',
    withdrawalRule: 'Absolute Lock post Phase 2',
    dailyTarget: 'Institutional Zenith',
    phases: [
      { title: 'Phase 1', start: 50.11, trades: [50.11, 96.21, 184.72, 354.66] },
      { title: 'Phase 2', start: 500.11, trades: [500.11, 960.21, 1843.60, 3539.71] },
      { title: 'Phase 3', start: 5000.11, trades: [5000.11, 9600.21, 18432.40, 35390.21] },
      { title: 'Phase 4', start: 50000.11, trades: [50000.11, 96000.21, 184320.40, 353895.17] }
    ]
  }
];

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
  const [mainSection, setMainSection] = useState<'calculator' | 'challenges' | 'paradox'>('calculator');
  const [activeMode, setActiveMode] = useState<'333' | '444' | 'paradox'>('333');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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
    localStorage.setItem('compounding_steps', JSON.stringify(completedSteps));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem('payout_rate', payoutRate.toString());
  }, [payoutRate]);

  useEffect(() => {
    localStorage.setItem('journal_entries', JSON.stringify(journalEntries));
  }, [journalEntries]);

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
  };

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

  const currentPlansTemplate = activeMode === '333' ? plans333 : plans444;
  
  // Dynamically generate plans with calculated trades
  const currentPlans = React.useMemo(() => {
    return currentPlansTemplate.map(plan => ({
      ...plan,
      subtitle: plan.subtitle.replace(/92%|[\d.]+%/, `${(payoutRate * 100).toFixed(0)}%`),
      phases: plan.phases.map(phase => ({
        ...phase,
        trades: generateTrades(phase.start, activeMode === '333' ? 3 : 4, payoutRate)
      }))
    }));
  }, [currentPlansTemplate, payoutRate, activeMode]);

  // Set initial selection and sync mode
  useEffect(() => {
    if (activeMode !== 'paradox') {
      const isValid = currentPlans.some(p => p.id === selectedPlanId);
      if (!isValid && currentPlans.length > 0) {
        setSelectedPlanId(currentPlans[0].id);
      }
    }
  }, [activeMode, currentPlans, selectedPlanId]);

  const activePlan = currentPlans.find(p => p.id === selectedPlanId) || currentPlans[0];

  // Calculate session stats
  const sessionStats = React.useMemo(() => {
    let totalProfit = 0;
    let completedCount = 0;
    let totalStaked = 0;
    let totalLockedProfit = 0;
    
    // Track if a phase is actually completed to calculate real-time locked profit
    activePlan.phases.forEach((phase, pIdx) => {
      const phaseTrades = phase.trades || [];
      const lastStepKey = `${activePlan.id}-${pIdx}-${phaseTrades.length - 1}`;
      const isPhaseFinished = completedSteps[lastStepKey];

      // Sum individual trade profits
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
        // Calculate amount that WAS locked from THIS phase for the NEXT phase
        const lastTradeStake = phaseTrades[phaseTrades.length - 1];
        const lastTradeFinalValue = lastTradeStake * (1 + payoutRate);
        const nextPhase = activePlan.phases[pIdx + 1];
        
        if (nextPhase) {
          const lockedAmount = lastTradeFinalValue - nextPhase.start;
          if (lockedAmount > 0) totalLockedProfit += lockedAmount;
        } else {
          // If it's the final phase, the final value achieved is the ultimate "locked" win
          totalLockedProfit += lastTradeFinalValue;
        }
      }
    });

    return { totalProfit, completedCount, totalStaked, totalLockedProfit };
  }, [completedSteps, activePlan, payoutRate]);

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
    setCompletedSteps(prev => ({ ...prev, [key]: !prev[key] }));
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

  return (
    <div className="flex-1 flex flex-col gap-5 text-zinc-100 overflow-hidden pb-4 sm:pb-6 px-1 sm:px-3 pt-2 bg-[#0a0a0b]">
      {/* Primary Section Switcher - Square design with subtle curves, eye-friendly cool dark theme */}
      <div className="flex flex-col bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-[8px] gap-1.5 shadow-lg shrink-0">
        {/* Top: AladdinSniper Trade Manager - slimmer vertically, single full-width button */}
        <button
          onClick={() => setMainSection('calculator')}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[6px] text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            mainSection === 'calculator'
              ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
          }`}
        >
          <Calculator className={`w-3.5 h-3.5 ${mainSection === 'calculator' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]' : 'text-zinc-500'}`} />
          <span>AladdinSniper Trade Manager</span>
        </button>

        {/* Bottom Row: Challenge Protocols & Paradox Matrix side-by-side */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setMainSection('challenges')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-[6px] text-[10.5px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              mainSection === 'challenges'
                ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${mainSection === 'challenges' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]' : 'text-zinc-500'}`} />
            <span className="truncate">333/444 Mode</span>
          </button>

          <button
            onClick={() => setMainSection('paradox')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-[6px] text-[10.5px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              mainSection === 'paradox'
                ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/70'
            }`}
          >
            <Brain className={`w-3.5 h-3.5 shrink-0 ${mainSection === 'paradox' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]' : 'text-zinc-500'}`} />
            <span className="truncate">Paradox Matrix</span>
          </button>
        </div>
      </div>

      {mainSection === 'calculator' ? (
        <PocketSniperApp />
      ) : mainSection === 'paradox' ? (
        <ParadoxStrategy />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 text-zinc-100 overflow-hidden">
          {/* 1. PLAN SELECTOR SIDEBAR */}
          <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto hide-scrollbar shrink-0">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-900/40 ring-1 ring-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Compounding Class</h3>
            <div className="flex gap-1">
               {['333', '444', 'paradox'].map(mode => (
                 <button
                    key={mode}
                    onClick={() => setActiveMode(mode as any)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                      activeMode === mode ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-zinc-500 hover:text-zinc-300'
                    }`}
                 >
                   {mode}
                 </button>
               ))}
            </div>
          </div>
          
          {activeMode !== 'paradox' ? (
            <div className="space-y-2">
              {currentPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all duration-300 group ${
                    selectedPlanId === plan.id 
                      ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' 
                      : 'bg-black/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${themeStyles[plan.theme].text === 'text-emerald-400' ? 'bg-emerald-500' : themeStyles[plan.theme].text === 'text-cyan-400' ? 'bg-cyan-500' : 'bg-purple-500'}`}></div>
                    <span className={`text-[13px] font-medium ${selectedPlanId === plan.id ? 'text-white' : 'text-zinc-400'}`}>{plan.title}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedPlanId === plan.id ? 'text-indigo-400 translate-x-1' : 'text-zinc-600'}`} />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-zinc-500">Paradox Strategy Selected</p>
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
                   value={(payoutRate * 100).toFixed(0)}
                   onChange={(e) => setPayoutRate(Number(e.target.value) / 100)}
                   className="w-16 bg-black/40 ring-1 ring-white/10 rounded px-2 py-1 text-lg font-mono font-bold text-white focus:ring-indigo-500/50 outline-none"
                 />
                 <span className="text-lg font-mono font-bold text-zinc-500">%</span>
               </div>
             </div>
           </div>
           <div className="grid grid-cols-2 gap-3 pt-2">
             <div className="p-3 bg-black/40 rounded-lg ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <span className="block text-[8px] uppercase tracking-[0.2em] text-emerald-500/60 mb-1 font-black">Gross Profit</span>
                <span className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                   ${sessionStats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
             </div>
             <div className="p-3 bg-black/40 rounded-lg ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <span className="block text-[8px] uppercase tracking-[0.2em] text-cyan-500/60 mb-1 font-black">Profit Locked</span>
                <span className="text-sm font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                   ${sessionStats.totalLockedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
             </div>
             <div className="p-3 bg-black/40 rounded-lg ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[8px] uppercase tracking-[0.2em] text-zinc-500 mb-1 font-black">Trade Volume</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-300">${sessionStats.totalStaked.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-[0.2em] text-indigo-500/60 mb-1 font-black">Win Count</span>
                    <span className="text-sm font-black text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]">
                      {sessionStats.completedCount}
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
          {activeMode === 'paradox' ? (
            <motion.div key="paradox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ParadoxStrategy />
            </motion.div>
          ) : (
            <motion.div key={activePlan.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pb-12">
              
              {/* Active Plan Dashboard Header */}
              <div className={`relative p-4 sm:p-6 rounded-xl bg-zinc-900/60 ring-1 ${activeStyles.ring} overflow-hidden shadow-2xl backdrop-blur-md ${activeStyles.neon}`}>
                 <div className={`absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none`}></div>
                 <div className={`absolute -bottom-10 -left-10 w-48 h-48 ${activePlan.theme === 'emerald' ? 'bg-emerald-500/5' : activePlan.theme === 'cyan' ? 'bg-cyan-500/5' : activePlan.theme === 'purple' ? 'bg-purple-500/5' : 'bg-amber-500/5'} blur-[60px] rounded-full pointer-events-none`}></div>
                 
                 <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
                    <div className="space-y-3 flex-1">
                       <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white/5 ring-1 ring-white/10 shadow-lg`}>
                             <Target className={`w-5 h-5 ${activeStyles.text}`} />
                          </div>
                          <div>
                             <h2 className="text-xl font-black tracking-tight text-white leading-tight">{activePlan.title}</h2>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${activeStyles.text}`}>{activePlan.subtitle}</span>
                                <div className="w-0.5 h-0.5 rounded-full bg-zinc-700"></div>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Live Protocol</span>
                             </div>
                          </div>
                       </div>
                       
                       {/* Overall Plan Progress */}
                       <div className="space-y-1.5 max-w-sm">
                          <div className="flex justify-between items-center px-1">
                             <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Execution Progress</span>
                             <span className={`text-[9px] font-black ${activeStyles.text}`}>
                               {Math.round((Object.keys(completedSteps).filter(k => k.startsWith(`${activePlan.id}-`)).length / (activePlan.phases.length * (activePlan.phases[0].trades?.length || 0))) * 100)}%
                             </span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-[0.5px]">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${(Object.keys(completedSteps).filter(k => k.startsWith(`${activePlan.id}-`)).length / (activePlan.phases.length * (activePlan.phases[0].trades?.length || 0))) * 100}%` }}
                               className={`h-full rounded-full bg-gradient-to-r ${activePlan.theme === 'emerald' ? 'from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : activePlan.theme === 'cyan' ? 'from-cyan-500 to-cyan-400 shadow-[0_0_8px_rgba(6,185,129,0.4)]' : activePlan.theme === 'purple' ? 'from-purple-500 to-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}
                             />
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 ring-1 ring-white/5">
                             <ShieldCheck className="w-3 h-3 text-zinc-500" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{activePlan.withdrawalRule}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 ring-1 ring-white/5">
                             <Activity className="w-3 h-3 text-zinc-500" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{activePlan.dailyTarget}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 ring-1 ring-emerald-500/20">
                             <TrendingUp className="w-3 h-3 text-emerald-400" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Profit: ${sessionStats.totalProfit.toFixed(2)}</span>
                          </div>
                          
                          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
                          
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                setCompletedSteps(prev => {
                                  const next = { ...prev };
                                  let found = false;
                                  Object.keys(next).forEach(key => {
                                    if (key.startsWith(`${activePlan.id}-`)) {
                                      delete next[key];
                                      found = true;
                                    }
                                  });
                                  return found ? next : prev;
                                });
                                stopTimer();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/20 ring-1 ring-white/10 hover:ring-rose-500/40 text-zinc-500 hover:text-rose-400 transition-all text-[8px] font-black uppercase tracking-widest shadow-xl group/reset"
                          >
                             <RotateCcw className="w-3 h-3 group-hover/reset:rotate-[-45deg] transition-transform" />
                             Clear Session
                          </motion.button>

                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                // First clear local state which will trigger useEffects to clear localStorage
                                setCompletedSteps({});
                                setJournalEntries([]);
                                setPayoutRate(0.92);
                                
                                // Also clear storage directly to be safe
                                localStorage.removeItem('compounding_steps');
                                localStorage.removeItem('journal_entries');
                                localStorage.removeItem('payout_rate');
                                
                                stopTimer();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-amber-500/20 ring-1 ring-white/10 hover:ring-amber-500/40 text-zinc-500 hover:text-amber-400 transition-all text-[8px] font-black uppercase tracking-widest shadow-xl group/resetall"
                          >
                             <Zap className="w-3 h-3 group-hover/resetall:scale-110 transition-transform" />
                             Reset All
                          </motion.button>
                       </div>
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl ring-1 ring-indigo-500/20 md:w-64 backdrop-blur-md flex flex-col justify-center">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Session Status</span>
                          {activeTimerId && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>}
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
                            {timerLabel || 'Standby'}
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
                  const phaseCompletedSteps = phase.trades!.filter((_, tIndex) => completedSteps[`${activePlan.id}-${pIndex}-${tIndex}`]).length;
                  const phaseProgress = (phaseCompletedSteps / phase.trades!.length) * 100;

                  return (
                    <div key={pIndex} id={`phase-container-${pIndex}`} className="relative group">
                       <div className="relative z-10 flex flex-col gap-3">
                          <div className={`bg-zinc-900/80 ring-1 ring-white/10 rounded-xl overflow-hidden transition-all duration-500 hover:ring-white/20 shadow-2xl relative`}>
                             {/* Multi-color Neon Background Accent */}
                             <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${activeStyles.gradient} blur-[40px] pointer-events-none opacity-50`}></div>
                             
                             {/* Phase Header Progress Bar */}
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
                                     <div className={`w-8 h-8 rounded flex items-center justify-center ring-1 ${activeStyles.neon} ${activeStyles.ring} ${activeStyles.iconBg} shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                        <span className={`text-sm font-black ${activeStyles.text}`}>{pIndex + 1}</span>
                                     </div>
                                     <div>
                                        <h4 className="text-base font-bold text-white tracking-tight leading-tight">{phase.title}</h4>
                                        <div className="flex items-center gap-2">
                                           <div className={`w-1 h-1 rounded-full ${phaseProgress === 100 ? 'bg-emerald-500 glow-emerald-500' : phaseProgress > 0 ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div>
                                           <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black">
                                             {phaseProgress === 100 ? 'Complete' : phaseProgress > 0 ? `${Math.round(phaseProgress)}%` : 'Active'}
                                           </span>
                                        </div>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                     <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg ring-1 ring-white/5">
                                        <button 
                                           onClick={() => startTimer(`${activePlan.id}-${pIndex}`, 0, 'session', 'Active')}
                                           className="p-1.5 hover:bg-emerald-500/20 rounded text-emerald-400 transition-colors"
                                           title="Start Session"
                                        >
                                           <Play className="w-3.5 h-3.5" fill="currentColor" />
                                        </button>
                                        <div className="h-3 w-[1px] bg-white/10 mx-0.5"></div>
                                        <button 
                                           onClick={() => startTimer(`${activePlan.id}-${pIndex}_rest`, 1800, 'rest', 'Wait')}
                                           className="px-2 py-1 hover:bg-white/5 rounded text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-colors"
                                        >
                                           30m
                                        </button>
                                        <button 
                                           onClick={() => startTimer(`${activePlan.id}-${pIndex}_rest`, 3600, 'rest', 'Rest')}
                                           className="px-2 py-1 hover:bg-white/5 rounded text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-colors"
                                        >
                                           1h
                                        </button>
                                        <button onClick={stopTimer} className="p-1.5 hover:bg-white/5 rounded text-zinc-500" title="Stop Timer">
                                           <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                     </div>

                                     <motion.button 
                                       whileTap={{ scale: 0.9 }}
                                       onClick={() => {
                                         if(true) {
                                           setCompletedSteps(prev => {
                                             const next = { ...prev };
                                             let deleted = 0;
                                             Object.keys(next).forEach(key => {
                                               if (key.startsWith(`${activePlan.id}-${pIndex}-`)) {
                                                 delete next[key];
                                                 deleted++;
                                               }
                                             });
                                             console.log(`Reset ${deleted} trades in Phase ${pIndex + 1}`);
                                             return next;
                                           });
                                         }
                                       }}
                                       className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-rose-500/20 text-rose-400 transition-all text-[8px] font-black uppercase tracking-widest"
                                     >
                                        <RotateCcw className="w-3 h-3" />
                                        Clear Phase
                                     </motion.button>
                                  </div>
                               </div>

                               {/* Step Execution Grid */}
                               <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                                  {phase.trades!.map((amount, tIndex) => {
                                    const isLast = tIndex === phase.trades!.length - 1;
                                    const isFirst = tIndex === 0;
                                    const stepKey = `${activePlan.id}-${pIndex}-${tIndex}`;
                                    const isDone = completedSteps[stepKey];

                                     return (
                                      <motion.button
                                        key={tIndex}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleStep(activePlan.id, pIndex, tIndex)}
                                        className={`group/step relative p-2 rounded-lg text-left transition-all duration-300 border ring-1 ${
                                          isDone 
                                            ? `bg-emerald-500/20 ring-emerald-500/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] grayscale-0` 
                                            : isLast 
                                              ? `${activeStyles.bg} ${activeStyles.ring} border-indigo-500/50 ${activeStyles.neon} shadow-lg hover:scale-[1.02] grayscale-0` 
                                              : 'bg-black/90 ring-white/20 border-transparent hover:ring-white/30 grayscale-[0.3]'
                                        }`}
                                      >
                                         {isDone && (
                                           <motion.div 
                                             initial={{ scale: 0, opacity: 0 }} 
                                             animate={{ scale: 1, opacity: 1 }}
                                             className="absolute inset-0 bg-emerald-500/10 rounded-lg pointer-events-none" 
                                           />
                                         )}
                                         <div className="flex items-center justify-between mb-1 relative z-10">
                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-black ${
                                              isDone ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-white/5 text-zinc-700'
                                            }`}>
                                              {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : tIndex + 1}
                                            </div>
                                            <span className={`text-[6px] font-black uppercase tracking-[0.1em] ${isDone ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : isLast ? 'text-indigo-400 animate-pulse' : 'text-zinc-600'}`}>
                                              {isFirst ? 'Entry' : isLast ? 'Peak' : 'Next'}
                                            </span>
                                         </div>
                                         <div className="flex flex-col relative z-10">
                                            <span className={`text-xs font-mono font-black tracking-tight ${isDone ? 'text-emerald-300' : 'text-zinc-100'}`}>
                                              ${amount.toFixed(2)}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                               <div className={`w-0.5 h-0.5 rounded-full ${isDone ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,1)]' : 'bg-zinc-800'}`}></div>
                                               <span className={`text-[7px] font-bold uppercase tracking-widest ${isDone ? 'text-emerald-500/60' : 'text-zinc-700'}`}>
                                                 {isDone ? 'Paid' : 'Wait'}
                                               </span>
                                            </div>
                                         </div>
                                      </motion.button>
                                    );
                                  })}
                               </div>

                               {/* Phase Direct Trade Action Bar */}
                               <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-white/5">
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse shrink-0"></span>
                                     <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold truncate">{phase.title} • Pocket Option</span>
                                  </div>
                                  <a
                                    href={POCKET_OPTION_AFFILIATE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 hover:border-emerald-400/80 text-[11px] font-semibold tracking-wide text-emerald-300 hover:text-emerald-200 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer shrink-0 touch-manipulation select-none active:scale-95"
                                    title="Launch Pocket Option Broker Terminal"
                                  >
                                     <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                                     <span className="whitespace-nowrap">Trade Now</span>
                                  </a>
                               </div>

                               {/* Phase Outcome Summary */}
                               {(() => {
                                 const lastStepDone = completedSteps[`${activePlan.id}-${pIndex}-${phase.trades!.length - 1}`];
                                 if (!lastStepDone) return null;

                                 const lastAmount = phase.trades![phase.trades!.length - 1];
                                 const finalVal = lastAmount * (1 + payoutRate);
                                 const nextPhase = activePlan.phases[pIndex + 1];
                                 const reserved = nextPhase ? Math.max(0, finalVal - nextPhase.start) : finalVal;

                                 return (
                                   <motion.div 
                                     initial={{ opacity: 0, scale: 0.95 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     className="mt-6 p-5 rounded-2xl bg-black/40 ring-1 ring-emerald-500/30 shadow-2xl relative overflow-hidden group/outcome"
                                   >
                                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Phase Result Breakdown</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full ring-1 ring-emerald-500/30">
                                           <Sparkles className="w-3 h-3 text-emerald-400" />
                                           <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Target Hit</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-4">
                                         <div className="flex justify-between items-end pb-3 border-b border-white/5">
                                            <div>
                                               <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Final Phase Value</span>
                                               <span className="text-xl font-black text-white font-mono tracking-tighter">${finalVal.toFixed(2)}</span>
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                               <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">Capital Reserved</span>
                                               <div className="flex items-center gap-2">
                                                  <div className="p-1.5 bg-emerald-500/10 rounded-lg ring-1 ring-emerald-500/20">
                                                     <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                  </div>
                                                  <span className="text-sm font-black text-emerald-400 font-mono tracking-tight">${reserved.toFixed(2)}</span>
                                               </div>
                                               <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-tight ml-1">Safe profit locked</p>
                                            </div>
                                            
                                            {nextPhase ? (
                                              <motion.button 
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                  const nextEl = document.getElementById(`phase-container-${pIndex + 1}`);
                                                  if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }}
                                                className="text-right space-y-1 cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10 p-2 -m-2 rounded-xl transition-colors ring-1 ring-transparent hover:ring-indigo-500/20"
                                              >
                                                 <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">Next Phase Setup</span>
                                                 <div className="flex items-center justify-end gap-2">
                                                    <span className="text-sm font-black text-indigo-400 font-mono tracking-tight">${nextPhase.start.toFixed(2)}</span>
                                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg ring-1 ring-indigo-500/20">
                                                       <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                                                    </div>
                                                 </div>
                                                 <p className="text-[7px] text-zinc-600 font-bold uppercase tracking-tight mr-1 italic">Click to start Level {pIndex + 2}</p>
                                              </motion.button>
                                            ) : (
                                              <div className="text-right space-y-1">
                                                 <span className="block text-[8px] font-black uppercase tracking-widest text-zinc-500">Exit Result</span>
                                                 <div className="flex items-center justify-end gap-2 text-amber-400">
                                                    <span className="text-sm font-black font-mono tracking-tight">TOTAL WIN</span>
                                                    <Zap className="w-4 h-4 fill-amber-400" />
                                                 </div>
                                                 <p className="text-[7px] text-amber-500/40 font-black uppercase tracking-tight mr-1">Plan Completed</p>
                                              </div>
                                            )}
                                         </div>
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
                 <div className="p-6 rounded-2xl bg-black/20 ring-1 ring-white/5 space-y-3">
                    <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                       <AlertTriangle className="w-3 h-3" /> Stop Loss Protocol
                    </h5>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      If 1 trade fails at any sequence, <strong className="text-zinc-200">Reset to Step 1</strong>. Take minimum 30-min hiatus to avoid revenge trading cycles.
                    </p>
                 </div>
                 <div className="p-6 rounded-2xl bg-black/20 ring-1 ring-white/5 space-y-3">
                    <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                       <Brain className="w-3 h-3" /> Recovery Protocol
                    </h5>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Peak target completion requires emotional stability. Secure your capital post-Phase 2 to ensure "House Money" play for Phase 3.
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

    </div>
  );
};

