import React, { useState, useEffect, useMemo } from 'react';
import {
  CurrencyCode,
  DailyScheduleRow,
  StepScheduleRow,
} from '../../types/calculator';
import { formatCurrency } from '../../utils/calculatorMath';
import {
  exportDailyScheduleToCSV,
  exportStepScheduleToCSV,
  exportPlanToPDF,
  copyPlanSummaryToClipboard,
} from '../../utils/exportUtils';
import {
  Search,
  Filter,
  Download,
  FileText,
  Copy,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveScheduleTableProps {
  mode: 'daily' | 'step';
  dailyRows?: DailyScheduleRow[];
  stepRows?: StepScheduleRow[];
  currency: CurrencyCode;
  startingCapital: number;
  finalBalance: number;
  totalWithdrawn: number;
  dailyOrPayoutRate: number;
  reinvestmentPercent: number;
}

export const InteractiveScheduleTable: React.FC<InteractiveScheduleTableProps> = ({
  mode,
  dailyRows = [],
  stepRows = [],
  currency,
  startingCapital,
  finalBalance,
  totalWithdrawn,
  dailyOrPayoutRate,
  reinvestmentPercent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'milestones' | 'completed' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [copied, setCopied] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Persistence of completed execution rows
  const storageKey = mode === 'daily' ? 'aladdin_completed_daily_days' : 'aladdin_completed_steps';
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedItems));
    } catch {
      // ignore
    }
  }, [completedItems, storageKey]);

  const toggleComplete = (idx: number) => {
    setCompletedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopy = async () => {
    const success = await copyPlanSummaryToClipboard(mode, {
      startingCapital,
      finalBalance,
      totalProfit: finalBalance + totalWithdrawn - startingCapital,
      totalWithdrawn,
      currency,
      daysOrStepsCount: mode === 'daily' ? dailyRows.length : stepRows.length,
      dailyOrPayoutRate,
      reinvestmentPercent,
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter & Search logic
  const filteredDaily = useMemo(() => {
    if (mode !== 'daily') return [];
    return dailyRows.filter((row) => {
      const matchesSearch =
        row.dayIndex.toString().includes(searchTerm) ||
        row.formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.milestoneHit && row.milestoneHit.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.tierName && row.tierName.toLowerCase().includes(searchTerm.toLowerCase()));

      const isDone = !!completedItems[row.dayIndex];
      if (filterType === 'milestones') return matchesSearch && (!!row.milestoneHit || row.cashFlowAmount !== 0);
      if (filterType === 'completed') return matchesSearch && isDone;
      if (filterType === 'pending') return matchesSearch && !isDone;
      return matchesSearch;
    });
  }, [mode, dailyRows, searchTerm, filterType, completedItems]);

  const filteredStep = useMemo(() => {
    if (mode !== 'step') return [];
    return stepRows.filter((row) => {
      const matchesSearch =
        row.stepIndex.toString().includes(searchTerm) ||
        row.phaseIndex.toString().includes(searchTerm) ||
        (row.milestoneHit && row.milestoneHit.toLowerCase().includes(searchTerm.toLowerCase()));

      const isDone = !!completedItems[row.stepIndex];
      if (filterType === 'milestones') return matchesSearch && (!!row.milestoneHit || row.isPhaseTarget);
      if (filterType === 'completed') return matchesSearch && isDone;
      if (filterType === 'pending') return matchesSearch && !isDone;
      return matchesSearch;
    });
  }, [mode, stepRows, searchTerm, filterType, completedItems]);

  const totalItems = mode === 'daily' ? filteredDaily.length : filteredStep.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedDaily = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDaily.slice(start, start + pageSize);
  }, [filteredDaily, currentPage, pageSize]);

  const paginatedStep = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStep.slice(start, start + pageSize);
  }, [filteredStep, currentPage, pageSize]);

  // Tier Badge Color resolver
  const getTierBadgeStyle = (tierName?: string) => {
    if (!tierName) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    const lower = tierName.toLowerCase();
    if (lower.includes('spark') || lower.includes('micro') || lower.includes('t1')) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]';
    }
    if (lower.includes('kinetic') || lower.includes('scale') || lower.includes('t2')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    }
    if (lower.includes('fortress') || lower.includes('preservation') || lower.includes('t3')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
    }
    return 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
  };

  return (
    <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#090d1a] to-[#04060c] p-4 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden font-sans">
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${mode === 'daily' ? 'days, dates, tiers...' : 'steps, phases...'}`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-black/60 border border-cyan-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 font-mono outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="flex bg-black/60 border border-white/10 p-1 rounded-lg gap-1">
            {(['all', 'milestones', 'completed', 'pending'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilterType(f);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[9.5px] font-mono font-black uppercase transition-all cursor-pointer ${
                  filterType === f
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)] font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
            title="Copy formatted summary to clipboard"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (mode === 'daily') {
                exportDailyScheduleToCSV(dailyRows, currency);
              } else {
                exportStepScheduleToCSV(stepRows, currency);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
            title="Export CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportPlanToPDF(
                mode,
                {
                  startingCapital,
                  finalBalance,
                  totalProfit: finalBalance + totalWithdrawn - startingCapital,
                  totalWithdrawn,
                  currency,
                  daysOrStepsCount: mode === 'daily' ? dailyRows.length : stepRows.length,
                  dailyOrPayoutRate,
                  reinvestmentPercent,
                },
                dailyRows,
                stepRows
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 border border-purple-400/50 text-purple-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            title="Generate print-ready PDF audit"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
        <table className="w-full text-left text-xs border-collapse min-w-[740px]">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 text-[10px] font-mono font-black uppercase tracking-wider bg-black/60">
              <th className="py-2.5 px-3 w-10">Done</th>
              <th className="py-2.5 px-3">{mode === 'daily' ? 'Day / Date' : 'Step / Phase'}</th>
              <th className="py-2.5 px-3">Growth Tier</th>
              <th className="py-2.5 px-3">{mode === 'daily' ? 'Starting Balance' : 'Stake'}</th>
              <th className="py-2.5 px-3">{mode === 'daily' ? 'Daily Return' : 'Payout Rate'}</th>
              <th className="py-2.5 px-3">Gross Profit</th>
              <th className="py-2.5 px-3">{mode === 'daily' ? 'Reinvested' : 'Reinvest / Lock'}</th>
              <th className="py-2.5 px-3">{mode === 'daily' ? 'To Vault' : 'Locked Profit'}</th>
              <th className="py-2.5 px-3 text-right">{mode === 'daily' ? 'Ending Balance' : 'Balance'}</th>
              <th className="py-2.5 px-3 text-right">Portfolio Total</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 font-mono">
            {mode === 'daily' ? (
              paginatedDaily.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No matching days found.
                  </td>
                </tr>
              ) : (
                paginatedDaily.map((row) => {
                  const isDone = !!completedItems[row.dayIndex];
                  const hasMilestone = !!row.milestoneHit;

                  return (
                    <tr
                      key={row.dayIndex}
                      className={`transition-colors hover:bg-white/[0.04] ${
                        isDone ? 'bg-emerald-500/10' : hasMilestone ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleComplete(row.dayIndex)}
                          className="p-1 text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#10b981]" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Day / Date */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">Day {row.dayIndex}</span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {row.formattedDate}
                          </span>
                        </div>
                        {row.milestoneHit && (
                          <div className="flex items-center gap-1 text-[9px] text-amber-400 font-sans font-bold mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{row.milestoneHit}</span>
                          </div>
                        )}
                      </td>

                      {/* Tier Badge */}
                      <td className="py-2.5 px-3">
                        <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded border font-bold uppercase inline-block ${getTierBadgeStyle(row.tierName)}`}>
                          {row.tierName || 'Micro T1'}
                        </span>
                      </td>

                      {/* Start Balance */}
                      <td className="py-2.5 px-3 text-slate-300">
                        {formatCurrency(row.startBalance, currency)}
                      </td>

                      {/* Return Rate */}
                      <td className="py-2.5 px-3">
                        <span className="text-cyan-400 font-bold">
                          {row.effectiveReturnRate > 0 ? '+' : ''}
                          {row.effectiveReturnRate.toFixed(1)}%
                        </span>
                      </td>

                      {/* Gross Profit */}
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        +{formatCurrency(row.grossProfit, currency)}
                      </td>

                      {/* Reinvested */}
                      <td className="py-2.5 px-3 text-slate-300">
                        +{formatCurrency(row.reinvestedProfit, currency)}
                      </td>

                      {/* Withdrawn to Vault */}
                      <td className="py-2.5 px-3 text-purple-300 font-bold">
                        {row.withdrawnProfit > 0 ? `+${formatCurrency(row.withdrawnProfit, currency)}` : '-'}
                      </td>

                      {/* End Balance */}
                      <td className="py-2.5 px-3 text-right font-black text-white">
                        {formatCurrency(row.endBalance, currency)}
                      </td>

                      {/* Total Net Worth */}
                      <td className="py-2.5 px-3 text-right font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                        {formatCurrency(row.totalNetWorth, currency)}
                      </td>
                    </tr>
                  );
                })
              )
            ) : (
              paginatedStep.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No matching steps found.
                  </td>
                </tr>
              ) : (
                paginatedStep.map((row) => {
                  const isDone = !!completedItems[row.stepIndex];
                  const hasMilestone = !!row.milestoneHit;

                  return (
                    <tr
                      key={row.stepIndex}
                      className={`transition-colors hover:bg-white/[0.04] ${
                        isDone ? 'bg-emerald-500/10' : hasMilestone ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleComplete(row.stepIndex)}
                          className="p-1 text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#10b981]" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white">Step {row.stepIndex}</span>
                          <span className="text-[10px] text-purple-300 font-mono">
                            (Phase {row.phaseIndex})
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-400/30 font-bold uppercase">
                          Phase {row.phaseIndex}.{row.stepInPhase}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 font-bold">
                        {formatCurrency(row.stakeAmount, currency)}
                      </td>

                      <td className="py-2.5 px-3 text-cyan-400 font-bold">
                        {dailyOrPayoutRate}%
                      </td>

                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        +{formatCurrency(row.grossProfit, currency)}
                      </td>

                      <td className="py-2.5 px-3 text-slate-300">
                        {formatCurrency(row.reinvestedAmount, currency)}
                      </td>

                      <td className="py-2.5 px-3 text-purple-300 font-bold">
                        {row.lockedProfit > 0 ? `+${formatCurrency(row.lockedProfit, currency)}` : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black text-white">
                        {formatCurrency(row.endBalance, currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-black text-amber-300">
                        {formatCurrency(row.totalValue, currency)}
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 text-[10px]">
            Showing {(currentPage - 1) * pageSize + 1} –{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-black/40 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-bold text-cyan-300 text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/10 bg-black/40 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
