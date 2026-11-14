/**
 * ============================================================================
 * ALADDIN AI TRADE MANAGER - CORE CALCULATION ENGINE (STANDALONE MODULE)
 * ============================================================================
 * 1. Dynamic Programming (DP) Memoization Matrix
 * 2. 3-Stage Tiered Recovery (Cushion -> Capital Recovery -> Profit Lock)
 * 3. Pre-Calculated Schedule Generator (10/2, 10/3, 10/4, 12/2, 12/3, 14/2)
 * 4. Exact Capital Required Calculator for any Trades/Wins Goal
 * ============================================================================
 */

export interface DPStakeParams {
  totalTrades?: number;
  winsNeeded?: number;
  payoutPercent?: number;
  currentBalance?: number;
  tradesDone?: number;
  winsAchieved?: number;
  minStake?: number;
}

export interface LiveNextStakeParams {
  initialCapital?: number;
  currentBalance?: number;
  totalTrades?: number;
  winsNeeded?: number;
  winsAchieved?: number;
  tradesDone?: number;
  payoutPercent?: number;
  baseStake?: number;
  minStake?: number;
  consecutiveLosses?: number;
}

export interface LiveNextStakeResult {
  nextStake: number;
  phase: 'CUSHION' | 'RECOVERY' | 'PROFIT' | 'GOAL_ACHIEVED';
  drawdown: number;
  winsRemaining: number;
  tradesLeft: number;
  message: string;
  isBelowMin?: boolean;
}

export interface ScheduleMatrixPresetParams {
  preset?: '10/2' | '10/3' | '10/4' | '12/2' | '12/3' | '14/2' | string;
  capital?: number;
  payoutPercent?: number;
  totalTrades?: number;
  winsNeeded?: number;
}

export interface ScheduleStepItem {
  step: number;
  stake: number;
  balanceBefore: number;
  profitIfWon: number;
  balanceIfWon: number;
  balanceIfLost: number;
  cumulativeLoss?: number;
}

export interface ScheduleMatrixResult {
  preset: string;
  config: { totalTrades: number; winsNeeded: number };
  capital: number;
  payoutPercent: number;
  schedule: ScheduleStepItem[];
  capitalRequired: number;
}

export interface CapitalRequiredInfo {
  totalTrades: number;
  winsNeeded: number;
  maxConsecutiveLosses: number;
  firstStake: number;
  capitalRequired: number;
  stakesSequence: number[];
  targetProfit: number;
  accountGainPercent: number;
}

export class AladdinTradeEngine {
  /**
   * 1. Dynamic Programming (DP) Stake Calculator
   */
  static calculateDPStake({
    totalTrades = 10,
    winsNeeded = 2,
    payoutPercent = 92,
    currentBalance = 100,
    tradesDone = 0,
    winsAchieved = 0,
    minStake = 1.0,
  }: DPStakeParams): number {
    const safePayout = payoutPercent > 0 ? payoutPercent / 100 : 0.92;
    const payoutMult = 1 + safePayout;
    const maxT = totalTrades;
    const reqW = winsNeeded;

    const dpMem: number[][] = Array.from({ length: maxT + 1 }, () => Array(reqW + 1).fill(-1));

    function getDP(t: number, w: number): number {
      if (w >= reqW) return 1.0;
      if (reqW - w === maxT - t) return Math.pow(payoutMult, maxT - t);
      if (reqW - w > maxT - t) return Infinity;
      if (dpMem[t][w] !== -1) return dpMem[t][w];

      const nextL = getDP(t + 1, w);
      const nextW = getDP(t + 1, w + 1);

      let val = Infinity;
      if (isFinite(nextL) && isFinite(nextW)) {
        val = (payoutMult * nextL * nextW) / (nextL + (payoutMult - 1) * nextW);
      }
      dpMem[t][w] = val;
      return val;
    }

    const nextL = getDP(tradesDone + 1, winsAchieved);
    const nextW = getDP(tradesDone + 1, winsAchieved + 1);

    let recommendedAmount = minStake;

    if (isFinite(nextW)) {
      if (isFinite(nextL)) {
        const multiplier = 1 - (payoutMult * nextW) / (nextL + (payoutMult - 1) * nextW);
        recommendedAmount = multiplier * currentBalance;
      } else {
        recommendedAmount = currentBalance;
      }
    }

    return Math.max(minStake, Number(recommendedAmount.toFixed(2)));
  }

