import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { getResolvedLogistics, ROAD_CONDITION_META } from './logistics';
import { getResolvedStockManagement } from './stockManagement';
import { computeStorageWeightLossRate, getResolvedStorageOptimization } from './storage';

export type LifecycleScope = 'annual' | 'hauteSaison' | 'basseSaison';

export interface LifecycleStageItem {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  avgCycleDays: number;
  inputMassPerRotKg: number;
  outputMassPerRotKg: number;
  massRetentionPct: number;
  cumulativeValuePerKgPaddyAr: number;
  keyMetricLabel: string;
  keyMetricValue: string;
}

export interface MassBalanceSlice {
  name: string;
  kgPerTonPaddy: number;
  pct: number;
  color: string;
}

export interface ProductLifecycleAnalysis {
  scope: LifecycleScope;
  scopeLabel: string;
  paddyPerRotationKg: number;
  milledRicePerRotationKg: number;
  byproductsPerRotationKg: number;
  millingYieldPct: number;
  wholeRiceRatioPct: number;
  brokenRiceRatioPct: number;
  postHarvestLossPct: number;
  huskAndResiduePct: number;
  bagsPerRotation: number;
  bagCapacityKg: number;
  totalCycleDays: number;
  revenuePerKgPaddyAr: number;
  grossMarginPerKgPaddyAr: number;
  stages: LifecycleStageItem[];
  massBalance: MassBalanceSlice[];
  cycleChartData: Array<{
    stage: string;
    days: number;
    pctOfCycle: number;
  }>;
}

