import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  FileDown,
  Download,
  ShieldCheck,
  Share2,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import {
  ParadoxMode,
  ParadoxShareData,
  getParadoxModeConfig,
  getPlansForMode,
  exportParadoxCSV,
  exportParadoxPDF
} from './utils/paradoxEngine';
import { ParadoxShareModal } from './components/ParadoxShareModal';

const POCKET_OPTION_AFFILIATE_URL = 'https://pocket-friends.co/r/mphdnyllo5';

export const ParadoxStrategy = () => {
  const [mode, setMode] = useState<ParadoxMode>(() => {
    const saved = localStorage.getItem('paradox_core_mode');
    return saved === '111' || saved === '222' || saved === '333' || saved === '444' ? saved : '111';
  });
  const [payoutRate, setPayoutRate] = useState<number>(() => {
    const saved = localStorage.getItem('payout_rate');
    return saved ? Number(saved) : 0.92;
  });
  const [customSeedInput, setCustomSeedInput] = useState<string>('');
  const [customSeeds, setCustomSeeds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('paradox_custom_seeds');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activePhases, setActivePhases] = useState<number[]>([0]);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('paradox_core_steps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [vaultedTotal, setVaultedTotal] = useState<number>(() => {
    const saved = localStorage.getItem('paradox_core_vault');
    return saved ? Number(saved) || 0 : 0;
  });
  const [cyclesByPlan, setCyclesByPlan] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('paradox_core_cycles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerLeft, setTimerLeft] = useState<number>(0);
  const [timerType, setTimerType] = useState<'rest' | 'session'>('session');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [shareData, setShareData] = useState<ParadoxShareData | null>(null);

  useEffect(() => {
    localStorage.setItem('paradox_core_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('paradox_core_steps', JSON.stringify(completedSteps));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem('paradox_core_vault', vaultedTotal.toString());
  }, [vaultedTotal]);

  useEffect(() => {
    localStorage.setItem('paradox_core_cycles', JSON.stringify(cyclesByPlan));
  }, [cyclesByPlan]);

  useEffect(() => {
    localStorage.setItem('paradox_custom_seeds', JSON.stringify(customSeeds));
  }, [customSeeds]);

  const plans = useMemo(
    () => getPlansForMode(mode, payoutRate, customSeeds[mode]),
    [mode, payoutRate, customSeeds]
  );

  useEffect(() => {
    const exists = plans.some((p) => p.id === selectedPlanId);
    if (!exists && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
      setActivePhases([0]);
    }
  }, [plans, selectedPlanId]);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const modeCfg = getParadoxModeConfig(mode);

  const stats = useMemo(() => {
    let totalProfit = 0;
    let completedCount = 0;
    let totalStaked = 0;
    let totalLockedProfit = 0;
    let completedPhases = 0;

    activePlan.phases.forEach((ph, pIdx) => {
      const trades = ph.trades || [];
      const lastKey = `${activePlan.id}-${pIdx}-${trades.length - 1}`;
      const isPhaseDone = trades.length > 0 && !!completedSteps[lastKey];
      if (isPhaseDone) completedPhases++;

      trades.forEach((amt, tIdx) => {
        if (completedSteps[`${activePlan.id}-${pIdx}-${tIdx}`]) {
          totalProfit += amt * payoutRate;
          totalStaked += amt;
          completedCount++;
        }
      });

      if (isPhaseDone) {
        const lastStake = trades[trades.length - 1];
        const finalVal = lastStake * (1 + payoutRate);
        const nextPh = activePlan.phases[pIdx + 1];
        if (nextPh) {
          const locked = finalVal - nextPh.start;
          if (locked > 0) totalLockedProfit += locked;
        } else {
          totalLockedProfit += Math.max(0, finalVal - trades[0]);
        }
      }
    });

    return { totalProfit, completedCount, totalStaked, totalLockedProfit, completedPhases };
  }, [activePlan, completedSteps, payoutRate]);

  const planCycles = cyclesByPlan[activePlan.id] || 0;
  const totalVaultCombined = Number((stats.totalLockedProfit + vaultedTotal).toFixed(2));

  const togglePhaseAccordion = (idx: number) => {
    setActivePhases((prev) => (prev.includes(idx) ? prev.filter((p) => p !== idx) : [...prev, idx]));
  };

  const startTimer = (id: string, initialSeconds: number, type: 'rest' | 'session') => {
    setActiveTimerId(id);
    setTimerLeft(initialSeconds);
    setTimerType(type);
  };

  useEffect(() => {
    if (!activeTimerId) return;
    const intv = setInterval(() => {
      setTimerLeft((prev) => {
        if (timerType === 'rest') {
          if (prev <= 1) {
            clearInterval(intv);
            setActiveTimerId(null);
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(intv);
  }, [activeTimerId, timerType]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const ss = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const toggleTradeStep = (pIdx: number, tIdx: number) => {
    const key = `${activePlan.id}-${pIdx}-${tIdx}`;
    const wasDone = !!completedSteps[key];
    const nextSteps = { ...completedSteps, [key]: !wasDone };
    const wasAllDone = activePlan.phases.every((ph, pi) =>
      (ph.trades || []).every((_, ti) => !!completedSteps[`${activePlan.id}-${pi}-${ti}`])
    );
    const isNowAllDone = activePlan.phases.every((ph, pi) =>
      (ph.trades || []).every((_, ti) => !!nextSteps[`${activePlan.id}-${pi}-${ti}`])
    );
    setCompletedSteps(nextSteps);

    const trades = activePlan.phases[pIdx]?.trades || [];
    const isFinalPhase = pIdx === activePlan.phases.length - 1;
    const isFinalStep = tIdx === trades.length - 1;

    if (!wasAllDone && isNowAllDone) {
      setCyclesByPlan((prev) => ({
        ...prev,
        [activePlan.id]: (prev[activePlan.id] || 0) + 1
      }));
      setStatusNotice(`Cycle Complete! Phase ${activePlan.phases.length} cleared and logged.`);
      startTimer(`cycle_rest`, 3600, 'rest');
    } else if (!wasDone && isFinalStep && !isFinalPhase) {
      setActivePhases((prev) => Array.from(new Set([...prev, pIdx + 1])));
    }
  };

  // Strict Phase 1 Full Reset (Vault 100% Protected + 30m OTM Shield)
  const handleStrictP1LossReset = () => {
    const earnedLockBeforeReset = stats.totalLockedProfit;
    if (earnedLockBeforeReset > 0) {
      setVaultedTotal((prev) => Number((prev + earnedLockBeforeReset).toFixed(2)));
    }
    setCompletedSteps((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${activePlan.id}-`)) delete next[k];
      });
      return next;
    });
    setActivePhases([0]);
    startTimer('otm_shield_rest', 1800, 'rest');
    setStatusNotice(
      earnedLockBeforeReset > 0
        ? `Strict Phase 1 Reset applied. +$${earnedLockBeforeReset.toFixed(2)} moved safely into Vault (100% Protected). 30m OTM Shield started.`
        : 'Strict Phase 1 Reset applied. Vault remains 100% Protected. 30m OTM Shield started.'
    );
  };

  const applyCustomSeed = () => {
    const num = Number(customSeedInput);
    if (!Number.isFinite(num) || num < 1) return;
    setCustomSeeds((prev) => ({ ...prev, [mode]: Number(num.toFixed(2)) }));
    setSelectedPlanId(`custom-${mode}`);
    setActivePhases([0]);
  };

  const openShareModal = (phaseIdx: number | null) => {
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
      const dispProfit = phDone > 0 ? earnedProfit : finalRet - phStart;
      const phLocked = nextPh ? Math.max(0, finalRet - nextPh.start) : Math.max(0, finalRet - phStart);
      setShareData({
        title: `Paradox ${mode} · ${activePlan.title} (${ph.title})`,
        shareHeadline: `ALADDINSNIPER PARADOX ${mode} · PHASE ${phaseIdx + 1} REPORT`,
        heroLabel: phDone === trades.length ? 'PHASE PROFIT SECURED' : phDone > 0 ? 'LIVE PHASE PROFIT' : 'PROJECTED PHASE GAIN',
        seedLabel: 'Phase Start Seed',
        engineLabel: `Paradox ${mode}`,
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
    const doneSteps = stats.completedCount;
    const lastPh = activePlan.phases[activePlan.phases.length - 1];
    const lastTrades = lastPh?.trades || [seedAmt];
    const targetTopRet = (lastTrades[lastTrades.length - 1] || seedAmt) * (1 + payoutRate);
    const dispPnL = doneSteps > 0 ? stats.totalProfit : Math.max(0, targetTopRet - seedAmt);
    const dispEnd = doneSteps > 0 ? seedAmt + stats.totalProfit + totalVaultCombined : targetTopRet;

    setShareData({
      title: `Paradox ${mode} · ${activePlan.title}`,
      shareHeadline: `ALADDINSNIPER PARADOX ${mode} MASTER REPORT`,
      heroLabel: doneSteps > 0 ? 'PARADOX EARNED PROFIT' : 'PROJECTED FULL CYCLE GAIN',
      seedLabel: 'Phase 1 Seed',
      engineLabel: `Paradox ${mode} (${modeCfg.phasesCount}×${modeCfg.stepsPerPhase})`,
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

  return (
    <div className="flex-1 flex flex-col gap-5 text-zinc-100 overflow-y-auto pb-16 hide-scrollbar pt-3 px-2 sm:px-4 max-w-6xl mx-auto w-full">
      {/* Header & Global Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f121b] border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-black/50 rounded-lg border border-white/10">
            {(['111', '222', '333', '444'] as const).map((m) => {
              const cfg = getParadoxModeConfig(m);
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    mode === m ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-zinc-400 font-medium">{modeCfg.lockLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
            <span className="text-xs text-zinc-400">Payout</span>
            <input
              type="number"
              min={50}
              max={99}
              value={Math.round(payoutRate * 100)}
              onChange={(e) => setPayoutRate(Math.max(0.5, Math.min(0.99, Number(e.target.value) / 100)))}
              className="w-12 bg-transparent text-xs font-mono font-bold text-white outline-none text-right tabular-nums"
            />
            <span className="text-xs text-zinc-400">%</span>
          </div>

          <button
            onClick={() =>
              exportParadoxCSV({
                mode,
                plan: activePlan,
                payoutRate,
                completedSteps,
                vaultedTotal: totalVaultCombined,
                cyclesCount: planCycles
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold whitespace-nowrap"
          >
            <FileDown className="w-3.5 h-3.5" /> CSV
          </button>

          <button
            onClick={() =>
              exportParadoxPDF({
                mode,
                plan: activePlan,
                payoutRate,
                completedSteps,
                sessionStats: stats,
                vaultedTotal,
                cyclesCount: planCycles
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>

          <button
            onClick={() => openShareModal(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-500/15"
              title="Reset Core Progress"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setCompletedSteps({});
                  setVaultedTotal(0);
                  setCyclesByPlan({});
                  setActiveTimerId(null);
                  setConfirmReset(false);
                  setStatusNotice('All Paradox Core progress cleared.');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold whitespace-nowrap"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1.5 rounded-lg bg-white/5 text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tier Presets + Custom Seed Bar */}
      <div className="bg-[#0f121b] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlanId(p.id);
                setActivePhases([0]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activePlan.id === p.id
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200'
                  : 'bg-black/40 border border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={1}
            step="0.01"
            placeholder="Custom Seed $"
            value={customSeedInput}
            onChange={(e) => setCustomSeedInput(e.target.value)}
            className="w-28 bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-amber-500"
          />
          <button
            onClick={applyCustomSeed}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold whitespace-nowrap"
          >
            Set Seed
          </button>
        </div>
      </div>

      {statusNotice && (
        <div className="px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <span>{statusNotice}</span>
          <button onClick={() => setStatusNotice('')} className="text-amber-300 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Strip + Strict P1 Loss Reset */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#0f121b] border border-white/10 rounded-xl p-3.5">
          <div className="text-xs text-zinc-400 mb-1">Plan Earned</div>
          <div className="text-lg font-mono font-bold text-white tabular-nums">${stats.totalProfit.toFixed(2)}</div>
        </div>
        <div className="bg-[#0f121b] border border-emerald-500/25 rounded-xl p-3.5">
          <div className="text-xs text-emerald-400/80 mb-1">Vault Protected</div>
          <div className="text-lg font-mono font-bold text-emerald-400 tabular-nums">${totalVaultCombined.toFixed(2)}</div>
        </div>
        <div className="bg-[#0f121b] border border-white/10 rounded-xl p-3.5">
          <div className="text-xs text-zinc-400 mb-1">Phases Cleared</div>
          <div className="text-lg font-mono font-bold text-indigo-400 tabular-nums">
            {stats.completedPhases}/{activePlan.phases.length}
          </div>
        </div>
        <div className="bg-[#0f121b] border border-white/10 rounded-xl p-3.5">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Cycles
          </div>
          <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">×{planCycles}</div>
        </div>
        <div className="bg-[#0f121b] border border-rose-500/25 rounded-xl p-3.5 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="text-xs text-rose-300 flex items-center justify-between">
            <span>{activeTimerId ? formatTime(timerLeft) : 'OTM Shield'}</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <button
            onClick={handleStrictP1LossReset}
            className="mt-1.5 w-full py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Loss · P1 Reset
          </button>
        </div>
      </div>

      {/* Phase Roadmap */}
      <div className="flex flex-col gap-3">
        {activePlan.phases.map((phase, pIdx) => {
          const isOpen = activePhases.includes(pIdx);
          const trades = phase.trades || [];
          const doneCount = trades.filter((_, ti) => !!completedSteps[`${activePlan.id}-${pIdx}-${ti}`]).length;
          const isPhaseDone = trades.length > 0 && doneCount === trades.length;
          const finalRet = (trades[trades.length - 1] || phase.start) * (1 + payoutRate);
          const nextPh = activePlan.phases[pIdx + 1];
          const lockAmt = nextPh ? Math.max(0, finalRet - nextPh.start) : Math.max(0, finalRet - (trades[0] || phase.start));

          return (
            <div key={`${activePlan.id}-${pIdx}`} className="bg-[#0f121b] border border-white/10 rounded-xl overflow-hidden">
              <div
                onClick={() => togglePhaseAccordion(pIdx)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold shrink-0 ${
                      isPhaseDone
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-black/40 border-white/10 text-zinc-400'
                    }`}
                  >
                    {isPhaseDone ? <CheckCircle2 className="w-4 h-4" /> : pIdx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {phase.title} · Start ${phase.start.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono tabular-nums">
                      {doneCount}/{trades.length} Trades · Vault Lock +${lockAmt.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openShareModal(pIdx)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300"
                    title="Share Phase P&L"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={POCKET_OPTION_AFFILIATE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-300 whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" /> Trade Now
                  </a>
                  <button onClick={() => togglePhaseAccordion(pIdx)} className="p-1 text-zinc-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-white/10 p-4 space-y-3 bg-black/20"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {trades.map((stake, tIdx) => {
                        const isDone = !!completedSteps[`${activePlan.id}-${pIdx}-${tIdx}`];
                        const prof = stake * payoutRate;
                        const ret = stake + prof;
                        return (
                          <button
                            key={tIdx}
                            onClick={() => toggleTradeStep(pIdx, tIdx)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              isDone
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                                : 'bg-black/50 border-white/10 hover:border-white/25 text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                              <span>Step {tIdx + 1}</span>
                              <span>{isDone ? 'PAID' : 'PENDING'}</span>
                            </div>
                            <div className="text-base font-mono font-bold tabular-nums">${stake.toFixed(2)}</div>
                            <div className="text-xs font-mono text-emerald-400 tabular-nums">
                              +${prof.toFixed(2)} {'->'} ${ret.toFixed(2)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Strict P1 Full Reset protects 100% Vaulted Profit on OTM loss</span>
                      </div>
                      <button
                        onClick={handleStrictP1LossReset}
                        className="px-3 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-semibold"
                      >
                        OTM Loss · Reset to Phase 1
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <ParadoxShareModal data={shareData} onClose={() => setShareData(null)} />
    </div>
  );
};
