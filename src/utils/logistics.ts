import {
  CostPerRotation,
  FinancialAssumptions,
  FullFinancialModel,
  KpiAlertThresholds,
  LogisticsAssumptions,
  RoadCondition,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';
import { formatAriary, formatMonths, formatPercent } from './formatters';

export const ROAD_CONDITION_META: Record<
  RoadCondition,
  {
    label: string;
    shortLabel: string;
    multiplier: number;
    description: string;
  }
> = {
  goudronnee: {
    label: 'Route bitumée (RN)',
    shortLabel: 'Bitumée (×1,00)',
    multiplier: 1.0,
    description: 'Axes goudronnés (RN2, RN4, RN7) : consommation nominale et faible usure.',
  },
  piste_praticable: {
    label: 'Piste latérite praticable',
    shortLabel: 'Piste praticable (×1,60)',
    multiplier: 1.6,
    description: 'Pistes secondaires de collecte : +60 % surconsommation gasoil et usure.',
  },
  piste_degradee: {
    label: 'Piste dégradée / Saison des pluies',
    shortLabel: 'Piste dégradée (×2,20)',
    multiplier: 2.2,
    description: 'Pistes enclavées ou boueuses (Alaotra/Marovoay) : +120 % carburant et entretien.',
  },
};

export const URBAN_DISTRIBUTION_COST_ID = 'rot-transport-marche';

export const DEFAULT_LOGISTICS_ASSUMPTIONS: LogisticsAssumptions = {
  enabled: true,
  distanceOneWayKmHS: 25,
  distanceOneWayKmBS: 125,
  roadConditionHS: 'goudronnee',
  roadConditionBS: 'piste_praticable',
  fuelPriceArPerLiter: 5000,
  fuelConsumptionLPer100Km: 25,
  truckTollAndWearArPerKm: 750,
  includeUrbanDistribution: false,
  distanceToUrbanMarketKmHS: 180,
  distanceToUrbanMarketKmBS: 180,
  urbanRoadConditionHS: 'goudronnee',
  urbanRoadConditionBS: 'goudronnee',
  urbanFreightArPerTonKm: 320,
  urbanHandlingAndTollArPerRot: 45000,
  corridorPresetId: 'custom',
};

export interface CorridorLogisticsPreset {
  id: string;
  label: string;
  routeSummary: string;
  description: string;
  patch: Partial<LogisticsAssumptions>;
}

export const CORRIDOR_LOGISTICS_PRESETS: CorridorLogisticsPreset[] = [
  {
    id: 'alaotra_tana',
    label: 'Alaotra → Antananarivo',
    routeSummary: 'Collecte 35 km (piste) + RN44/RN2 255 km (urbain)',
    description: 'Bassin du Lac Alaotra acheminé vers les grossistes d’Antananarivo (Anosibe/Behoririka).',
    patch: {
      corridorPresetId: 'alaotra_tana',
      distanceOneWayKmHS: 35,
      distanceOneWayKmBS: 75,
      roadConditionHS: 'piste_praticable',
      roadConditionBS: 'piste_degradee',
      includeUrbanDistribution: true,
      distanceToUrbanMarketKmHS: 255,
      distanceToUrbanMarketKmBS: 255,
      urbanRoadConditionHS: 'goudronnee',
      urbanRoadConditionBS: 'piste_praticable',
      urbanFreightArPerTonKm: 330,
      urbanHandlingAndTollArPerRot: 55000,
    },
  },
  {
    id: 'vakinankaratra_tana',
    label: 'Vakinankaratra → Antananarivo',
    routeSummary: 'Collecte 20 km + RN7 165 km goudronné',
    description: 'Axes courts sur RN7 reliant la rizerie d’Antsirabe aux marchés de la capitale.',
    patch: {
      corridorPresetId: 'vakinankaratra_tana',
      distanceOneWayKmHS: 20,
      distanceOneWayKmBS: 45,
      roadConditionHS: 'goudronnee',
      roadConditionBS: 'piste_praticable',
      includeUrbanDistribution: true,
      distanceToUrbanMarketKmHS: 165,
      distanceToUrbanMarketKmBS: 165,
      urbanRoadConditionHS: 'goudronnee',
      urbanRoadConditionBS: 'goudronnee',
      urbanFreightArPerTonKm: 290,
      urbanHandlingAndTollArPerRot: 40000,
    },
  },
  {
    id: 'marovoay_mahajanga',
    label: 'Marovoay → Mahajanga',
    routeSummary: 'Collecte plaine 30 km + RN4 85 km',
    description: 'Corridor Nord-Ouest : faible éloignement portuaire avec fort contraste HS/BS sur pistes.',
    patch: {
      corridorPresetId: 'marovoay_mahajanga',
      distanceOneWayKmHS: 30,
      distanceOneWayKmBS: 65,
      roadConditionHS: 'piste_praticable',
      roadConditionBS: 'piste_degradee',
      includeUrbanDistribution: true,
      distanceToUrbanMarketKmHS: 85,
      distanceToUrbanMarketKmBS: 85,
      urbanRoadConditionHS: 'goudronnee',
      urbanRoadConditionBS: 'goudronnee',
      urbanFreightArPerTonKm: 310,
      urbanHandlingAndTollArPerRot: 35000,
    },
  },
  {
    id: 'sofia_toamasina',
    label: 'Sofia → Toamasina (Port)',
    routeSummary: 'Collecte 85 km piste + 440 km grand corridor',
    description: 'Longue distance inter-régionale testant le seuil de rentabilité logistique.',
    patch: {
      corridorPresetId: 'sofia_toamasina',
      distanceOneWayKmHS: 85,
      distanceOneWayKmBS: 140,
      roadConditionHS: 'piste_praticable',
      roadConditionBS: 'piste_degradee',
      includeUrbanDistribution: true,
      distanceToUrbanMarketKmHS: 440,
      distanceToUrbanMarketKmBS: 440,
      urbanRoadConditionHS: 'piste_praticable',
      urbanRoadConditionBS: 'piste_degradee',
      urbanFreightArPerTonKm: 360,
      urbanHandlingAndTollArPerRot: 75000,
    },
  },
];

export const DEFAULT_KPI_THRESHOLDS: Required<KpiAlertThresholds> = {
  minNpvAr: 0,
  minIrrRate: 0.12,
  maxPaybackMonths: 24,
  minNetMarginRate: 0.08,
  minOperatingMarginRate: 0.1,
  minGrossMarginRate: 0.2,
};

export function getResolvedLogistics(assumptions: FinancialAssumptions): LogisticsAssumptions {
  return {
    ...DEFAULT_LOGISTICS_ASSUMPTIONS,
    ...(assumptions.logistics || {}),
  };
}

export function getResolvedKpiThresholds(
  assumptions: FinancialAssumptions
): Required<KpiAlertThresholds> {
  return {
    minNpvAr: assumptions.kpiThresholds?.minNpvAr ?? DEFAULT_KPI_THRESHOLDS.minNpvAr,
    minIrrRate:
      assumptions.kpiThresholds?.minIrrRate ??
      assumptions.discountRate ??
      DEFAULT_KPI_THRESHOLDS.minIrrRate,
    maxPaybackMonths:
      assumptions.kpiThresholds?.maxPaybackMonths ?? DEFAULT_KPI_THRESHOLDS.maxPaybackMonths,
    minNetMarginRate:
      assumptions.kpiThresholds?.minNetMarginRate ??
      DEFAULT_KPI_THRESHOLDS.minNetMarginRate,
    minOperatingMarginRate:
      assumptions.kpiThresholds?.minOperatingMarginRate ??
      DEFAULT_KPI_THRESHOLDS.minOperatingMarginRate,
    minGrossMarginRate:
      assumptions.kpiThresholds?.minGrossMarginRate ??
      DEFAULT_KPI_THRESHOLDS.minGrossMarginRate,
  };
}

export interface SeasonLogisticsBreakdown {
  distanceOneWayKm: number;
  roundTripKm: number;
  roadCondition: RoadCondition;
  roadMultiplier: number;
  litersPerRotation: number;
  fuelCostAr: number;
  wearAndDriverCostAr: number;
  totalCostPerRotationAr: number;
}

export function computeSeasonLogisticsBreakdown(
  logistics: LogisticsAssumptions,
  season: 'hauteSaison' | 'basseSaison'
): SeasonLogisticsBreakdown {
  const distanceOneWayKm = Math.max(
    0,
    season === 'hauteSaison' ? logistics.distanceOneWayKmHS : logistics.distanceOneWayKmBS
  );
  const roadCondition =
    season === 'hauteSaison' ? logistics.roadConditionHS : logistics.roadConditionBS;
  const roadMultiplier = ROAD_CONDITION_META[roadCondition]?.multiplier ?? 1.0;

  const roundTripKm = distanceOneWayKm * 2;
  const consumption = Math.max(0, logistics.fuelConsumptionLPer100Km);
  const fuelPrice = Math.max(0, logistics.fuelPriceArPerLiter);
  const wearPerKm = Math.max(0, logistics.truckTollAndWearArPerKm);

  const litersPerRotation = (roundTripKm / 100) * consumption * roadMultiplier;
  const fuelCostAr = litersPerRotation * fuelPrice;
  const wearAndDriverCostAr = roundTripKm * wearPerKm * roadMultiplier;
  const totalCostPerRotationAr = Math.round(fuelCostAr + wearAndDriverCostAr);

  return {
    distanceOneWayKm,
    roundTripKm,
    roadCondition,
    roadMultiplier,
    litersPerRotation,
    fuelCostAr,
    wearAndDriverCostAr,
    totalCostPerRotationAr,
  };
}

export interface UrbanDistributionBreakdown {
  distanceKm: number;
  roadCondition: RoadCondition;
  roadMultiplier: number;
  riceTonsPerRotation: number;
  freightCostAr: number;
  handlingAndTollAr: number;
  totalCostPerRotationAr: number;
}

export function computeUrbanDistributionBreakdown(
  logistics: LogisticsAssumptions,
  riceKgPerRotation: number,
  season: 'hauteSaison' | 'basseSaison'
): UrbanDistributionBreakdown {
  const distanceKm = Math.max(
    0,
    season === 'hauteSaison'
      ? logistics.distanceToUrbanMarketKmHS ?? DEFAULT_LOGISTICS_ASSUMPTIONS.distanceToUrbanMarketKmHS ?? 180
      : logistics.distanceToUrbanMarketKmBS ?? DEFAULT_LOGISTICS_ASSUMPTIONS.distanceToUrbanMarketKmBS ?? 180
  );
  const roadCondition =
    season === 'hauteSaison'
      ? logistics.urbanRoadConditionHS ?? 'goudronnee'
      : logistics.urbanRoadConditionBS ?? 'goudronnee';
  const roadMultiplier = ROAD_CONDITION_META[roadCondition]?.multiplier ?? 1.0;
  const riceTonsPerRotation = Math.max(0, riceKgPerRotation) / 1000;
  const freightRate = Math.max(
    0,
    logistics.urbanFreightArPerTonKm ?? DEFAULT_LOGISTICS_ASSUMPTIONS.urbanFreightArPerTonKm ?? 320
  );
  const handlingAndTollAr = Math.max(
    0,
    logistics.urbanHandlingAndTollArPerRot ??
      DEFAULT_LOGISTICS_ASSUMPTIONS.urbanHandlingAndTollArPerRot ??
      45000
  );
  const freightCostAr = distanceKm * riceTonsPerRotation * freightRate * roadMultiplier;
  const totalCostPerRotationAr = Math.round(freightCostAr + (distanceKm > 0 ? handlingAndTollAr : 0));

  return {
    distanceKm,
    roadCondition,
    roadMultiplier,
    riceTonsPerRotation,
    freightCostAr,
    handlingAndTollAr: distanceKm > 0 ? handlingAndTollAr : 0,
    totalCostPerRotationAr,
  };
}

export function applyLogisticsToCostsPerRotation(
  costsPerRotation: CostPerRotation[],
  logistics: LogisticsAssumptions,
  assumptions: FinancialAssumptions
): CostPerRotation[] {
  const cleanCosts = costsPerRotation.filter((c) => c.id !== URBAN_DISTRIBUTION_COST_ID);
  if (!logistics.enabled) {
    return cleanCosts;
  }

  const hsCollectCost = computeSeasonLogisticsBreakdown(logistics, 'hauteSaison').totalCostPerRotationAr;
  const bsCollectCost = computeSeasonLogisticsBreakdown(logistics, 'basseSaison').totalCostPerRotationAr;

  const hasFuelItem = cleanCosts.some((c) => c.id === 'rot-carburant');
  const withCollection = hasFuelItem
    ? cleanCosts.map((c) =>
        c.id === 'rot-carburant'
          ? { ...c, costHS: hsCollectCost, costBS: bsCollectCost }
          : c
      )
    : [
        {
          id: 'rot-carburant',
          label: 'Carburant & Collecte paddy',
          costHS: hsCollectCost,
          costBS: bsCollectCost,
        },
        ...cleanCosts,
      ];

  if (!logistics.includeUrbanDistribution) {
    return withCollection;
  }

  const hsRiceKg =
    assumptions.hauteSaison.paddyBoughtKgPerRotation * assumptions.hauteSaison.yieldPaddyToRice;
  const bsRiceKg =
    assumptions.basseSaison.paddyBoughtKgPerRotation * assumptions.basseSaison.yieldPaddyToRice;
  const hsUrban = computeUrbanDistributionBreakdown(logistics, hsRiceKg, 'hauteSaison').totalCostPerRotationAr;
  const bsUrban = computeUrbanDistributionBreakdown(logistics, bsRiceKg, 'basseSaison').totalCostPerRotationAr;

  return [
    ...withCollection,
    {
      id: URBAN_DISTRIBUTION_COST_ID,
      label: 'Transport vers marchés urbains',
      costHS: hsUrban,
      costBS: bsUrban,
    },
  ];
}

export interface DistanceProfitabilityPoint {
  totalDistanceKm: number;
  label: string;
  collectionKm: number;
  urbanKm: number;
  annualLogisticsCostMAr: number;
  netResultAfterTaxMAr: number;
  netMarginPct: number;
  npvMAr: number;
}

export interface DistanceProfitabilitySimulation {
  points: DistanceProfitabilityPoint[];
  currentAvgTotalKm: number;
  breakEvenDistanceKm: number | null;
  logisticsCostPerKgRiceAr: number;
}

export function computeDistanceProfitabilitySimulation(
  assumptions: FinancialAssumptions,
  logistics: LogisticsAssumptions
): DistanceProfitabilitySimulation {
  const avgCollectKm = (logistics.distanceOneWayKmHS + logistics.distanceOneWayKmBS) / 2;
  const avgUrbanKm = logistics.includeUrbanDistribution
    ? ((logistics.distanceToUrbanMarketKmHS ?? 180) + (logistics.distanceToUrbanMarketKmBS ?? 180)) / 2
    : 0;
  const currentAvgTotalKm = avgCollectKm + avgUrbanKm;

  const hsRiceKg =
    assumptions.hauteSaison.paddyBoughtKgPerRotation * assumptions.hauteSaison.yieldPaddyToRice;
  const bsRiceKg =
    assumptions.basseSaison.paddyBoughtKgPerRotation * assumptions.basseSaison.yieldPaddyToRice;
  const hsRot = assumptions.hauteSaison.months * assumptions.hauteSaison.rotationsPerMonth;
  const bsRot = assumptions.basseSaison.months * assumptions.basseSaison.rotationsPerMonth;
  const totalRiceAnnualKg = Math.max(1, hsRiceKg * hsRot + bsRiceKg * bsRot);

  const distances = [25, 75, 125, 175, 225, 300, 400, 500, 650];
  const collectShare = currentAvgTotalKm > 0 ? avgCollectKm / currentAvgTotalKm : 0.35;

  const points: DistanceProfitabilityPoint[] = distances.map((totalKm) => {
    const colKm = Math.round(totalKm * (logistics.includeUrbanDistribution ? collectShare : 1));
    const urbKm = logistics.includeUrbanDistribution ? Math.max(0, totalKm - colKm) : 0;

    const simLog: LogisticsAssumptions = {
      ...logistics,
      enabled: true,
      distanceOneWayKmHS: colKm,
      distanceOneWayKmBS: colKm,
      distanceToUrbanMarketKmHS: urbKm,
      distanceToUrbanMarketKmBS: urbKm,
    };
    const simCosts = applyLogisticsToCostsPerRotation(assumptions.costsPerRotation, simLog, assumptions);
    const simModel = calculateFullModel({
      ...assumptions,
      logistics: simLog,
      costsPerRotation: simCosts,
    });

    const simHsCol = computeSeasonLogisticsBreakdown(simLog, 'hauteSaison').totalCostPerRotationAr;
    const simBsCol = computeSeasonLogisticsBreakdown(simLog, 'basseSaison').totalCostPerRotationAr;
    const simHsUrb = simLog.includeUrbanDistribution
      ? computeUrbanDistributionBreakdown(simLog, hsRiceKg, 'hauteSaison').totalCostPerRotationAr
      : 0;
    const simBsUrb = simLog.includeUrbanDistribution
      ? computeUrbanDistributionBreakdown(simLog, bsRiceKg, 'basseSaison').totalCostPerRotationAr
      : 0;
    const annualCost = (simHsCol + simHsUrb) * hsRot + (simBsCol + simBsUrb) * bsRot;

    return {
      totalDistanceKm: totalKm,
      label: `${totalKm} km`,
      collectionKm: colKm,
      urbanKm: urbKm,
      annualLogisticsCostMAr: Number((annualCost / 1e6).toFixed(2)),
      netResultAfterTaxMAr: Number((simModel.year1.netResultAfterTaxAr / 1e6).toFixed(2)),
      netMarginPct: Number((simModel.year1.netMarginAfterTaxRate * 100).toFixed(1)),
      npvMAr: Number((simModel.npv.npvAr / 1e6).toFixed(2)),
    };
  });

  // Linear interpolation for break-even total distance (Net Result After Tax = 0)
  let breakEvenDistanceKm: number | null = null;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.netResultAfterTaxMAr >= 0 && curr.netResultAfterTaxMAr < 0) {
      const ratio =
        prev.netResultAfterTaxMAr /
        Math.max(1e-6, prev.netResultAfterTaxMAr - curr.netResultAfterTaxMAr);
      breakEvenDistanceKm = Math.round(
        prev.totalDistanceKm + ratio * (curr.totalDistanceKm - prev.totalDistanceKm)
      );
      break;
    }
  }

  const curColAnnual =
    computeSeasonLogisticsBreakdown(logistics, 'hauteSaison').totalCostPerRotationAr * hsRot +
    computeSeasonLogisticsBreakdown(logistics, 'basseSaison').totalCostPerRotationAr * bsRot;
  const curUrbAnnual = logistics.includeUrbanDistribution
    ? computeUrbanDistributionBreakdown(logistics, hsRiceKg, 'hauteSaison').totalCostPerRotationAr *
        hsRot +
      computeUrbanDistributionBreakdown(logistics, bsRiceKg, 'basseSaison').totalCostPerRotationAr *
        bsRot
    : 0;

  return {
    points,
    currentAvgTotalKm: Math.round(currentAvgTotalKm),
    breakEvenDistanceKm,
    logisticsCostPerKgRiceAr: (curColAnnual + curUrbAnnual) / totalRiceAnnualKg,
  };
}

