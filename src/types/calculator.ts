export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'BRL' | 'CAD' | 'AUD' | 'USDT';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateToUSD: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rateToUSD: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToUSD: 1.08 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rateToUSD: 1.28 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rateToUSD: 0.012 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rateToUSD: 0.0065 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rateToUSD: 0.18 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', rateToUSD: 0.73 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rateToUSD: 0.65 },
  USDT: { code: 'USDT', symbol: '₮', name: 'Tether USDT', flag: '🌐', rateToUSD: 1 },
};

export type ActiveDaysPreset = 'weekdays' | 'all' | 'custom';

export interface ActiveDaysMap {
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
}

export interface ReturnTier {
  id: string;
  name: string;
  minBalance: number;
  maxBalance: number | null; // null means unbounded
  returnRate: number; // percentage, e.g. 5 for 5%
}

export type CashFlowFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurringCashFlow {
  enabled: boolean;
  type: 'deposit' | 'withdrawal';
  amount: number;
  frequency: CashFlowFrequency;
}

export interface AdvancedRiskModel {
  enabled: boolean;
  sessionsPerDay: number; // 1, 2, or 3
  tradesPerSession: number; // e.g. 3
  winRatePercent: number; // e.g. 70%
  brokerPayoutPercent: number; // e.g. 85%
  riskPerTradePercent: number; // e.g. 2%
  lossDragMultiplier: number; // 1.0 = standard loss of stake, 2.0 = 1-step martingale loss drag
  useCalculatedDailyReturn: boolean; // if true, derives dailyReturnRate from risk model EV
  enableTieredReturns: boolean;
  tiers: ReturnTier[];
  cashFlow: RecurringCashFlow;
}

export interface DailyCompoundingInputs {
  startingCapital: number;
  currency: CurrencyCode;
  dailyReturnRate: number; // percentage, e.g. 5
  daysCount: number; // e.g. 30, 60, 90
  startDate: string; // YYYY-MM-DD
  activeDaysPreset: ActiveDaysPreset;
  activeDays: ActiveDaysMap;
  reinvestmentPercent: number; // 0 - 100
  targetGoal: number; // custom goal amount
  riskModel: AdvancedRiskModel;
}

export interface DailyScheduleRow {
  dayIndex: number; // 1-indexed trading day
  calendarDate: string; // YYYY-MM-DD
  formattedDate: string; // e.g. 'Mon, Oct 30'
  dayOfWeek: string;
  startBalance: number;
  effectiveReturnRate: number; // applied rate considering tiers or EV
  grossProfit: number;
  reinvestedProfit: number;
  withdrawnProfit: number;
  cashFlowAmount: number;
  endBalance: number;
  cumulativeProfit: number;
  cumulativeWithdrawn: number;
  totalNetWorth: number; // endBalance + cumulativeWithdrawn
  tierName?: string;
  milestoneHit?: string;
  isCompleted?: boolean;
}

export type StepCompoundingType = 'all_in' | 'profit_split' | 'fixed_payout' | 'phases';

export interface StepCompoundingInputs {
  startingCapital: number;
  currency: CurrencyCode;
  stepsCount: number; // total consecutive steps, e.g. 10
  payoutRatePercent: number; // e.g. 85% to 92%
  compoundingType: StepCompoundingType;
  reinvestmentPercent: number; // for profit_split mode
  phaseLength: number; // for phases mode, e.g. 3 for 333, 4 for 444
  lockProfitAtPhaseEnd: boolean;
  sessionMultiplier: number; // runs per day
  targetGoal: number;
  customStakes?: number[];
}

export interface StepScheduleRow {
  stepIndex: number; // 1-indexed step
  phaseIndex: number;
  stepInPhase: number;
  startCapital: number;
  stakeAmount: number;
  payoutAmount: number;
  grossProfit: number;
  reinvestedAmount: number;
  lockedProfit: number;
  endBalance: number;
  cumulativeProfit: number;
  cumulativeLocked: number;
  totalValue: number;
  isPhaseTarget?: boolean;
  milestoneHit?: string;
  isCompleted?: boolean;
}

export interface MilestoneItem {
  id: string;
  label: string;
  multiplier: number;
  targetAmount: number;
  projectedIndex: number | null; // day or step index
  projectedDate?: string | null;
  achieved: boolean;
}

export interface GoalFeasibility {
  targetDaysNeeded: number | null;
  targetDateEstimated: string | null;
  totalProfitAtTarget: number;
  totalBankedAtTarget: number;
  requiredDailyRateForInputDays: number;
  riskRating: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'EXTREME_RISK';
  riskScore: number; // 1-100
  recommendations: string[];
}
