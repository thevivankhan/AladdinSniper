import React, { useState, useEffect } from 'react';
import { MilestoneItem, CurrencyCode } from '../../types/calculator';
import { formatCurrency } from '../../utils/calculatorMath';
import { Trophy, CheckCircle2, Circle, Flame, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface MilestoneTrackerCardProps {
  milestones: MilestoneItem[];
  currency: CurrencyCode;
  startingCapital: number;
  mode: 'daily' | 'step';
}

export const MilestoneTrackerCard: React.FC<MilestoneTrackerCardProps> = ({
  milestones,
  currency,
  startingCapital,
  mode,
}) => {
  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('aladdin_milestones_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aladdin_milestones_completed', JSON.stringify(completedMilestones));
    } catch {
      // ignore
    }
  }, [completedMilestones]);

  const toggleMilestone = (id: string) => {
    setCompletedMilestones((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const achievedCount = milestones.filter((m) => completedMilestones[m.id]).length;
  const progressPercent = milestones.length > 0 ? (achievedCount / milestones.length) * 100 : 0;

  return (
    <div className="relative rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#130f06] via-[#090b1c] to-[#04060c] p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.12)] overflow-hidden font-sans select-none">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 font-mono">
              MILESTONE PROGRESSION LADDER
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Psychological checkpoints, compounding milestones & projected achievement dates.
            </p>
          </div>
        </div>

        {/* Progress Tracker Pill */}
        <div className="flex items-center gap-3 bg-black/60 border border-amber-500/30 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[8.5px] font-mono font-black text-slate-400 uppercase tracking-widest block">
              Checkpoint Progress
            </span>
            <span className="text-xs font-mono font-black text-amber-300">
              {achievedCount} of {milestones.length} Completed
            </span>
          </div>
          <div className="w-20 bg-white/10 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 h-full transition-all duration-500 shadow-[0_0_8px_#f59e0b]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones Ladder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 relative z-10">
        {milestones.map((m, idx) => {
          const isDone = !!completedMilestones[m.id];
          const hasProjectedDate = !!m.projectedDate;
          const hasProjectedIndex = m.projectedIndex !== null;

          return (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => toggleMilestone(m.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group select-none ${
                isDone
                  ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-black/50 border-white/10 hover:border-amber-500/40 hover:bg-white/5'
              }`}
            >
              {/* Checkmark Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      isDone
                        ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.8)] font-black'
                        : 'bg-white/5 text-slate-500 group-hover:text-slate-300 border border-white/10'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    Checkpoint #{idx + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      isDone
                        ? 'bg-amber-500 text-black font-black'
                        : hasProjectedIndex
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/5 text-slate-500'
                    }`}
                  >
                    {isDone
                      ? 'ACHIEVED'
                      : hasProjectedIndex
                      ? mode === 'daily'
                        ? `Day ${m.projectedIndex}`
                        : `Step ${m.projectedIndex}`
                      : 'Outside Scope'}
                  </span>
                </div>
              </div>

              {/* Title & Target */}
              <div className="space-y-1 my-2">
                <h4
                  className={`text-xs font-black tracking-tight font-sans transition-colors ${
                    isDone ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {m.label}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono font-black text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    {formatCurrency(m.targetAmount, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({(m.targetAmount / Math.max(1, startingCapital)).toFixed(1)}x Multiple)
                  </span>
                </div>
              </div>

              {/* Projection Footer */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>
                  {hasProjectedDate
                    ? `Est: ${m.projectedDate}`
                    : hasProjectedIndex
                    ? `Estimated at ${mode === 'daily' ? 'Day' : 'Step'} ${m.projectedIndex}`
                    : 'Requires timeline extension'}
                </span>
                <span className="text-[8.5px] font-bold text-amber-400/80 uppercase">
                  {isDone ? 'Marked Done' : 'Tap to Complete'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