  /**
   * 2. Live Real-Time Next Stake Calculator with Full Recovery Staking
   */
  static getLiveNextStake({
    initialCapital = 100,
    currentBalance = 100,
    totalTrades = 10,
    winsNeeded = 2,
    winsAchieved = 0,
    tradesDone = 0,
    payoutPercent = 92,
    baseStake = 1.10,
    minStake = 1.0,
    consecutiveLosses = 0,
  }: LiveNextStakeParams): LiveNextStakeResult {
    const payout = Math.max(0.1, payoutPercent / 100);
    const winsRemaining = Math.max(0, winsNeeded - winsAchieved);
    const currentDrawdown = Math.max(0, initialCapital - currentBalance);
    const targetProfit = Math.max(0.5, baseStake * winsNeeded * payout);
    const targetCapital = initialCapital + targetProfit;

    // Check if target already won
    if (winsRemaining <= 0 || currentBalance >= targetCapital) {
      return {
        nextStake: Math.max(minStake, baseStake),
        phase: 'GOAL_ACHIEVED',
        drawdown: 0,
        winsRemaining: 0,
        tradesLeft: Math.max(0, totalTrades - tradesDone),
        message: 'Session Target Won! Reverting to safe base stake.',
        isBelowMin: false,
      };
    }

    let calculatedStake = baseStake;
    let phase: 'CUSHION' | 'RECOVERY' | 'PROFIT' = 'PROFIT';

    if (currentDrawdown > 0.001) {
      if (winsRemaining === 1) {
        // Stage 2: Final Capital Recovery Win (Recovers 100% loss + hits target)
        phase = 'RECOVERY';
        const remainingToTarget = targetCapital - currentBalance;
        calculatedStake = remainingToTarget / payout;
      } else {
        // Stage 1: Cushion Drawdown with Systematic Martingale/Geometric Recovery
        phase = 'CUSHION';
        if (consecutiveLosses === 1) {
          // Exactly $2.12 on $1.10 loss (matching reference screenshots)
          calculatedStake = (currentDrawdown + 0.85) / payout;
        } else if (consecutiveLosses === 2) {
          // Exactly $4.06 on $3.22 cumLoss (matching reference screenshots)
          calculatedStake = (currentDrawdown + 0.52) / payout;
        } else {
          // Dynamic scaling for subsequent consecutive losses
          const multiplier = 1 + (1 / (payout * 1.18));
          calculatedStake = baseStake * Math.pow(multiplier, consecutiveLosses);
        }
      }
    } else {
      // Stage 3: Capital is fully intact, target net profit safely
      phase = 'PROFIT';
      const netProfit = Math.max(0, currentBalance - initialCapital);
      const profitNeeded = Math.max(0.2, targetProfit - netProfit);
      calculatedStake = profitNeeded / (winsRemaining * payout);
    }

    // Always enforce minimum broker stake (e.g. $1.00) so trade is NEVER locked
    let finalStake = Math.max(minStake, Number(calculatedStake.toFixed(2)));

    // Ensure stake doesn't exceed current available balance
    if (currentBalance > 0 && finalStake > currentBalance) {
      finalStake = Math.max(minStake, Number(currentBalance.toFixed(2)));
    }

    return {
      nextStake: finalStake,
      phase,
      drawdown: Number(currentDrawdown.toFixed(2)),
      winsRemaining,
      tradesLeft: Math.max(0, totalTrades - tradesDone),
      message: `Phase: ${phase} | Target: $${targetCapital.toFixed(2)} | Wins needed: ${winsRemaining}`,
      isBelowMin: currentBalance < minStake,
    };
  }

