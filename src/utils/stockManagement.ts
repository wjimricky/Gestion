import {
  FinancialAssumptions,
  FixedMonthlyCharge,
  FullFinancialModel,
  StockManagementAssumptions,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';

export const STOCK_COST_FIXED_ID = 'fix-couts-stockage';

export const DEFAULT_STOCK_MANAGEMENT: StockManagementAssumptions = {
  enabled: false,
  syncCostsToModel: true,
  paddyHoldingDaysHS: 20,
  paddyHoldingDaysBS: 35,
  paddySafetyStockDays: 7,
  paddyMaxShelfLifeDays: 120,
  paddyStorageCostArPerTonMonth: 18000,
  milledRiceHoldingDaysHS: 10,
  milledRiceHoldingDaysBS: 14,
  milledRiceSafetyStockDays: 5,
  milledRiceMaxShelfLifeDays: 60,
  milledRiceStorageCostArPerTonMonth: 22000,
  workingCapitalFinancingRateAnnual: 0.18,
  targetHoldingReductionPct: 25,
};

export interface StockPreset {
  id: string;
  label: string;
  description: string;
  patch: Partial<StockManagementAssumptions>;
}

export const STOCK_OPTIMIZATION_PRESETS: StockPreset[] = [
  {
    id: 'jit',
    label: 'Flux tendu (BFR minimal)',
    description: 'Conservation courte (12 j paddy / 7 j riz usiné) réduisant l’immobilisation de trésorerie.',
    patch: {
      enabled: true,
      syncCostsToModel: true,
      paddyHoldingDaysHS: 12,
      paddyHoldingDaysBS: 16,
      paddySafetyStockDays: 4,
      milledRiceHoldingDaysHS: 6,
      milledRiceHoldingDaysBS: 8,
      milledRiceSafetyStockDays: 3,
      targetHoldingReductionPct: 15,
    },
  },
  {
    id: 'balanced',
    label: 'Équilibre rizerie standard',
    description: 'Rotation régulière (20–35 j paddy, 10–14 j riz blanc) adaptée aux collectes régionales.',
    patch: {
      enabled: true,
      syncCostsToModel: true,
      paddyHoldingDaysHS: 20,
      paddyHoldingDaysBS: 35,
      paddySafetyStockDays: 7,
      milledRiceHoldingDaysHS: 10,
      milledRiceHoldingDaysBS: 14,
      milledRiceSafetyStockDays: 5,
      targetHoldingReductionPct: 25,
    },
  },
  {
    id: 'speculative',
    label: 'Stockage report soudure',
    description: 'Conservation longue en HS (75 j paddy) pour valoriser le riz en période de soudure.',
    patch: {
      enabled: true,
      syncCostsToModel: true,
      paddyHoldingDaysHS: 75,
      paddyHoldingDaysBS: 25,
      paddySafetyStockDays: 12,
      milledRiceHoldingDaysHS: 18,
      milledRiceHoldingDaysBS: 12,
      milledRiceSafetyStockDays: 6,
      targetHoldingReductionPct: 30,
    },
  },
];

export function getResolvedStockManagement(
  assumptions: FinancialAssumptions
): StockManagementAssumptions {
  return {
    ...DEFAULT_STOCK_MANAGEMENT,
    ...(assumptions.stockManagement || {}),
  };
}

export function computeAverageStockVolumesAndCosts(
  assumptions: FinancialAssumptions,
  stock: StockManagementAssumptions
) {
  const hsMonths = Math.max(1, assumptions.hauteSaison.months);
  const bsMonths = Math.max(1, assumptions.basseSaison.months);
  const totalMonths = hsMonths + bsMonths;

  const hsPaddyRot = assumptions.hauteSaison.paddyBoughtKgPerRotation;
  const bsPaddyRot = assumptions.basseSaison.paddyBoughtKgPerRotation;
  const hsTotalPaddy = hsPaddyRot * hsMonths * assumptions.hauteSaison.rotationsPerMonth;
  const bsTotalPaddy = bsPaddyRot * bsMonths * assumptions.basseSaison.rotationsPerMonth;

  const hsTotalRice = hsTotalPaddy * assumptions.hauteSaison.yieldPaddyToRice;
  const bsTotalRice = bsTotalPaddy * assumptions.basseSaison.yieldPaddyToRice;

  const hsDailyPaddyKg = hsTotalPaddy / (hsMonths * 30);
  const bsDailyPaddyKg = bsTotalPaddy / (bsMonths * 30);
  const hsDailyRiceKg = hsTotalRice / (hsMonths * 30);
  const bsDailyRiceKg = bsTotalRice / (bsMonths * 30);

  const avgPaddyKgHS =
    hsDailyPaddyKg * (Math.max(0, stock.paddyHoldingDaysHS) + Math.max(0, stock.paddySafetyStockDays));
  const avgPaddyKgBS =
    bsDailyPaddyKg * (Math.max(0, stock.paddyHoldingDaysBS) + Math.max(0, stock.paddySafetyStockDays));
  const weightedAvgPaddyKg = (avgPaddyKgHS * hsMonths + avgPaddyKgBS * bsMonths) / totalMonths;

  const avgRiceKgHS =
    hsDailyRiceKg *
    (Math.max(0, stock.milledRiceHoldingDaysHS) + Math.max(0, stock.milledRiceSafetyStockDays));
  const avgRiceKgBS =
    bsDailyRiceKg *
    (Math.max(0, stock.milledRiceHoldingDaysBS) + Math.max(0, stock.milledRiceSafetyStockDays));
  const weightedAvgRiceKg = (avgRiceKgHS * hsMonths + avgRiceKgBS * bsMonths) / totalMonths;

  const monthlyPaddyStorageAr =
    (weightedAvgPaddyKg / 1000) * Math.max(0, stock.paddyStorageCostArPerTonMonth);
  const monthlyRiceStorageAr =
    (weightedAvgRiceKg / 1000) * Math.max(0, stock.milledRiceStorageCostArPerTonMonth);
  const totalMonthlyStorageAr = Math.round(monthlyPaddyStorageAr + monthlyRiceStorageAr);

  return {
    weightedAvgPaddyKg,
    weightedAvgRiceKg,
    avgPaddyKgHS,
    avgPaddyKgBS,
    avgRiceKgHS,
    avgRiceKgBS,
    monthlyPaddyStorageAr,
    monthlyRiceStorageAr,
    totalMonthlyStorageAr,
    totalAnnualStorageAr: totalMonthlyStorageAr * 12,
  };
}

export function applyStockCostsToFixedCharges(
  fixedMonthlyCharges: FixedMonthlyCharge[],
  assumptions: FinancialAssumptions,
  stock: StockManagementAssumptions
): FixedMonthlyCharge[] {
  const cleanFixed = fixedMonthlyCharges.filter((f) => f.id !== STOCK_COST_FIXED_ID);
  if (!stock.enabled || !stock.syncCostsToModel) {
    return cleanFixed;
  }
  const { totalMonthlyStorageAr } = computeAverageStockVolumesAndCosts(assumptions, stock);
  if (totalMonthlyStorageAr <= 0) {
    return cleanFixed;
  }
  return [
    ...cleanFixed,
    {
      id: STOCK_COST_FIXED_ID,
      label: 'Coûts stockage (paddy & riz usiné)',
      amount: totalMonthlyStorageAr,
    },
  ];
}

export interface StockBfrCurvePoint {
  daysLabel: string;
  totalDays: number;
  bfrStockMAr: number;
  annualHoldingCostMAr: number;
}

export interface StockBfrAnalysis {
  isSyncedToModel: boolean;
  weightedAvgPaddyKg: number;
  weightedAvgRiceKg: number;
  bfrPaddyAr: number;
  bfrMilledRiceAr: number;
  totalStockBfrAr: number;
  totalAnnualStorageCostAr: number;
  annualWorkingCapitalFinancingCostAr: number;
  totalCarryingCostAr: number;
  cashConversionDays: number;
  optimizedStockBfrAr: number;
  bfrCashReleasedAr: number;
  optimizedCarryingSavingsAr: number;
  paddyShelfLifeAlert: boolean;
  riceShelfLifeAlert: boolean;
  baselineNetResultAr: number;
  withStockCostsNetResultAr: number;
  curveData: StockBfrCurvePoint[];
}

export function computeStockBfrAnalysis(
  assumptions: FinancialAssumptions,
  _currentModel: FullFinancialModel,
  stockInput?: StockManagementAssumptions
): StockBfrAnalysis {
  const stock = stockInput ?? getResolvedStockManagement(assumptions);

  const withoutFixed = applyStockCostsToFixedCharges(assumptions.fixedMonthlyCharges, assumptions, {
    ...stock,
    enabled: false,
  });
  const withFixed = applyStockCostsToFixedCharges(assumptions.fixedMonthlyCharges, assumptions, {
    ...stock,
    enabled: true,
    syncCostsToModel: true,
  });

  const baseModel = calculateFullModel({ ...assumptions, fixedMonthlyCharges: withoutFixed });
  const taxedModel = calculateFullModel({ ...assumptions, fixedMonthlyCharges: withFixed });

  const volumes = computeAverageStockVolumesAndCosts(assumptions, stock);

  // Average unit valuation of paddy (purchase + transport/bagging) & milled rice (cost of goods sold)
  const hsPaddyUnitAr = baseModel.hauteSaison.costPerKgPaddyAr;
  const bsPaddyUnitAr = baseModel.basseSaison.costPerKgPaddyAr;
  const hsMonths = Math.max(1, assumptions.hauteSaison.months);
  const bsMonths = Math.max(1, assumptions.basseSaison.months);
  const totalMonths = hsMonths + bsMonths;

  const avgPaddyCostAr = (hsPaddyUnitAr * hsMonths + bsPaddyUnitAr * bsMonths) / totalMonths;
  const totalRiceAnnualKg = Math.max(1, baseModel.year1.totalRiceKgSold);
  const avgMilledRiceCostAr =
    baseModel.year1.totalPurchaseAndOperatingCostsAr / totalRiceAnnualKg;

  const bfrPaddyAr = Math.round(volumes.weightedAvgPaddyKg * avgPaddyCostAr);
  const bfrMilledRiceAr = Math.round(volumes.weightedAvgRiceKg * avgMilledRiceCostAr);
  const totalStockBfrAr = bfrPaddyAr + bfrMilledRiceAr;

  const finRate = Math.max(0, stock.workingCapitalFinancingRateAnnual);
  const annualWorkingCapitalFinancingCostAr = Math.round(totalStockBfrAr * finRate);
  const totalCarryingCostAr =
    volumes.totalAnnualStorageAr + annualWorkingCapitalFinancingCostAr;

  const avgPaddyDays =
    (stock.paddyHoldingDaysHS * hsMonths + stock.paddyHoldingDaysBS * bsMonths) / totalMonths +
    stock.paddySafetyStockDays;
  const avgRiceDays =
    (stock.milledRiceHoldingDaysHS * hsMonths + stock.milledRiceHoldingDaysBS * bsMonths) /
      totalMonths +
    stock.milledRiceSafetyStockDays;
  const cashConversionDays = Math.round(avgPaddyDays + avgRiceDays);

  // Optimization simulation: reduce holding & safety days by targetHoldingReductionPct
  const redFactor = Math.max(0, Math.min(0.8, (stock.targetHoldingReductionPct || 0) / 100));
  const optStock: StockManagementAssumptions = {
    ...stock,
    paddyHoldingDaysHS: stock.paddyHoldingDaysHS * (1 - redFactor),
    paddyHoldingDaysBS: stock.paddyHoldingDaysBS * (1 - redFactor),
    paddySafetyStockDays: stock.paddySafetyStockDays * (1 - redFactor * 0.5),
    milledRiceHoldingDaysHS: stock.milledRiceHoldingDaysHS * (1 - redFactor),
    milledRiceHoldingDaysBS: stock.milledRiceHoldingDaysBS * (1 - redFactor),
    milledRiceSafetyStockDays: stock.milledRiceSafetyStockDays * (1 - redFactor * 0.5),
  };
  const optVol = computeAverageStockVolumesAndCosts(assumptions, optStock);
  const optimizedStockBfrAr = Math.round(
    optVol.weightedAvgPaddyKg * avgPaddyCostAr + optVol.weightedAvgRiceKg * avgMilledRiceCostAr
  );
  const bfrCashReleasedAr = Math.max(0, totalStockBfrAr - optimizedStockBfrAr);
  const optFinancingCost = Math.round(optimizedStockBfrAr * finRate);
  const optimizedCarryingSavingsAr = Math.max(
    0,
    totalCarryingCostAr - (optVol.totalAnnualStorageAr + optFinancingCost)
  );

  const paddyShelfLifeAlert =
    Math.max(stock.paddyHoldingDaysHS, stock.paddyHoldingDaysBS) > stock.paddyMaxShelfLifeDays;
  const riceShelfLifeAlert =
    Math.max(stock.milledRiceHoldingDaysHS, stock.milledRiceHoldingDaysBS) >
    stock.milledRiceMaxShelfLifeDays;

  const curveMultipliers = [0.4, 0.7, 1.0, 1.35, 1.75, 2.2];
  const curveData: StockBfrCurvePoint[] = curveMultipliers.map((mult) => {
    const simStock: StockManagementAssumptions = {
      ...stock,
      paddyHoldingDaysHS: stock.paddyHoldingDaysHS * mult,
      paddyHoldingDaysBS: stock.paddyHoldingDaysBS * mult,
      milledRiceHoldingDaysHS: stock.milledRiceHoldingDaysHS * mult,
      milledRiceHoldingDaysBS: stock.milledRiceHoldingDaysBS * mult,
    };
    const simVol = computeAverageStockVolumesAndCosts(assumptions, simStock);
    const simBfr =
      simVol.weightedAvgPaddyKg * avgPaddyCostAr + simVol.weightedAvgRiceKg * avgMilledRiceCostAr;
    const simDays = Math.round((avgPaddyDays - stock.paddySafetyStockDays) * mult + (avgRiceDays - stock.milledRiceSafetyStockDays) * mult + stock.paddySafetyStockDays + stock.milledRiceSafetyStockDays);
    const simHolding = simVol.totalAnnualStorageAr + simBfr * finRate;

    return {
      daysLabel: `${simDays} j`,
      totalDays: simDays,
      bfrStockMAr: Number((simBfr / 1e6).toFixed(2)),
      annualHoldingCostMAr: Number((simHolding / 1e6).toFixed(2)),
    };
  });

  return {
    isSyncedToModel: Boolean(stock.enabled && stock.syncCostsToModel),
    weightedAvgPaddyKg: volumes.weightedAvgPaddyKg,
    weightedAvgRiceKg: volumes.weightedAvgRiceKg,
    bfrPaddyAr,
    bfrMilledRiceAr,
    totalStockBfrAr,
    totalAnnualStorageCostAr: volumes.totalAnnualStorageAr,
    annualWorkingCapitalFinancingCostAr,
    totalCarryingCostAr,
    cashConversionDays,
    optimizedStockBfrAr,
    bfrCashReleasedAr,
    optimizedCarryingSavingsAr,
    paddyShelfLifeAlert,
    riceShelfLifeAlert,
    baselineNetResultAr: baseModel.year1.netResultAfterTaxAr,
    withStockCostsNetResultAr: taxedModel.year1.netResultAfterTaxAr,
    curveData,
  };
}
