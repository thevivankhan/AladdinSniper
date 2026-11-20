import {
  CurrencyCode,
  CURRENCIES,
  DailyCompoundingInputs,
  DailyScheduleRow,
  StepCompoundingInputs,
  StepScheduleRow,
  MilestoneItem,
  GoalFeasibility,
  ActiveDaysMap,
  ReturnTier
} from '../types/calculator';

/**
 * Formats a numeric amount into local currency string with symbol
 */
export const formatCurrency = (
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  decimals: number = 2
): string => {
  const curr = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // For high precision / large numbers
  if (absAmount >= 1_000_000_000) {
    formattedNumber = (absAmount / 1_000_000_000).toFixed(2) + 'B';
  } else if (absAmount >= 10_000_000) {
    formattedNumber = (absAmount / 1_000_000).toFixed(2) + 'M';
  }

  const sign = isNegative ? '-' : '';
  return `${sign}${curr.symbol}${formattedNumber}`;
};

/**
 * Checks if a JavaScript Date falls on an active trading day
 */
export const isDayActive = (date: Date, activeDays: ActiveDaysMap): boolean => {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  switch (day) {
    case 0:
      return activeDays.sun;
    case 1:
      return activeDays.mon;
    case 2:
      return activeDays.tue;
    case 3:
      return activeDays.wed;
    case 4:
      return activeDays.thu;
    case 5:
      return activeDays.fri;
    case 6:
      return activeDays.sat;
    default:
      return false;
  }
};

/**
 * Calculates Expected Value (EV) and Risk Drag from win rate & loss multiplier
 */
export const calculateRiskDragEV = (
  winRatePercent: number,
  brokerPayoutPercent: number,
  riskPerTradePercent: number,
  lossDragMultiplier: number,
  tradesPerDay: number
) => {
  const W = Math.max(0, Math.min(100, winRatePercent)) / 100;
  const P = brokerPayoutPercent / 100;
  const R = riskPerTradePercent / 100;
  const L = Math.max(0.5, lossDragMultiplier);

  // Per trade profit when win = R * P
  // Per trade loss when loss = R * L
  const expectedReturnPerTrade = W * (R * P) - (1 - W) * (R * L);
  const netDailyReturnPercent = tradesPerDay * expectedReturnPerTrade * 100;

  // Probability of losing session (binomial distribution approximation for N trades)
  const breakEvenWinRate = (L / (P + L)) * 100;
  const edgeMargin = winRatePercent - breakEvenWinRate;

  return {
    netDailyReturnPercent: Number(netDailyReturnPercent.toFixed(3)),
    breakEvenWinRate: Number(breakEvenWinRate.toFixed(1)),
    edgeMargin: Number(edgeMargin.toFixed(1)),
    expectedReturnPerTradePercent: Number((expectedReturnPerTrade * 100).toFixed(3)),
  };
};

/**
 * Find tier matching current balance
 */