export interface KpiAlertItem {
  id: 'netMargin' | 'operatingMargin' | 'grossMargin' | 'van' | 'tri' | 'payback';
  label: string;
  breached: boolean;
  actualValue: number;
  thresholdValue: number;
  actualFormatted: string;
  thresholdFormatted: string;
  reason: string;
  targetTab: 'vantri' | 'payback' | 'projections' | 'breakeven';
}

export interface KpiAlertsEvaluation {
  thresholds: Required<KpiAlertThresholds>;
  items: {
    netMargin: KpiAlertItem;
    operatingMargin: KpiAlertItem;
    grossMargin: KpiAlertItem;
    van: KpiAlertItem;
    tri: KpiAlertItem;
    payback: KpiAlertItem;
  };
  breachedItems: KpiAlertItem[];
  hasAnyBreach: boolean;
}

export function evaluateKpiThresholdAlerts(
  model: FullFinancialModel,
  assumptions: FinancialAssumptions
): KpiAlertsEvaluation {
  const thresholds = getResolvedKpiThresholds(assumptions);

  const npvBreached = !Number.isFinite(model.npv.npvAr) || model.npv.npvAr < thresholds.minNpvAr;

  const irrFinite = Number.isFinite(model.irr.irrValue);
  const irrBreached = !irrFinite || model.irr.irrValue < thresholds.minIrrRate;

  const paybackFinite =
    Number.isFinite(model.payback.paybackMonths) && model.payback.paybackMonths > 0;
  const paybackBreached =
    !model.payback.isRecoveredWithin36Months ||
    !paybackFinite ||
    model.payback.paybackMonths > thresholds.maxPaybackMonths;

  const vanItem: KpiAlertItem = {
    id: 'van',
    label: 'VAN (3 ans)',
    breached: npvBreached,
    actualValue: model.npv.npvAr,
    thresholdValue: thresholds.minNpvAr,
    actualFormatted: formatAriary(model.npv.npvAr, { inMillions: true }),
    thresholdFormatted: `≥ ${formatAriary(thresholds.minNpvAr, { inMillions: true })}`,
    reason: `VAN (${formatAriary(model.npv.npvAr, { inMillions: true })}) inférieure au seuil exigé (${formatAriary(thresholds.minNpvAr, { inMillions: true })}).`,
    targetTab: 'vantri',
  };

  const triItem: KpiAlertItem = {
    id: 'tri',
    label: 'TRI',
    breached: irrBreached,
    actualValue: irrFinite ? model.irr.irrValue : 0,
    thresholdValue: thresholds.minIrrRate,
    actualFormatted: irrFinite ? formatPercent(model.irr.irrValue, 1) : 'Non calculable',
    thresholdFormatted: `≥ ${formatPercent(thresholds.minIrrRate, 1)}`,
    reason: irrFinite
      ? `TRI (${formatPercent(model.irr.irrValue, 1)}) inférieur au seuil exigé (${formatPercent(thresholds.minIrrRate, 1)}).`
      : `TRI non calculable (flux nets insuffisants par rapport au seuil ${formatPercent(thresholds.minIrrRate, 1)}).`,
    targetTab: 'vantri',
  };

  const paybackItem: KpiAlertItem = {
    id: 'payback',
    label: 'Payback saisonnier',
    breached: paybackBreached,
    actualValue: model.payback.paybackMonths,
    thresholdValue: thresholds.maxPaybackMonths,
    actualFormatted:
      model.payback.isRecoveredWithin36Months && paybackFinite
        ? formatMonths(model.payback.paybackMonths)
        : '> 36 mois',
    thresholdFormatted: `≤ ${formatMonths(thresholds.maxPaybackMonths)}`,
    reason:
      model.payback.isRecoveredWithin36Months && paybackFinite
        ? `Payback (${formatMonths(model.payback.paybackMonths)}) supérieur au plafond fixé (${formatMonths(thresholds.maxPaybackMonths)}).`
        : `Capital non récupéré sous ${formatMonths(thresholds.maxPaybackMonths)} (délai > 36 mois).`,
    targetTab: 'payback',
  };

  const netMarginRate =
    model.year1.totalTurnoverAr > 0 ? model.year1.netMarginAfterTaxRate : 0;
  const netMarginBreached = netMarginRate < thresholds.minNetMarginRate;

  const netMarginItem: KpiAlertItem = {
    id: 'netMargin',
    label: 'Marge nette après IR',
    breached: netMarginBreached,
    actualValue: netMarginRate,
    thresholdValue: thresholds.minNetMarginRate,
    actualFormatted: formatPercent(netMarginRate, 1),
    thresholdFormatted: `≥ ${formatPercent(thresholds.minNetMarginRate, 1)}`,
    reason: `Marge nette après IR (${formatPercent(netMarginRate, 1)}) inférieure au seuil critique (${formatPercent(thresholds.minNetMarginRate, 1)}).`,
    targetTab: 'projections',
  };

  const opMarginRate =
    model.year1.totalTurnoverAr > 0
      ? model.year1.netResultBeforeTaxAr / model.year1.totalTurnoverAr
      : 0;
  const opMarginBreached = opMarginRate < thresholds.minOperatingMarginRate;

  const grossMarginRate = model.year1.grossMarginRate;
  const grossMarginBreached = grossMarginRate < thresholds.minGrossMarginRate;

  const operatingMarginItem: KpiAlertItem = {
    id: 'operatingMargin',
    label: 'Marge opérationnelle',
    breached: opMarginBreached,
    actualValue: opMarginRate,
    thresholdValue: thresholds.minOperatingMarginRate,
    actualFormatted: formatPercent(opMarginRate, 1),
    thresholdFormatted: `≥ ${formatPercent(thresholds.minOperatingMarginRate, 1)}`,
    reason: `Marge opérationnelle (${formatPercent(opMarginRate, 1)}) inférieure au seuil critique (${formatPercent(thresholds.minOperatingMarginRate, 1)}).`,
    targetTab: 'projections',
  };

  const grossMarginItem: KpiAlertItem = {
    id: 'grossMargin',
    label: 'Marge brute',
    breached: grossMarginBreached,
    actualValue: grossMarginRate,
    thresholdValue: thresholds.minGrossMarginRate,
    actualFormatted: formatPercent(grossMarginRate, 1),
    thresholdFormatted: `≥ ${formatPercent(thresholds.minGrossMarginRate, 1)}`,
    reason: `Taux de marge brute (${formatPercent(grossMarginRate, 1)}) inférieur au seuil critique (${formatPercent(thresholds.minGrossMarginRate, 1)}).`,
    targetTab: 'breakeven',
  };

  const breachedItems = [
    netMarginItem,
    triItem,
    operatingMarginItem,
    grossMarginItem,
    vanItem,
    paybackItem,
  ].filter((item) => item.breached);

  return {
    thresholds,
    items: {
      netMargin: netMarginItem,
      operatingMargin: operatingMarginItem,
      grossMargin: grossMarginItem,
      van: vanItem,
      tri: triItem,
      payback: paybackItem,
    },
    breachedItems,
    hasAnyBreach: breachedItems.length > 0,
  };
}
