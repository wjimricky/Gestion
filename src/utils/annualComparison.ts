import { FullFinancialModel } from '../types/finance';

export interface AnnualComparisonRow {
  year: number; // 1..5
  label: string; // 'Année 1', ..., 'Année 5'
  shortLabel: string; // 'A1', ..., 'A5'
  growthAppliedPct: number | null;
  turnoverAr: number;
  variableCostsAr: number;
  grossProfitAr: number;
  grossMarginRate: number;
  fixedChargesAr: number;
  operatingIncomeAr: number; // Résultat opérationnel (EBIT / avant IR)
  operatingMarginRate: number;
  corporateTaxAr: number;
  netResultAfterTaxAr: number;
  netMarginRate: number;
  riceVolumeKg: number;
}

export interface AnnualComparisonSummary {
  scenarioMode: 'realistic' | 'ambitious';
  rows: AnnualComparisonRow[];
  cagrTurnover: number;
  cagrGrossProfit: number;
  cagrOperatingIncome: number;
  cagrOperatingMarginRatio: number; // CAGR of operating margin % itself when positive
  operatingMarginDeltaPts: number; // A5 - A1 in percentage points
  cagrNetResult: number;
  cumulativeTurnover5YAr: number;
  cumulativeNet5YAr: number;
}

/**
 * Standard Compound Annual Growth Rate from t=1 to t=5 (4 compounding intervals).
 */
export function computeCagr(startValue: number, endValue: number, periods = 4): number {
  if (periods <= 0 || startValue <= 0 || endValue <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / periods) - 1;
}

/**
 * Builds a side-by-side 5-year P&L comparison with CAGR metrics on turnover & operating margins.
 */
export function buildAnnualComparison5Y(
  model: FullFinancialModel,
  scenarioMode: 'realistic' | 'ambitious' = 'realistic'
): AnnualComparisonSummary {
  const a = model.assumptions;
  const y1 = model.year1;

  const g2 = scenarioMode === 'ambitious' ? a.ambitiousGrowthRateYear2 : a.growthRateYear2;
  const g3 = scenarioMode === 'ambitious' ? a.ambitiousGrowthRateYear3 : a.growthRateYear3;

  // Base ratios in Year 1
  const taxRate = a.corporateTaxRate;
  const baseTurnover = y1.totalTurnoverAr;
  const baseVarCosts = y1.totalPurchaseAndOperatingCostsAr;
  const baseFixed = y1.annualFixedChargesAr;
  const baseRiceKg = y1.totalRiceKgSold;

  // In Year 1 -> Year 5 projections:
  // Target net after-tax growth rates come directly from the financial model (g2 for A2, g3 for A3..A5),
  // while operating leverage reflects moderate fixed-cost scaling (45% of revenue growth rate)
  // so operating margin evolution & CAGR are realistic and consistent with ProjectionsTab drivers.
  const rows: AnnualComparisonRow[] = [];

  let prevTurnover = baseTurnover;
  let prevVarCosts = baseVarCosts;
  let prevFixed = baseFixed;
  let prevRice = baseRiceKg;

  for (let year = 1; year <= 5; year++) {
    const stepGrowth = year === 1 ? null : year === 2 ? g2 : g3;

    if (year > 1 && stepGrowth !== null) {
      // Scale turnover by step growth; scale variable costs slightly slower (purchasing optimization),
      // and fixed charges at 45% of top-line expansion (operating leverage).
      const revFactor = 1 + stepGrowth;
      const varFactor = 1 + stepGrowth * 0.94;
      const fixedFactor = 1 + Math.max(0, stepGrowth * 0.45);

      prevTurnover = prevTurnover * revFactor;
      prevVarCosts = prevVarCosts * varFactor;
      prevFixed = prevFixed * fixedFactor;
      prevRice = prevRice * (1 + stepGrowth * 0.85);
    }

    const grossProfitAr = prevTurnover - prevVarCosts;
    const grossMarginRate = prevTurnover > 0 ? grossProfitAr / prevTurnover : 0;
    const operatingIncomeAr = grossProfitAr - prevFixed;
    const operatingMarginRate = prevTurnover > 0 ? operatingIncomeAr / prevTurnover : 0;
    const corporateTaxAr = Math.max(0, operatingIncomeAr) * taxRate;
    const netResultAfterTaxAr = operatingIncomeAr - corporateTaxAr;
    const netMarginRate = prevTurnover > 0 ? netResultAfterTaxAr / prevTurnover : 0;

    rows.push({
      year,
      label: `Année ${year}`,
      shortLabel: `A${year}`,
      growthAppliedPct: stepGrowth,
      turnoverAr: Math.round(prevTurnover),
      variableCostsAr: Math.round(prevVarCosts),
      grossProfitAr: Math.round(grossProfitAr),
      grossMarginRate,
      fixedChargesAr: Math.round(prevFixed),
      operatingIncomeAr: Math.round(operatingIncomeAr),
      operatingMarginRate,
      corporateTaxAr: Math.round(corporateTaxAr),
      netResultAfterTaxAr: Math.round(netResultAfterTaxAr),
      netMarginRate,
      riceVolumeKg: Math.round(prevRice),
    });
  }

  const first = rows[0];
  const last = rows[rows.length - 1];

  return {
    scenarioMode,
    rows,
    cagrTurnover: computeCagr(first.turnoverAr, last.turnoverAr, 4),
    cagrGrossProfit: computeCagr(first.grossProfitAr, last.grossProfitAr, 4),
    cagrOperatingIncome: computeCagr(first.operatingIncomeAr, last.operatingIncomeAr, 4),
    cagrOperatingMarginRatio: computeCagr(first.operatingMarginRate, last.operatingMarginRate, 4),
    operatingMarginDeltaPts: (last.operatingMarginRate - first.operatingMarginRate) * 100,
    cagrNetResult: computeCagr(first.netResultAfterTaxAr, last.netResultAfterTaxAr, 4),
    cumulativeTurnover5YAr: rows.reduce((s, r) => s + r.turnoverAr, 0),
    cumulativeNet5YAr: rows.reduce((s, r) => s + r.netResultAfterTaxAr, 0),
  };
}
