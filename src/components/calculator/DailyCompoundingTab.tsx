import React from 'react';
import {
  DailyCompoundingInputs,
  CurrencyCode,
  CURRENCIES,
  ActiveDaysPreset,
  ActiveDaysMap,
} from '../../types/calculator';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

interface DailyCompoundingTabProps {
  inputs: DailyCompoundingInputs;
  onChange: (updated: DailyCompoundingInputs) => void;
  onOpenRiskModal: () => void;
}

export const DailyCompoundingTab: React.FC<DailyCompoundingTabProps> = ({
  inputs,
  onChange,
  onOpenRiskModal,
}) => {
  const curr = CURRENCIES[inputs.currency] || CURRENCIES.USD;

  const handleStartingCapChange = (val: number) => {
    onChange({ ...inputs, startingCapital: Math.max(1, val) });
  };

  const handleReturnRateChange = (val: number) => {
    onChange({ ...inputs, dailyReturnRate: Math.max(0.1, Math.min(100, val)) });
  };

  const handleDaysChange = (val: number) => {
    onChange({ ...inputs, daysCount: Math.max(1, Math.min(1500, val)) });
  };

  const handleActiveDaysPreset = (preset: ActiveDaysPreset) => {
    let newDays: ActiveDaysMap;
    if (preset === 'weekdays') {
      newDays = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };
    } else if (preset === 'all') {
      newDays = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true };
    } else {
      newDays = { ...inputs.activeDays };
    }
    onChange({ ...inputs, activeDaysPreset: preset, activeDays: newDays });
  };

  const activeDaysCount = Object.values(inputs.activeDays).filter(Boolean).length;

  return (
    <div className="space-y-2.5 font-sans select-none">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Capital & Yield */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Capital & Target Yield
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {curr.code} ({curr.symbol})
            </span>
          </div>

          {/* Starting Capital */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Starting Capital:</span>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
              <span className="font-mono text-slate-400 font-bold">{curr.symbol}</span>
              <input
                type="number"
                min={1}
                value={inputs.startingCapital}
                onChange={(e) => handleStartingCapChange(Number(e.target.value))}
                className="w-full bg-transparent text-base font-black font-mono text-white outline-none"
              />
            </div>
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[50, 100, 250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleStartingCapChange(amt)}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                    inputs.startingCapital === amt
                      ? 'bg-cyan-500 text-black font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {curr.symbol}{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Return Rate */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Daily Return Target (%):</span>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={100}
                value={inputs.dailyReturnRate}
                onChange={(e) => handleReturnRateChange(Number(e.target.value))}
                className="w-full bg-transparent text-base font-black font-mono text-emerald-300 outline-none"
              />
              <span className="font-mono text-emerald-400 font-bold">%</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[2, 3, 5, 8, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleReturnRateChange(r)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                    inputs.dailyReturnRate === r
                      ? 'bg-emerald-500 text-black font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Timeline & Market Horizon */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Horizon & Schedule
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              {activeDaysCount}d / Week
            </span>
          </div>

          {/* Trading Days Horizon */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Trading Days Horizon:</span>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
              <input
                type="number"
                min={1}
                max={1500}
                value={inputs.daysCount}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                className="w-full bg-transparent text-base font-black font-mono text-amber-300 outline-none"
              />
              <span className="font-mono text-slate-400 text-xs">Days</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[30, 60, 90, 180].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDaysChange(d)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                    inputs.daysCount === d
                      ? 'bg-amber-500 text-black font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Market Active Sessions */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Market Trading Days:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleActiveDaysPreset('weekdays')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  inputs.activeDaysPreset === 'weekdays'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Mon–Fri (5d Forex)
              </button>
              <button
                type="button"
                onClick={() => handleActiveDaysPreset('all')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  inputs.activeDaysPreset === 'all'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Mon–Sun (7d OTC)
              </button>
            </div>
          </div>
        </div>

        {/* 3. Reinvestment vs Vault Split */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Reinvest vs Safe Vault
              </span>
              <div className="text-[10px] font-mono font-bold">
                <span className="text-emerald-400">{inputs.reinvestmentPercent}%</span>
                <span className="text-slate-500"> / </span>
                <span className="text-purple-400">{100 - inputs.reinvestmentPercent}%</span>
              </div>
            </div>

            {/* Range slider */}
            <div className="space-y-1.5 pt-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={inputs.reinvestmentPercent}
                onChange={(e) => onChange({ ...inputs, reinvestmentPercent: Number(e.target.value) })}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0% (All to Vault)</span>
                <span>50/50 Balanced</span>
                <span>100% (Full Growth)</span>
              </div>
            </div>

            {/* Quick split buttons */}
            <div className="grid grid-cols-4 gap-1 mt-2.5">
              {[
                { label: '100%', val: 100 },
                { label: '80/20', val: 80 },
                { label: '70/30', val: 70 },
                { label: '50/50', val: 50 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onChange({ ...inputs, reinvestmentPercent: p.val })}
                  className={`py-1 rounded text-[9.5px] font-mono font-bold border transition-all cursor-pointer ${
                    inputs.reinvestmentPercent === p.val
                      ? 'bg-purple-500 text-white border-purple-400 font-black'
                      : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Risk Modal link */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-mono">Win rate loss drag:</span>
            <button
              type="button"
              onClick={onOpenRiskModal}
              className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer flex items-center gap-1 font-mono"
            >
              <Sliders className="w-3 h-3" />
              <span>Risk Model</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
