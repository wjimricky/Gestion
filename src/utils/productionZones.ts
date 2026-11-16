import {
  FinancialAssumptions,
  FullFinancialModel,
  LogisticsAssumptions,
  RoadCondition,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';
import {
  computeSeasonLogisticsBreakdown,
  getResolvedLogistics,
} from './logistics';

export type ProductionZoneId =
  | 'current'
  | 'alaotra'
  | 'marovoay'
  | 'vakinankaratra'
  | 'sofia';

export interface ProductionZoneProfile {
  id: ProductionZoneId;
  name: string;
  shortName: string;
  region: string;
  color: string;
  logisticsSummary: string;
  avgFieldYieldKgPerHa: number;
  fieldYieldNote: string;
  distanceKmHS: number;
  distanceKmBS: number;
  roadHS: RoadCondition;
  roadBS: RoadCondition;
  paddyPriceMultiplier: number; // relative to current paddy cost/kg
  volumeMultiplier: number; // relative to current paddy kg/rotation
  fuelPriceMultiplier: number; // regional pump price variation
  millingYieldOffset: number; // regional variety yield delta
}

export const MADAGASCAR_PRODUCTION_ZONES: ProductionZoneProfile[] = [
  {
    id: 'current',
    name: 'Projet Actuel (Profil courant)',
    shortName: 'Projet Actuel',
    region: 'Configuration active',
    color: '#10b981',
    logisticsSummary: 'Paramètres actuels de votre modèle',
    avgFieldYieldKgPerHa: 3500,
    fieldYieldNote: 'Rendement nominal de référence (3,5 t/ha)',
    distanceKmHS: 25,
    distanceKmBS: 125,
    roadHS: 'goudronnee',
    roadBS: 'piste_praticable',
    paddyPriceMultiplier: 1.0,
    volumeMultiplier: 1.0,
    fuelPriceMultiplier: 1.0,
    millingYieldOffset: 0,
  },
  {
    id: 'alaotra',
    name: 'Lac Alaotra (Ambatondrazaka)',
    shortName: 'Lac Alaotra',
    region: 'Alaotra-Mangoro · 1er grenier',
    color: '#6366f1',
    logisticsSummary: '165–185 km · RN44 + pistes rurales · Fort volume',
    avgFieldYieldKgPerHa: 4300,
    fieldYieldNote: 'Périmètres irrigués SOMALAC & plaine d’Ambatondrazaka (4,3 t/ha)',
    distanceKmHS: 165,
    distanceKmBS: 185,
    roadHS: 'piste_praticable',
    roadBS: 'piste_degradee',
    paddyPriceMultiplier: 0.94,
    volumeMultiplier: 1.12,
    fuelPriceMultiplier: 1.04,
    millingYieldOffset: 0.01,
  },
  {
    id: 'marovoay',
    name: 'Marovoay / Boeny (Nord-Ouest)',
    shortName: 'Marovoay',
    region: 'Boeny · Plaine irriguée',
    color: '#06b6d4',
    logisticsSummary: '95–125 km · Pistes plaine · 2 récoltes majeures',
    avgFieldYieldKgPerHa: 4000,
    fieldYieldNote: 'Plaines irriguées de la Betsiboka, double saison (4,0 t/ha)',
    distanceKmHS: 95,
    distanceKmBS: 125,
    roadHS: 'piste_praticable',
    roadBS: 'piste_degradee',
    paddyPriceMultiplier: 0.97,
    volumeMultiplier: 1.04,
    fuelPriceMultiplier: 0.97,
    millingYieldOffset: 0,
  },
  {
    id: 'vakinankaratra',
    name: 'Vakinankaratra (Hautes Terres)',
    shortName: 'Vakinankaratra',
    region: 'Antsirabe / RN7 · Axe bitumé',
    color: '#f59e0b',
    logisticsSummary: '40–65 km · Proche RN7 goudronnée · Faible fret',
    avgFieldYieldKgPerHa: 3300,
    fieldYieldNote: 'Riziculture d’altitude & terrasses des Hautes Terres (3,3 t/ha)',
    distanceKmHS: 40,
    distanceKmBS: 65,
    roadHS: 'goudronnee',
    roadBS: 'piste_praticable',
    paddyPriceMultiplier: 1.05,
    volumeMultiplier: 0.95,
    fuelPriceMultiplier: 1.0,
    millingYieldOffset: -0.01,
  },
  {
    id: 'sofia',
    name: 'Sofia / Port-Bergé (Nord)',
    shortName: 'Sofia / Port-Bergé',
    region: 'Sofia · Bassin excentré',
    color: '#ec4899',
    logisticsSummary: '210–240 km · Longue distance & pistes difficiles',
    avgFieldYieldKgPerHa: 3600,
    fieldYieldNote: 'Plaines alluviales du Nord-Ouest (3,6 t/ha)',
    distanceKmHS: 210,
    distanceKmBS: 240,
    roadHS: 'piste_praticable',
    roadBS: 'piste_degradee',
    paddyPriceMultiplier: 0.9,
    volumeMultiplier: 1.06,
    fuelPriceMultiplier: 1.06,
    millingYieldOffset: 0,
  },
];

export function getZoneProfileById(zoneId?: string): ProductionZoneProfile {
  return (
    MADAGASCAR_PRODUCTION_ZONES.find((z) => z.id === zoneId) ||
    MADAGASCAR_PRODUCTION_ZONES[0]
  );
}

/**
 * Applies regional geographic specificities (transport distances/road state, fuel price,
 * regional average yield/ha, paddy volume/rotation & milling yield) cleanly without compounding drift.
 */
export function applyProductionZoneToAssumptions(
  baseAssumptions: FinancialAssumptions,
  targetZoneId: ProductionZoneId,
  options?: { syncPaddyPrice?: boolean }
): FinancialAssumptions {
  const prevZoneId = (baseAssumptions.selectedRegionId as ProductionZoneId) || 'current';
  const prevProfile = getZoneProfileById(prevZoneId);
  const target = getZoneProfileById(targetZoneId);
  const baseLog = getResolvedLogistics(baseAssumptions);

  const fuelRatio =
    prevProfile.fuelPriceMultiplier > 0
      ? target.fuelPriceMultiplier / prevProfile.fuelPriceMultiplier
      : target.fuelPriceMultiplier;
  const volRatio =
    prevProfile.volumeMultiplier > 0
      ? target.volumeMultiplier / prevProfile.volumeMultiplier
      : target.volumeMultiplier;
  const paddyRatio =
    prevProfile.paddyPriceMultiplier > 0
      ? target.paddyPriceMultiplier / prevProfile.paddyPriceMultiplier
      : target.paddyPriceMultiplier;
  const yieldDelta = target.millingYieldOffset - prevProfile.millingYieldOffset;

  const nextLogistics: LogisticsAssumptions = {
    ...baseLog,
    enabled: true,
    distanceOneWayKmHS: target.distanceKmHS,
    distanceOneWayKmBS: target.distanceKmBS,
    roadConditionHS: target.roadHS,
    roadConditionBS: target.roadBS,
    fuelPriceArPerLiter: Math.max(
      1000,
      Math.round((baseLog.fuelPriceArPerLiter * fuelRatio) / 50) * 50
    ),
  };

  const hsLogCost = computeSeasonLogisticsBreakdown(
    nextLogistics,
    'hauteSaison'
  ).totalCostPerRotationAr;
  const bsLogCost = computeSeasonLogisticsBreakdown(
    nextLogistics,
    'basseSaison'
  ).totalCostPerRotationAr;

  const hasFuelRow = baseAssumptions.costsPerRotation.some((c) => c.id === 'rot-carburant');
  const nextCostsPerRotation = hasFuelRow
    ? baseAssumptions.costsPerRotation.map((c) =>
        c.id === 'rot-carburant'
          ? { ...c, costHS: hsLogCost, costBS: bsLogCost }
          : c
      )
    : [
        {
          id: 'rot-carburant',
          label: 'Carburant & Collecte paddy',
          costHS: hsLogCost,
          costBS: bsLogCost,
        },
        ...baseAssumptions.costsPerRotation,
      ];

  const syncPaddyPrice = options?.syncPaddyPrice ?? true;
  const nextCostsPerKg = syncPaddyPrice
    ? baseAssumptions.costsPerKgPaddy.map((c) =>
        c.id === 'cost-paddy'
          ? {
              ...c,
              costHS: Math.max(200, Math.round(c.costHS * paddyRatio)),
              costBS: Math.max(250, Math.round(c.costBS * paddyRatio)),
            }
          : c
      )
    : baseAssumptions.costsPerKgPaddy;

  const clampYield = (y: number) => Math.max(0.2, Math.min(0.95, Number(y.toFixed(4))));

  const nextHsPaddy = Math.max(
    500,
    Math.round((baseAssumptions.hauteSaison.paddyBoughtKgPerRotation * volRatio) / 100) * 100
  );
  const nextBsPaddy = Math.max(
    500,
    Math.round((baseAssumptions.basseSaison.paddyBoughtKgPerRotation * volRatio) / 100) * 100
  );
  const nextHsYield = clampYield(baseAssumptions.hauteSaison.yieldPaddyToRice + yieldDelta);
  const nextBsYield = clampYield(baseAssumptions.basseSaison.yieldPaddyToRice + yieldDelta);

  const prevClimate = baseAssumptions.climateImpact;
  const nextClimate = prevClimate
    ? {
        ...prevClimate,
        nominalYieldKgPerHa: target.avgFieldYieldKgPerHa,
        baselinePaddyKgHS: nextHsPaddy,
        baselinePaddyKgBS: nextBsPaddy,
        baselineMillingYieldHS: nextHsYield,
        baselineMillingYieldBS: nextBsYield,
      }
    : {
        enabled: true,
        hazardType: 'normal' as const,
        nominalYieldKgPerHa: target.avgFieldYieldKgPerHa,
        cultivatedAreaHa: 118,
        fieldYieldShockPercent: 0,
        millingYieldDeltaPoints: 0,
        affectedSeason: 'both' as const,
        baselinePaddyKgHS: nextHsPaddy,
        baselinePaddyKgBS: nextBsPaddy,
        baselineMillingYieldHS: nextHsYield,
        baselineMillingYieldBS: nextBsYield,
      };

  return {
    ...baseAssumptions,
    selectedRegionId: targetZoneId,
    logistics: nextLogistics,
    costsPerRotation: nextCostsPerRotation,
    costsPerKgPaddy: nextCostsPerKg,
    hauteSaison: {
      ...baseAssumptions.hauteSaison,
      paddyBoughtKgPerRotation: nextHsPaddy,
      yieldPaddyToRice: nextHsYield,
    },
    basseSaison: {
      ...baseAssumptions.basseSaison,
      paddyBoughtKgPerRotation: nextBsPaddy,
      yieldPaddyToRice: nextBsYield,
    },
    climateImpact: nextClimate,
    ...(baseAssumptions.partnersEcosystem
      ? {
          partnersEcosystem: {
            ...baseAssumptions.partnersEcosystem,
            syncTransportCosts: false,
            ...(syncPaddyPrice ? { syncPaddyCosts: false } : {}),
          },
        }
      : {}),
  };
}

export interface ZoneSimulationResult {
  profile: ProductionZoneProfile;
  model: FullFinancialModel;
  npvAr: number;
  irrValue: number;
  netMarginRate: number;
  paybackMonths: number;
  logisticsCostPerRotHS: number;
  logisticsCostPerRotBS: number;
  avgLogisticsCostPerRotAr: number;
  logisticsCostPerKgPaddyAr: number;
  annualTurnoverAr: number;
}

export function simulateZoneProfitability(
  baseAssumptions: FinancialAssumptions,
  baseModel: FullFinancialModel,
  profile: ProductionZoneProfile
): ZoneSimulationResult {
  const baseLog = getResolvedLogistics(baseAssumptions);

  if (profile.id === 'current') {
    const fuelRow = baseAssumptions.costsPerRotation.find((c) => c.id === 'rot-carburant');
    const hsCost = fuelRow
      ? fuelRow.costHS
      : computeSeasonLogisticsBreakdown(baseLog, 'hauteSaison').totalCostPerRotationAr;
    const bsCost = fuelRow
      ? fuelRow.costBS
      : computeSeasonLogisticsBreakdown(baseLog, 'basseSaison').totalCostPerRotationAr;
    const totalRot =
      baseModel.hauteSaison.totalRotations + baseModel.basseSaison.totalRotations;
    const totalAnnualLogCost =
      hsCost * baseModel.hauteSaison.totalRotations +
      bsCost * baseModel.basseSaison.totalRotations;
    const totalPaddy =
      baseModel.hauteSaison.totalPaddyKg + baseModel.basseSaison.totalPaddyKg;

    return {
      profile,
      model: baseModel,
      npvAr: baseModel.npv.npvAr,
      irrValue: Number.isFinite(baseModel.irr.irrValue) ? baseModel.irr.irrValue : 0,
      netMarginRate: baseModel.year1.netMarginAfterTaxRate,
      paybackMonths: baseModel.payback.paybackMonths,
      logisticsCostPerRotHS: hsCost,
      logisticsCostPerRotBS: bsCost,
      avgLogisticsCostPerRotAr: totalRot > 0 ? totalAnnualLogCost / totalRot : 0,
      logisticsCostPerKgPaddyAr: totalPaddy > 0 ? totalAnnualLogCost / totalPaddy : 0,
      annualTurnoverAr: baseModel.year1.totalTurnoverAr,
    };
  }

  const zoneLogistics: LogisticsAssumptions = {
    ...baseLog,
    enabled: true,
    distanceOneWayKmHS: profile.distanceKmHS,
    distanceOneWayKmBS: profile.distanceKmBS,
    roadConditionHS: profile.roadHS,
    roadConditionBS: profile.roadBS,
    fuelPriceArPerLiter: Math.round(baseLog.fuelPriceArPerLiter * profile.fuelPriceMultiplier),
  };

  const hsCost = computeSeasonLogisticsBreakdown(zoneLogistics, 'hauteSaison').totalCostPerRotationAr;
  const bsCost = computeSeasonLogisticsBreakdown(zoneLogistics, 'basseSaison').totalCostPerRotationAr;

  const hasFuelRow = baseAssumptions.costsPerRotation.some((c) => c.id === 'rot-carburant');
  const nextCostsPerRotation = hasFuelRow
    ? baseAssumptions.costsPerRotation.map((c) =>
        c.id === 'rot-carburant' ? { ...c, costHS: hsCost, costBS: bsCost } : c
      )
    : [
        {
          id: 'rot-carburant',
          label: 'Carburant & Collecte paddy',
          costHS: hsCost,
          costBS: bsCost,
        },
        ...baseAssumptions.costsPerRotation,
      ];

  const nextCostsPerKg = baseAssumptions.costsPerKgPaddy.map((c) =>
    c.id === 'cost-paddy'
      ? {
          ...c,
          costHS: Math.round(c.costHS * profile.paddyPriceMultiplier),
          costBS: Math.round(c.costBS * profile.paddyPriceMultiplier),
        }
      : c
  );

  const clampYield = (y: number) => Math.max(0.2, Math.min(0.95, Number(y.toFixed(4))));

  const zoneAssumptions: FinancialAssumptions = {
    ...baseAssumptions,
    logistics: zoneLogistics,
    costsPerRotation: nextCostsPerRotation,
    costsPerKgPaddy: nextCostsPerKg,
    hauteSaison: {
      ...baseAssumptions.hauteSaison,
      paddyBoughtKgPerRotation: Math.max(
        500,
        Math.round(baseAssumptions.hauteSaison.paddyBoughtKgPerRotation * profile.volumeMultiplier)
      ),
      yieldPaddyToRice: clampYield(
        baseAssumptions.hauteSaison.yieldPaddyToRice + profile.millingYieldOffset
      ),
    },
    basseSaison: {
      ...baseAssumptions.basseSaison,
      paddyBoughtKgPerRotation: Math.max(
        500,
        Math.round(baseAssumptions.basseSaison.paddyBoughtKgPerRotation * profile.volumeMultiplier)
      ),
      yieldPaddyToRice: clampYield(
        baseAssumptions.basseSaison.yieldPaddyToRice + profile.millingYieldOffset
      ),
    },
  };

  const zoneModel = calculateFullModel(zoneAssumptions);
  const totalRot = zoneModel.hauteSaison.totalRotations + zoneModel.basseSaison.totalRotations;
  const totalAnnualLogCost =
    hsCost * zoneModel.hauteSaison.totalRotations +
    bsCost * zoneModel.basseSaison.totalRotations;
  const totalPaddy = zoneModel.hauteSaison.totalPaddyKg + zoneModel.basseSaison.totalPaddyKg;

  return {
    profile,
    model: zoneModel,
    npvAr: zoneModel.npv.npvAr,
    irrValue: Number.isFinite(zoneModel.irr.irrValue) ? zoneModel.irr.irrValue : 0,
    netMarginRate: zoneModel.year1.netMarginAfterTaxRate,
    paybackMonths: zoneModel.payback.paybackMonths,
    logisticsCostPerRotHS: hsCost,
    logisticsCostPerRotBS: bsCost,
    avgLogisticsCostPerRotAr: totalRot > 0 ? totalAnnualLogCost / totalRot : 0,
    logisticsCostPerKgPaddyAr: totalPaddy > 0 ? totalAnnualLogCost / totalPaddy : 0,
    annualTurnoverAr: zoneModel.year1.totalTurnoverAr,
  };
}

export interface ZoneRadarDatum {
  axis: string;
  description: string;
  scores: Record<ProductionZoneId, number>;
  rawLabels: Record<ProductionZoneId, string>;
  // Flat keys for Recharts dataKey binding
  current?: number;
  alaotra?: number;
  marovoay?: number;
  vakinankaratra?: number;
  sofia?: number;
}

export function buildZoneRadarDataset(
  results: ZoneSimulationResult[],
  formatArFn: (v: number) => string,
  formatPctFn: (v: number, d?: number) => string,
  formatMonthsFn: (v: number) => string
): ZoneRadarDatum[] {
  const maxNpv = Math.max(...results.map((r) => Math.max(0, r.npvAr)), 1e6);
  const maxIrr = Math.max(...results.map((r) => Math.max(0, r.irrValue)), 0.12);
  const maxMargin = Math.max(...results.map((r) => Math.max(0, r.netMarginRate)), 0.05);
  const maxLogPerKg = Math.max(...results.map((r) => r.logisticsCostPerKgPaddyAr), 10);

  const clampScore = (val: number) => Math.max(4, Math.min(100, Number(val.toFixed(1))));

  const axes: Array<{
    axis: string;
    description: string;
    scoreOf: (r: ZoneSimulationResult) => number;
    rawOf: (r: ZoneSimulationResult) => string;
  }> = [
    {
      axis: 'VAN (3 ans)',
      description: 'Valeur Actuelle Nette actualisée sur 3 ans',
      scoreOf: (r) => (r.npvAr > 0 ? clampScore((r.npvAr / maxNpv) * 100) : 4),
      rawOf: (r) => formatArFn(r.npvAr),
    },
    {
      axis: 'TRI (Rentabilité)',
      description: 'Taux de Rentabilité Interne sur 3 ans',
      scoreOf: (r) => (r.irrValue > 0 ? clampScore((r.irrValue / maxIrr) * 100) : 4),
      rawOf: (r) => (r.irrValue > 0 ? formatPctFn(r.irrValue, 1) : 'N/A'),
    },
    {
      axis: 'Marge nette',
      description: 'Taux de marge nette après impôt (IR)',
      scoreOf: (r) => (r.netMarginRate > 0 ? clampScore((r.netMarginRate / maxMargin) * 100) : 4),
      rawOf: (r) => formatPctFn(r.netMarginRate, 1),
    },
    {
      axis: 'Rapidité Payback',
      description: 'Vitesse de récupération de I₀ (base 36 mois)',
      scoreOf: (r) =>
        r.paybackMonths > 0
          ? clampScore(((36 - Math.min(36, r.paybackMonths)) / 36) * 100)
          : 4,
      rawOf: (r) => formatMonthsFn(r.paybackMonths),
    },
    {
      axis: 'Efficience logistique',
      description: 'Maîtrise du coût de collecte rapporté au kg de paddy',
      scoreOf: (r) =>
        clampScore(100 - (r.logisticsCostPerKgPaddyAr / (maxLogPerKg * 1.15)) * 85),
      rawOf: (r) => `${Math.round(r.logisticsCostPerKgPaddyAr).toLocaleString('fr-FR')} Ar/kg`,
    },
  ];

  return axes.map((a) => {
    const scores = {} as Record<ProductionZoneId, number>;
    const rawLabels = {} as Record<ProductionZoneId, string>;
    const flat: Partial<Record<ProductionZoneId, number>> = {};

    results.forEach((r) => {
      const sc = a.scoreOf(r);
      scores[r.profile.id] = sc;
      rawLabels[r.profile.id] = a.rawOf(r);
      flat[r.profile.id] = sc;
    });

    return {
      axis: a.axis,
      description: a.description,
      scores,
      rawLabels,
      ...flat,
    };
  });
}
