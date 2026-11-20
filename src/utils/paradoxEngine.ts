import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ParadoxMode = '111' | '222' | '333' | '444';

export interface ParadoxPhaseTemplate {
  title: string;
  start: number;
  trades?: number[];
}

export interface ParadoxPlan {
  id: string;
  seed?: number;
  title: string;
  subtitle: string;
  phases: ParadoxPhaseTemplate[];
  theme: 'emerald' | 'cyan' | 'purple' | 'amber';
  withdrawalRule: string;
  dailyTarget: string;
  minCapital?: number;
  isCustom?: boolean;
}

export interface JournalAuditItem {
  id: string;
  date: string;
  phase: string;
  planName: string;
  result: 'Success' | 'Fail';
  emotion: string;
  marketCondition: string;
  rating: number;
  notes: string;
  payout: number;
}

export interface ParadoxShareData {
  title: string;
  shareHeadline: string;
  heroLabel: string;
  seedLabel: string;
  engineLabel: string;
  profitOrLoss: number;
  startingBalance: number;
  endingBalance: number;
  vaultedAmount: number;
  winsCount: number;
  lossesCount: number;
  tradesCount: number;
  winRate: number;
  payoutRate: number;
  strategyGoal: string;
  timestamp: string;
}

export function getParadoxModeConfig(mode: ParadoxMode) {
  if (mode === '111') return { mode: '111' as const, phasesCount: 10, stepsPerPhase: 1, label: '111 · 10×1', lockLabel: '30% Profit Vault Lock' };
  if (mode === '222') return { mode: '222' as const, phasesCount: 6, stepsPerPhase: 2, label: '222 · 6×2', lockLabel: '40% Return Vault Lock' };
  if (mode === '444') return { mode: '444' as const, phasesCount: 4, stepsPerPhase: 4, label: '444 · 4×4', lockLabel: '65% Roll / 35% Lock' };
  return { mode: '333' as const, phasesCount: 3, stepsPerPhase: 3, label: '333 · 3×3', lockLabel: '58% Roll / 42% Lock' };
}

export function generateChallengeTrades(start: number, count: number, payoutRate: number): number[] {
  const trades: number[] = [];
  let current = start;
  for (let i = 0; i < count; i++) {
    trades.push(Number(current.toFixed(2)));
    current = current * (1 + payoutRate);
  }
  return trades;
}

export function buildParadoxPhases(mode: ParadoxMode, seedInput: number, payoutRate: number): ParadoxPhaseTemplate[] {
  const cfg = getParadoxModeConfig(mode);
  const safePay = Math.max(0.1, Number(payoutRate) || 0.92);
  const seed = Math.max(1, Number(Number(seedInput || 1.11).toFixed(2)));
  const phaseMult = Math.pow(1 + safePay, cfg.stepsPerPhase);
  const phases: ParadoxPhaseTemplate[] = [];
  let curStart = seed;

  for (let i = 0; i < cfg.phasesCount; i++) {
    phases.push({ title: `Phase ${i + 1}`, start: Number(curStart.toFixed(2)) });
    if (cfg.mode === '111') {
      const nextVal = curStart + (curStart * safePay) * 0.7;
      curStart = Math.max(Number((curStart * 1.05).toFixed(2)), Number(nextVal.toFixed(2)));
    } else if (cfg.mode === '222') {
      const nextVal = curStart * phaseMult * 0.6;
      curStart = Math.max(Number((curStart * 1.15).toFixed(2)), Number(nextVal.toFixed(2)));
    } else {
      const keepRatio = cfg.mode === '333' ? 0.58 : 0.65;
      const nextVal = curStart * phaseMult * keepRatio;
      curStart = Math.max(Number((curStart * 1.1).toFixed(2)), Number(nextVal.toFixed(2)));
    }
  }
  return phases;
}

