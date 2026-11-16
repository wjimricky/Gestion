import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { CALENDAR_MONTHS_FR, CALENDAR_MONTHS_SHORT_FR } from './treasury';

export type SeasonalityPresetId = 'normale' | 'tension_soudure' | 'recolte_abondante';

export interface SeasonalitySimulationConfig {
  startMonthIndex: number; // 0..11 (4 = Mai, début récolte principale Madagascar)
  peakSoudureInflationPct: number; // 0..0.60 extra variation around BS peak
  harvestDiscountPct: number; // -0.25..0.15 variation during HS peak harvest
  ricePricePassThrough: number; // 0..1: how much paddy price swing transmits to rice selling price
  monthlyPriceOverrides: Record<number, number>; // optional manual Ar/kg overrides by calendar month 0..11
}

export const DEFAULT_SEASONALITY_CONFIG: SeasonalitySimulationConfig = {
  startMonthIndex: 4, // Mai
  peakSoudureInflationPct: 0.12,
  harvestDiscountPct: -0.05,
  ricePricePassThrough: 0.45,
  monthlyPriceOverrides: {},
};

export const SEASONALITY_PRESETS: Array<{
  id: SeasonalityPresetId;
  label: string;
  description: string;
  peakSoudureInflationPct: number;
  harvestDiscountPct: number;
}> = [
  {
    id: 'normale',
    label: 'Campagne type Madagascar',
    description: 'Creux modéré à la récolte (−5 %) et tension progressive en soudure (+12 % sur base BS).',
    peakSoudureInflationPct: 0.12,
    harvestDiscountPct: -0.05,
  },
  {
    id: 'tension_soudure',
    label: 'Forte tension soudure (+32 %)',
    description: 'Flambée des prix du paddy entre janvier et mars (+32 % sur pic BS) pesant sur le BFR.',
    peakSoudureInflationPct: 0.32,
    harvestDiscountPct: 0,
  },
  {
    id: 'recolte_abondante',
    label: 'Récolte abondante (−15 % HS)',
    description: 'Forte disponibilité de paddy en Haute Saison réduisant le BFR initial de collecte.',
    peakSoudureInflationPct: 0.05,
    harvestDiscountPct: -0.15,
  },
];

export interface MonthlySeasonalityPoint {
  monthNumber: number; // 1..12
  calendarIndex: number; // 0..11
  monthName: string;
  monthShort: string;
  seasonTag: 'HS' | 'BS';
  paddyPriceArPerKg: number;
  baselinePaddyPriceArPerKg: number;
  priceDeltaPct: number;
  bfrPerRotationAr: number;
  baselineBfrPerRotationAr: number;
  bfrDeltaAr: number;
  monthlyBfrRequirementAr: number;
  monthlyTurnoverAr: number;
  monthlyCostsAr: number;
  monthlyNetCashFlowAr: number;
  cumulativeCashFlowAr: number;
  baselineCumulativeCashFlowAr: number;
  isOverridden: boolean;
}

export interface SeasonalitySimulationResult {
  points: MonthlySeasonalityPoint[];
  avgSimulatedPaddyHS: number;
  avgSimulatedPaddyBS: number;
  minPaddyPriceAr: number;
  maxPaddyPriceAr: number;
  peakBfrPerRotationAr: number;
  peakBfrMonthName: string;
  baselinePeakBfrPerRotationAr: number;
  maxBfrDeltaAr: number;
  maxBfrDeltaPct: number;
  minCumulativeCashAr: number;
  minCumulativeCashMonthName: string;
  endingCumulativeCashAr: number;
  baselineEndingCumulativeCashAr: number;
  annualCashFlowDeltaAr: number;
}

/**
 * Generates realistic intra-seasonal paddy price profiles (harvest trough -> soudure peak)
 * and computes monthly Working Capital (BFR) & forecast cash flows over 12 months.
 */
