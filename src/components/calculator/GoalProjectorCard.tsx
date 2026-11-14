import React, { useState } from 'react';
import { Target, Calendar, TrendingUp, AlertTriangle, ShieldCheck, Zap, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { CurrencyCode, ActiveDaysMap } from '../../types/calculator';
import { formatCurrency, calculateGoalProjection } from '../../utils/calculatorMath';

interface GoalProjectorCardProps {
  startingCapital: number;
  targetGoal: number;
  dailyReturnRate: number;
  reinvestmentPercent: number;
  currency: CurrencyCode;
  activeDays: ActiveDaysMap;
  startDate: string;
  onUpdateTargetGoal?: (newGoal: number) => void;
}

export const GoalProjectorCard: React.FC<GoalProjectorCardProps> = ({
  startingCapital,
  targetGoal,
  dailyReturnRate,
  reinvestmentPercent,
  currency,
  activeDays,
  startDate,
  onUpdateTargetGoal,
}) => {
  const [customDaysTarget, setCustomDaysTarget] = useState<number>(60);
  const [tempGoalInput, setTempGoalInput] = useState<string>(targetGoal.toString());

  const projection = calculateGoalProjection(
    startingCapital,
    targetGoal,
    dailyReturnRate,
    reinvestmentPercent,
    activeDays,
    startDate,
    customDaysTarget
  );

  const riskBadgeStyles = {
    CONSERVATIVE: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/40',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]',
    },
    BALANCED: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    },
    AGGRESSIVE: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    },
    EXTREME_RISK: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    },
  }[projection.riskRating];

  return (
    <div className="relative rounded-xl border border-purple-500/30 bg-gradient-to-b from-[#0d071c] via-[#090b1c] to-[#04060c] p-4 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.12)] overflow-hidden font-sans select-none">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-300 font-mono">
              GOAL PROJECTOR & FEASIBILITY ENGINE
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Reverse engineering time horizon, risk profile & target completion dates.
            </p>
          </div>
        </div>

        {/* Goal Quick Input */}
        <div className="flex items-center gap-2 bg-black/60 border border-purple-500/30 rounded-lg px-2.5 py-1.5 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Target:</span>
          <input
            type="number"
            value={tempGoalInput}
            onChange={(e) => {
              setTempGoalInput(e.target.value);
              const val = Number(e.target.value);
              if (val > startingCapital && onUpdateTargetGoal) {
                onUpdateTargetGoal(val);
              }
            }}
            className="w-24 bg-transparent font-mono text-xs font-black text-purple-300 outline-none"
            placeholder="10000"
          />
          <button
            type="button"
            onClick={() => {
              const val = Number(tempGoalInput);
              if (val > startingCapital && onUpdateTargetGoal) {
                onUpdateTargetGoal(val);
              }
            }}
            className="text-[9.5px] font-mono font-black uppercase px-2 py-0.5 bg-purple-500 text-white rounded hover:bg-purple-400 transition-colors cursor-pointer shadow-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Core Projection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4 relative z-10">
        {/* Estimated Days */}
        <div className="rounded-xl border border-cyan-500/30 bg-[#070e1c] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono font-black text-cyan-400 uppercase tracking-wider">
              Days Horizon Needed
            </span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {projection.targetDaysNeeded !== null ? `${projection.targetDaysNeeded} Days` : '> 1,500 Days'}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
              Active sessions calculated
            </span>
          </div>
        </div>

        {/* Target Date */}
        <div className="rounded-xl border border-emerald-500/30 bg-[#051610] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono font-black text-emerald-400 uppercase tracking-wider">
              Projected Date
            </span>
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-300 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {projection.targetDateEstimated || 'Indefinite Horizon'}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
              Calendar date forecast
            </span>
          </div>
        </div>

        {/* Banked Profit Along Way */}
        <div className="rounded-xl border border-purple-500/30 bg-[#0d071c] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono font-black text-purple-400 uppercase tracking-wider">
              Safe Profit Banked
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black font-mono text-purple-300 tracking-tight drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
              {formatCurrency(projection.totalBankedAtTarget, currency)}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
              Secured at {100 - reinvestmentPercent}% vault split
            </span>
          </div>
        </div>

        {/* Feasibility Grade */}
        <div className={`p-3.5 rounded-xl border ${riskBadgeStyles.border} ${riskBadgeStyles.bg} ${riskBadgeStyles.glow} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9.5px] font-mono font-black text-slate-300 uppercase tracking-wider">
              Risk Profile Rating
            </span>
            <Zap className={`w-3.5 h-3.5 ${riskBadgeStyles.text}`} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-black uppercase tracking-wider font-mono ${riskBadgeStyles.text}`}>
                {projection.riskRating.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                {projection.riskScore}/100
              </span>
            </div>
            <div className="w-full bg-black/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  projection.riskScore > 75
                    ? 'bg-rose-500'
                    : projection.riskScore > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${projection.riskScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reverse Horizon Solver & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 relative z-10">
        {/* Reverse Time Horizon Solver */}
        <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Reverse Horizon Solver
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Target: {customDaysTarget} Trading Days
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Reach <strong className="text-white font-mono">{formatCurrency(targetGoal, currency)}</strong> on your chosen timeline. Adjust days below:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={365}
              value={customDaysTarget}
              onChange={(e) => setCustomDaysTarget(Number(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex gap-1 font-mono">
              {[30, 60, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCustomDaysTarget(d)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    customDaysTarget === d
                      ? 'bg-cyan-500 text-black font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="bg-black/60 border border-white/5 rounded-lg p-2.5 flex items-center justify-between font-mono">
            <span className="text-[10px] text-slate-400">Required Daily Net Yield:</span>
            <span className="text-base font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              +{projection.requiredDailyRateForInputDays}% / day
            </span>
          </div>
        </div>

        {/* Actionable Risk Recommendations */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Tactical Risk Directives
            </span>
            <ul className="space-y-1.5 font-sans">
              {projection.recommendations.map((rec, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Capital Multiplier Target:</span>
            <span className="text-amber-400 font-bold">
              {(targetGoal / Math.max(1, startingCapital)).toFixed(1)}x Initial Capital
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