export const PLANS_111: ParadoxPlan[] = [
  { id: 'plan-111-1', seed: 1.11, title: 'Micro 10×1', subtitle: 'Start: $1.11 - 92% Ratio (10×1)', theme: 'cyan', minCapital: 15, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$228', phases: [] },
  { id: 'plan-111-2', seed: 2.11, title: 'Mini 10×1', subtitle: 'Start: $2.11 - 92% Ratio (10×1)', theme: 'purple', minCapital: 30, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$434', phases: [] },
  { id: 'plan-111-5', seed: 5.11, title: 'Starter 10×1', subtitle: 'Start: $5.11 - 92% Ratio (10×1)', theme: 'emerald', minCapital: 75, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$1,051', phases: [] },
  { id: 'plan-111-10', seed: 10.11, title: 'Builder 10×1', subtitle: 'Start: $10.11 - 92% Ratio (10×1)', theme: 'cyan', minCapital: 150, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$2,079', phases: [] },
  { id: 'plan-111-20', seed: 20.11, title: 'Pro 10×1', subtitle: 'Start: $20.11 - 92% Ratio (10×1)', theme: 'purple', minCapital: 300, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$4,135', phases: [] },
  { id: 'plan-111-50', seed: 50.11, title: 'Elite 10×1', subtitle: 'Start: $50.11 - 92% Ratio (10×1)', theme: 'emerald', minCapital: 750, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$10,302', phases: [] },
  { id: 'plan-111-100', seed: 100.11, title: 'Master 10×1', subtitle: 'Start: $100.11 - 92% Ratio (10×1)', theme: 'amber', minCapital: 1500, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$20,582', phases: [] },
  { id: 'plan-111-500', seed: 500.11, title: 'Zenith 10×1', subtitle: 'Start: $500.11 - 92% Ratio (10×1)', theme: 'cyan', minCapital: 7500, withdrawalRule: 'Lock 30% Profit Every Phase · Strict P1 Reset', dailyTarget: '10 Sniper Shots -> ~$102,821', phases: [] }
];

export const PLANS_222: ParadoxPlan[] = [
  { id: 'plan-222-1', seed: 1.11, title: 'Micro 6×2', subtitle: 'Start: $1.11 - 92% Ratio (6×2)', theme: 'cyan', minCapital: 18, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$287', phases: [] },
  { id: 'plan-222-2', seed: 2.11, title: 'Mini 6×2', subtitle: 'Start: $2.11 - 92% Ratio (6×2)', theme: 'purple', minCapital: 35, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$545', phases: [] },
  { id: 'plan-222-5', seed: 5.11, title: 'Starter 6×2', subtitle: 'Start: $5.11 - 92% Ratio (6×2)', theme: 'emerald', minCapital: 85, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$1,320', phases: [] },
  { id: 'plan-222-10', seed: 10.11, title: 'Builder 6×2', subtitle: 'Start: $10.11 - 92% Ratio (6×2)', theme: 'cyan', minCapital: 170, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$2,612', phases: [] },
  { id: 'plan-222-20', seed: 20.11, title: 'Pro 6×2', subtitle: 'Start: $20.11 - 92% Ratio (6×2)', theme: 'purple', minCapital: 350, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$5,195', phases: [] },
  { id: 'plan-222-50', seed: 50.11, title: 'Elite 6×2', subtitle: 'Start: $50.11 - 92% Ratio (6×2)', theme: 'emerald', minCapital: 850, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$12,946', phases: [] },
  { id: 'plan-222-100', seed: 100.11, title: 'Master 6×2', subtitle: 'Start: $100.11 - 92% Ratio (6×2)', theme: 'amber', minCapital: 1700, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$25,863', phases: [] },
  { id: 'plan-222-500', seed: 500.11, title: 'Zenith 6×2', subtitle: 'Start: $500.11 - 92% Ratio (6×2)', theme: 'cyan', minCapital: 8500, withdrawalRule: 'Lock 40% Return Every Phase · Strict P1 Reset', dailyTarget: '6 Phases (12T) -> ~$129,203', phases: [] }
];

export const PLANS_333: ParadoxPlan[] = [
  { id: 'plan-100', title: 'Nano Builder', subtitle: 'Start: $100 / $250 - 92% Ratio', theme: 'cyan', minCapital: 80, withdrawalRule: 'Lock 50% post Phase 2 · Strict P1 Reset', dailyTarget: 'Complete 1 Phase/Day', phases: [{ title: 'Phase 1', start: 2.11 }, { title: 'Phase 2', start: 10.11 }, { title: 'Phase 3', start: 30.11 }] },
  { id: 'plan-250', title: 'Micro Builder', subtitle: 'Start: $250 / $500 - 92% Ratio', theme: 'purple', minCapital: 200, withdrawalRule: 'Full withdrawal post Phase 3 · Strict P1 Reset', dailyTarget: 'Max 2 Sessions/Day', phases: [{ title: 'Phase 1', start: 5.11 }, { title: 'Phase 2', start: 20.11 }, { title: 'Phase 3', start: 100.11 }] },
  { id: 'plan-500', title: 'Beginner Builder', subtitle: 'Start: $500 / $1000 - 92% Ratio', theme: 'emerald', minCapital: 450, withdrawalRule: 'Lock 50% of Phase 2 · Strict P1 Reset', dailyTarget: 'Strictly 1 Phase/Day', phases: [{ title: 'Phase 1', start: 10.11 }, { title: 'Phase 2', start: 50.11 }, { title: 'Phase 3', start: 300.11 }] },
  { id: 'plan-2000', title: 'Advanced Accelerator', subtitle: 'Start: $2000 / $3000 - 92% Ratio', theme: 'cyan', minCapital: 1500, withdrawalRule: 'Lock 60% post Phase 3 · Strict P1 Reset', dailyTarget: 'Paced Execution (1/Day)', phases: [{ title: 'Phase 1', start: 20.11 }, { title: 'Phase 2', start: 100.11 }, { title: 'Phase 3', start: 600.11 }] },
  { id: 'plan-5000', title: 'Elite Capital', subtitle: 'Start: $5000 - 92% Ratio', theme: 'purple', minCapital: 4000, withdrawalRule: 'Lock Initial post Phase 1 · Strict P1 Reset', dailyTarget: 'High Capital Focus', phases: [{ title: 'Phase 1', start: 50.11 }, { title: 'Phase 2', start: 300.11 }, { title: 'Phase 3', start: 2000.11 }] },
  { id: 'plan-10000', title: 'Master Capital', subtitle: 'Start: $10000 - 92% Ratio', theme: 'amber', minCapital: 8000, withdrawalRule: 'Systematic Withdrawal · Strict P1 Reset', dailyTarget: 'Institutional Pace', phases: [{ title: 'Phase 1', start: 100.11 }, { title: 'Phase 2', start: 600.11 }, { title: 'Phase 3', start: 4000.11 }] },
  { id: 'plan-100k', title: 'Legendary Target', subtitle: 'Start: $500.11 - 92% Ratio', theme: 'cyan', minCapital: 15000, withdrawalRule: '1 Lakh Target Lock · Strict P1 Reset', dailyTarget: 'Ultimate Consistency', phases: [{ title: 'Phase 1', start: 500.11 }, { title: 'Phase 2', start: 2000.11 }, { title: 'Phase 3', start: 14156.54 }] }
];

export const PLANS_444: ParadoxPlan[] = [
  { id: 'plan-1-11', title: 'Micro Starter', subtitle: 'Start: $1.11 - 92% Ratio (4x4)', theme: 'cyan', minCapital: 20, withdrawalRule: 'Withdraw risk after P2 · Strict P1 Reset', dailyTarget: '1 Phase Completion', phases: [{ title: 'Phase 1', start: 1.11 }, { title: 'Phase 2', start: 10.11 }, { title: 'Phase 3', start: 100.11 }, { title: 'Phase 4', start: 1000.11 }] },
  { id: 'plan-2-11', title: 'Mini Starter', subtitle: 'Start: $2.11 - 92% Ratio (4x4)', theme: 'purple', minCapital: 40, withdrawalRule: 'Withdraw $100 at P2 · Strict P1 Reset', dailyTarget: 'Max 2 Paced Sessions', phases: [{ title: 'Phase 1', start: 2.11 }, { title: 'Phase 2', start: 20.11 }, { title: 'Phase 3', start: 200.11 }, { title: 'Phase 4', start: 2000.11 }] },
  { id: 'plan-5-11', title: 'Pro Starter', subtitle: 'Start: $5.11 - 92% Ratio (4x4)', theme: 'emerald', minCapital: 90, withdrawalRule: 'Lock 50% post Phase 2 · Strict P1 Reset', dailyTarget: 'Optimal Scaling (1/Day)', phases: [{ title: 'Phase 1', start: 5.11 }, { title: 'Phase 2', start: 50.11 }, { title: 'Phase 3', start: 500.11 }, { title: 'Phase 4', start: 5000.11 }] },
  { id: 'plan-10-11', title: 'Elite Starter', subtitle: 'Start: $10.11 - 92% Ratio (4x4)', theme: 'amber', minCapital: 200, withdrawalRule: 'Strict 40% lock post P2 · Strict P1 Reset', dailyTarget: 'Advanced Capital Mgmt', phases: [{ title: 'Phase 1', start: 10.11 }, { title: 'Phase 2', start: 100.11 }, { title: 'Phase 3', start: 1000.11 }, { title: 'Phase 4', start: 10000.11 }] },
  { id: 'plan-50-11', title: 'God Starter', subtitle: 'Start: $50.11 - 92% Ratio (4x4)', theme: 'cyan', minCapital: 900, withdrawalRule: 'Absolute Lock post Phase 2 · Strict P1 Reset', dailyTarget: 'Institutional Zenith', phases: [{ title: 'Phase 1', start: 50.11 }, { title: 'Phase 2', start: 500.11 }, { title: 'Phase 3', start: 5000.11 }, { title: 'Phase 4', start: 50000.11 }] }
];

export function buildCustomParadoxPlan(mode: ParadoxMode, seedInput: number, payoutRate: number): ParadoxPlan {
  const cfg = getParadoxModeConfig(mode);
  const seed = Math.max(1, Number(Number(seedInput || 1.11).toFixed(2)));
  const phases = buildParadoxPhases(cfg.mode, seed, payoutRate);
  const pctStr = `${Math.round((Number(payoutRate) || 0.92) * 100)}%`;
  const lastPh = phases[phases.length - 1];
  const lastTrades = lastPh ? generateChallengeTrades(lastPh.start, cfg.stepsPerPhase, payoutRate) : [seed];
  const estTop = (lastTrades[lastTrades.length - 1] || seed) * (1 + payoutRate);
  return {
    id: `custom-${cfg.mode}`,
    seed,
    title: `Custom $${seed.toFixed(2)}`,
    subtitle: `Seed $${seed.toFixed(2)} - ${pctStr} Ratio (${cfg.phasesCount}×${cfg.stepsPerPhase})`,
    theme: 'amber',
    isCustom: true,
    minCapital: Number((seed * 15).toFixed(2)),
    withdrawalRule:
      cfg.mode === '111'
        ? 'Lock 30% Profit Every Phase · Strict P1 Reset'
        : cfg.mode === '222'
          ? 'Lock 40% Return Every Phase · Strict P1 Reset'
          : 'Custom Auto-Locked Strategy · Strict P1 Reset',
    dailyTarget: `${cfg.phasesCount} Phases (${cfg.phasesCount * cfg.stepsPerPhase}T) -> ~$${Math.round(estTop).toLocaleString()}`,
    phases
  };
}

export function getPlansForMode(mode: ParadoxMode, payoutRate: number, customSeed?: number): ParadoxPlan[] {
  const cfg = getParadoxModeConfig(mode);
  const baseTmpl = mode === '111' ? PLANS_111 : mode === '222' ? PLANS_222 : mode === '444' ? PLANS_444 : PLANS_333;
  const tmpl = customSeed && customSeed >= 1 ? [...baseTmpl, buildCustomParadoxPlan(mode, customSeed, payoutRate)] : baseTmpl;
  const pctStr = `${Math.round(payoutRate * 100)}%`;
  return tmpl.map((plan) => {
    const rawPhases =
      plan.phases && plan.phases.length > 0
        ? plan.phases
        : buildParadoxPhases(mode, plan.seed || 1.11, payoutRate);
    return {
      ...plan,
      subtitle: plan.subtitle.replace(/92%|[\d.]+%/, pctStr),
      phases: rawPhases.map((ph) => ({
        ...ph,
        trades: generateChallengeTrades(ph.start, cfg.stepsPerPhase, payoutRate)
      }))
    };
  });
}

export function exportParadoxCSV(opts: {
  mode: ParadoxMode;
  plan: ParadoxPlan;
  payoutRate: number;
  completedSteps: Record<string, boolean>;
  vaultedTotal: number;
  cyclesCount: number;
}) {
  const { mode, plan, payoutRate, completedSteps, vaultedTotal, cyclesCount } = opts;
  const rows: string[] = [
    ['Mode', 'Plan', 'Phase', 'Step', 'Status', 'Stake ($)', 'Est Profit ($)', 'Est Return ($)', 'Vault Action', 'Payout %', 'Persistent Vault ($)', 'Cycles'].join(',')
  ];
  plan.phases.forEach((ph, pIdx) => {
    const trades = ph.trades || [];
    const lastVal = (trades[trades.length - 1] || ph.start) * (1 + payoutRate);
    const nextPh = plan.phases[pIdx + 1];
    const lockAmt = nextPh ? Math.max(0, lastVal - nextPh.start) : Math.max(0, lastVal - (trades[0] || ph.start));
    trades.forEach((amt, tIdx) => {
      const done = !!completedSteps[`${plan.id}-${pIdx}-${tIdx}`];
      const prof = amt * payoutRate;
      const ret = amt + prof;
      const vaultNote = tIdx === trades.length - 1 ? `+$${lockAmt.toFixed(2)}` : 'Roll';
      rows.push(
        [
          mode,
          `"${plan.title.replace(/"/g, '""')}"`,
          `"${ph.title}"`,
          `${tIdx + 1}/${trades.length}`,
          done ? 'DONE' : 'PENDING',
          amt.toFixed(2),
          prof.toFixed(2),
          ret.toFixed(2),
          vaultNote,
          Math.round(payoutRate * 100),
          vaultedTotal.toFixed(2),
          cyclesCount
        ].join(',')
      );
    });
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paradox_${mode}_${plan.id}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportParadoxPDF(opts: {
  mode: ParadoxMode;
  plan: ParadoxPlan;
  payoutRate: number;
  completedSteps: Record<string, boolean>;
  sessionStats: { totalProfit: number; completedCount: number; totalStaked: number; totalLockedProfit: number };
  vaultedTotal: number;
  cyclesCount: number;
  journalEntries?: JournalAuditItem[];
}) {
  const { mode, plan, payoutRate, completedSteps, sessionStats, vaultedTotal, cyclesCount, journalEntries = [] } = opts;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const payPct = Math.round(payoutRate * 100);
  const stepsPerPhase = plan.phases[0]?.trades?.length || 1;
  const totalPlanSteps = plan.phases.length * stepsPerPhase;
  const totalVaultCombined = Number((sessionStats.totalLockedProfit + vaultedTotal).toFixed(2));
  const seed = plan.phases[0]?.start || plan.seed || 1.11;

  // Header Banner
  doc.setFillColor(12, 17, 30);
  doc.rect(0, 0, 595.28, 108, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, 595.28, 4, 'F');

  doc.setTextColor(251, 191, 36);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ALADDINSNIPER · PARADOX MASTER REPORT', 36, 36);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(10);
  doc.text(`${mode} MODE (${plan.phases.length}×${stepsPerPhase}) · ${plan.title} · ${payPct}% PAYOUT`, 36, 56);

  doc.setTextColor(52, 211, 153);
  doc.setFontSize(9);
  doc.text(`Rule: ${plan.withdrawalRule}`, 36, 74);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 36, 90);

  // KPI summary boxes
  const kpis = [
    { label: 'SEED AT RISK', val: `$${seed.toFixed(2)}` },
    { label: 'PLAN PROFIT', val: `$${sessionStats.totalProfit.toFixed(2)}` },
    { label: 'VAULT LOCKED', val: `$${totalVaultCombined.toFixed(2)}` },
    { label: 'WINS / CYCLES', val: `${sessionStats.completedCount}/${totalPlanSteps} · ×${cyclesCount}` }
  ];
  const boxW = 124;
  kpis.forEach((k, idx) => {
    const x = 36 + idx * (boxW + 9);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 122, boxW, 44, 4, 4, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(k.label, x + 8, 136);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(k.val, x + 8, 156);
  });

  // Steps Table
  const tableRows: string[][] = [];
  plan.phases.forEach((ph, pIdx) => {
    const trades = ph.trades || [];
    const lastVal = (trades[trades.length - 1] || ph.start) * (1 + payoutRate);
    const nextPh = plan.phases[pIdx + 1];
    const lockAmt = nextPh ? Math.max(0, lastVal - nextPh.start) : Math.max(0, lastVal - (trades[0] || ph.start));
    trades.forEach((amt, tIdx) => {
      const done = !!completedSteps[`${plan.id}-${pIdx}-${tIdx}`];
      const prof = amt * payoutRate;
      const ret = amt + prof;
      tableRows.push([
        `P${pIdx + 1}`,
        `${tIdx + 1}/${trades.length}`,
        done ? 'DONE' : 'PENDING',
        `$${amt.toFixed(2)}`,
        `+$${prof.toFixed(2)}`,
        `$${ret.toFixed(2)}`,
        tIdx === trades.length - 1 ? `+$${lockAmt.toFixed(2)}` : 'Roll'
      ]);
    });
  });

  autoTable(doc, {
    startY: 180,
    head: [['PHASE', 'STEP', 'STATUS', 'STAKE', 'EST PROFIT', 'EST RETURN', 'VAULT ACTION']],
    body: tableRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // Optional Journal Audits
  if (journalEntries.length > 0) {
    const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 500;
    autoTable(doc, {
      startY: lastY + 20,
      head: [['DATE', 'PLAN / PHASE', 'OUTCOME', 'EMOTION', 'NOTES']],
      body: journalEntries.slice(0, 10).map((j) => [
        j.date,
        `${j.planName} · ${j.phase}`,
        j.result,
        `${j.emotion} (${j.rating}/5)`,
        j.notes.slice(0, 70)
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255] }
    });
  }

  doc.save(`paradox_${mode}_${plan.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
