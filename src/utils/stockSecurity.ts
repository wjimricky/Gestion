import {
  FinancialAssumptions,
  FullFinancialModel,
  PaddyStockAssumptions,
} from '../types/finance';
import { computeStorageWeightLossRate, getResolvedStorageOptimization } from './storage';

export const DEFAULT_PADDY_STOCK_ASSUMPTIONS: PaddyStockAssumptions = {
  currentStockKg: 32000,
  upcomingOrdersRiceKg: 14000,
  replenishmentLeadDays: 10,
  safetyMarginDays: 6,
};

export function getResolvedPaddyStock(
  assumptions: FinancialAssumptions
): PaddyStockAssumptions {
  const existing = assumptions.paddyStock;
  return {
    currentStockKg: existing?.currentStockKg ?? DEFAULT_PADDY_STOCK_ASSUMPTIONS.currentStockKg,
    upcomingOrdersRiceKg:
      existing?.upcomingOrdersRiceKg ?? DEFAULT_PADDY_STOCK_ASSUMPTIONS.upcomingOrdersRiceKg,
    replenishmentLeadDays:
      existing?.replenishmentLeadDays ?? DEFAULT_PADDY_STOCK_ASSUMPTIONS.replenishmentLeadDays,
    safetyMarginDays:
      existing?.safetyMarginDays ?? DEFAULT_PADDY_STOCK_ASSUMPTIONS.safetyMarginDays,
  };
}

export type StockSecurityStatus = 'securise' | 'vigilance' | 'critique';

export interface PaddyStockSecurityResult {
  rawStockKg: number;
  storageLossRate: number;
  storageLossKg: number;
  usableStockKg: number;
  weightedYieldRatio: number;
  upcomingOrdersRiceKg: number;
  paddyNeededForOrdersKg: number;
  dailyPaddyDemandKg: number;
  leadTimeBufferKg: number;
  safetyThresholdKg: number;
  shortfallKg: number; // > 0 when below safety threshold
  surplusKg: number; // >= 0 when above safety threshold
  daysOfAutonomy: number;
  requiredAutonomyDays: number;
  orderFulfillmentRatio: number; // 0..1+ (usableStock / paddyNeededForOrdersKg)
  thresholdCoverageRatio: number; // usableStock / safetyThresholdKg
  status: StockSecurityStatus;
  recommendedReorderKg: number;
}

/**
 * Evaluates current usable paddy inventory (net of post-harvest storage losses)
 * against the safety threshold required to fulfill upcoming firm rice orders
 * and cover procurement lead time + safety buffer days.
 */
export function evaluatePaddyStockSecurity(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel
): PaddyStockSecurityResult {
  const stock = getResolvedPaddyStock(assumptions);
  const storage = getResolvedStorageOptimization(assumptions);
  const storageLossRate = storage.enabled
    ? computeStorageWeightLossRate(storage).totalLossRate
    : 0;

  const rawStockKg = Math.max(0, stock.currentStockKg);
  const storageLossKg = Math.round(rawStockKg * storageLossRate);
  const usableStockKg = Math.max(0, rawStockKg - storageLossKg);

  const totalPaddyAnnual =
    model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg;
  const weightedYieldRatio =
    totalPaddyAnnual > 0
      ? model.year1.totalRiceKgSold / totalPaddyAnnual
      : Math.max(0.4, assumptions.hauteSaison.yieldPaddyToRice || 0.7);

  const safeYield = Math.max(0.15, weightedYieldRatio);

  // Operational daily paddy demand from the financial model's annual throughput
  const annualDays = Math.max(1, (model.hauteSaison.months + model.basseSaison.months) * 30.4);
  const dailyPaddyDemandKg = totalPaddyAnnual / annualDays;

  // Paddy strictly required to honor upcoming firm rice orders
  const upcomingOrdersRiceKg = Math.max(0, stock.upcomingOrdersRiceKg);
  const paddyNeededForOrdersKg = Math.ceil(upcomingOrdersRiceKg / safeYield);

  // Buffer needed during procurement lead time & operational safety margin
  const requiredBufferDays = Math.max(
    1,
    stock.replenishmentLeadDays + stock.safetyMarginDays
  );
  const leadTimeBufferKg = Math.ceil(dailyPaddyDemandKg * stock.safetyMarginDays);

  // Safety threshold = max(orders + lead buffer, full leadTime+safety days demand)
  const cycleBufferKg = Math.ceil(dailyPaddyDemandKg * requiredBufferDays);
  const safetyThresholdKg = Math.max(
    paddyNeededForOrdersKg + leadTimeBufferKg,
    cycleBufferKg
  );

  const shortfallKg = Math.max(0, safetyThresholdKg - usableStockKg);
  const surplusKg = Math.max(0, usableStockKg - safetyThresholdKg);

  const daysOfAutonomy =
    dailyPaddyDemandKg > 0 ? usableStockKg / dailyPaddyDemandKg : 0;

  const orderFulfillmentRatio =
    paddyNeededForOrdersKg > 0 ? usableStockKg / paddyNeededForOrdersKg : 1;

  const thresholdCoverageRatio =
    safetyThresholdKg > 0 ? usableStockKg / safetyThresholdKg : 1;

  let status: StockSecurityStatus = 'securise';
  if (usableStockKg < paddyNeededForOrdersKg || thresholdCoverageRatio < 0.85) {
    status = 'critique';
  } else if (usableStockKg < safetyThresholdKg || thresholdCoverageRatio < 1.1) {
    status = 'vigilance';
  }

  const rotationSize = Math.max(
    1000,
    Math.round(assumptions.hauteSaison.paddyBoughtKgPerRotation || 17200)
  );
  const recommendedReorderKg =
    shortfallKg > 0
      ? Math.max(rotationSize, Math.ceil((shortfallKg + leadTimeBufferKg) / 1000) * 1000)
      : 0;

  return {
    rawStockKg,
    storageLossRate,
    storageLossKg,
    usableStockKg,
    weightedYieldRatio: safeYield,
    upcomingOrdersRiceKg,
    paddyNeededForOrdersKg,
    dailyPaddyDemandKg,
    leadTimeBufferKg,
    safetyThresholdKg,
    shortfallKg,
    surplusKg,
    daysOfAutonomy,
    requiredAutonomyDays: requiredBufferDays,
    orderFulfillmentRatio,
    thresholdCoverageRatio,
    status,
    recommendedReorderKg,
  };
}
