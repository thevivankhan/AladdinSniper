import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, CheckCircle2, ChevronDown, ChevronUp, Clock, Target, Wallet, Activity, Zap, FileDown, Download, BarChart2, TrendingUp, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const POCKET_OPTION_AFFILIATE_URL = 'https://pocket-friends.co/r/mphdnyllo5';

interface Step {
  id: number;
  stake: number;
  profit: number;
  result: number;
}

interface Session {
  id: string;
  title: string;
  start: number;
  target: number;
  steps: Step[];
}

interface Phase {
  id: string;
  title: string;
  mode: string;
  objective: string;
  sessions: Session[];
}

const generateSession = (id: string, start: number, numSteps: number, ratio: number = 0.92): Session => {
  const steps: Step[] = [];
  let current = start;
  for(let i=0; i<numSteps; i++){
    const profit = current * ratio;
    const result = current + profit;
    steps.push({
      id: i+1,
      stake: Number(current.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      result: Number(result.toFixed(2))
    });
    current = result;
  }
  return {
    id,
    title: `SESSION TARGET`,
    start: Number(start.toFixed(2)),
    target: Number(current.toFixed(2)),
    steps
  }
}

const phases: Phase[] = [
  {
    id: 'phase-1',
    title: 'Precision Starter',
    mode: '444 MODE',
    objective: 'Initial capital building with calculated risk.',
    sessions: [
      generateSession('p1-s1', 2.11, 4),
      generateSession('p1-s2', 10.11, 4),
      generateSession('p1-s3', 100.11, 4)
    ]
  },
  {
    id: 'phase-2',
    title: 'Momentum Builder',
    mode: '444 MODE',
    objective: 'Starting from $3.11, this phase ramps up the volume slightly to secure the first significant wallet savings.',
    sessions: [
      generateSession('p2-s1', 3.11, 4),
      generateSession('p2-s2', 11.11, 4),
      generateSession('p2-s3', 111.11, 4)
    ]
  },
  {
    id: 'phase-3',
    title: 'Compact Growth',
    mode: '333 MODE',
    objective: 'Transition to 3-step compounding for faster turnarounds.',
    sessions: [
      generateSession('p3-s1', 5.11, 3),
      generateSession('p3-s2', 50.11, 3),
      generateSession('p3-s3', 500.11, 3)
    ]
  }
];

export const ParadoxStrategy = () => {
  const [activePhases, setActivePhases] = useState<string[]>(['phase-1']);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerLeft, setTimerLeft] = useState<number>(0);
  const [timerType, setTimerType] = useState<'rest' | 'session'>('session'); 

  const stats = useMemo(() => {
    let totalSecured = 0;
    let totalTrades = 0;
    let completedPhases = 0;

    phases.forEach(phase => {
      const phaseSessions = phase.sessions;
      const completedInPhase = phaseSessions.filter(s => completedSessions.includes(s.id));
      
      completedInPhase.forEach(s => {
        totalSecured += (s.target - s.start);
        totalTrades += s.steps.length;
      });

      if (completedInPhase.length === phaseSessions.length) {
        completedPhases++;
      }
    });

    return { totalSecured, totalTrades, completedPhases };
  }, [completedSessions]);

  const togglePhase = (id: string) => {
    setActivePhases(prev => Array.from(new Set(prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])));
  };

  const markComplete = (sessionId: string) => {
    if(!completedSessions.includes(sessionId)){
      setCompletedSessions(prev => [...prev, sessionId]);
      startTimer(sessionId + '_rest', 3600, 'rest'); // 1 hour rest
    }
  };

  const handleLoss = (sessionId: string) => {
    startTimer(sessionId + '_loss', 1800, 'rest'); // 30 mins rest
  };

  const startTimer = (id: string, initialSeconds: number, type: 'rest' | 'session') => {
    setActiveTimerId(id);
    setTimerLeft(initialSeconds);
    setTimerType(type);
  };

  const stopTimer = () => {
    setActiveTimerId(null);
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

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Phase,Session,Start Amount,Target Amount,Status\n";
    
    phases.forEach(phase => {
      phase.sessions.forEach(session => {
        const status = completedSessions.includes(session.id) ? "Completed" : "Pending";
        csvContent += `${phase.title},${session.title},${session.start},${session.target},${status}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paradox_strategy_report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text("Paradox Strategy Report", 14, 20);
    
    // Stats
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Profit Secured: $${stats.totalSecured.toFixed(2)}`, 14, 40);
    doc.text(`Completed Sessions: ${completedSessions.length}`, 14, 47);
    
    // Table Data
    const tableData: any[] = [];
    phases.forEach(phase => {
      phase.sessions.forEach(session => {
        tableData.push([
          phase.title,
          session.title,
          `$${session.start.toFixed(2)}`,
          `$${session.target.toFixed(2)}`,
          completedSessions.includes(session.id) ? "DONE" : "PENDING"
        ]);
      });
    });

    autoTable(doc, {
      startY: 55,
      head: [['Phase', 'Session', 'Start', 'Target', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      margin: { top: 50 }
    });

    doc.save(`paradox_report_${Date.now()}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 text-zinc-100 overflow-y-auto pb-20 hide-scrollbar pt-6 px-4 max-w-5xl mx-auto w-full">
      {/* Mini Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-1.5">
            <Zap className="w-2.5 h-2.5 text-indigo-500 fill-indigo-500" />
            Paradox Core
          </h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to reset all strategy progress?")) {
                setCompletedSessions([]);
                setActiveTimerId(null);
              }
            }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition group"
            title="Reset All Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={exportCSV}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 transition group"
            title="Export CSV"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider transition"
          >
            <Download className="w-3.5 h-3.5" />
            Report
          </button>
        </div>
      </div>

      {/* Compact Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0f121b] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Secured</span>
          <div className="text-xl font-black text-white">${stats.totalSecured.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[#0f121b] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Wins</span>
          <div className="text-xl font-black text-emerald-400">{stats.totalTrades}</div>
        </div>
        <div className="bg-[#0f121b] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Phase Progress</span>
          <div className="text-xl font-black text-indigo-400">{stats.completedPhases}/{phases.length}</div>
        </div>
        <div className="bg-[#0f121b] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Engine Status</span>
          <div className={`text-xl font-black italic ${activeTimerId ? 'text-amber-400' : 'text-zinc-600'}`}>
            {activeTimerId ? 'ACTIVE' : 'IDLE'}
          </div>
        </div>
      </div>

      {/* Simple Phase List */}
      <div className="flex flex-col gap-3">
        {phases.map((phase, pIndex) => {
          const isOpen = activePhases.includes(phase.id);
          const isPhaseDone = phase.sessions.every(s => completedSessions.includes(s.id));
          
          return (
            <div key={phase.id} className="flex flex-col gap-2">
              <button 
                onClick={() => togglePhase(phase.id)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isOpen ? 'bg-[#151a2d] border-indigo-500/30' : 'bg-[#0a0d14] border-white/5 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-[10px] font-black shrink-0 ${
                    isPhaseDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-white/10 text-zinc-600'
                  }`}>
                    {isPhaseDone ? <CheckCircle2 className="w-4 h-4" /> : `0${pIndex+1}`}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 truncate">Protocol {pIndex+1} / {phase.mode}</div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{phase.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <a
                    href={POCKET_OPTION_AFFILIATE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 hover:border-emerald-400/80 text-[11px] font-semibold tracking-wide text-emerald-300 hover:text-emerald-200 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer touch-manipulation select-none active:scale-95"
                    title="Trade Now on Pocket Option"
                  >
                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                    <span className="whitespace-nowrap font-bold">Trade Now</span>
                  </a>
                  <div className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-1 py-4 flex flex-col gap-6">
                      {/* Strategy Summary */}
                      <div className="bg-[#0f121b]/50 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest mb-1 block">Directive</span>
                          <p className="text-xs text-zinc-400 font-bold italic leading-relaxed">"{phase.objective}"</p>
                        </div>
                        <div className="flex items-center gap-4 border-l border-white/5 md:pl-6 flex-wrap">
                           <div>
                              <div className="text-[7px] text-zinc-600 uppercase font-black tracking-widest mb-1">Secured</div>
                              <div className="text-sm font-black text-emerald-400 font-mono">
                                ${phase.sessions.filter(s => completedSessions.includes(s.id)).reduce((acc, s) => acc + (s.target - s.start), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                           </div>
                           <div>
                              <div className="text-[7px] text-zinc-600 uppercase font-black tracking-widest mb-1">Terminal</div>
                              <div className="text-sm font-black text-white font-mono">
                                ${phase.sessions[phase.sessions.length-1].target.toLocaleString()}
                              </div>
                           </div>
                           <a
                             href={POCKET_OPTION_AFFILIATE_URL}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 hover:border-emerald-400/80 text-[11px] font-semibold tracking-wide text-emerald-300 hover:text-emerald-200 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer shrink-0 touch-manipulation select-none active:scale-95"
                             title="Trade Now on Pocket Option"
                           >
                             <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                             <span className="whitespace-nowrap font-bold">Trade Now</span>
                           </a>
                        </div>
                      </div>

                      {/* Sessions List */}
                      <div className="grid grid-cols-1 gap-4">
                        {phase.sessions.map((session, sIndex) => {
                          const isCompleted = completedSessions.includes(session.id);
                          const isResting = activeTimerId === session.id + '_rest' || activeTimerId === session.id + '_loss';
                          const isSessionActive = activeTimerId === session.id;

                          return (
                            <div key={session.id} className={`bg-[#0f121b] border rounded-xl overflow-hidden shadow-xl transition-all ${
                              isSessionActive ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-white/5'
                            }`}>
                              <div className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-black ${
                                    isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-white/10 text-zinc-600'
                                  }`}>
                                    {sIndex+1}
                                  </div>
                                  <div>
                                    <div className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Session Module {sIndex+1}</div>
                                    <div className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                                      <span className="opacity-40 font-normal">$</span>{session.start.toFixed(2)} 
                                      <span className="text-zinc-600 text-[10px] lowercase italic px-1">leads to</span>
                                      <span className="text-indigo-400 font-mono">${session.target.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1.5 border border-white/5">
                                  <div className="flex items-center gap-2 px-3">
                                    <Clock className={`w-3.5 h-3.5 ${isResting ? 'text-amber-500 animate-pulse' : isSessionActive ? 'text-indigo-500' : 'text-zinc-700'}`} />
                                    <span className={`text-base font-black font-mono tabular-nums ${isResting ? 'text-amber-400' : isSessionActive ? 'text-white' : 'text-zinc-800'}`}>
                                      {activeTimerId?.startsWith(session.id) ? formatTime(timerLeft) : '00:00'}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    {isSessionActive || isResting ? (
                                      <button onClick={stopTimer} className="p-1.5 hover:bg-white/10 rounded transition text-zinc-500">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button onClick={() => startTimer(session.id, 0, 'session')} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded text-[9px] font-black uppercase text-white transition">
                                        Start
                                      </button>
                                    )}
                                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                                    <button onClick={() => startTimer(session.id + '_rest', 1800, 'rest')} className="text-[8px] font-black px-2 py-1 hover:bg-white/5 text-zinc-500 hover:text-white transition uppercase">30m</button>
                                    <button onClick={() => startTimer(session.id + '_rest', 3600, 'rest')} className="text-[8px] font-black px-2 py-1 hover:bg-white/5 text-zinc-500 hover:text-white transition uppercase">1h</button>
                                  </div>
                                </div>
                              </div>

                              <div className="w-full overflow-x-auto hide-scrollbar">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="border-b border-white/5 bg-black/10">
                                      <th className="py-2 px-4 font-black text-zinc-600 uppercase tracking-widest">Step</th>
                                      <th className="py-2 px-4 font-black text-zinc-600 uppercase tracking-widest">Stake</th>
                                      <th className="py-2 px-4 font-black text-zinc-600 uppercase tracking-widest">Yield</th>
                                      <th className="py-2 px-4 font-black text-zinc-600 uppercase tracking-widest text-right">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/[0.02]">
                                    {session.steps.map((step) => (
                                      <tr key={step.id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-2.5 px-4 text-zinc-600 font-mono">0{step.id}</td>
                                        <td className="py-2.5 px-4 font-bold text-zinc-400 tabular-nums">${step.stake.toFixed(2)}</td>
                                        <td className="py-2.5 px-4 font-bold text-emerald-500/60 tabular-nums">+${step.profit.toFixed(2)}</td>
                                        <td className="py-2.5 px-4 text-right font-black text-zinc-200 tabular-nums">${step.result.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="p-3 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleLoss(session.id)}
                                    className="text-[8px] font-black uppercase text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded hover:bg-rose-500/10 transition"
                                  >
                                    Loss / Reset
                                  </button>
                                  <a
                                    href={POCKET_OPTION_AFFILIATE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/40 hover:border-emerald-400/80 text-[11px] font-semibold tracking-wide text-emerald-300 hover:text-emerald-200 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_18px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer shrink-0 touch-manipulation select-none active:scale-95"
                                    title="Launch Pocket Option Broker Terminal"
                                  >
                                    <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" />
                                    <span className="whitespace-nowrap font-bold">Trade Now</span>
                                  </a>
                                </div>
                                <button 
                                  onClick={() => markComplete(session.id)}
                                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all ${
                                    isCompleted 
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                      : 'bg-white text-black hover:bg-zinc-200'
                                  }`}
                                >
                                  {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                  {isCompleted ? 'Secured' : 'Complete Module'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
