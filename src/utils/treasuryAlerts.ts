import { FullFinancialModel } from '../types/finance';
import {
  buildMonthlyTreasuryPlan,
  MonthlyTreasuryRow,
  TreasurySimulationSettings,
} from './treasury';

export interface ConsecutiveNegativeTreasuryAlert {
  hasNegativeMonth: boolean;
  negativeMonthsCount: number;
  negativeMonthsLabels: string[];
  hasConsecutiveNegativeStreak: boolean;
  maxConsecutiveMonths: number;
  streakMonths: MonthlyTreasuryRow[];
  streakStartLabel: string;
  streakEndLabel: string;
  worstEndingBalanceAr: number;
  recommendedCashBufferIncreaseAr: number;
  recommendedSellingPriceIncreasePct: number;
  recommendedCreditLineAr: number;
  recommendedSupplierDpoDays: 15 | 30;
  recommendedSafetyStockReductionDays: number;
  hasDsoDelayActive: boolean;
  hasSupplierDpoActive: boolean;
}

/**
 * Monitors the monthly treasury balance forecast (`endingCashAr + creditLineAr`)
 * and raises a stress-test alert whenever ANY monthly balance turns negative,
 * proposing concrete levers: supplier payment delay (DPO), safety stock adjustment,
 * cash buffer uplift, BFR credit facility, or DSO reduction.
 */
export function evaluateConsecutiveNegativeCashAlert(
  model: FullFinancialModel,
  settings: TreasurySimulationSettings
): ConsecutiveNegativeTreasuryAlert {
  const plan = buildMonthlyTreasuryPlan(model, settings);

  let currentStreak: MonthlyTreasuryRow[] = [];
  let longestStreak: MonthlyTreasuryRow[] = [];
  const allNegativeMonths: MonthlyTreasuryRow[] = [];

  for (const row of plan.rows) {
    const netBalance = row.endingCashAr + settings.creditLineAr;
    if (netBalance < 0) {
      allNegativeMonths.push(row);
      currentStreak.push(row);
      if (currentStreak.length > longestStreak.length) {
        longestStreak = [...currentStreak];
      }
    } else {
      currentStreak = [];
    }
  }

  const hasNegativeMonth = allNegativeMonths.length >= 1;
  const hasConsecutiveNegativeStreak = longestStreak.length >= 2;
  const focusRows = longestStreak.length > 0 ? longestStreak : allNegativeMonths;
  const worstEndingBalanceAr =
    allNegativeMonths.length > 0
      ? Math.min(...allNegativeMonths.map((r) => r.endingCashAr + settings.creditLineAr))
      : 0;

  const deficitMagnitude = Math.max(0, Math.abs(worstEndingBalanceAr));
  const recommendedCashBufferIncreaseAr =
    deficitMagnitude > 0 ? Math.ceil((deficitMagnitude * 1.1) / 500000) * 500000 : 0;

  const annualTurnover = Math.max(1, model.year1.totalTurnoverAr);
  const rawPricePct = (deficitMagnitude / (annualTurnover * 0.4)) * 100;
  const recommendedSellingPriceIncreasePct =
    deficitMagnitude > 0 ? Math.min(25, Math.max(3, Math.ceil(rawPricePct))) : 0;

  const currentDpo = settings.supplierDpoDays ?? 0;
  const recommendedSupplierDpoDays: 15 | 30 =
    currentDpo >= 15 || deficitMagnitude > 5000000 ? 30 : 15;
  const recommendedSafetyStockReductionDays =
    deficitMagnitude > 5000000 ? 5 : 3;

  return {
    hasNegativeMonth,
    negativeMonthsCount: allNegativeMonths.length,
    negativeMonthsLabels: allNegativeMonths.map((r) => r.calendarMonthShort),
    hasConsecutiveNegativeStreak,
    maxConsecutiveMonths: Math.max(longestStreak.length, allNegativeMonths.length > 0 ? 1 : 0),
    streakMonths: focusRows,
    streakStartLabel: focusRows[0]?.calendarMonthName ?? '—',
    streakEndLabel: focusRows[focusRows.length - 1]?.calendarMonthName ?? '—',
    worstEndingBalanceAr,
    recommendedCashBufferIncreaseAr,
    recommendedSellingPriceIncreasePct,
    recommendedCreditLineAr: recommendedCashBufferIncreaseAr,
    recommendedSupplierDpoDays,
    recommendedSafetyStockReductionDays,
    hasDsoDelayActive: settings.clientDsoDays > 0,
    hasSupplierDpoActive: currentDpo > 0,
  };
}
