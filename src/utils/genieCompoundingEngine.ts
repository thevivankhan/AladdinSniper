export type GenieCompMode = 'NK_PLAN' | 'DAILY';
export type ActiveTradingDays = 'MON_FRI' | 'WEEKENDS' | 'ALL_7';
export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED';
export type CashFlowType = 'NONE' | 'DEPOSIT' | 'WITHDRAW';
export type CashFlowFreq = 'WEEKLY' | 'MONTHLY';

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; label: string }> = {
  USD: { symbol: '$', label: 'USD ($)' },
  INR: { symbol: '₹', label: 'INR (₹)' },
  EUR: { symbol: '€', label: 'EUR (€)' },
  GBP: { symbol: '£', label: 'GBP (£)' },
  AED: { symbol: 'د.إ', label: 'AED' },
};

export interface NKPlanConfig {
  capital: number;
  totalTrades: number;
  winsNeeded: number;
  payoutPct: number;
  minStake: number;
  currency: CurrencyCode;
}

export interface NKScheduleRow {
  tradeIndex: number;
  stake: number;
  balanceBefore: number;
  profitIfWin: number;
  balanceAfterLoss: number;
  fitsMinStake: boolean;
  fitsBalance: boolean;
}

export interface NKPlanResult {
  status: 'ACTIVE' | 'GOAL_WON' | 'BUSTED';
  nextStake: number;
  rawFirstStake: number;
  ifWinNextStake: number;
  ifLossNextStake: number;
  currentBalance: number;
  targetCapital: number;
  targetProfit: number;
  targetGainPct: number;
  tradesDone: number;
  tradesLeft: number;
  winsAchieved: number;
  winsRemaining: number;
  fitsMinStake: boolean;
  bestFitTrades: number;
  bestFitProfit: number;
  bestFitGainPct: number;
  coverableSteps: number;
  schedule: NKScheduleRow[];
}

export interface GenieCompConfig {
  mode: GenieCompMode;
  currency: CurrencyCode;
  startingCapital: number;
  totalTrades: number;
  winsNeeded: number;
  minStake: number;
  targetGoal: number;
  dailyTargetPct: number;
  horizonDays: number;
  activeDays: ActiveTradingDays;
  reinvestPct: number;
  payoutPct: number;
  riskPerTradePct: number;
  useWinRateDrag: boolean;
  winRatePct: number;
  tradesPerDay: number;
  useTierRates: boolean;
  tier1Limit: number;
  tier2Limit: number;
  tier2RatePct: number;
  tier3RatePct: number;
  cashFlowType: CashFlowType;
  cashFlowAmount: number;
  cashFlowFreq: CashFlowFreq;
}

export interface GenieCompRow {
  index: number;
  label: string;
  dateStr: string;
  startBalance: number;
  stake: number;
  grossProfit: number;
  reinvested: number;
  withdrawn: number;
  cashFlow: number;
  endBalance: number;
  cumulativeWithdrawn: number;
  effectiveRatePct: number;
  milestoneHit?: string | null;
}

export interface GenieMilestoneItem {
  label: string;
  target: number;
  hitPeriod: number | null;
  hitDate: string | null;
}

export interface GenieCompResult {
  rows: GenieCompRow[];
  summary: {
    finalBalance: number;
    totalWithdrawn: number;
    totalNetWealth: number;
    netProfit: number;
    goalReached: boolean;
    estPeriodsToGoal: number | null;
    projectedGoalDate: string | null;
    progressPct: number;
    nextRecommendedStake: number;
    effectiveDailyEvPct: number;
    edgeStatus: 'POSITIVE' | 'BREAKEVEN' | 'NEGATIVE';
    milestones: GenieMilestoneItem[];
  };
}

