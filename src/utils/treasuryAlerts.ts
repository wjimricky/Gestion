import { FullFinancialModel } from '../types/finance';
import {
  buildMonthlyTreasuryPlan,
  MonthlyTreasuryRow,
  TreasurySimulationSettings,
} from './treasury';

export interface ConsecutiveNegativeTreasuryAlert {
  hasConsecutiveNegativeStreak: boolean;
  maxConsecutiveMonths: number;
  streakMonths: MonthlyTreasuryRow[];
  streakStartLabel: string;
  streakEndLabel: string;
  worstEndingBalanceAr: number;
  recommendedCashBufferIncreaseAr: number;
  recommendedSellingPriceIncreasePct: number;
  recommendedCreditLineAr: number;
  hasDsoDelayActive: boolean;
}

/**
 * Monitors the monthly treasury balance forecast (`endingCashAr + creditLineAr`)
 * and raises an intelligent alert if the projected balance stays negative
 * for 2 or more consecutive months, along with concrete remediation figures
 * for investment plan & sales terms adjustments.
 */
export function evaluateConsecutiveNegativeCashAlert(
  model: FullFinancialModel,
  settings: TreasurySimulationSettings
): ConsecutiveNegativeTreasuryAlert {
  const plan = buildMonthlyTreasuryPlan(model, settings);

  let currentStreak: MonthlyTreasuryRow[] = [];
  let longestStreak: MonthlyTreasuryRow[] = [];

  for (const row of plan.rows) {
    const netBalance = row.endingCashAr + settings.creditLineAr;
    if (netBalance < 0) {
      currentStreak.push(row);
      if (currentStreak.length > longestStreak.length) {
        longestStreak = [...currentStreak];
      }
    } else {
      currentStreak = [];
    }
  }

  const hasConsecutiveNegativeStreak = longestStreak.length >= 2;
  const worstEndingBalanceAr =
    longestStreak.length > 0
      ? Math.min(...longestStreak.map((r) => r.endingCashAr + settings.creditLineAr))
      : 0;

  const deficitMagnitude = Math.max(0, Math.abs(worstEndingBalanceAr));
  const recommendedCashBufferIncreaseAr =
    deficitMagnitude > 0 ? Math.ceil((deficitMagnitude * 1.1) / 500000) * 500000 : 0;

  const annualTurnover = Math.max(1, model.year1.totalTurnoverAr);
  // Estimate selling price uplift needed over affected horizon to restore positive balance
  const rawPricePct = (deficitMagnitude / (annualTurnover * 0.4)) * 100;
  const recommendedSellingPriceIncreasePct =
    deficitMagnitude > 0 ? Math.min(25, Math.max(3, Math.ceil(rawPricePct))) : 0;

  return {
    hasConsecutiveNegativeStreak,
    maxConsecutiveMonths: longestStreak.length,
    streakMonths: longestStreak,
    streakStartLabel: longestStreak[0]?.calendarMonthName ?? '—',
    streakEndLabel: longestStreak[longestStreak.length - 1]?.calendarMonthName ?? '—',
    worstEndingBalanceAr,
    recommendedCashBufferIncreaseAr,
    recommendedSellingPriceIncreasePct,
    recommendedCreditLineAr: recommendedCashBufferIncreaseAr,
    hasDsoDelayActive: settings.clientDsoDays > 0,
  };
}