export const getActiveTier = (balance: number, tiers: ReturnTier[]): ReturnTier | null => {
  if (!tiers || tiers.length === 0) return null;
  for (const tier of tiers) {
    if (balance >= tier.minBalance && (tier.maxBalance === null || balance < tier.maxBalance)) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
};

/**
 * Simulates Daily Compounding with profit split, active days, tiers, and cash flow
 */
export const calculateDailyCompoundingSchedule = (
  inputs: DailyCompoundingInputs
): {
  rows: DailyScheduleRow[];
  finalBalance: number;
  totalWithdrawn: number;
  totalProfit: number;
  totalNetWorth: number;
  milestones: MilestoneItem[];
} => {
  const rows: DailyScheduleRow[] = [];
  let currentBalance = Math.max(0.01, inputs.startingCapital);
  let cumulativeProfit = 0;
  let cumulativeWithdrawn = 0;

  const startDate = new Date(inputs.startDate || new Date().toISOString().slice(0, 10));
  // Set to midnight UTC to prevent time zone shifts
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const tradesPerDay = inputs.riskModel.sessionsPerDay * inputs.riskModel.tradesPerSession;
  const riskDrag = calculateRiskDragEV(
    inputs.riskModel.winRatePercent,
    inputs.riskModel.brokerPayoutPercent,
    inputs.riskModel.riskPerTradePercent,
    inputs.riskModel.lossDragMultiplier,
    tradesPerDay
  );

  // Initialize milestone tracking targets
  const initialCap = inputs.startingCapital;
  const milestones: MilestoneItem[] = [
    { id: '1x_banked', label: '100% Risk Free (Initial Capital Banked)', multiplier: 1, targetAmount: initialCap, projectedIndex: null, achieved: false },
    { id: '2x', label: '2x Double Up', multiplier: 2, targetAmount: initialCap * 2, projectedIndex: null, achieved: false },
    { id: '3x', label: '3x Expansion', multiplier: 3, targetAmount: initialCap * 3, projectedIndex: null, achieved: false },
    { id: '5x', label: '5x Multiplier', multiplier: 5, targetAmount: initialCap * 5, projectedIndex: null, achieved: false },
    { id: '10x', label: '10x Elite Club', multiplier: 10, targetAmount: initialCap * 10, projectedIndex: null, achieved: false },
    { id: 'custom_goal', label: `Target Goal (${formatCurrency(inputs.targetGoal, inputs.currency)})`, multiplier: inputs.targetGoal / initialCap, targetAmount: inputs.targetGoal, projectedIndex: null, achieved: false },
  ];

  let tradingDayCounter = 0;
  let safetyLoopCounter = 0;
  const MAX_DAYS_SCAN = 365 * 4; // max 4 years safety limit

  while (tradingDayCounter < inputs.daysCount && safetyLoopCounter < MAX_DAYS_SCAN) {
    safetyLoopCounter++;

    // Check if currentDate is an active trading day
    if (isDayActive(currentDate, inputs.activeDays)) {
      tradingDayCounter++;

      const startBal = currentBalance;

      // Determine return rate
      let effectiveRate = inputs.dailyReturnRate;
      let tierName: string | undefined = undefined;

      if (inputs.riskModel.enabled) {
        if (inputs.riskModel.enableTieredReturns && inputs.riskModel.tiers.length > 0) {
          const matchedTier = getActiveTier(startBal, inputs.riskModel.tiers);
          if (matchedTier) {
            effectiveRate = matchedTier.returnRate;
            tierName = matchedTier.name;
          }
        } else if (inputs.riskModel.useCalculatedDailyReturn) {
          effectiveRate = riskDrag.netDailyReturnPercent;
        }
      }

      // Calculate gross profit
      const grossProfit = startBal * (effectiveRate / 100);
      const reinvestRatio = Math.max(0, Math.min(100, inputs.reinvestmentPercent)) / 100;
      
      let reinvested = 0;
      let withdrawn = 0;

      if (grossProfit >= 0) {
        reinvested = grossProfit * reinvestRatio;
        withdrawn = grossProfit * (1 - reinvestRatio);
      } else {
        // In case of negative EV drag
        reinvested = grossProfit;
        withdrawn = 0;
      }

      // Check recurring cash flow
      let cashFlowAmount = 0;
      if (inputs.riskModel.enabled && inputs.riskModel.cashFlow.enabled && inputs.riskModel.cashFlow.amount > 0) {
        const cf = inputs.riskModel.cashFlow;
        let isEligibleDay = false;

        if (cf.frequency === 'daily') {
          isEligibleDay = true;
        } else if (cf.frequency === 'weekly' && tradingDayCounter % 5 === 0) {
          isEligibleDay = true;
        } else if (cf.frequency === 'biweekly' && tradingDayCounter % 10 === 0) {
          isEligibleDay = true;
        } else if (cf.frequency === 'monthly' && tradingDayCounter % 20 === 0) {
          isEligibleDay = true;
        }

        if (isEligibleDay) {
          cashFlowAmount = cf.type === 'deposit' ? cf.amount : -cf.amount;
        }
      }

      const endBal = Math.max(0, startBal + reinvested + cashFlowAmount);
      cumulativeProfit += grossProfit;
      cumulativeWithdrawn += withdrawn;
      currentBalance = endBal;
      const totalNetWorth = endBal + cumulativeWithdrawn;

      const dateStr = currentDate.toISOString().slice(0, 10);
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
      const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

      // Check milestones
      let milestoneHit: string | undefined = undefined;
      milestones.forEach((m) => {
        if (m.projectedIndex === null) {
          if (m.id === '1x_banked') {
            if (cumulativeWithdrawn >= m.targetAmount) {
              m.projectedIndex = tradingDayCounter;
              m.projectedDate = formattedDate;
              milestoneHit = m.label;
            }
          } else if (totalNetWorth >= m.targetAmount || endBal >= m.targetAmount) {
            m.projectedIndex = tradingDayCounter;
            m.projectedDate = formattedDate;
            milestoneHit = m.label;
          }
        }
      });

      rows.push({
        dayIndex: tradingDayCounter,
        calendarDate: dateStr,
        formattedDate,
        dayOfWeek,
        startBalance: startBal,
        effectiveReturnRate: effectiveRate,
        grossProfit,
        reinvestedProfit: reinvested,
        withdrawnProfit: withdrawn,
        cashFlowAmount,
        endBalance: endBal,
        cumulativeProfit,
        cumulativeWithdrawn,
        totalNetWorth,
        tierName,
        milestoneHit,
      });
    }

    // Advance calendar by 1 day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    rows,
    finalBalance: currentBalance,
    totalWithdrawn: cumulativeWithdrawn,
    totalProfit: cumulativeProfit,
    totalNetWorth: currentBalance + cumulativeWithdrawn,
    milestones,
  };
};

/**
 * Simulates Steps / Consecutive Wins Mode (Binary Options & Sniper Compounding)
 */
export const calculateStepCompoundingSchedule = (
  inputs: StepCompoundingInputs
): {
  rows: StepScheduleRow[];
  finalBalance: number;
  totalProfit: number;
  totalLocked: number;
  totalValue: number;
  milestones: MilestoneItem[];
} => {
  const rows: StepScheduleRow[] = [];
  const payoutRatio = inputs.payoutRatePercent / 100;
  const initialCap = inputs.startingCapital;
  let currentBalance = initialCap;
  let cumulativeProfit = 0;
  let cumulativeLocked = 0;

  const phaseLength = Math.max(1, inputs.phaseLength || 3);

  const milestones: MilestoneItem[] = [
    { id: '2x', label: '2x Double Up', multiplier: 2, targetAmount: initialCap * 2, projectedIndex: null, achieved: false },
    { id: '5x', label: '5x Multiplier', multiplier: 5, targetAmount: initialCap * 5, projectedIndex: null, achieved: false },
    { id: '10x', label: '10x Multiplier', multiplier: 10, targetAmount: initialCap * 10, projectedIndex: null, achieved: false },
    { id: '25x', label: '25x Zenith', multiplier: 25, targetAmount: initialCap * 25, projectedIndex: null, achieved: false },
    { id: 'custom_goal', label: `Target Goal (${formatCurrency(inputs.targetGoal, inputs.currency)})`, multiplier: inputs.targetGoal / initialCap, targetAmount: inputs.targetGoal, projectedIndex: null, achieved: false },
  ];

  let currentStake = initialCap;

  for (let i = 1; i <= inputs.stepsCount; i++) {
    const phaseIndex = Math.floor((i - 1) / phaseLength) + 1;
    const stepInPhase = ((i - 1) % phaseLength) + 1;
    const isPhaseEnd = stepInPhase === phaseLength;

    const startCapital = currentBalance;
    let stake = currentStake;

    if (inputs.customStakes && inputs.customStakes[i - 1] !== undefined) {
      stake = inputs.customStakes[i - 1];
    }

    const payoutAmount = stake * (1 + payoutRatio);
    const grossProfit = stake * payoutRatio;

    let reinvested = grossProfit;
    let locked = 0;

    if (inputs.compoundingType === 'profit_split') {
      const splitRatio = Math.max(0, Math.min(100, inputs.reinvestmentPercent)) / 100;
      reinvested = grossProfit * splitRatio;
      locked = grossProfit * (1 - splitRatio);
    } else if (inputs.compoundingType === 'phases') {
      if (isPhaseEnd && inputs.lockProfitAtPhaseEnd) {
        // Lock 50% or excess of the phase profit
        locked = (stake + grossProfit) * 0.5;
        reinvested = (stake + grossProfit) - locked;
      } else {
        reinvested = stake + grossProfit;
        locked = 0;
      }
    } else if (inputs.compoundingType === 'all_in') {
      reinvested = stake + grossProfit;
      locked = 0;
    }

    cumulativeProfit += grossProfit;
    cumulativeLocked += locked;

    let endBalance = 0;
    if (inputs.compoundingType === 'all_in') {
      endBalance = payoutAmount;
      currentStake = payoutAmount;
      currentBalance = payoutAmount;
    } else if (inputs.compoundingType === 'phases') {
      if (isPhaseEnd && inputs.lockProfitAtPhaseEnd) {
        endBalance = reinvested;
        // For next phase, start stake is reset or scaled
        currentStake = Math.max(initialCap, reinvested * 0.2);
        currentBalance = reinvested;
      } else {
        endBalance = payoutAmount;
        currentStake = payoutAmount;
        currentBalance = payoutAmount;
      }
    } else {
      endBalance = startCapital + reinvested;
      currentBalance = endBalance;
      currentStake = endBalance;
    }

    const totalVal = endBalance + cumulativeLocked;

    // Check milestones
    let milestoneHit: string | undefined = undefined;
    milestones.forEach((m) => {
      if (m.projectedIndex === null && totalVal >= m.targetAmount) {
        m.projectedIndex = i;
        milestoneHit = m.label;
      }
    });

    rows.push({
      stepIndex: i,
      phaseIndex,
      stepInPhase,
      startCapital,
      stakeAmount: stake,
      payoutAmount,
      grossProfit,
      reinvestedAmount: reinvested,
      lockedProfit: locked,
      endBalance,
      cumulativeProfit,
      cumulativeLocked,
      totalValue: totalVal,
      isPhaseTarget: isPhaseEnd,
      milestoneHit,
    });
  }

  return {
    rows,
    finalBalance: currentBalance,
    totalProfit: cumulativeProfit,
    totalLocked: cumulativeLocked,
    totalValue: currentBalance + cumulativeLocked,
    milestones,
  };
};

/**
 * Projects timeline & days needed to reach goal
 */
export const calculateGoalProjection = (
  startingCapital: number,
  targetGoal: number,
  dailyReturnRate: number,
  reinvestmentPercent: number,
  activeDays: ActiveDaysMap,
  startDateStr: string = new Date().toISOString().slice(0, 10),
  targetDaysInput: number = 60
): GoalFeasibility => {
  const S = Math.max(1, startingCapital);
  const G = Math.max(S + 1, targetGoal);
  const r = Math.max(0.001, (dailyReturnRate * (reinvestmentPercent / 100)) / 100);

  // G = S * (1 + r)^n  => n = ln(G / S) / ln(1 + r)
  const theoreticalDays = Math.ceil(Math.log(G / S) / Math.log(1 + r));

  // Determine calendar date by skipping non-trading days
  let calendarDateStr: string | null = null;
  if (theoreticalDays > 0 && theoreticalDays <= 1500) {
    const curDate = new Date(startDateStr);
    let counted = 0;
    while (counted < theoreticalDays) {
      if (isDayActive(curDate, activeDays)) {
        counted++;
      }
      if (counted < theoreticalDays) {
        curDate.setDate(curDate.getDate() + 1);
      }
    }
    calendarDateStr = curDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Required daily net return to achieve goal in targetDaysInput
  // (1 + r)^N = G/S  =>  r = (G/S)^(1/N) - 1
  const requiredRate = (Math.pow(G / S, 1 / Math.max(1, targetDaysInput)) - 1) * 100;

  // Feasibility & Risk analysis
  let riskRating: GoalFeasibility['riskRating'] = 'BALANCED';
  let riskScore = 45;
  const recommendations: string[] = [];

  if (dailyReturnRate < 2) {
    riskRating = 'CONSERVATIVE';
    riskScore = 20;
    recommendations.push('Low volatility, capital preservation focus.');
    recommendations.push('Ideal for large capital portfolios and institutional risk.');
  } else if (dailyReturnRate <= 4) {
    riskRating = 'BALANCED';
    riskScore = 45;
    recommendations.push('Solid consistent compounding with sustainable drawdown limits.');
    recommendations.push('Protect psychological equilibrium with strict 2-session daily caps.');
  } else if (dailyReturnRate <= 8) {
    riskRating = 'AGGRESSIVE';
    riskScore = 75;
    recommendations.push('High daily velocity required; requires disciplined stop-loss rules.');
    recommendations.push('Bank at least 30% profits into the vault to de-risk original capital.');
  } else {
    riskRating = 'EXTREME_RISK';
    riskScore = 95;
    recommendations.push('Extremely aggressive return expectation (>8% daily net).');
    recommendations.push('Market variance or 2 consecutive losing trades can wipe out compounding momentum.');
    recommendations.push('Consider extending the target timeline to lower required daily risk.');
  }

  return {
    targetDaysNeeded: theoreticalDays > 1500 ? null : theoreticalDays,
    targetDateEstimated: calendarDateStr,
    totalProfitAtTarget: G - S,
    totalBankedAtTarget: ((G - S) * (1 - reinvestmentPercent / 100)),
    requiredDailyRateForInputDays: Number(requiredRate.toFixed(2)),
    riskRating,
    riskScore,
    recommendations,
  };
};
