import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CurrencyCode,
  DailyScheduleRow,
  StepScheduleRow,
  CURRENCIES,
} from '../types/calculator';
import { formatCurrency } from './calculatorMath';

/**
 * Exports Daily Compounding Schedule to a CSV file
 */
export const exportDailyScheduleToCSV = (
  rows: DailyScheduleRow[],
  currency: CurrencyCode,
  filename: string = 'aladdin-compounding-daily-plan.csv'
) => {
  const headers = [
    'Day',
    'Date',
    'Day of Week',
    `Start Balance (${currency})`,
    'Return Rate (%)',
    `Gross Profit (${currency})`,
    `Reinvested (${currency})`,
    `Withdrawn / Banked (${currency})`,
    `Cash Flow (${currency})`,
    `End Balance (${currency})`,
    `Cumulative Profit (${currency})`,
    `Cumulative Withdrawn (${currency})`,
    `Total Net Worth (${currency})`,
    'Milestone / Tier',
  ];

  const csvRows = rows.map((r) => [
    r.dayIndex,
    r.calendarDate,
    r.dayOfWeek,
    r.startBalance.toFixed(2),
    r.effectiveReturnRate.toFixed(2) + '%',
    r.grossProfit.toFixed(2),
    r.reinvestedProfit.toFixed(2),
    r.withdrawnProfit.toFixed(2),
    r.cashFlowAmount.toFixed(2),
    r.endBalance.toFixed(2),
    r.cumulativeProfit.toFixed(2),
    r.cumulativeWithdrawn.toFixed(2),
    r.totalNetWorth.toFixed(2),
    `"${r.milestoneHit || r.tierName || ''}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports Step Compounding Schedule to a CSV file
 */
export const exportStepScheduleToCSV = (
  rows: StepScheduleRow[],
  currency: CurrencyCode,
  filename: string = 'aladdin-step-compounding-plan.csv'
) => {
  const headers = [
    'Step',
    'Phase',
    'Step in Phase',
    `Start Capital (${currency})`,
    `Stake (${currency})`,
    `Payout (${currency})`,
    `Gross Profit (${currency})`,
    `Reinvested (${currency})`,
    `Locked in Vault (${currency})`,
    `Balance (${currency})`,
    `Cumulative Profit (${currency})`,
    `Cumulative Locked (${currency})`,
    `Total Portfolio (${currency})`,
    'Milestone',
  ];

  const csvRows = rows.map((r) => [
    r.stepIndex,
    r.phaseIndex,
    r.stepInPhase,
    r.startCapital.toFixed(2),
    r.stakeAmount.toFixed(2),
    r.payoutAmount.toFixed(2),
    r.grossProfit.toFixed(2),
    r.reinvestedAmount.toFixed(2),
    r.lockedProfit.toFixed(2),
    r.endBalance.toFixed(2),
    r.cumulativeProfit.toFixed(2),
    r.cumulativeLocked.toFixed(2),
    r.totalValue.toFixed(2),
    `"${r.milestoneHit || (r.isPhaseTarget ? 'Phase Target Hit' : '')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports a PDF report of the compounding plan
 */
export const exportPlanToPDF = (
  mode: 'daily' | 'step',
  summary: {
    startingCapital: number;
    finalBalance: number;
    totalProfit: number;
    totalWithdrawn: number;
    currency: CurrencyCode;
    daysOrStepsCount: number;
    dailyOrPayoutRate: number;
    reinvestmentPercent: number;
  },
  dailyRows?: DailyScheduleRow[],
  stepRows?: StepScheduleRow[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const curr = CURRENCIES[summary.currency] || CURRENCIES.USD;

  // Header background
  doc.setFillColor(10, 15, 28);
  doc.rect(0, 0, doc.internal.pageSize.width, 100, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(6, 182, 212); // Cyan
  doc.text('ALADDIN AI COMPOUNDING & RISK PLAN', 40, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(
    `${mode === 'daily' ? 'Daily Calendar Compounding Plan' : 'Step-by-Step Consecutive Compounding Plan'} | Generated: ${new Date().toLocaleDateString()}`,
    40,
    65
  );

  // Summary Metrics Grid (Top Box)
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(40, 115, doc.internal.pageSize.width - 80, 85, 8, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('START CAPITAL', 55, 135);
  doc.text('PROJECTED BALANCE', 180, 135);
  doc.text('TOTAL BANKED / WITHDRAWN', 320, 135);
  doc.text('NET RETURN RATE', 460, 135);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(summary.startingCapital, summary.currency), 55, 158);

  doc.setTextColor(52, 211, 153); // Emerald
  doc.text(formatCurrency(summary.finalBalance, summary.currency), 180, 158);

  doc.setTextColor(6, 182, 212); // Cyan
  doc.text(formatCurrency(summary.totalWithdrawn, summary.currency), 320, 158);

  doc.setTextColor(245, 158, 11); // Amber
  const growthMultiplier = (
    (summary.finalBalance + summary.totalWithdrawn) /
    Math.max(1, summary.startingCapital)
  ).toFixed(1);
  doc.text(`${growthMultiplier}x (+${summary.dailyOrPayoutRate}%)`, 460, 158);

  // Sub-metrics
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Reinvestment Split: ${summary.reinvestmentPercent}% Compounding / ${100 - summary.reinvestmentPercent}% Banked | Duration: ${summary.daysOrStepsCount} ${mode === 'daily' ? 'Trading Days' : 'Steps'}`,
    55,
    185
  );

  // Table Data
  if (mode === 'daily' && dailyRows && dailyRows.length > 0) {
    const tableData = dailyRows.map((r) => [
      `Day ${r.dayIndex}`,
      r.calendarDate,
      `${curr.symbol}${r.startBalance.toFixed(2)}`,
      `${r.effectiveReturnRate.toFixed(1)}%`,
      `+${curr.symbol}${r.grossProfit.toFixed(2)}`,
      `+${curr.symbol}${r.reinvestedProfit.toFixed(2)}`,
      `${curr.symbol}${r.withdrawnProfit.toFixed(2)}`,
      `${curr.symbol}${r.endBalance.toFixed(2)}`,
      r.milestoneHit || r.tierName || '',
    ]);

    autoTable(doc, {
      startY: 215,
      head: [
        [
          'Day',
          'Date',
          'Start',
          'Rate',
          'Gross',
          'Reinvested',
          'Withdrawn',
          'End Balance',
          'Event / Tier',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [248, 250, 252],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  } else if (mode === 'step' && stepRows && stepRows.length > 0) {
    const tableData = stepRows.map((r) => [
      `Step ${r.stepIndex}`,
      `Phase ${r.phaseIndex}`,
      `${curr.symbol}${r.stakeAmount.toFixed(2)}`,
      `${curr.symbol}${r.payoutAmount.toFixed(2)}`,
      `+${curr.symbol}${r.grossProfit.toFixed(2)}`,
      `${curr.symbol}${r.lockedProfit.toFixed(2)}`,
      `${curr.symbol}${r.endBalance.toFixed(2)}`,
      `${curr.symbol}${r.totalValue.toFixed(2)}`,
      r.milestoneHit || (r.isPhaseTarget ? 'Phase Peak' : ''),
    ]);

    autoTable(doc, {
      startY: 215,
      head: [
        [
          'Step',
          'Phase',
          'Stake',
          'Payout',
          'Gross Profit',
          'Locked Profit',
          'Balance',
          'Total Portfolio',
          'Event',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [248, 250, 252],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  }

  doc.save(
    `aladdin-${mode}-compounding-report-${new Date().toISOString().slice(0, 10)}.pdf`
  );
};

/**
 * Copies a markdown/telegram ready summary of the plan
 */
export const copyPlanSummaryToClipboard = (
  mode: 'daily' | 'step',
  summary: {
    startingCapital: number;
    finalBalance: number;
    totalProfit: number;
    totalWithdrawn: number;
    currency: CurrencyCode;
    daysOrStepsCount: number;
    dailyOrPayoutRate: number;
    reinvestmentPercent: number;
    targetDate?: string;
  }
): Promise<boolean> => {
  const curr = CURRENCIES[summary.currency] || CURRENCIES.USD;
  const growthMultiplier = (
    (summary.finalBalance + summary.totalWithdrawn) /
    Math.max(1, summary.startingCapital)
  ).toFixed(2);

  const text = `
🧞 **ALADDIN AI COMPOUNDING PROTOCOL**
━━━━━━━━━━━━━━━━━━━━
📊 **Plan Mode:** ${mode === 'daily' ? 'Daily Calendar Compounding' : 'Step-by-Step Consecutive Wins'}
💰 **Initial Capital:** ${formatCurrency(summary.startingCapital, summary.currency)}
🎯 **Projected Balance:** ${formatCurrency(summary.finalBalance, summary.currency)}
🏦 **Banked Profit / Safe Vault:** ${formatCurrency(summary.totalWithdrawn, summary.currency)}
📈 **Total Net Generation:** ${formatCurrency(summary.finalBalance + summary.totalWithdrawn, summary.currency)} (${growthMultiplier}x)
⏱️ **Horizon:** ${summary.daysOrStepsCount} ${mode === 'daily' ? 'Active Trading Days' : 'Target Steps'}
⚖️ **Profit Split:** ${summary.reinvestmentPercent}% Reinvested / ${100 - summary.reinvestmentPercent}% Secured
${summary.targetDate ? `📅 **Target Date:** ${summary.targetDate}` : ''}
━━━━━━━━━━━━━━━━━━━━
*Risk Rule: Stop trading immediately if consecutive stop-loss hits. Never risk more than designated session limits.*
`.trim();

  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
};