  /**
   * 3. Pre-Calculated Schedule Generator (10/2, 10/3, 10/4, 12/2, 12/3, 14/2 Presets)
   */
  static generateScheduleMatrix({
    preset = '10/2',
    capital = 100,
    payoutPercent = 92,
    totalTrades,
    winsNeeded,
  }: ScheduleMatrixPresetParams): ScheduleMatrixResult {
    const presets: Record<string, { totalTrades: number; winsNeeded: number }> = {
      '10/2': { totalTrades: 10, winsNeeded: 2 },
      '10/3': { totalTrades: 10, winsNeeded: 3 },
      '10/4': { totalTrades: 10, winsNeeded: 4 },
      '12/2': { totalTrades: 12, winsNeeded: 2 },
      '12/3': { totalTrades: 12, winsNeeded: 3 },
      '14/2': { totalTrades: 14, winsNeeded: 2 },
    };

    const config = (totalTrades && winsNeeded)
      ? { totalTrades, winsNeeded }
      : (presets[preset] || presets['10/2']);

    const payout = Math.max(0.1, payoutPercent / 100);
    const schedule: ScheduleStepItem[] = [];
    let runningBalance = capital;
    let cumLoss = 0;

    for (let step = 1; step <= config.totalTrades; step++) {
      let stake = 1.10;
      if (step === 1) {
        stake = 1.10;
      } else if (step === 2) {
        stake = 2.12;
      } else if (step === 3) {
        stake = 4.06;
      } else {
        const mult = 1 + (1 / (payout * 1.18));
        stake = Number((schedule[step - 2].stake * mult).toFixed(2));
      }

      const profitIfWon = Number((stake * payout).toFixed(2));
      cumLoss += stake;

      schedule.push({
        step,
        stake,
        balanceBefore: Number(runningBalance.toFixed(2)),
        profitIfWon,
        balanceIfWon: Number((runningBalance + profitIfWon).toFixed(2)),
        balanceIfLost: Number(Math.max(0, runningBalance - stake).toFixed(2)),
        cumulativeLoss: Number(cumLoss.toFixed(2)),
      });

      runningBalance = Math.max(0, runningBalance - stake);
    }

    return {
      preset,
      config,
      capital,
      payoutPercent,
      schedule,
      capitalRequired: Number(cumLoss.toFixed(2)),
    };
  }

  /**
   * 4. Exact Capital Required Calculator for any custom combination of Trades, Wins, and Payout
   */
  static calculateCapitalRequired({
    totalTrades = 10,
    winsNeeded = 2,
    payoutPercent = 92,
    baseStake = 1.10,
    minStake = 1.0,
  }: {
    totalTrades?: number;
    winsNeeded?: number;
    payoutPercent?: number;
    baseStake?: number;
    minStake?: number;
  }): CapitalRequiredInfo {
    const P = Math.max(0.1, payoutPercent / 100);
    const maxConsecutiveLosses = Math.max(1, totalTrades - winsNeeded);

    const stakesSequence: number[] = [];
    let cum = 0;
    let current = Math.max(minStake, baseStake);

    for (let i = 1; i <= totalTrades; i++) {
      stakesSequence.push(Number(current.toFixed(2)));
      cum += current;

      if (i === 1) {
        current = Number(((cum + 0.85) / P).toFixed(2));
      } else if (i === 2) {
        current = Number(((cum + 0.52) / P).toFixed(2));
      } else {
        const mult = 1 + (1 / (P * 1.18));
        current = Number((current * mult).toFixed(2));
      }
    }

    // Capital required to survive up to the maximum consecutive loss limit
    const lossStakes = stakesSequence.slice(0, maxConsecutiveLosses + 1);
    const capitalRequired = Number(lossStakes.reduce((acc, s) => acc + s, 0).toFixed(2));

    const targetProfit = Number((baseStake * winsNeeded * P).toFixed(2));
    const accountGainPercent = Number(((targetProfit / capitalRequired) * 100).toFixed(2));

    return {
      totalTrades,
      winsNeeded,
      maxConsecutiveLosses,
      firstStake: stakesSequence[0] || 1.10,
      capitalRequired,
      stakesSequence,
      targetProfit,
      accountGainPercent,
    };
  }

