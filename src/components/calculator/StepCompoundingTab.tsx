import React from 'react';
import {
  StepCompoundingInputs,
  CurrencyCode,
  CURRENCIES,
  StepCompoundingType,
} from '../../types/calculator';
import {
  Zap,
  Layers,
  Award,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface StepCompoundingTabProps {
  inputs: StepCompoundingInputs;
  onChange: (updated: StepCompoundingInputs) => void;
}

export const StepCompoundingTab: React.FC<StepCompoundingTabProps> = ({
  inputs,
  onChange,
}) => {
  const curr = CURRENCIES[inputs.currency] || CURRENCIES.USD;

  const handleStartingCapChange = (val: number) => {
    onChange({ ...inputs, startingCapital: Math.max(0.1, val) });
  };

  const handleStepsChange = (val: number) => {
    onChange({ ...inputs, stepsCount: Math.max(2, Math.min(30, val)) });
  };

  const handlePayoutChange = (val: number) => {
    onChange({ ...inputs, payoutRatePercent: Math.max(50, Math.min(100, val)) });
  };

  const applyPreset = (presetName: string) => {
    if (presetName === '333') {
      onChange({
        ...inputs,
        startingCapital: 2.11,
        stepsCount: 9,
        phaseLength: 3,
        compoundingType: 'phases',
        lockProfitAtPhaseEnd: true,
        payoutRatePercent: 92,
      });
    } else if (presetName === '444') {
      onChange({
        ...inputs,
        startingCapital: 5.11,
        stepsCount: 16,
        phaseLength: 4,
        compoundingType: 'phases',
        lockProfitAtPhaseEnd: true,
        payoutRatePercent: 92,
      });
    } else if (presetName === 'sniper10') {
      onChange({
        ...inputs,
        startingCapital: 10,
        stepsCount: 10,
        compoundingType: 'all_in',
        payoutRatePercent: 92,
      });
    } else if (presetName === 'conservative') {
      onChange({
        ...inputs,
        startingCapital: 25,
        stepsCount: 8,
        compoundingType: 'profit_split',
        reinvestmentPercent: 70,
        payoutRatePercent: 92,
      });
    }
  };

  return (
    <div className="space-y-2.5 font-sans select-none">
      {/* 3-Column Clean Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Base Stake */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-purple-400" /> Base Entry Stake
            </span>
            <span className="text-[10px] font-mono text-purple-400 font-bold">
              {curr.code} ({curr.symbol})
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Initial Entry Amount:</span>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5">
              <span className="font-mono text-slate-400 font-bold">{curr.symbol}</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                value={inputs.startingCapital}
                onChange={(e) => handleStartingCapChange(Number(e.target.value))}
                className="w-full bg-transparent text-base font-black font-mono text-white outline-none"
              />
            </div>
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[1.11, 2.11, 5.11, 10, 25].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleStartingCapChange(amt)}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                    inputs.startingCapital === amt
                      ? 'bg-purple-500 text-white font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {curr.symbol}{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Steps Count & Payout */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Consecutive Target Steps
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {inputs.stepsCount} Steps
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Target Steps:</span>
              <input
                type="number"
                min={2}
                max={30}
                value={inputs.stepsCount}
                onChange={(e) => handleStepsChange(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-base font-black font-mono text-cyan-300 outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Broker Payout (%):</span>
              <input
                type="number"
                min={50}
                max={100}
                value={inputs.payoutRatePercent}
                onChange={(e) => handlePayoutChange(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-base font-black font-mono text-emerald-300 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {[3, 5, 8, 10, 12].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStepsChange(s)}
                className={`px-2 py-0.5 rounded text-[9.5px] font-mono transition-all cursor-pointer ${
                  inputs.stepsCount === s
                    ? 'bg-cyan-500 text-black font-black'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* 3. Strategy Presets */}
        <div className="bg-[#0b101a] border border-white/5 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-pink-400" /> Challenge Presets
              </span>
              <span className="text-[9.5px] font-mono text-pink-400 font-bold uppercase">
                {inputs.compoundingType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '333', label: '3x3 Matrix', desc: 'Phase Lock' },
                { id: '444', label: '4x4 Matrix', desc: '4 Steps x 4' },
                { id: 'sniper10', label: '10-Step Streak', desc: '100% All-In' },
                { id: 'conservative', label: '70/30 Vault', desc: 'Bank 30%' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/10 text-left transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-mono font-bold text-white block">{p.label}</span>
                  <span className="text-[8.5px] text-slate-400 block">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