export function computeSeasonalityAnalysis(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  config: SeasonalitySimulationConfig
): SeasonalitySimulationResult {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const hsMonths = Math.max(1, Math.min(11, Math.round(hs.months)));
  const totalMonths = Math.min(12, Math.max(1, Math.round(hs.months + bs.months)));

  const paddyRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const basePaddyHS = paddyRow ? paddyRow.costHS : 800;
  const basePaddyBS = paddyRow ? paddyRow.costBS : 1400;

  const nonPaddyVarCostPerKgHS = Math.max(0, hs.costPerKgPaddyAr - basePaddyHS);
  const nonPaddyVarCostPerKgBS = Math.max(0, bs.costPerKgPaddyAr - basePaddyBS);

  const monthlyFixed = model.year1.monthlyFixedChargesAr;
  const taxRate = assumptions.corporateTaxRate;

  const initialCash =
    model.investment.cashBufferAr + model.investment.rotationWorkingCapitalHSAr;

  let runningCumCash = initialCash;
  let runningBaseCumCash = initialCash;

  const points: MonthlySeasonalityPoint[] = [];

  for (let m = 0; m < totalMonths; m++) {
    const calIdx = (config.startMonthIndex + m) % 12;
    const isHS = m < hsMonths;
    const seasonTag: 'HS' | 'BS' = isHS ? 'HS' : 'BS';

    const basePrice = isHS ? basePaddyHS : basePaddyBS;

    // Seasonal curve factor inside HS (U-shaped trough mid-harvest) and BS (ramp to soudure peak)
    let curveFactor = 1;
    if (isHS) {
      const progressHS = hsMonths > 1 ? m / (hsMonths - 1) : 0.5;
      // Deeper discount around peak harvest (middle of HS)
      const harvestBell = Math.sin(progressHS * Math.PI);
      curveFactor = 1 + config.harvestDiscountPct * harvestBell;
    } else {
      const bsCount = Math.max(1, totalMonths - hsMonths);
      const bsPos = m - hsMonths;
      const progressBS = bsCount > 1 ? bsPos / (bsCount - 1) : 0.5;
      // Rises toward peak soudure around 75-85% of Basse Saison, easing slightly just before harvest
      const soudureWave = Math.sin(Math.min(1, progressBS * 1.15) * (Math.PI * 0.65));
      curveFactor = 1 + config.peakSoudureInflationPct * soudureWave;
    }

    const overrideVal = config.monthlyPriceOverrides[calIdx];
    const isOverridden =
      overrideVal !== undefined && Number.isFinite(overrideVal) && overrideVal >= 0;

    const paddyPriceArPerKg = isOverridden
      ? Math.round(overrideVal)
      : Math.max(100, Math.round(basePrice * curveFactor));

    const priceDeltaPct = basePrice > 0 ? (paddyPriceArPerKg - basePrice) / basePrice : 0;

    // Season metrics
    const sRes = isHS ? hs : bs;
    const nonPaddyPerKg = isHS ? nonPaddyVarCostPerKgHS : nonPaddyVarCostPerKgBS;
    const paddyKgRot = sRes.paddyKgPerRotation;
    const rotPerMonth = sRes.rotationsPerMonth;

    // BFR per rotation = total purchase & operating cost per rotation
    const baselineBfrPerRotationAr = sRes.totalCostPerRotationAr;
    const bfrPerRotationAr =
      paddyKgRot * (paddyPriceArPerKg + nonPaddyPerKg) + sRes.otherCostsPerRotationAr;
    const bfrDeltaAr = bfrPerRotationAr - baselineBfrPerRotationAr;
    const monthlyBfrRequirementAr = bfrPerRotationAr * rotPerMonth;

    // Turnover with optional pass-through of paddy cost variation to rice selling price
    const baseTurnoverMonth = sRes.turnoverPerRotationAr * rotPerMonth;
    const paddyCostDeltaPerRotation = paddyKgRot * (paddyPriceArPerKg - basePrice);
    const passThroughRevenueDelta =
      paddyCostDeltaPerRotation * rotPerMonth * config.ricePricePassThrough;
    const monthlyTurnoverAr = Math.max(0, baseTurnoverMonth + passThroughRevenueDelta);

    const baseBeforeTax = sRes.monthlyNetResultBeforeTaxAr;
    const simBeforeTax =
      monthlyTurnoverAr - monthlyBfrRequirementAr - monthlyFixed;
    const simTax = simBeforeTax > 0 ? simBeforeTax * taxRate : 0;
    const baseTax = baseBeforeTax > 0 ? baseBeforeTax * taxRate : 0;

    const monthlyCostsAr = monthlyBfrRequirementAr + monthlyFixed + simTax;
    const monthlyNetCashFlowAr = monthlyTurnoverAr - monthlyCostsAr;
    const baseNetCashFlowAr =
      baseTurnoverMonth - (baselineBfrPerRotationAr * rotPerMonth + monthlyFixed + baseTax);

    runningCumCash += monthlyNetCashFlowAr;
    runningBaseCumCash += baseNetCashFlowAr;

    points.push({
      monthNumber: m + 1,
      calendarIndex: calIdx,
      monthName: CALENDAR_MONTHS_FR[calIdx],
      monthShort: CALENDAR_MONTHS_SHORT_FR[calIdx],
      seasonTag,
      paddyPriceArPerKg,
      baselinePaddyPriceArPerKg: basePrice,
      priceDeltaPct,
      bfrPerRotationAr,
      baselineBfrPerRotationAr,
      bfrDeltaAr,
      monthlyBfrRequirementAr,
      monthlyTurnoverAr,
      monthlyCostsAr,
      monthlyNetCashFlowAr,
      cumulativeCashFlowAr: runningCumCash,
      baselineCumulativeCashFlowAr: runningBaseCumCash,
      isOverridden,
    });
  }

  const hsPoints = points.filter((p) => p.seasonTag === 'HS');
  const bsPoints = points.filter((p) => p.seasonTag === 'BS');

  const avgSimulatedPaddyHS =
    hsPoints.length > 0
      ? Math.round(hsPoints.reduce((a, b) => a + b.paddyPriceArPerKg, 0) / hsPoints.length)
      : basePaddyHS;
  const avgSimulatedPaddyBS =
    bsPoints.length > 0
      ? Math.round(bsPoints.reduce((a, b) => a + b.paddyPriceArPerKg, 0) / bsPoints.length)
      : basePaddyBS;

  const minPaddyPriceAr = Math.min(...points.map((p) => p.paddyPriceArPerKg));
  const maxPaddyPriceAr = Math.max(...points.map((p) => p.paddyPriceArPerKg));

  const peakBfrPoint = [...points].sort(
    (a, b) => b.bfrPerRotationAr - a.bfrPerRotationAr
  )[0];
  const baselinePeakBfrPerRotationAr = Math.max(
    ...points.map((p) => p.baselineBfrPerRotationAr)
  );
  const maxBfrDeltaPoint = [...points].sort((a, b) => b.bfrDeltaAr - a.bfrDeltaAr)[0];
  const minCashPoint = [...points].sort(
    (a, b) => a.cumulativeCashFlowAr - b.cumulativeCashFlowAr
  )[0];

  const endingCumulativeCashAr =
    points[points.length - 1]?.cumulativeCashFlowAr ?? initialCash;
  const baselineEndingCumulativeCashAr =
    points[points.length - 1]?.baselineCumulativeCashFlowAr ?? initialCash;

  return {
    points,
    avgSimulatedPaddyHS,
    avgSimulatedPaddyBS,
    minPaddyPriceAr,
    maxPaddyPriceAr,
    peakBfrPerRotationAr: peakBfrPoint?.bfrPerRotationAr ?? 0,
    peakBfrMonthName: peakBfrPoint?.monthName ?? '—',
    baselinePeakBfrPerRotationAr,
    maxBfrDeltaAr: maxBfrDeltaPoint?.bfrDeltaAr ?? 0,
    maxBfrDeltaPct:
      baselinePeakBfrPerRotationAr > 0
        ? (peakBfrPoint.bfrPerRotationAr - baselinePeakBfrPerRotationAr) /
          baselinePeakBfrPerRotationAr
        : 0,
    minCumulativeCashAr: minCashPoint?.cumulativeCashFlowAr ?? initialCash,
    minCumulativeCashMonthName: minCashPoint?.monthName ?? '—',
    endingCumulativeCashAr,
    baselineEndingCumulativeCashAr,
    annualCashFlowDeltaAr: endingCumulativeCashAr - baselineEndingCumulativeCashAr,
  };
}
