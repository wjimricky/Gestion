import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { computeMadagascarVatSimulation, getResolvedVatAssumptions } from './vatMadagascar';

export interface CashBurnMonthlyPoint {
  month: number;
  label: string;
  period: 'M0' | 'HS' | 'BS' | 'A2' | 'A3';
  grossBurnOutflowAr: number; // positive number representing monthly cash outflow
  cashInflowAr: number; // positive number representing monthly collections
  netBurnAr: number; // outflow - inflow (> 0 means burning cash, < 0 means cash positive)
  cumulativeCashAr: number; // treasury level relative to -I0 starting point (or cash pool)
  availableBufferRemainingAr: number; // initial cash buffer + working capital pool remaining before depletion
  isBreakEvenCrossMonth: boolean;
}

export interface CashBurnOptions {
  horizonMonths: 12 | 24 | 36;
  rampUpMonths: number; // 0..6 months of commercial ramp-up (reduces initial inflows)
  dsoDelayMonths: number; // 0, 1, or 2 months receivable lag
}

export interface CashBurnSummary {
  points: CashBurnMonthlyPoint[];
  avgGrossBurnMonthlyAr: number;
  avgNetBurnPreBreakevenAr: number;
  peakMonthlyNetBurnAr: number;
  peakCashDeficitAr: number; // lowest cumulative cash reached
  initialCapitalOutlayAr: number; // I0
  initialCashPoolAr: number; // cashBuffer + 1st rotation BFR
  runwayMonths: number | null; // null = self-sustaining / never hits zero buffer
  runwayLabel: string;
  breakEvenMonth: number | null; // first month where cumulative cash >= 0 (after M0)
  netBurnMonthsCount: number;
  vatApplied: boolean;
}

const safeNum = (v: number): number => (Number.isFinite(v) ? v : 0);

