import React from 'react';
import { AdvancedRiskModel, ReturnTier, CashFlowFrequency } from '../../types/calculator';
import { calculateRiskDragEV, formatCurrency } from '../../utils/calculatorMath';
import { X, ShieldAlert, Sliders, Zap, TrendingUp, Layers, DollarSign, Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdvancedRiskModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: AdvancedRiskModel;
  onChange: (updated: AdvancedRiskModel) => void;
  currency: any;
}

export const AdvancedRiskModelModal: React.FC<AdvancedRiskModelModalProps> = ({
  isOpen,
  onClose,
  model,
  onChange,
  currency,
}) => {
  if (!isOpen) return null;

  const tradesPerDay = model.sessionsPerDay * model.tradesPerSession;
  const evStats = calculateRiskDragEV(
    model.winRatePercent,
    model.brokerPayoutPercent,
    model.riskPerTradePercent,
    model.lossDragMultiplier,
    tradesPerDay
  );

  const updateTier = (index: number, key: keyof ReturnTier, value: any) => {
    const newTiers = [...model.tiers];
    newTiers[index] = { ...newTiers[index], [key]: value };
    onChange({ ...model, tiers: newTiers });
  };

  const addTier = () => {
    const lastTier = model.tiers[model.tiers.length - 1];
    const newMin = lastTier?.maxBalance || 10000;
    const newTier: ReturnTier = {
      id: Date.now().toString(),
      name: `Tier ${model.tiers.length + 1}`,
      minBalance: newMin,
      maxBalance: null,
      returnRate: 1.5,
    };
    onChange({ ...model, tiers: [...model.tiers, newTier] });
  };

  const removeTier = (index: number) => {
    if (model.tiers.length <= 1) return;
    const newTiers = model.tiers.filter((_, i) => i !== index);
    onChange({ ...model, tiers: newTiers });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0b101d] border border-white/10 rounded-[6px] w-full max-w-3xl max-h-[90vh] overflow-y-auto hide-scrollbar shadow-2xl relative"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#0b101d]/95 backdrop-blur-md border-b border-white/10 p-5 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Advanced Risk Engineering & Models
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Session multipliers, win rate loss drag, dynamic tiers & cash flow
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-[3px] hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Master Toggle */}
            <div className="bg-black/40 border border-white/5 rounded-[4px] p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-black text-white block">
                  Activate Advanced Risk Engine
                </span>
                <span className="text-[11px] text-slate-400">
                  Enables mathematical loss drag, session pacing, and tiered return brackets
                </span>
              </div>
              <button
                onClick={() => onChange({ ...model, enabled: !model.enabled })}
                className={`px-4 py-2 rounded-[3px] text-xs font-black uppercase tracking-wider transition-all border ${
                  model.enabled
                    ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                {model.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* SECTION 1: Session Multipliers */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> 1. Session Multiplier & Pacing
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {tradesPerDay} Total Trades / Day
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sessions per day */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Sessions Per Day
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((s) => (
                      <button
                        key={s}
                        onClick={() => onChange({ ...model, sessionsPerDay: s })}
                        className={`py-2 rounded-lg text-xs font-mono font-black transition-all border ${
                          model.sessionsPerDay === s
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}x {s === 1 ? 'Solo' : s === 2 ? 'Dual' : 'Triple'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trades per session */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Trades Per Session
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={model.tradesPerSession}
                      onChange={(e) =>
                        onChange({ ...model, tradesPerSession: Number(e.target.value) })
                      }
                      className="flex-1 accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <span className="w-12 text-center font-mono font-black text-sm text-white bg-black/40 px-2 py-1 rounded border border-white/10">
                      {model.tradesPerSession}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Win Rate vs Average Loss Drag */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> 2. Win Rate vs Average Loss Drag (EV Engine)
                </span>
                <span
                  className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border ${
                    evStats.netDailyReturnPercent > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  Calculated EV: {evStats.netDailyReturnPercent > 0 ? '+' : ''}
                  {evStats.netDailyReturnPercent}% / day
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Win Rate */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Win Rate %
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={40}
                      max={95}
                      value={model.winRatePercent}
                      onChange={(e) =>
                        onChange({ ...model, winRatePercent: Number(e.target.value) })
                      }
                      className="w-16 bg-transparent text-lg font-mono font-black text-white outline-none border-b border-white/20 focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-500 font-bold">%</span>
                  </div>
                </div>

                {/* Broker Payout */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Broker Payout %
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={60}
                      max={100}
                      value={model.brokerPayoutPercent}
                      onChange={(e) =>
                        onChange({ ...model, brokerPayoutPercent: Number(e.target.value) })
                      }
                      className="w-16 bg-transparent text-lg font-mono font-black text-cyan-400 outline-none border-b border-white/20 focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-500 font-bold">%</span>
                  </div>
                </div>

                {/* Risk per trade */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Risk / Stake %
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={model.riskPerTradePercent}
                      onChange={(e) =>
                        onChange({ ...model, riskPerTradePercent: Number(e.target.value) })
                      }
                      className="w-16 bg-transparent text-lg font-mono font-black text-amber-400 outline-none border-b border-white/20 focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-500 font-bold">%</span>
                  </div>
                </div>

                {/* Loss Drag Multiplier */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                    Loss Drag Drag (MTG)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={4}
                      step={0.1}
                      value={model.lossDragMultiplier}
                      onChange={(e) =>
                        onChange({ ...model, lossDragMultiplier: Number(e.target.value) })
                      }
                      className="w-16 bg-transparent text-lg font-mono font-black text-rose-400 outline-none border-b border-white/20 focus:border-cyan-400"
                    />
                    <span className="text-xs text-slate-500 font-bold">x</span>
                  </div>
                </div>
              </div>

              {/* Math EV Output Pill */}
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-300 font-bold block">
                    EV Reality Check:
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Break-even win rate required: <strong className="text-white">{evStats.breakEvenWinRate}%</strong> | Edge margin: <strong className={evStats.edgeMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}>{evStats.edgeMargin > 0 ? '+' : ''}{evStats.edgeMargin}%</strong>
                  </span>
                </div>
                <button
                  onClick={() =>
                    onChange({
                      ...model,
                      useCalculatedDailyReturn: !model.useCalculatedDailyReturn,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                    model.useCalculatedDailyReturn
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {model.useCalculatedDailyReturn ? 'Applying EV to Schedule' : 'Apply EV Rate to Schedule'}
                </button>
              </div>
            </div>

            {/* SECTION 3: Tier-Based Return Rates (Capital Brackets) */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" /> 3. Tier-Based Return Rates (Capital Scaling)
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Automatically decreases daily return targets as account balance crosses tiers
                  </p>
                </div>
                <button
                  onClick={() =>
                    onChange({
                      ...model,
                      enableTieredReturns: !model.enableTieredReturns,
                    })
                  }
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    model.enableTieredReturns
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {model.enableTieredReturns ? 'Tiers Enabled' : 'Tiers Off'}
                </button>
              </div>

              {model.enableTieredReturns && (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase text-slate-500 px-2">
                    <span className="col-span-3">Tier Name</span>
                    <span className="col-span-3">Min Balance</span>
                    <span className="col-span-3">Max Balance</span>
                    <span className="col-span-2">Rate %</span>
                    <span className="col-span-1 text-right">Del</span>
                  </div>

                  {model.tiers.map((tier, idx) => (
                    <div
                      key={tier.id}
                      className="grid grid-cols-12 gap-2 items-center bg-black/40 border border-white/5 p-2 rounded-lg"
                    >
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => updateTier(idx, 'name', e.target.value)}
                        className="col-span-3 bg-transparent text-xs font-bold text-white outline-none"
                      />
                      <input
                        type="number"
                        value={tier.minBalance}
                        onChange={(e) => updateTier(idx, 'minBalance', Number(e.target.value))}
                        className="col-span-3 bg-black/60 border border-white/5 rounded px-2 py-1 text-xs font-mono text-slate-300 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={tier.maxBalance === null ? '' : tier.maxBalance}
                        onChange={(e) =>
                          updateTier(
                            idx,
                            'maxBalance',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        className="col-span-3 bg-black/60 border border-white/5 rounded px-2 py-1 text-xs font-mono text-slate-300 outline-none"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          step={0.1}
                          value={tier.returnRate}
                          onChange={(e) => updateTier(idx, 'returnRate', Number(e.target.value))}
                          className="w-full bg-black/60 border border-white/5 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-400 outline-none"
                        />
                        <span className="text-[10px] text-slate-500">%</span>
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeTier(idx)}
                          className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addTier}
                    className="w-full py-2 border border-dashed border-white/10 hover:border-white/30 text-slate-400 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Tier Bracket
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 4: Recurring Cash Flow */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> 4. Recurring Cash Flow (Deposits & Scheduled Withdrawals)
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Inject periodic weekly deposits or schedule monthly lifestyle salary withdrawals
                  </p>
                </div>
                <button
                  onClick={() =>
                    onChange({
                      ...model,
                      cashFlow: { ...model.cashFlow, enabled: !model.cashFlow.enabled },
                    })
                  }
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    model.cashFlow.enabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {model.cashFlow.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              {model.cashFlow.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Type */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Action Type
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                      {(['deposit', 'withdrawal'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            onChange({
                              ...model,
                              cashFlow: { ...model.cashFlow, type: t },
                            })
                          }
                          className={`py-1.5 rounded text-xs font-bold capitalize transition-colors ${
                            model.cashFlow.type === t
                              ? t === 'deposit'
                                ? 'bg-emerald-500 text-black font-black'
                                : 'bg-rose-500 text-white font-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={model.cashFlow.amount}
                      onChange={(e) =>
                        onChange({
                          ...model,
                          cashFlow: { ...model.cashFlow, amount: Number(e.target.value) },
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Frequency
                    </label>
                    <select
                      value={model.cashFlow.frequency}
                      onChange={(e) =>
                        onChange({
                          ...model,
                          cashFlow: {
                            ...model.cashFlow,
                            frequency: e.target.value as CashFlowFrequency,
                          },
                        })
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-medium text-white outline-none focus:border-cyan-400"
                    >
                      <option value="daily">Daily (Every trading day)</option>
                      <option value="weekly">Weekly (Every 5 trading days)</option>
                      <option value="biweekly">Bi-weekly (Every 10 trading days)</option>
                      <option value="monthly">Monthly (Every 20 trading days)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#0b101d]/95 backdrop-blur-md border-t border-white/10 p-4 flex items-center justify-between">
            <button
              onClick={() => {
                onChange({
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
                    { id: '1', name: 'Micro Growth', minBalance: 0, maxBalance: 1000, returnRate: 5.0 },
                    { id: '2', name: 'Mid Scale', minBalance: 1000, maxBalance: 5000, returnRate: 3.5 },
                    { id: '3', name: 'Preservation', minBalance: 5000, maxBalance: 25000, returnRate: 2.0 },
                    { id: '4', name: 'Institutional', minBalance: 25000, maxBalance: null, returnRate: 1.0 },
                  ],
                  cashFlow: {
                    enabled: false,
                    type: 'withdrawal',
                    amount: 100,
                    frequency: 'weekly',
                  },
                });
              }}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-500/20"
            >
              Done & Save Models
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