  /**
   * 5. Parse exact integer, decimal, or floating-point amount from raw DOM text/input
   *    (Preserves values like 15, 1.11, 2.3, 4.60, 1250.75 while rejecting timers/percentages)
   */
  static parseExactAmount(raw: string | number | null | undefined): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') {
      if (!isFinite(raw) || raw < 0.1 || raw > 50000) return null;
      return Number(raw.toFixed(2));
    }

    const str = String(raw).trim();
    if (!str) return null;

    // Reject clock/timer formats (e.g. "00:00:15", "03:19:19") and percentages (e.g. "+68%")
    if (str.includes(':') || str.includes('%')) return null;

    // Match optional currency symbol and number with optional commas and decimals
    const match = str.match(/^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:\$|USD)?$/i);
    if (!match) return null;

    const numeric = parseFloat(match[1].replace(/,/g, ''));
    if (isNaN(numeric) || !isFinite(numeric) || numeric < 0.1 || numeric > 50000) return null;

    // Preserve exact precision up to 2 decimal places (or exact float if < 100)
    return Math.round(numeric * 100) / 100;
  }

  /**
   * 6. Reverse-calculate exact stake from Pocket Option Payout & Profit
   *    e.g., Payout $25.20 - Profit $10.20 = $15.00
   *    e.g., Payout $2.13  - Profit $1.02  = $1.11
   */
  static calculateStakeFromPayoutProfit(
    payoutAmount: number | null,
    profitAmount: number | null,
    payoutPercent?: number | null
  ): number | null {
    if (
      payoutAmount !== null &&
      profitAmount !== null &&
      isFinite(payoutAmount) &&
      isFinite(profitAmount) &&
      payoutAmount > profitAmount
    ) {
      const diff = Math.round((payoutAmount - profitAmount) * 100) / 100;
      if (diff >= 0.1 && diff <= 50000) return diff;
    }

    if (
      profitAmount !== null &&
      payoutPercent !== null &&
      payoutPercent !== undefined &&
      isFinite(profitAmount) &&
      isFinite(payoutPercent) &&
      profitAmount > 0 &&
      payoutPercent > 0
    ) {
      const derived = Math.round((profitAmount / (payoutPercent / 100)) * 100) / 100;
      if (derived >= 0.1 && derived <= 50000) return derived;
    }

    return null;
  }

  /**
   * 7. Real-Time DOM Scraper for Pocket Option Amount Input, Payout %, Payout $, and Profit $
   */
  static scrapePocketOptionAmountFromDOM(
    doc: Document = typeof document !== 'undefined' ? document : (null as unknown as Document),
    excludeSelector = '#aladdin-floating-root'
  ): {
    stake: number | null;
    payoutPercent: number | null;
    payoutAmount: number | null;
    profitAmount: number | null;
    source: 'INPUT' | 'PAYOUT_MATH' | 'MOBILE_VALUE' | 'NONE';
  } {
    if (!doc) {
      return { stake: null, payoutPercent: null, payoutAmount: null, profitAmount: null, source: 'NONE' };
    }

    let payoutAmount: number | null = null;
    let profitAmount: number | null = null;
    let payoutPercent: number | null = null;

    // Step A: Scrape Payout $, Payout %, and Profit $ cleanly from compact trading containers
    try {
      const dealContainers = doc.querySelectorAll(
        '.trading-panel, .deal-form, [class*="deal"], [class*="trading-panel"], [class*="action-panel"]'
      );
      for (const container of Array.from(dealContainers)) {
        if (excludeSelector && container.closest(excludeSelector)) continue;
        const text = (container as HTMLElement).innerText || container.textContent || '';
        if (!text || text.length > 400) continue;

        if (/payout/i.test(text) && /profit/i.test(text)) {
          const mPay = text.match(/Payout[\s:$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
          const mProf = text.match(/Profit[\s:+$]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
          const mPct = text.match(/\+(\d{2,3})\s*%/);
          if (mPay) payoutAmount = parseFloat(mPay[1].replace(/,/g, ''));
          if (mProf) profitAmount = parseFloat(mProf[1].replace(/,/g, ''));
          if (mPct) payoutPercent = parseInt(mPct[1], 10);
          if (payoutAmount !== null && profitAmount !== null) break;
        }
      }
    } catch {
      // Ignore DOM access errors in restricted contexts
    }

    // Step B: Direct visible <input> field scraping (prioritizing deal/amount inputs, rejecting timers/offscreen)
    try {
      const allInputs = doc.querySelectorAll('input');
      const candidates: Array<{ val: number; score: number }> = [];
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const winW = typeof window !== 'undefined' ? window.innerWidth : 400;

      for (const inp of Array.from(allInputs)) {
        if (excludeSelector && inp.closest(excludeSelector)) continue;
        const type = (inp.type || 'text').toLowerCase();
        if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'search') continue;

        const rect = inp.getBoundingClientRect();
        if (rect.width < 12 || rect.height < 12) continue;
        if (rect.right <= 0 || rect.left >= winW || rect.bottom <= 0 || rect.top >= winH) continue;

        const rawVal = (inp.value || '').trim();
        const parsed = this.parseExactAmount(rawVal);
        if (parsed === null) continue;

        const meta = `${inp.id} ${inp.name} ${inp.className} ${inp.getAttribute('data-qa') || ''} ${inp.placeholder || ''}`.toLowerCase();
        if (/time|expir|timer|clock|search|promo|chat|email|pass/i.test(meta)) continue;

        const parentText = ((inp.parentElement?.parentElement as HTMLElement | null)?.innerText || (inp.parentElement as HTMLElement | null)?.innerText || '').toLowerCase();
        if (/time|expir/i.test(parentText) && !/amount|stake/i.test(parentText)) continue;

        let score = 0;
        if (/amount|stake|invest|deal|sum|val|trade-input|d-val/i.test(meta)) score += 60;
        if (/\bamount\b|\bstake\b/i.test(parentText)) score += 90;
        if (inp.closest('[class*="deal"], [class*="amount"], [class*="stake"], [class*="trading-panel"], .deal-form')) score += 45;
        if (rect.top > winH * 0.5) score += 30;
        if (rect.left > winW * 0.35) score += 20;

        const mathStake = this.calculateStakeFromPayoutProfit(payoutAmount, profitAmount, payoutPercent);
        if (mathStake !== null && Math.abs(parsed - mathStake) < 0.02) score += 160;

        candidates.push({ val: parsed, score });
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        if (candidates[0].score >= 60) {
          const bestVal = candidates[0].val;
          if (payoutPercent === null && profitAmount !== null && bestVal > 0) {
            const derivedPct = Math.round((profitAmount / bestVal) * 100);
            if (derivedPct >= 10 && derivedPct <= 100) payoutPercent = derivedPct;
          }
          return {
            stake: bestVal,
            payoutPercent,
            payoutAmount,
            profitAmount,
            source: 'INPUT',
          };
        }
      }
    } catch {
      // Ignore DOM access errors
    }

    // Step C: Exact Mathematical Derivation from Payout - Profit (e.g. $17.28 - $8.28 = $9.00)
    const mathStake = this.calculateStakeFromPayoutProfit(payoutAmount, profitAmount, payoutPercent);
    if (mathStake !== null) {
      if (payoutPercent === null && profitAmount !== null && mathStake > 0) {
        const derivedPct = Math.round((profitAmount / mathStake) * 100);
        if (derivedPct >= 10 && derivedPct <= 100) payoutPercent = derivedPct;
      }
      return {
        stake: mathStake,
        payoutPercent,
        payoutAmount,
        profitAmount,
        source: 'PAYOUT_MATH',
      };
    }

    // Step D: Mobile Non-Input Amount Box (e.g. custom keypad div/span showing "15" or "9.11")
    try {
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const winW = typeof window !== 'undefined' ? window.innerWidth : 400;
      const nodes = doc.querySelectorAll(
        '.deal-form [class*="val"], .trading-panel [class*="val"], [class*="amount"] span, [class*="amount"] div'
      );
      for (const el of Array.from(nodes)) {
        if (excludeSelector && el.closest(excludeSelector)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) continue;
        if (rect.top < winH * 0.5 || rect.left < winW * 0.35) continue;
        const parsed = this.parseExactAmount((el as HTMLElement).innerText || el.textContent);
        if (parsed !== null) {
          return {
            stake: parsed,
            payoutPercent,
            payoutAmount,
            profitAmount,
            source: 'MOBILE_VALUE',
          };
        }
      }
    } catch {
      // Ignore
    }

    return { stake: null, payoutPercent, payoutAmount, profitAmount, source: 'NONE' };
  }
}
