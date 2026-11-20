import React, { useState, useEffect, useMemo } from 'react';
import {
  CurrencyCode,
  CURRENCIES,
  DailyCompoundingInputs,
  StepCompoundingInputs,
  AdvancedRiskModel,
  ReturnTier,
} from '../../types/calculator';
import {
  formatCurrency,
  calculateDailyCompoundingSchedule,
  calculateStepCompoundingSchedule,
  getActiveTier,
} from '../../utils/calculatorMath';
import { DailyCompoundingTab } from './DailyCompoundingTab';
import { StepCompoundingTab } from './StepCompoundingTab';
import { InteractiveScheduleTable } from './InteractiveScheduleTable';
import { GoalProjectorCard } from './GoalProjectorCard';
import { MilestoneTrackerCard } from './MilestoneTrackerCard';
import { AdvancedRiskModelModal } from './AdvancedRiskModelModal';
import {
  Calendar,
  Zap,
  TrendingUp,
  ShieldCheck,
  Target,
  Trophy,
  Sliders,
  DollarSign,
  Activity,
  Lock,
  Layers,
  BarChart2,
  Table,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_RISK_MODEL: AdvancedRiskModel = {
  enabled: true,
  sessionsPerDay: 2,
  tradesPerSession: 3,
  winRatePercent: 75,
  brokerPayoutPercent: 85,
  riskPerTradePercent: 2,
  lossDragMultiplier: 1.0,
  useCalculatedDailyReturn: false,
  enableTieredReturns: true,
  tiers: [
    { id: '1', name: 'Micro Spark (T1)', minBalance: 0, maxBalance: 1000, returnRate: 5.0 },
    { id: '2', name: 'Velocity Scale (T2)', minBalance: 1000, maxBalance: 5000, returnRate: 3.5 },
    { id: '3', name: 'Fortress Vault (T3)', minBalance: 5000, maxBalance: 25000, returnRate: 2.0 },
    { id: '4', name: 'Apex Sovereign (T4)', minBalance: 25000, maxBalance: null, returnRate: 1.0 },
  ],
  cashFlow: {
    enabled: false,
    type: 'withdrawal',
    amount: 100,
    frequency: 'weekly',
  },
};

export const DynamicCalculator: React.FC = () => {
  // Mode selection: Daily Compounding vs Wins / Step Compounding
  const [activeMode, setActiveMode] = useState<'daily' | 'step'>('daily');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'schedule' | 'projector' | 'milestones'>('chart');

  // Daily Mode Inputs
  const [dailyInputs, setDailyInputs] = useState<DailyCompoundingInputs>(() => {
    try {
      const saved = localStorage.getItem('aladdin_daily_calc_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.riskModel) parsed.riskModel = DEFAULT_RISK_MODEL;
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      startingCapital: 250,
      currency: 'USD',
      dailyReturnRate: 5,
      daysCount: 60,
      startDate: new Date().toISOString().slice(0, 10),
      activeDaysPreset: 'weekdays',
      activeDays: {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
      },
      reinvestmentPercent: 70,
      targetGoal: 10000,
      riskModel: DEFAULT_RISK_MODEL,
    };
  });

  // Step Mode Inputs
  const [stepInputs, setStepInputs] = useState<StepCompoundingInputs>(() => {
    try {
      const saved = localStorage.getItem('aladdin_step_calc_inputs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      startingCapital: 10,
      currency: 'USD',
      stepsCount: 10,
      payoutRatePercent: 92,
      compoundingType: 'all_in',
      reinvestmentPercent: 70,
      phaseLength: 3,
      lockProfitAtPhaseEnd: true,
      sessionMultiplier: 2,
      targetGoal: 5000,
    };
  });

  // Save inputs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aladdin_daily_calc_inputs', JSON.stringify(dailyInputs));
    } catch {
      // ignore
    }
  }, [dailyInputs]);

  useEffect(() => {
    try {
      localStorage.setItem('aladdin_step_calc_inputs', JSON.stringify(stepInputs));
    } catch {
      // ignore
    }
  }, [stepInputs]);

  // Currency synchronization
  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    setSelectedCurrency(newCurr);
    setDailyInputs((prev) => ({ ...prev, currency: newCurr }));
    setStepInputs((prev) => ({ ...prev, currency: newCurr }));
  };

  // Perform Calculations
  const dailyResults = useMemo(() => {
    return calculateDailyCompoundingSchedule({
      ...dailyInputs,
      currency: selectedCurrency,
    });
  }, [dailyInputs, selectedCurrency]);

  const stepResults = useMemo(() => {
    return calculateStepCompoundingSchedule({
      ...stepInputs,
      currency: selectedCurrency,
    });
  }, [stepInputs, selectedCurrency]);

  // Current Summary Metrics
  const summary = useMemo(() => {
    if (activeMode === 'daily') {
      const start = dailyInputs.startingCapital;
      const end = dailyResults.finalBalance;
      const withdrawn = dailyResults.totalWithdrawn;
      const totalGen = end + withdrawn;
      const netProfit = totalGen - start;
      const multiple = totalGen / Math.max(1, start);

      return {
        start,
        end,
        withdrawn,
        totalGen,
        netProfit,
        multiple,
        durationLabel: `${dailyInputs.daysCount} Days`,
        rateLabel: `${dailyInputs.dailyReturnRate}% Target`,
      };
    } else {
      const start = stepInputs.startingCapital;
      const end = stepResults.finalBalance;
      const locked = stepResults.totalLocked;
      const totalGen = end + locked;
      const netProfit = totalGen - start;
      const multiple = totalGen / Math.max(0.1, start);

      return {
        start,
        end,
        withdrawn: locked,
        totalGen,
        netProfit,
        multiple,
        durationLabel: `${stepInputs.stepsCount} Steps`,
        rateLabel: `${stepInputs.payoutRatePercent}% Payout`,
      };
    }
  }, [activeMode, dailyInputs, dailyResults, stepInputs, stepResults]);

  // Active Tier analysis for current capital
  const activeEndTier = useMemo(() => {
    const tiers = dailyInputs.riskModel?.tiers || DEFAULT_RISK_MODEL.tiers;
    return getActiveTier(dailyResults.finalBalance, tiers);
  }, [dailyResults.finalBalance, dailyInputs.riskModel]);

  // Update Tier Return Rate Handler
  const handleUpdateTierRate = (tierIndex: number, newRate: number) => {
    const currentTiers = [...(dailyInputs.riskModel.tiers || DEFAULT_RISK_MODEL.tiers)];
    currentTiers[tierIndex] = { ...currentTiers[tierIndex], returnRate: newRate };
    setDailyInputs((prev) => ({
      ...prev,
      riskModel: {
        ...prev.riskModel,
        tiers: currentTiers,
      },
    }));
  };

  // Toggle Tiered Compounding
  const handleToggleTieredReturns = () => {
    setDailyInputs((prev) => ({
      ...prev,
      riskModel: {
        ...prev.riskModel,
        enabled: true,
        enableTieredReturns: !prev.riskModel.enableTieredReturns,
      },
    }));
  };

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (activeMode === 'daily') {
      return dailyResults.rows.map((r) => ({
        label: `D${r.dayIndex}`,
        balance: Math.round(r.endBalance),
        withdrawn: Math.round(r.cumulativeWithdrawn),
        total: Math.round(r.totalNetWorth),
      }));
    } else {
      return stepResults.rows.map((r) => ({
        label: `S${r.stepIndex}`,
        balance: Math.round(r.endBalance),
        withdrawn: Math.round(r.cumulativeLocked),
        total: Math.round(r.totalValue),
      }));
    }
  }, [activeMode, dailyResults, stepResults]);

  return (
    <div className="space-y-4 text-slate-100 font-sans select-none">
      {/* 1. MINIMAL CLEAN HEADER & DUAL MODE SWITCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0e17] border border-white/10 rounded-xl p-3 sm:px-4 sm:py-3 shadow-sm">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Compounding Matrix
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400">
              Calendar Daily Growth & Step Compounding Engine
            </p>
          </div>
        </div>

        {/* Mode Switcher & Currency */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-black/50 border border-white/10 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveMode('daily')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'daily'
                  ? 'bg-emerald-500 text-black font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('step')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'step'
                  ? 'bg-purple-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Steps Mode</span>
            </button>
          </div>

          {/* Currency */}
          <select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-[#121824] border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-200 outline-none cursor-pointer"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code} className="bg-[#0e1420]">
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. MINIMAL 4-METRIC STRIP (Clean & Non-Messy) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Seed */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Initial Capital
          </span>
          <div className="text-xl sm:text-2xl font-mono font-black text-white">
            {formatCurrency(summary.start, selectedCurrency)}
          </div>
          <span className="text-[9.5px] font-mono text-slate-500 block mt-0.5">
            100% Principal Seed
          </span>
        </div>

        {/* Compounded Balance */}
        <div className="bg-[#071712] border border-emerald-500/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Active Balance
            </span>
            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {activeEndTier?.name.split(' ')[0] || 'Tier 2'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-emerald-300">
            {formatCurrency(summary.end, selectedCurrency)}
          </div>
          <span className="text-[9.5px] font-mono text-emerald-400/80 block mt-0.5">
            Compounded Capital
          </span>
        </div>

        {/* Banked Safe Vault */}
        <div className="bg-[#120b1e] border border-purple-500/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-purple-400" /> Banked Vault
            </span>
            <span className="text-[9px] font-mono text-purple-400 font-bold">Secured</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-purple-300">
            {formatCurrency(summary.withdrawn, selectedCurrency)}
          </div>
          <span className="text-[9.5px] font-mono text-purple-300/80 block mt-0.5">
            Risk-Free Harvest
          </span>
        </div>

        {/* Total Net Profit */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Total Generation
            </span>
            <span className="text-[9.5px] font-mono text-amber-400 font-bold">
              {summary.multiple.toFixed(1)}x
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-black text-white">
            {formatCurrency(summary.totalGen, selectedCurrency)}
          </div>
          <span className="text-[9.5px] font-mono text-emerald-400 font-bold block mt-0.5">
            +{formatCurrency(summary.netProfit, selectedCurrency)} Net
          </span>
        </div>
      </div>

      {/* 3. MINIMAL CLEAN COMPOUNDING TIER RIBBON ("टायर") */}
      <div className="bg-[#090d17] border border-white/10 rounded-xl p-3 sm:p-3.5 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-200">
              Adaptive Tier Matrix (T1 – T4)
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleTieredReturns}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
              dailyInputs.riskModel.enableTieredReturns
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}
          >
            {dailyInputs.riskModel.enableTieredReturns ? 'Tiers: Active' : 'Tiers: Disabled'}
          </button>
        </div>

        {/* 4 Connected Minimal Tier Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {(dailyInputs.riskModel.tiers || DEFAULT_RISK_MODEL.tiers).map((tier, idx) => {
            const isEndTier = activeEndTier?.id === tier.id;
            const tierColors = [
              { border: 'border-cyan-500/30', active: 'border-cyan-400 bg-cyan-500/10 text-cyan-300', dot: 'bg-cyan-400' },
              { border: 'border-emerald-500/30', active: 'border-emerald-400 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
              { border: 'border-purple-500/30', active: 'border-purple-400 bg-purple-500/10 text-purple-300', dot: 'bg-purple-400' },
              { border: 'border-amber-500/30', active: 'border-amber-400 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
            ][idx % 4];

            return (
              <div
                key={tier.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isEndTier
                    ? tierColors.active
                    : `bg-black/40 ${tierColors.border} text-slate-400`
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase flex items-center gap-1.5 text-slate-200">
                    <span className={`w-1.5 h-1.5 rounded-full ${tierColors.dot}`} />
                    <span>{tier.name.split(' ')[0]} (T{idx + 1})</span>
                  </span>
                  <span className="text-xs font-black text-white">{tier.returnRate}%</span>
                </div>
                <div className="text-[9.5px] text-slate-500">
                  {tier.maxBalance === null
                    ? `>${formatCurrency(tier.minBalance, selectedCurrency, 0)}`
                    : `${formatCurrency(tier.minBalance, selectedCurrency, 0)}–${formatCurrency(tier.maxBalance, selectedCurrency, 0)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. CLEAN INPUTS PANEL (DAILY OR STEPS) */}
      <AnimatePresence mode="wait">
        {activeMode === 'daily' ? (
          <motion.div
            key="daily-inputs"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <DailyCompoundingTab
              inputs={dailyInputs}
              onChange={setDailyInputs}
              onOpenRiskModal={() => setIsRiskModalOpen(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="step-inputs"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <StepCompoundingTab inputs={stepInputs} onChange={setStepInputs} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. CLEAN VIEW SWITCHER & VISUALS (Chart vs Schedule Table vs Goal vs Milestones) */}
      <div className="bg-[#0a0e17] border border-white/10 rounded-xl p-1 flex items-center gap-1 overflow-x-auto hide-scrollbar">
        <button
          type="button"
          onClick={() => setViewMode('chart')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            viewMode === 'chart'
              ? 'bg-emerald-500 text-black font-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Growth Trajectory</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('schedule')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            viewMode === 'schedule'
              ? 'bg-emerald-500 text-black font-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Schedule Table</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('projector')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            viewMode === 'projector'
              ? 'bg-purple-500 text-white font-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Goal Projector</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('milestones')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            viewMode === 'milestones'
              ? 'bg-amber-500 text-black font-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Milestones</span>
        </button>
      </div>

      {/* 6. CLEAN VIEW PANEL */}
      <AnimatePresence mode="wait">
        {viewMode === 'chart' && (
          <motion.div
            key="view-chart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#0a0e17] border border-white/10 rounded-xl p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <span>Capital & Vault Projection</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Balance
                </span>
                <span className="text-purple-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Vault
                </span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Total
                </span>
              </div>
            </div>

            <div className="h-60 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cleanTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cleanBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cleanVaultGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162032" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    fontFamily="monospace"
                    tickFormatter={(v) => formatCurrency(v, selectedCurrency, 0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070b16',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val), selectedCurrency), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Net Worth"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cleanTotalGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Compounding Balance"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cleanBalanceGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawn"
                    name="Banked Vault"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#cleanVaultGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {viewMode === 'schedule' && (
          <motion.div
            key="view-schedule"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <InteractiveScheduleTable
              mode={activeMode}
              dailyRows={dailyResults.rows}
              stepRows={stepResults.rows}
              currency={selectedCurrency}
              startingCapital={summary.start}
              finalBalance={summary.end}
              totalWithdrawn={summary.withdrawn}
              dailyOrPayoutRate={
                activeMode === 'daily'
                  ? dailyInputs.dailyReturnRate
                  : stepInputs.payoutRatePercent
              }
              reinvestmentPercent={
                activeMode === 'daily'
                  ? dailyInputs.reinvestmentPercent
                  : stepInputs.reinvestmentPercent
              }
            />
          </motion.div>
        )}

        {viewMode === 'projector' && (
          <motion.div
            key="view-projector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GoalProjectorCard
              startingCapital={summary.start}
              targetGoal={
                activeMode === 'daily' ? dailyInputs.targetGoal : stepInputs.targetGoal
              }
              dailyReturnRate={
                activeMode === 'daily' ? dailyInputs.dailyReturnRate : 5
              }
              reinvestmentPercent={
                activeMode === 'daily' ? dailyInputs.reinvestmentPercent : 70
              }
              currency={selectedCurrency}
              activeDays={dailyInputs.activeDays}
              startDate={dailyInputs.startDate}
              onUpdateTargetGoal={(newGoal) => {
                if (activeMode === 'daily') {
                  setDailyInputs((prev) => ({ ...prev, targetGoal: newGoal }));
                } else {
                  setStepInputs((prev) => ({ ...prev, targetGoal: newGoal }));
                }
              }}
            />
          </motion.div>
        )}

        {viewMode === 'milestones' && (
          <motion.div
            key="view-milestones"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MilestoneTrackerCard
              milestones={
                activeMode === 'daily'
                  ? dailyResults.milestones
                  : stepResults.milestones
              }
              currency={selectedCurrency}
              startingCapital={summary.start}
              mode={activeMode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Risk Modal */}
      <AdvancedRiskModelModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        model={dailyInputs.riskModel}
        onChange={(updated) => setDailyInputs((prev) => ({ ...prev, riskModel: updated }))}
        currency={selectedCurrency}
      />
    </div>
  );
};