export function computeProductLifecycle(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  scope: LifecycleScope = 'annual',
  millingThroughputKgPerHour = 1200
): ProductLifecycleAnalysis {
  const logistics = getResolvedLogistics(assumptions);
  const stock = getResolvedStockManagement(assumptions);
  const storage = getResolvedStorageOptimization(assumptions);

  const hsMonths = Math.max(1, assumptions.hauteSaison.months);
  const bsMonths = Math.max(1, assumptions.basseSaison.months);
  const totalMonths = hsMonths + bsMonths;

  const pick = <T extends number>(hsVal: T, bsVal: T): number => {
    if (scope === 'hauteSaison') return hsVal;
    if (scope === 'basseSaison') return bsVal;
    return (hsVal * hsMonths + bsVal * bsMonths) / totalMonths;
  };

  const paddyPerRotationKg = pick(
    model.hauteSaison.paddyKgPerRotation,
    model.basseSaison.paddyKgPerRotation
  );
  const milledRicePerRotationKg = pick(
    model.hauteSaison.riceKgPerRotation,
    model.basseSaison.riceKgPerRotation
  );
  const byproductsPerRotationKg = pick(
    model.hauteSaison.byproductsKgPerRotation,
    model.basseSaison.byproductsKgPerRotation
  );
  const bagsPerRotation = pick(
    model.hauteSaison.bagsPerRotation,
    model.basseSaison.bagsPerRotation
  );
  const turnoverPerRotationAr = pick(
    model.hauteSaison.turnoverPerRotationAr,
    model.basseSaison.turnoverPerRotationAr
  );
  const grossProfitPerRotationAr = pick(
    model.hauteSaison.grossProfitPerRotationAr,
    model.basseSaison.grossProfitPerRotationAr
  );
  const costPerKgPaddyAr = pick(
    model.hauteSaison.costPerKgPaddyAr,
    model.basseSaison.costPerKgPaddyAr
  );

  const millingYieldPct =
    paddyPerRotationKg > 0
      ? (milledRicePerRotationKg / paddyPerRotationKg) * 100
      : assumptions.hauteSaison.yieldPaddyToRice * 100;

  // Post-harvest storage weight loss rate if enabled
  const postHarvestLossPct = storage.enabled
    ? Number((computeStorageWeightLossRate(storage).totalLossRate * 100).toFixed(1))
    : 0;

  // Byproducts vs Husk split (non-milled fraction = 100 - millingYieldPct)
  const nonRicePct = Math.max(0, 100 - millingYieldPct);
  const valorizedSonPct = Number(Math.min(nonRicePct, 10).toFixed(1));
  const huskAndResiduePct = Number(Math.max(0, nonRicePct - valorizedSonPct).toFixed(1));

  // Cycle time estimates (days)
  const collectKm = pick(logistics.distanceOneWayKmHS, logistics.distanceOneWayKmBS);
  const roadCond =
    scope === 'basseSaison' ? logistics.roadConditionBS : logistics.roadConditionHS;
  const roadSpeedKmh =
    roadCond === 'goudronnee' ? 45 : roadCond === 'piste_praticable' ? 25 : 14;
  const collectHours = (collectKm * 2) / roadSpeedKmh + 6; // +6h loading/weighing
  const collectionDays = Number(Math.max(0.4, collectHours / 24).toFixed(1));

  const paddyStorageDays = stock.enabled
    ? Number(
        (
          pick(stock.paddyHoldingDaysHS, stock.paddyHoldingDaysBS) +
          stock.paddySafetyStockDays * 0.5
        ).toFixed(1)
      )
    : Number((15 / Math.max(1, pick(assumptions.hauteSaison.rotationsPerMonth, assumptions.basseSaison.rotationsPerMonth))).toFixed(1));

  const safeThroughput = Math.max(300, millingThroughputKgPerHour);
  const millingHours = paddyPerRotationKg / safeThroughput;
  const millingDays = Number(Math.max(0.2, millingHours / 8).toFixed(1)); // 8h/day shift

  const riceStorageDays = stock.enabled
    ? Number(
        (
          pick(stock.milledRiceHoldingDaysHS, stock.milledRiceHoldingDaysBS) +
          stock.milledRiceSafetyStockDays * 0.5
        ).toFixed(1)
      )
    : 5.0;

  const urbanKm = logistics.includeUrbanDistribution
    ? pick(logistics.distanceToUrbanMarketKmHS ?? 180, logistics.distanceToUrbanMarketKmBS ?? 180)
    : 0;
  const distributionDays = logistics.includeUrbanDistribution
    ? Number(Math.max(0.5, urbanKm / 300 + 0.6).toFixed(1))
    : 0.5;

  const totalCycleDays = Number(
    (
      collectionDays +
      paddyStorageDays +
      millingDays +
      riceStorageDays +
      distributionDays
    ).toFixed(1)
  );

  const revenuePerKgPaddyAr =
    paddyPerRotationKg > 0 ? turnoverPerRotationAr / paddyPerRotationKg : 0;
  const grossMarginPerKgPaddyAr =
    paddyPerRotationKg > 0 ? grossProfitPerRotationAr / paddyPerRotationKg : 0;

  const collectRoadMult = ROAD_CONDITION_META[roadCond]?.multiplier ?? 1;
  const cleanPaddyKg = paddyPerRotationKg * (1 - postHarvestLossPct / 100);

  const stages: LifecycleStageItem[] = [
    {
      id: 'collecte',
      stepNumber: 1,
      title: 'Collecte Rizières',
      subtitle: `${Math.round(collectKm)} km aller (${ROAD_CONDITION_META[roadCond]?.shortLabel || 'Route'})`,
      avgCycleDays: collectionDays,
      inputMassPerRotKg: Math.round(paddyPerRotationKg),
      outputMassPerRotKg: Math.round(paddyPerRotationKg),
      massRetentionPct: 100,
      cumulativeValuePerKgPaddyAr: Math.round(costPerKgPaddyAr * 0.85),
      keyMetricLabel: 'Indice route',
      keyMetricValue: `×${collectRoadMult.toFixed(2)}`,
    },
    {
      id: 'stock_paddy',
      stepNumber: 2,
      title: 'Séchage & Stock Paddy',
      subtitle: `Humidité cible ${storage.moisturePercent.toFixed(1)} %`,
      avgCycleDays: paddyStorageDays,
      inputMassPerRotKg: Math.round(paddyPerRotationKg),
      outputMassPerRotKg: Math.round(cleanPaddyKg),
      massRetentionPct: Number((100 - postHarvestLossPct).toFixed(1)),
      cumulativeValuePerKgPaddyAr: Math.round(costPerKgPaddyAr * 0.92),
      keyMetricLabel: 'Freinte stockage',
      keyMetricValue: `−${postHarvestLossPct.toFixed(1)} %`,
    },
    {
      id: 'usinage',
      stepNumber: 3,
      title: 'Transformation Industrielle',
      subtitle: `Débit ${Math.round(safeThroughput).toLocaleString('fr-FR')} kg/h`,
      avgCycleDays: millingDays,
      inputMassPerRotKg: Math.round(cleanPaddyKg),
      outputMassPerRotKg: Math.round(milledRicePerRotationKg),
      massRetentionPct: Number(millingYieldPct.toFixed(1)),
      cumulativeValuePerKgPaddyAr: Math.round(costPerKgPaddyAr),
      keyMetricLabel: 'Rendement usinage',
      keyMetricValue: `${millingYieldPct.toFixed(1)} %`,
    },
    {
      id: 'ensachage',
      stepNumber: 4,
      title: 'Ensachage & Stock Riz',
      subtitle: `${Math.round(bagsPerRotation)} sacs × ${assumptions.selectedBagCapacityKg} kg`,
      avgCycleDays: riceStorageDays,
      inputMassPerRotKg: Math.round(milledRicePerRotationKg),
      outputMassPerRotKg: Math.round(milledRicePerRotationKg),
      massRetentionPct: Number(millingYieldPct.toFixed(1)),
      cumulativeValuePerKgPaddyAr: Math.round(costPerKgPaddyAr * 1.06),
      keyMetricLabel: 'Unités produites',
      keyMetricValue: `${Math.round(bagsPerRotation)} sacs`,
    },
    {
      id: 'distribution',
      stepNumber: 5,
      title: 'Distribution & Vente',
      subtitle: logistics.includeUrbanDistribution
        ? `Corridor urbain ${Math.round(urbanKm)} km`
        : 'Vente départ rizerie',
      avgCycleDays: distributionDays,
      inputMassPerRotKg: Math.round(milledRicePerRotationKg),
      outputMassPerRotKg: Math.round(milledRicePerRotationKg),
      massRetentionPct: Number(millingYieldPct.toFixed(1)),
      cumulativeValuePerKgPaddyAr: Math.round(revenuePerKgPaddyAr),
      keyMetricLabel: 'Valeur créée',
      keyMetricValue: `${Math.round(revenuePerKgPaddyAr).toLocaleString('fr-FR')} Ar/kg`,
    },
  ];

  const wholeRiceShare = 0.82;
  const wholeRicePct = Number((millingYieldPct * wholeRiceShare).toFixed(1));
  const brokenRicePct = Number((millingYieldPct * (1 - wholeRiceShare)).toFixed(1));

  const massBalance: MassBalanceSlice[] = [
    {
      name: 'Riz blanc entier',
      kgPerTonPaddy: Math.round(wholeRicePct * 10),
      pct: wholeRicePct,
      color: '#14b8a6',
    },
    {
      name: 'Brisures marchandes',
      kgPerTonPaddy: Math.round(brokenRicePct * 10),
      pct: brokenRicePct,
      color: '#6366f1',
    },
    {
      name: 'Son & issues valorisables',
      kgPerTonPaddy: Math.round(valorizedSonPct * 10),
      pct: valorizedSonPct,
      color: '#f59e0b',
    },
    {
      name: 'Balles de paddy / Enveloppes',
      kgPerTonPaddy: Math.round(huskAndResiduePct * 10),
      pct: huskAndResiduePct,
      color: '#64748b',
    },
  ];

  const cycleChartData = stages.map((st) => ({
    stage: st.title,
    days: st.avgCycleDays,
    pctOfCycle:
      totalCycleDays > 0 ? Number(((st.avgCycleDays / totalCycleDays) * 100).toFixed(1)) : 0,
  }));

  const scopeLabel =
    scope === 'hauteSaison'
      ? 'Haute Saison (HS)'
      : scope === 'basseSaison'
        ? 'Basse Saison (BS)'
        : 'Moyenne annuelle pondérée';

  return {
    scope,
    scopeLabel,
    paddyPerRotationKg,
    milledRicePerRotationKg,
    byproductsPerRotationKg,
    millingYieldPct: Number(millingYieldPct.toFixed(1)),
    wholeRiceRatioPct: wholeRicePct,
    brokenRiceRatioPct: brokenRicePct,
    postHarvestLossPct,
    huskAndResiduePct,
    bagsPerRotation,
    bagCapacityKg: assumptions.selectedBagCapacityKg,
    totalCycleDays,
    revenuePerKgPaddyAr,
    grossMarginPerKgPaddyAr,
    stages,
    massBalance,
    cycleChartData,
  };
}
