import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { applyScenarioDefinitionToAssumptions } from './scenarioHelpers';

export interface SavedScenarioInput {
  id: string;
  name: string;
  assumptions: FinancialAssumptions;
}

export interface MultiScenarioDcfCandidate {
  id: string;
  label: string;
  shortLabel: string;
  sourceType: 'model' | 'saved';
  color: string;
  assumptions: FinancialAssumptions;
  model: FullFinancialModel;
}

export interface MultiScenarioYearlyDcfPoint {
  year: number; // 0..5
  label: string; // 't=0 (I₀)', 'A1', ..., 'A5'
  // Dynamic keys: `${candidateId}_cumul`, `${candidateId}_annual`, `${candidateId}_nominal`
  [key: string]: number | string;
}

export interface MultiScenarioDcfSummary {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  sourceType: 'model' | 'saved';
  discountRate: number;
  initialInvestmentAr: number;
  npv3YearsAr: number;
  npv5YearsAr: number;
  irrRate: number;
  discountedPaybackYears: number | null;
  yearlyDiscountedAr: number[]; // A1..A5
  yearlyCumulativeDcfAr: number[]; // t=0..A5
}

export const MULTI_SCENARIO_PALETTE = [
  '#818CF8', // Indigo
  '#2DD4BF', // Teal
  '#F59E0B', // Amber
  '#38BDF8', // Sky
  '#EC4899', // Pink
  '#A3E635', // Lime
];

/**
 * Computes exact interpolated discounted payback period (in years) from t=0..A5.
 */
function computeDiscountedPaybackYears(cumulativeDcf: number[]): number | null {
  for (let t = 1; t < cumulativeDcf.length; t++) {
    const prev = cumulativeDcf[t - 1];
    const curr = cumulativeDcf[t];
    if (prev < 0 && curr >= 0) {
      const gain = curr - prev;
      if (gain <= 0) return t;
      return (t - 1) + -prev / gain;
    }
    if (prev >= 0 && t === 1) {
      return 0;
    }
  }
  return null;
}

export function buildMultiScenarioCandidates(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  savedScenarios: SavedScenarioInput[]
): MultiScenarioDcfCandidate[] {
  const optAssumptions = applyScenarioDefinitionToAssumptions(
    assumptions,
    model.scenarios.optimiste.definition
  );
  const pessAssumptions = applyScenarioDefinitionToAssumptions(
    assumptions,
    model.scenarios.pessimiste.definition
  );

  const builtIn: MultiScenarioDcfCandidate[] = [
    {
      id: 'model:realiste',
      label: 'Réaliste (Base active)',
      shortLabel: 'Réaliste',
      sourceType: 'model',
      color: MULTI_SCENARIO_PALETTE[0],
      assumptions,
      model,
    },
    {
      id: 'model:optimiste',
      label: 'Optimiste (Chocs positifs)',
      shortLabel: 'Optimiste',
      sourceType: 'model',
      color: MULTI_SCENARIO_PALETTE[1],
      assumptions: optAssumptions,
      model: calculateFullModel(optAssumptions),
    },
    {
      id: 'model:pessimiste',
      label: 'Pessimiste (Stress marché)',
      shortLabel: 'Pessimiste',
      sourceType: 'model',
      color: MULTI_SCENARIO_PALETTE[2],
      assumptions: pessAssumptions,
      model: calculateFullModel(pessAssumptions),
    },
  ];

  const saved: MultiScenarioDcfCandidate[] = savedScenarios.map((sc, idx) => ({
    id: `saved:${sc.id}`,
    label: sc.name,
    shortLabel: sc.name.length > 18 ? `${sc.name.slice(0, 17)}…` : sc.name,
    sourceType: 'saved',
    color: MULTI_SCENARIO_PALETTE[(idx + 3) % MULTI_SCENARIO_PALETTE.length],
    assumptions: sc.assumptions,
    model: calculateFullModel(sc.assumptions),
  }));

  return [...builtIn, ...saved];
}

export function buildMultiScenarioDcfDataset(
  candidates: MultiScenarioDcfCandidate[],
  selectedIds: string[],
  horizonYears: 3 | 5
): {
  chartData: MultiScenarioYearlyDcfPoint[];
  summaries: MultiScenarioDcfSummary[];
} {
  const active = candidates.filter((c) => selectedIds.includes(c.id));
  const summaries: MultiScenarioDcfSummary[] = active.map((cand, idx) => {
    const m = cand.model;
    const i0 = m.investment.fundsToRaiseAr;
    const r = m.npv.discountRate;
    const g3 = m.assumptions.growthRateYear3;

    const cf1 = m.projections.realistic[0]?.netResultAfterTaxAr ?? m.year1.netResultAfterTaxAr;
    const cf2 = m.projections.realistic[1]?.netResultAfterTaxAr ?? cf1 * (1 + m.assumptions.growthRateYear2);
    const cf3 = m.projections.realistic[2]?.netResultAfterTaxAr ?? cf2 * (1 + g3);
    const cf4 = cf3 * (1 + g3);
    const cf5 = cf4 * (1 + g3);

    const nominalCfs = [cf1, cf2, cf3, cf4, cf5];
    const discountedAnnual = nominalCfs.map((cf, yearIdx) => cf / Math.pow(1 + r, yearIdx + 1));

    const cumulativeDcf: number[] = [-i0];
    let running = -i0;
    for (let t = 0; t < 5; t++) {
      running += discountedAnnual[t];
      cumulativeDcf.push(running);
    }

    const assignedColor = MULTI_SCENARIO_PALETTE[idx % MULTI_SCENARIO_PALETTE.length];

    return {
      id: cand.id,
      label: cand.label,
      shortLabel: cand.shortLabel,
      color: assignedColor,
      sourceType: cand.sourceType,
      discountRate: r,
      initialInvestmentAr: i0,
      npv3YearsAr: cumulativeDcf[3],
      npv5YearsAr: cumulativeDcf[5],
      irrRate: Number.isFinite(m.irr.irrValue) ? m.irr.irrValue : 0,
      discountedPaybackYears: computeDiscountedPaybackYears(cumulativeDcf),
      yearlyDiscountedAr: discountedAnnual,
      yearlyCumulativeDcfAr: cumulativeDcf,
    };
  });

  const maxYear = horizonYears;
  const chartData: MultiScenarioYearlyDcfPoint[] = [];

  for (let year = 0; year <= maxYear; year++) {
    const row: MultiScenarioYearlyDcfPoint = {
      year,
      label: year === 0 ? 't=0 (-I₀)' : `A${year}`,
    };

    summaries.forEach((sum) => {
      row[`${sum.id}_cumul`] = Number((sum.yearlyCumulativeDcfAr[year] / 1e6).toFixed(2));
      row[`${sum.id}_annual`] =
        year === 0
          ? Number((-sum.initialInvestmentAr / 1e6).toFixed(2))
          : Number((sum.yearlyDiscountedAr[year - 1] / 1e6).toFixed(2));
    });

    chartData.push(row);
  }

  return { chartData, summaries };
}