export function computeCashBurnAnalysis(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  options: CashBurnOptions
): CashBurnSummary {
  const horizonMonths = options.horizonMonths;
  const rampUpMonths = Math.max(0, Math.min(6, Math.round(options.rampUpMonths)));
  const dsoDelayMonths = Math.max(0, Math.min(2, Math.round(options.dsoDelayMonths)));

  const hsMonths = Math.max(1, Math.min(11, Math.round(assumptions.hauteSaison.months)));
  const bsMonths = Math.max(1, 12 - hsMonths);

  const hsMonthlyInflow = safeNum(model.hauteSaison.totalTurnoverAr / hsMonths);
  const hsMonthlyVarOutflow = safeNum(model.hauteSaison.totalPurchaseAndOperatingCostsAr / hsMonths);
  const bsMonthlyInflow = safeNum(model.basseSaison.totalTurnoverAr / bsMonths);
  const bsMonthlyVarOutflow = safeNum(model.basseSaison.totalPurchaseAndOperatingCostsAr / bsMonths);
  const monthlyFixedOutflow = safeNum(model.year1.monthlyFixedChargesAr);
  const monthlyTaxProvision = safeNum(model.year1.corporateTaxAr / 12);

  // Optional VAT refinement when enabled & applied to cash flow
  const vatSettings = getResolvedVatAssumptions(assumptions);
  const vatApplied = vatSettings.enabled && vatSettings.applyToCashFlow;
  const vatSim = vatApplied ? computeMadagascarVatSimulation(assumptions, model, vatSettings) : null;

  const initialFunds = safeNum(model.investment.fundsToRaiseAr);
  const initialCashPoolAr = safeNum(
    model.investment.cashBufferAr + model.investment.rotationWorkingCapitalHSAr
  );

  // Build raw scheduled inflows before DSO shift
  const scheduledInflows: number[] = [];
  const scheduledOutflows: number[] = [];
  const periods: Array<'HS' | 'BS' | 'A2' | 'A3'> = [];

  for (let m = 1; m <= horizonMonths; m++) {
    const yearIdx = Math.floor((m - 1) / 12); // 0 = A1, 1 = A2, 2 = A3
    const monthInYear = ((m - 1) % 12) + 1;
    const isHs = monthInYear <= hsMonths;

    const growthMultiplier =
      yearIdx === 0
        ? 1
        : yearIdx === 1
        ? 1 + safeNum(assumptions.growthRateYear2)
        : (1 + safeNum(assumptions.growthRateYear2)) * (1 + safeNum(assumptions.growthRateYear3));

    // Ramp-up factor during initial commercial months
    const rampFactor =
      rampUpMonths > 0 && m <= rampUpMonths
        ? Math.max(0.18, m / (rampUpMonths + 1))
        : 1;

    const baseInflow = (isHs ? hsMonthlyInflow : bsMonthlyInflow) * growthMultiplier;
    const baseVarOutflow = (isHs ? hsMonthlyVarOutflow : bsMonthlyVarOutflow) * growthMultiplier;

    // During ramp-up, fixed charges remain 100%, variable purchases scale with production/sales slightly ahead of sales
    const varRampFactor =
      rampUpMonths > 0 && m <= rampUpMonths ? Math.min(1, rampFactor + 0.25) : 1;

    const vatMonthlyImpact = vatSim
      ? safeNum(vatSim.monthlySchedule[(monthInYear - 1) % 12]?.vatCashImpactAr ?? 0) *
        (yearIdx === 0 ? 1 : growthMultiplier)
      : 0;

    // If vatCashImpactAr < 0, it increases cash outflow; if > 0, it reduces outflow
    const vatOutflowDelta = vatMonthlyImpact < 0 ? Math.abs(vatMonthlyImpact) : 0;
    const vatInflowCredit = vatMonthlyImpact > 0 ? vatMonthlyImpact : 0;

    const totalOutflow =
      baseVarOutflow * varRampFactor +
      monthlyFixedOutflow +
      monthlyTaxProvision * growthMultiplier * rampFactor +
      vatOutflowDelta;

    const totalInflow = baseInflow * rampFactor + vatInflowCredit;

    scheduledInflows.push(safeNum(totalInflow));
    scheduledOutflows.push(safeNum(totalOutflow));
    periods.push(yearIdx === 0 ? (isHs ? 'HS' : 'BS') : yearIdx === 1 ? 'A2' : 'A3');
  }

  // Apply DSO receivables lag on inflows
  const points: CashBurnMonthlyPoint[] = [
    {
      month: 0,
      label: 'M0 (I₀)',
      period: 'M0',
      grossBurnOutflowAr: initialFunds,
      cashInflowAr: 0,
      netBurnAr: initialFunds,
      cumulativeCashAr: -initialFunds,
      availableBufferRemainingAr: initialCashPoolAr,
      isBreakEvenCrossMonth: false,
    },
  ];

  let cumulativeCash = -initialFunds;
  let availableBuffer = initialCashPoolAr;
  let breakEvenMonth: number | null = null;
  let peakCashDeficitAr = -initialFunds;
  let runwayMonths: number | null = null;

  for (let idx = 0; idx < horizonMonths; idx++) {
    const m = idx + 1;
    const laggedInflow = idx - dsoDelayMonths >= 0 ? scheduledInflows[idx - dsoDelayMonths] : 0;
    const outflow = scheduledOutflows[idx];
    const netBurn = outflow - laggedInflow;

    cumulativeCash += laggedInflow - outflow;
    availableBuffer += laggedInflow - outflow;

    if (cumulativeCash < peakCashDeficitAr) {
      peakCashDeficitAr = cumulativeCash;
    }

    if (runwayMonths === null && availableBuffer <= 0) {
      runwayMonths = m;
    }

    const crossedBreakEven = breakEvenMonth === null && cumulativeCash >= 0;
    if (crossedBreakEven) {
      breakEvenMonth = m;
    }

    points.push({
      month: m,
      label: `M${m}`,
      period: periods[idx],
      grossBurnOutflowAr: Math.round(outflow),
      cashInflowAr: Math.round(laggedInflow),
      netBurnAr: Math.round(netBurn),
      cumulativeCashAr: Math.round(cumulativeCash),
      availableBufferRemainingAr: Math.round(availableBuffer),
      isBreakEvenCrossMonth: crossedBreakEven,
    });
  }

  const operationalPoints = points.slice(1);
  const avgGrossBurnMonthlyAr =
    operationalPoints.length > 0
      ? operationalPoints.reduce((s, p) => s + p.grossBurnOutflowAr, 0) / operationalPoints.length
      : 0;

  const burnOnlyPoints = operationalPoints.filter((p) => p.netBurnAr > 0);
  const avgNetBurnPreBreakevenAr =
    burnOnlyPoints.length > 0
      ? burnOnlyPoints.reduce((s, p) => s + p.netBurnAr, 0) / burnOnlyPoints.length
      : 0;

  const peakMonthlyNetBurnAr = operationalPoints.reduce(
    (max, p) => (p.netBurnAr > max ? p.netBurnAr : max),
    0
  );

  // If cash buffer never ran out, compute theoretical runway at avg net burn or gross burn
  let runwayLabel = 'Autonome (> ' + horizonMonths + ' mois)';
  if (runwayMonths !== null) {
    runwayLabel = `${runwayMonths} mois (avant recharge)`;
  } else if (avgNetBurnPreBreakevenAr > 0) {
    const coveredMonths = Math.max(1, Math.round(initialCashPoolAr / avgNetBurnPreBreakevenAr));
    runwayLabel = `Autonome · ${coveredMonths} mois couverts`;
  }

  return {
    points,
    avgGrossBurnMonthlyAr,
    avgNetBurnPreBreakevenAr,
    peakMonthlyNetBurnAr,
    peakCashDeficitAr,
    initialCapitalOutlayAr: initialFunds,
    initialCashPoolAr,
    runwayMonths,
    runwayLabel,
    breakEvenMonth,
    netBurnMonthsCount: burnOnlyPoints.length,
    vatApplied,
  };
}