export const DEFAULT_GENIE_COMP_CONFIG: GenieCompConfig = {
  mode: 'NK_PLAN',
  currency: 'USD',
  startingCapital: 100,
  totalTrades: 8,
  winsNeeded: 2,
  minStake: 1.0,
  targetGoal: 1000,
  dailyTargetPct: 10,
  horizonDays: 25,
  activeDays: 'ALL_7',
  reinvestPct: 80,
  payoutPct: 92,
  riskPerTradePct: 3,
  useWinRateDrag: true,
  winRatePct: 72,
  tradesPerDay: 6,
  useTierRates: true,
  tier1Limit: 500,
  tier2Limit: 2500,
  tier2RatePct: 6,
  tier3RatePct: 3,
  cashFlowType: 'NONE',
  cashFlowAmount: 0,
  cashFlowFreq: 'WEEKLY',
};

export function formatCompMoney(value: number, currency: CurrencyCode = 'USD'): string {
  const sym = CURRENCY_META[currency]?.symbol || '$';
  if (!Number.isFinite(value)) return `${sym}0.00`;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${sym}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Combinatorial Dynamic Programming Solver for (N Trades / K Wins) Staking
 */
function buildDPTables(N: number, K: number, payoutMult: number) {
  const memo: number[][] = Array.from({ length: N + 2 }, () => Array(K + 2).fill(-1));

  function dp(t: number, w: number): number {
    if (w >= K) return 1.0;
    if (K - w === N - t) return Math.pow(payoutMult, N - t);
    if (K - w > N - t) return Infinity;
    if (memo[t][w] !== -1) return memo[t][w];

    const nl = dp(t + 1, w);
    const nw = dp(t + 1, w + 1);
    let val = Infinity;
    if (Number.isFinite(nl) && Number.isFinite(nw)) {
      val = (payoutMult * nl * nw) / (nl + (payoutMult - 1) * nw);
    }
    memo[t][w] = val;
    return val;
  }

  function frac(t: number, w: number): number {
    if (w >= K || t >= N) return 0;
    const nl = dp(t + 1, w);
    const nw = dp(t + 1, w + 1);
    if (!Number.isFinite(nw)) return 0;
    if (!Number.isFinite(nl)) return 1.0;
    return Math.max(0, Math.min(1, 1 - (payoutMult * nw) / (nl + (payoutMult - 1) * nw)));
  }

  return { dp, frac };
}

/**
 * Find the safest largest N trades for a given Capital, Wins Needed (K), Payout%, and Broker Min Stake.
 */
export function findBestTradesForCapital(
  capital: number,
  winsNeeded: number,
  payoutPct: number,
  minStake: number = 1.0
): { bestN: number; firstStake: number; targetProfit: number; gainPct: number } {
  const safeCap = Math.max(1, capital);
  const K = Math.max(1, Math.min(6, Math.round(winsNeeded)));
  const pm = 1 + Math.max(0.1, Math.min(1.0, payoutPct / 100));

  let bestN = Math.max(2, K + 1);
  let bestFirst = safeCap;
  let bestMult = 1;

  for (let N = K + 1; N <= 16; N++) {
    const { dp, frac } = buildDPTables(N, K, pm);
    const f = frac(0, 0);
    const s1 = f * safeCap;
    const mult = dp(0, 0);
    if (s1 >= minStake && Number.isFinite(mult)) {
      bestN = N;
      bestFirst = s1;
      bestMult = mult;
    } else if (N > K + 1) {
      break;
    }
  }

  if (bestMult <= 1) {
    const { dp, frac } = buildDPTables(bestN, K, pm);
    bestMult = dp(0, 0);
    bestFirst = frac(0, 0) * safeCap;
  }

  const targetProfit = Number((safeCap * (bestMult - 1)).toFixed(2));
  const gainPct = Number(((bestMult - 1) * 100).toFixed(2));
  return {
    bestN,
    firstStake: Number(bestFirst.toFixed(2)),
    targetProfit,
    gainPct,
  };
}

/**
 * Real-Time Amount-Adaptive Combinatorial N/K Calculator
 */
export function calculateNKSessionPlan(
  config: NKPlanConfig,
  tradesDone: number = 0,
  winsAchieved: number = 0,
  sessionNetPnL: number = 0
): NKPlanResult {
  const cap = Math.max(1, Number(config.capital) || 100);
  const N = Math.max(2, Math.min(20, Math.round(config.totalTrades || 8)));
  const K = Math.max(1, Math.min(N - 1, Math.round(config.winsNeeded || 2)));
  const payRate = Math.max(0.1, Math.min(1.0, (Number(config.payoutPct) || 92) / 100));
  const pm = 1 + payRate;
  const minStake = Math.max(1.0, Number(config.minStake) || 1.0);

  const { dp, frac } = buildDPTables(N, K, pm);
  const targetMult = Number.isFinite(dp(0, 0)) ? dp(0, 0) : 1;
  const targetCapital = Number((cap * targetMult).toFixed(2));
  const targetProfit = Number((targetCapital - cap).toFixed(2));
  const targetGainPct = Number(((targetMult - 1) * 100).toFixed(2));
  const rawFirstStake = Number((frac(0, 0) * cap).toFixed(2));
  const fitsMinStake = rawFirstStake >= minStake;

  const autoFit = findBestTradesForCapital(cap, K, config.payoutPct, minStake);
  const currentBalance = Number(Math.max(0, cap + sessionNetPnL).toFixed(2));

  // Simulate worst-case loss sequence from trade 1 .. (N - K + 1)
  const maxSteps = Math.max(1, N - K + 1);
  const schedule: NKScheduleRow[] = [];
  let simBal = cap;
  let coverableSteps = 0;

  for (let i = 0; i < maxSteps; i++) {
    const f = frac(i, 0);
    const rawS = f * simBal;
    const stepStake = Math.min(simBal, Math.max(minStake, Number(rawS.toFixed(2))));
    const fitsBal = simBal >= minStake && stepStake <= simBal + 0.01;
    if (fitsBal) coverableSteps++;

    const profitIfWin = Number((stepStake * payRate).toFixed(2));
    const balAfterLoss = Number(Math.max(0, simBal - stepStake).toFixed(2));

    schedule.push({
      tradeIndex: i + 1,
      stake: Number(stepStake.toFixed(2)),
      balanceBefore: Number(simBal.toFixed(2)),
      profitIfWin,
      balanceAfterLoss: balAfterLoss,
      fitsMinStake: rawS >= minStake,
      fitsBalance: fitsBal,
    });
    simBal = balAfterLoss;
    if (simBal <= 0) break;
  }

  const winsRemaining = Math.max(0, K - winsAchieved);
  const tradesLeft = Math.max(0, N - tradesDone);

  let status: NKPlanResult['status'] = 'ACTIVE';
  if (winsRemaining <= 0 || (targetProfit > 0.05 && currentBalance >= targetCapital - 0.02)) {
    status = 'GOAL_WON';
  } else if (winsRemaining > tradesLeft || currentBalance < minStake) {
    status = 'BUSTED';
  }

  let nextStake = Math.min(currentBalance, Math.max(minStake, rawFirstStake));
  let ifWinNextStake = 0;
  let ifLossNextStake = 0;

  if (status === 'ACTIVE') {
    const curFrac = frac(tradesDone, winsAchieved);
    nextStake = Math.min(currentBalance, Math.max(minStake, Number((curFrac * currentBalance).toFixed(2))));

    const winBal = currentBalance + nextStake * payRate;
    const winW = winsAchieved + 1;
    const winT = tradesDone + 1;
    if (winW < K && winT < N) {
      const wf = frac(winT, winW);
      ifWinNextStake = Math.min(winBal, Math.max(minStake, Number((wf * winBal).toFixed(2))));
    }

    const lossBal = Math.max(0, currentBalance - nextStake);
    const lossT = tradesDone + 1;
    if (K - winsAchieved <= N - lossT && lossBal >= minStake) {
      const lf = frac(lossT, winsAchieved);
      ifLossNextStake = Math.min(lossBal, Math.max(minStake, Number((lf * lossBal).toFixed(2))));
    }
  } else if (status === 'GOAL_WON') {
    nextStake = Math.min(currentBalance, Math.max(minStake, rawFirstStake));
  }

  return {
    status,
    nextStake: Number(nextStake.toFixed(2)),
    rawFirstStake,
    ifWinNextStake: Number(ifWinNextStake.toFixed(2)),
    ifLossNextStake: Number(ifLossNextStake.toFixed(2)),
    currentBalance,
    targetCapital,
    targetProfit,
    targetGainPct,
    tradesDone,
    tradesLeft,
    winsAchieved,
    winsRemaining,
    fitsMinStake,
    bestFitTrades: autoFit.bestN,
    bestFitProfit: autoFit.targetProfit,
    bestFitGainPct: autoFit.gainPct,
    coverableSteps,
    schedule,
  };
}

function advanceTradingDate(date: Date, filter: ActiveTradingDays): Date {
  const next = new Date(date.getTime());
  for (let guard = 0; guard < 10; guard++) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (filter === 'ALL_7') return next;
    if (filter === 'MON_FRI' && day >= 1 && day <= 5) return next;
    if (filter === 'WEEKENDS' && (day === 0 || day === 6)) return next;
  }
  return next;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Daily Compounding Projection Engine
 */
export function calculateDailyPlan(
  cfg: GenieCompConfig,
  liveCapitalBalance: number | null = null
): GenieCompResult {
  const capital = Math.max(1, Number(cfg.startingCapital) || 100);
  const goal = Math.max(capital + 1, Number(cfg.targetGoal) || capital * 5);
  const payout = Math.max(0.1, Math.min(1.0, (Number(cfg.payoutPct) || 92) / 100));
  const reinvestRatio = Math.min(1, Math.max(0, (Number(cfg.reinvestPct) || 0) / 100));
  const winProb = Math.min(0.99, Math.max(0.05, (Number(cfg.winRatePct) || 72) / 100));
  const riskPct = Math.max(0.25, Math.min(50, Number(cfg.riskPerTradePct) || 3));
  const tradesDay = Math.max(1, Math.min(50, Math.round(cfg.tradesPerDay || 6)));

  const perTradeEv = winProb * payout - (1 - winProb);
  const evDailyPct = tradesDay * riskPct * perTradeEv;
  const edgeStatus: 'POSITIVE' | 'BREAKEVEN' | 'NEGATIVE' =
    perTradeEv > 0.01 ? 'POSITIVE' : perTradeEv < -0.01 ? 'NEGATIVE' : 'BREAKEVEN';

  const milestoneDefs = [
    { label: '25% Goal', target: capital + (goal - capital) * 0.25 },
    { label: '50% Goal', target: capital + (goal - capital) * 0.50 },
    { label: '2x Capital', target: capital * 2 },
    { label: '100% Goal', target: goal },
  ];
  const milestoneHits: Record<string, { hitPeriod: number | null; hitDate: string | null }> = {};
  for (const m of milestoneDefs) milestoneHits[m.label] = { hitPeriod: null, hitDate: null };

  const displayDays = Math.max(5, Math.min(120, Math.round(cfg.horizonDays || 25)));
  const rows: GenieCompRow[] = [];
  let bal = capital;
  let cumWithdrawn = 0;
  let cursor = new Date();
  let goalPeriod: number | null = null;
  let goalDate: string | null = null;

  const cfStep = cfg.cashFlowFreq === 'MONTHLY'
    ? (cfg.activeDays === 'MON_FRI' ? 22 : cfg.activeDays === 'WEEKENDS' ? 8 : 30)
    : (cfg.activeDays === 'MON_FRI' ? 5 : cfg.activeDays === 'WEEKENDS' ? 2 : 7);

  for (let day = 1; day <= 365; day++) {
    cursor = advanceTradingDate(cursor, cfg.activeDays);
    const dateStr = formatShortDate(cursor);
    const startBalance = bal;

    let activePct = Number(cfg.dailyTargetPct) || 10;
    if (cfg.useTierRates) {
      if (startBalance >= (cfg.tier2Limit || 2500)) activePct = Number(cfg.tier3RatePct) || 3;
      else if (startBalance >= (cfg.tier1Limit || 500)) activePct = Number(cfg.tier2RatePct) || 6;
    }
    const effectiveRatePct = cfg.useWinRateDrag ? Math.min(activePct, evDailyPct) : activePct;
    const grossProfit = Number((startBalance * (effectiveRatePct / 100)).toFixed(2));
    const positiveProfit = Math.max(0, grossProfit);
    const reinvested = grossProfit >= 0 ? Number((positiveProfit * reinvestRatio).toFixed(2)) : grossProfit;
    const withdrawn = grossProfit >= 0 ? Number((positiveProfit - reinvested).toFixed(2)) : 0;

    let cashFlow = 0;
    if (cfg.cashFlowType !== 'NONE' && cfg.cashFlowAmount > 0 && day % cfStep === 0) {
      cashFlow = cfg.cashFlowType === 'DEPOSIT' ? Number(cfg.cashFlowAmount) : -Number(cfg.cashFlowAmount);
    }

    cumWithdrawn = Number((cumWithdrawn + withdrawn).toFixed(2));
    const endBalance = Number(Math.max(0, startBalance + reinvested + cashFlow).toFixed(2));
    const recStake = Number(Math.max(1, (startBalance * riskPct) / 100).toFixed(2));

    let hitLabel: string | null = null;
    for (const m of milestoneDefs) {
      if (milestoneHits[m.label].hitPeriod === null && endBalance >= m.target) {
        milestoneHits[m.label] = { hitPeriod: day, hitDate: dateStr };
        hitLabel = m.label;
      }
    }
    if (goalPeriod === null && endBalance >= goal) {
      goalPeriod = day;
      goalDate = dateStr;
    }

    if (day <= displayDays) {
      rows.push({
        index: day,
        label: `Day ${day}`,
        dateStr,
        startBalance: Number(startBalance.toFixed(2)),
        stake: recStake,
        grossProfit,
        reinvested,
        withdrawn,
        cashFlow,
        endBalance,
        cumulativeWithdrawn: cumWithdrawn,
        effectiveRatePct: Number(effectiveRatePct.toFixed(2)),
        milestoneHit: hitLabel,
      });
    }

    bal = endBalance;
    if (day >= displayDays && goalPeriod !== null && day >= 90) break;
    if (bal <= 0) break;
  }

  const finalBalance = rows.length ? rows[rows.length - 1].endBalance : capital;
  const totalWithdrawn = rows.length ? rows[rows.length - 1].cumulativeWithdrawn : 0;
  const progressSource = liveCapitalBalance && liveCapitalBalance > 0 ? liveCapitalBalance : finalBalance;

  return {
    rows,
    summary: {
      finalBalance,
      totalWithdrawn,
      totalNetWealth: Number((finalBalance + totalWithdrawn).toFixed(2)),
      netProfit: Number((finalBalance + totalWithdrawn - capital).toFixed(2)),
      goalReached: goalPeriod !== null,
      estPeriodsToGoal: goalPeriod,
      projectedGoalDate: goalDate,
      progressPct: Math.min(100, Math.max(0, Math.round(((progressSource - capital) / (goal - capital)) * 100))),
      nextRecommendedStake: rows[0]?.stake || Math.max(1, Number(((capital * riskPct) / 100).toFixed(2))),
      effectiveDailyEvPct: Number(evDailyPct.toFixed(2)),
      edgeStatus,
      milestones: milestoneDefs.map((m) => ({
        label: m.label,
        target: Number(m.target.toFixed(2)),
        hitPeriod: milestoneHits[m.label].hitPeriod,
        hitDate: milestoneHits[m.label].hitDate,
      })),
    },
  };
}
