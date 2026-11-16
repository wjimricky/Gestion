import {
  ClimateImpactAssumptions,
  FinancialAssumptions,
  StorageMethodType,
  StorageOptimizationAssumptions,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';
import { getResolvedClimateImpact, getResolvedClimateShocks } from './climate';

export interface StorageMethodMeta {
  label: string;
  shortLabel: string;
  protectionFactor: number; // multiplier on biological/spoilage losses (1.0 = baseline standard sacks)
  durationProtectionFactor: number;
  description: string;
}

export const STORAGE_METHOD_META: Record<StorageMethodType, StorageMethodMeta> = {
  sacs_standard: {
    label: 'Entrepôt traditionnel (Sacs PP standard)',
    shortLabel: 'Entrepôt traditionnel',
    protectionFactor: 1.0,
    durationProtectionFactor: 1.0,
    description:
      'Entrepôt classique non régulé en sacs tissés PP : vulnérable à l’humidité résiduelle (> 14 %), aux moisissures et aux insectes au-delà de 30 jours.',
  },
  grenier_ventile: {
    label: 'Entrepôt ventilé & caillebotis (hygrométrie régulée)',
    shortLabel: 'Entrepôt ventilé',
    protectionFactor: 0.62,
    durationProtectionFactor: 0.55,
    description:
      'Entrepôt aéré avec caillebotis, contrôle hygrométrique et traitement préventif : réduit de ~40 % les pertes biologiques par rapport à un entrepôt traditionnel.',
  },
  sacs_hermetiques_pics: {
    label: 'Sacs hermétiques PICS (triple couche sans pesticides)',
    shortLabel: 'Sacs hermétiques PICS',
    protectionFactor: 0.28,
    durationProtectionFactor: 0.2,
    description:
      'Technologie hermétique privant les ravageurs et moisissures d’oxygène : limite fortement les pertes post-récolte même sur un stockage long (90–180 jours).',
  },
};

export function getResolvedStorageOptimization(
  assumptions: FinancialAssumptions
): StorageOptimizationAssumptions {
  const existing = assumptions.storageOptimization;
  return {
    enabled: existing?.enabled ?? true,
    storageDurationDays: existing?.storageDurationDays ?? 30,
    moisturePercent: existing?.moisturePercent ?? 14.0,
    storageMethod: existing?.storageMethod ?? 'sacs_standard',
    affectedSeason: existing?.affectedSeason ?? 'both',
    storageCapacityKg: existing?.storageCapacityKg ?? 40000,
  };
}

/**
 * Computes post-harvest weight/spoilage loss ratio (0..0.42) from storage duration (days),
 * grain moisture (%), and storage technology.
 * Returns exact 0 when moisture <= 14.0% and duration <= 30 days (safe dry paddy baseline).
 */
export function computeStorageWeightLossRate(
  storage: Pick<
    StorageOptimizationAssumptions,
    'storageDurationDays' | 'moisturePercent' | 'storageMethod'
  >,
  capacityOverflowRatio = 0
): {
  totalLossRate: number;
  moistureLossRate: number;
  durationPestLossRate: number;
  desiccationRate: number;
  capacityOverflowLossRate: number;
  riskLevel: 'optimal' | 'vigilance' | 'critique';
} {
  const days = Math.max(0, storage.storageDurationDays);
  const moisture = Math.max(8, Math.min(35, storage.moisturePercent));
  const meta = STORAGE_METHOD_META[storage.storageMethod];

  const excessMoisture = Math.max(0, moisture - 14.0);
  const excessDays = Math.max(0, days - 30);
  const safeOverflow = Math.max(0, capacityOverflowRatio);

  if (excessMoisture <= 1e-6 && excessDays <= 1e-6 && safeOverflow <= 1e-6) {
    return {
      totalLossRate: 0,
      moistureLossRate: 0,
      durationPestLossRate: 0,
      desiccationRate: 0,
      capacityOverflowLossRate: 0,
      riskLevel: 'optimal',
    };
  }

  // Physical moisture shrinkage toward 14% equilibrium when stored wet
  const desiccationRate =
    excessMoisture > 0
      ? Math.min(0.11, (excessMoisture / 100) * Math.min(1, days / 75) * 0.65)
      : 0;

  // Fungal / heating / respiration loss driven by excess humidity × duration
  const timeExponent = Math.pow(Math.max(days, 15) / 30, 0.72);
  const moistureLossRate =
    excessMoisture > 0
      ? Math.min(
          0.25,
          (0.0065 * excessMoisture + 0.0018 * excessMoisture * excessMoisture) *
            timeExponent *
            meta.protectionFactor
        )
      : 0;

  // Insect / pest / handling spoilage over extended storage (> 30 days)
  const durationPestLossRate =
    excessDays > 0
      ? Math.min(
          0.14,
          0.0075 *
            (excessDays / 30) *
            meta.durationProtectionFactor *
            (1 + excessMoisture * 0.14)
        )
      : 0;

  // Overflow outside warehouse capacity increases spoilage (tarps / unventilated floor)
  const capacityOverflowLossRate =
    safeOverflow > 0
      ? Math.min(0.1, safeOverflow * 0.08 * meta.protectionFactor)
      : 0;

  const totalLossRate = Math.min(
    0.45,
    desiccationRate + moistureLossRate + durationPestLossRate + capacityOverflowLossRate
  );

  const riskLevel: 'optimal' | 'vigilance' | 'critique' =
    totalLossRate < 0.03 ? 'optimal' : totalLossRate < 0.08 ? 'vigilance' : 'critique';

  return {
    totalLossRate,
    moistureLossRate,
    durationPestLossRate,
    desiccationRate,
    capacityOverflowLossRate,
    riskLevel,
  };
}

/**
 * Unified season modifier applying BOTH Climate Impact (field volume + milling quality)
 * and Storage Optimization (post-harvest weight loss reducing end-of-season valorizable rice yield).
 * When climate is nominal and storage loss is 0%, returns exact baseline values (zero drift).
 */
export function applyClimateAndStorageToSeasons(
  assumptions: FinancialAssumptions,
  climateInput?: ClimateImpactAssumptions,
  storageInput?: StorageOptimizationAssumptions
): Pick<FinancialAssumptions, 'hauteSaison' | 'basseSaison'> {
  const climate = climateInput ?? getResolvedClimateImpact(assumptions);
  const storage = storageInput ?? getResolvedStorageOptimization(assumptions);

  const shocks = getResolvedClimateShocks(
    climate,
    assumptions.hauteSaison.months,
    assumptions.basseSaison.months
  );

  const hsFactor = Math.max(0.05, 1 + shocks.hsFieldShockPercent);
  const bsFactor = Math.max(0.05, 1 + shocks.bsFieldShockPercent);

  const hsPaddy = Math.max(100, Math.round(climate.baselinePaddyKgHS * hsFactor));
  const bsPaddy = Math.max(100, Math.round(climate.baselinePaddyKgBS * bsFactor));

  const avgRotPerMonth =
    (assumptions.hauteSaison.rotationsPerMonth +
      assumptions.basseSaison.rotationsPerMonth) /
    2;
  const maxPaddyPerRot = Math.max(hsPaddy, bsPaddy);
  const concurrentRotations = Math.max(
    1,
    (storage.storageDurationDays / 30) * avgRotPerMonth
  );
  const peakStockPaddyKg = Math.round(maxPaddyPerRot * concurrentRotations);
  const capacityKg = Math.max(5000, storage.storageCapacityKg ?? 40000);
  const overflowRatio =
    peakStockPaddyKg > capacityKg
      ? (peakStockPaddyKg - capacityKg) / Math.max(peakStockPaddyKg, 1)
      : 0;

  const storageLoss = storage.enabled
    ? computeStorageWeightLossRate(storage, overflowRatio).totalLossRate
    : 0;

  const storageHS =
    storage.enabled &&
    (storage.affectedSeason === 'both' || storage.affectedSeason === 'hauteSaison');
  const storageBS =
    storage.enabled &&
    (storage.affectedSeason === 'both' || storage.affectedSeason === 'basseSaison');

  const baseYieldHS = climate.baselineMillingYieldHS + shocks.hsMillingDeltaPoints;
  const baseYieldBS = climate.baselineMillingYieldBS + shocks.bsMillingDeltaPoints;

  const hsYield = Math.max(
    0.15,
    Math.min(0.95, Number((baseYieldHS * (1 - (storageHS ? storageLoss : 0))).toFixed(4)))
  );
  const bsYield = Math.max(
    0.15,
    Math.min(0.95, Number((baseYieldBS * (1 - (storageBS ? storageLoss : 0))).toFixed(4)))
  );

  return {
    hauteSaison: {
      ...assumptions.hauteSaison,
      paddyBoughtKgPerRotation: hsPaddy,
      yieldPaddyToRice: hsYield,
    },
    basseSaison: {
      ...assumptions.basseSaison,
      paddyBoughtKgPerRotation: bsPaddy,
      yieldPaddyToRice: bsYield,
    },
  };
}

export interface StorageCurvePoint {
  days: number;
  label: string;
  lossSacsStandardPct: number;
  lossGrenierVentilePct: number;
  lossSacsPicsPct: number;
}

export interface StorageMethodComparison {
  method: StorageMethodType;
  shortLabel: string;
  lossRate: number;
  valorizablePaddyKg: number;
  valorizableRiceKg: number;
  annualTurnoverAr: number;
  savedTurnoverVsStandardAr: number;
}

export interface StorageSimulationPreview {
  totalLossRate: number;
  moistureLossRate: number;
  durationPestLossRate: number;
  desiccationRate: number;
  riskLevel: 'optimal' | 'vigilance' | 'critique';
  storageCapacityKg: number;
  peakStockPaddyKg: number;
  capacityUtilizationPct: number;
  isOverCapacity: boolean;
  overflowExcessKg: number;
  baselinePurchasedPaddyKg: number;
  valorizablePaddyKg: number;
  lostPaddyKg: number;
  baselineRiceKg: number;
  valorizableRiceKg: number;
  lostRiceKg: number;
  baselineTurnoverAr: number;
  valorizableTurnoverAr: number;
  turnoverLossAr: number;
  grossMarginBefore: number;
  grossMarginAfter: number;
  grossProfitDeltaAr: number;
  netMarginBeforeAr: number;
  netMarginAfterAr: number;
  netProfitDeltaAr: number;
  netMarginDeltaPts: number;
  curveData: StorageCurvePoint[];
  methodComparison: StorageMethodComparison[];
}

export function computeStorageSimulationPreview(
  assumptions: FinancialAssumptions,
  storage: StorageOptimizationAssumptions
): StorageSimulationPreview {
  const climate = getResolvedClimateImpact(assumptions);

  // Baseline with zero storage loss (keeping current climate state)
  const noLossStorage: StorageOptimizationAssumptions = {
    ...storage,
    enabled: false,
  };
  const zeroLossSeasons = applyClimateAndStorageToSeasons(assumptions, climate, noLossStorage);
  const zeroLossAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...zeroLossSeasons,
  };
  const zeroLossModel = calculateFullModel(zeroLossAssumptions);

  // Simulated with active storage parameters (even if sync toggle paused)
  const activeStorage: StorageOptimizationAssumptions = {
    ...storage,
    enabled: true,
  };
  const shockedSeasons = applyClimateAndStorageToSeasons(assumptions, climate, activeStorage);
  const shockedAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...shockedSeasons,
  };
  const shockedModel = calculateFullModel(shockedAssumptions);

  const capKg = Math.max(5000, storage.storageCapacityKg ?? 40000);
  const avgRotM =
    (zeroLossModel.hauteSaison.rotationsPerMonth +
      zeroLossModel.basseSaison.rotationsPerMonth) /
    2;
  const maxRotP = Math.max(
    zeroLossModel.hauteSaison.paddyKgPerRotation,
    zeroLossModel.basseSaison.paddyKgPerRotation
  );
  const concRot = Math.max(1, (storage.storageDurationDays / 30) * avgRotM);
  const peakP = Math.round(maxRotP * concRot);
  const ovfRatio = peakP > capKg ? (peakP - capKg) / Math.max(peakP, 1) : 0;

  const lossBreakdown = computeStorageWeightLossRate(storage, ovfRatio);

  const baselinePurchasedPaddyKg =
    zeroLossModel.hauteSaison.totalPaddyKg + zeroLossModel.basseSaison.totalPaddyKg;
  const baselineRiceKg = zeroLossModel.year1.totalRiceKgSold;
  const valorizableRiceKg = shockedModel.year1.totalRiceKgSold;
  const lostRiceKg = Math.max(0, baselineRiceKg - valorizableRiceKg);

  // Equivalent valorizable paddy remaining at end of season across affected seasons
  const hsWeight =
    storage.affectedSeason === 'both' || storage.affectedSeason === 'hauteSaison'
      ? 1 - lossBreakdown.totalLossRate
      : 1;
  const bsWeight =
    storage.affectedSeason === 'both' || storage.affectedSeason === 'basseSaison'
      ? 1 - lossBreakdown.totalLossRate
      : 1;
  const valorizablePaddyKg =
    zeroLossModel.hauteSaison.totalPaddyKg * hsWeight +
    zeroLossModel.basseSaison.totalPaddyKg * bsWeight;
  const lostPaddyKg = Math.max(0, baselinePurchasedPaddyKg - valorizablePaddyKg);

  const curveDurations = [15, 30, 60, 90, 120, 150, 180];
  const curveData: StorageCurvePoint[] = curveDurations.map((days) => ({
    days,
    label: `${days} j`,
    lossSacsStandardPct: Number(
      (
        computeStorageWeightLossRate({
          storageDurationDays: days,
          moisturePercent: storage.moisturePercent,
          storageMethod: 'sacs_standard',
        }).totalLossRate * 100
      ).toFixed(2)
    ),
    lossGrenierVentilePct: Number(
      (
        computeStorageWeightLossRate({
          storageDurationDays: days,
          moisturePercent: storage.moisturePercent,
          storageMethod: 'grenier_ventile',
        }).totalLossRate * 100
      ).toFixed(2)
    ),
    lossSacsPicsPct: Number(
      (
        computeStorageWeightLossRate({
          storageDurationDays: days,
          moisturePercent: storage.moisturePercent,
          storageMethod: 'sacs_hermetiques_pics',
        }).totalLossRate * 100
      ).toFixed(2)
    ),
  }));

  const methods: StorageMethodType[] = [
    'sacs_standard',
    'grenier_ventile',
    'sacs_hermetiques_pics',
  ];
  const rawComparisons = methods.map((method) => {
    const mStorage: StorageOptimizationAssumptions = {
      ...storage,
      enabled: true,
      storageMethod: method,
    };
    const mRate = computeStorageWeightLossRate(mStorage).totalLossRate;
    const mSeasons = applyClimateAndStorageToSeasons(assumptions, climate, mStorage);
    const mModel = calculateFullModel({
      ...assumptions,
      ...mSeasons,
    });
    const mHsW =
      storage.affectedSeason === 'both' || storage.affectedSeason === 'hauteSaison'
        ? 1 - mRate
        : 1;
    const mBsW =
      storage.affectedSeason === 'both' || storage.affectedSeason === 'basseSaison'
        ? 1 - mRate
        : 1;
    const mValPaddy =
      zeroLossModel.hauteSaison.totalPaddyKg * mHsW +
      zeroLossModel.basseSaison.totalPaddyKg * mBsW;
    return {
      method,
      shortLabel: STORAGE_METHOD_META[method].shortLabel,
      lossRate: mRate,
      valorizablePaddyKg: mValPaddy,
      valorizableRiceKg: mModel.year1.totalRiceKgSold,
      annualTurnoverAr: mModel.year1.totalTurnoverAr,
    };
  });

  const stdTurnover = rawComparisons[0].annualTurnoverAr;
  const methodComparison: StorageMethodComparison[] = rawComparisons.map((item) => ({
    ...item,
    savedTurnoverVsStandardAr: Math.max(0, item.annualTurnoverAr - stdTurnover),
  }));

  const storageCapacityKg = Math.max(5000, storage.storageCapacityKg ?? 40000);
  const avgRotPerMonth =
    (zeroLossModel.hauteSaison.rotationsPerMonth +
      zeroLossModel.basseSaison.rotationsPerMonth) /
    2;
  const maxRotPaddyKg = Math.max(
    zeroLossModel.hauteSaison.paddyKgPerRotation,
    zeroLossModel.basseSaison.paddyKgPerRotation
  );
  const concurrentRotations = Math.max(
    1,
    (storage.storageDurationDays / 30) * avgRotPerMonth
  );
  const peakStockPaddyKg = Math.round(maxRotPaddyKg * concurrentRotations);
  const capacityUtilizationPct = (peakStockPaddyKg / storageCapacityKg) * 100;
  const isOverCapacity = peakStockPaddyKg > storageCapacityKg;
  const overflowExcessKg = Math.max(0, peakStockPaddyKg - storageCapacityKg);

  return {
    totalLossRate: lossBreakdown.totalLossRate,
    moistureLossRate: lossBreakdown.moistureLossRate,
    durationPestLossRate: lossBreakdown.durationPestLossRate,
    desiccationRate: lossBreakdown.desiccationRate,
    riskLevel: lossBreakdown.riskLevel,
    storageCapacityKg,
    peakStockPaddyKg,
    capacityUtilizationPct,
    isOverCapacity,
    overflowExcessKg,
    baselinePurchasedPaddyKg,
    valorizablePaddyKg,
    lostPaddyKg,
    baselineRiceKg,
    valorizableRiceKg,
    lostRiceKg,
    baselineTurnoverAr: zeroLossModel.year1.totalTurnoverAr,
    valorizableTurnoverAr: shockedModel.year1.totalTurnoverAr,
    turnoverLossAr: Math.max(
      0,
      zeroLossModel.year1.totalTurnoverAr - shockedModel.year1.totalTurnoverAr
    ),
    grossMarginBefore: zeroLossModel.year1.grossMarginRate,
    grossMarginAfter: shockedModel.year1.grossMarginRate,
    grossProfitDeltaAr:
      shockedModel.year1.annualGrossProfitAr - zeroLossModel.year1.annualGrossProfitAr,
    netMarginBeforeAr: zeroLossModel.year1.netMarginAfterTaxRate,
    netMarginAfterAr: shockedModel.year1.netMarginAfterTaxRate,
    netProfitDeltaAr:
      shockedModel.year1.netResultAfterTaxAr - zeroLossModel.year1.netResultAfterTaxAr,
    netMarginDeltaPts:
      (shockedModel.year1.netMarginAfterTaxRate - zeroLossModel.year1.netMarginAfterTaxRate) *
      100,
    curveData,
    methodComparison,
  };
}
