import {
  ClimateCoefficientCategory,
  ClimateHazardType,
  ClimateImpactAssumptions,
  ClimateLossCoefficient,
  FinancialAssumptions,
} from '../types/finance';
import { computeSeason, computeYear1 } from '../engine/calculator';

export interface ClimateHazardMeta {
  label: string;
  shortLabel: string;
  defaultFieldShockPercent: number;
  defaultMillingDeltaPoints: number;
  severity: 'normal' | 'warning' | 'danger';
  description: string;
}

export const CLIMATE_HAZARD_META: Record<ClimateHazardType, ClimateHazardMeta> = {
  normal: {
    label: 'Conditions climatiques normales',
    shortLabel: 'Normal (0 %)',
    defaultFieldShockPercent: 0,
    defaultMillingDeltaPoints: 0,
    severity: 'normal',
    description:
      'Pluviométrie régulière sur les bassins rizicoles (Alaotra, Marovoay, Hautes Terres) : rendement agronomique nominal.',
  },
  secheresse_moderee: {
    label: 'Sécheresse modérée / Retard des pluies',
    shortLabel: 'Sécheresse (−18 %)',
    defaultFieldShockPercent: -0.18,
    defaultMillingDeltaPoints: -0.015,
    severity: 'warning',
    description:
      'Déficit hydrique en phase de tallage : baisse moyenne de 18 % du rendement à l’hectare et grains légèrement plus cassants (−1,5 pt à l’usinage).',
  },
  secheresse_severe: {
    label: 'Sécheresse sévère (Épisode El Niño)',
    shortLabel: 'Sécheresse sévère (−35 %)',
    defaultFieldShockPercent: -0.35,
    defaultMillingDeltaPoints: -0.03,
    severity: 'danger',
    description:
      'Stress hydrique prolongé : chute de 35 % de la récolte de paddy à l’hectare et taux de brisures accru (−3 pts de rendement paddy → riz).',
  },
  inondation_moderee: {
    label: 'Inondations saisonnières / Crues',
    shortLabel: 'Inondations (−22 %)',
    defaultFieldShockPercent: -0.22,
    defaultMillingDeltaPoints: -0.025,
    severity: 'warning',
    description:
      'Submersion partielle des rizières basses : perte de 22 % du volume récolté et séchage difficile réduisant le rendement usinage (−2,5 pts).',
  },
  cyclone_inondation: {
    label: 'Cyclone majeur & inondations étendues',
    shortLabel: 'Cyclone (−40 %)',
    defaultFieldShockPercent: -0.40,
    defaultMillingDeltaPoints: -0.05,
    severity: 'danger',
    description:
      'Sinistre météorologique sévère (côte Est / Sofia / Alaotra) : −40 % de paddy disponible et −5 pts de rendement d’usinage.',
  },
};

export const CLIMATE_CATEGORY_META: Record<
  ClimateCoefficientCategory,
  { label: string; badgeClass: string }
> = {
  cyclone: {
    label: 'Cyclone',
    badgeClass: 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200',
  },
  secheresse: {
    label: 'Sécheresse',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  },
  inondation: {
    label: 'Inondation / Crue',
    badgeClass: 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  },
  autre: {
    label: 'Autre aléa',
    badgeClass: 'border-zinc-400/40 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200',
  },
};

export const DEFAULT_CLIMATE_COEFFICIENTS: ClimateLossCoefficient[] = [
  {
    id: 'coeff-cyclone-est',
    label: 'Cyclone tropical (Côte Est / Alaotra)',
    category: 'cyclone',
    seasonScope: 'hauteSaison',
    fieldLossPercent: 0.30,
    millingLossPoints: 0.03,
    probabilityPercent: 35,
    active: false,
  },
  {
    id: 'coeff-secheresse-elnino',
    label: 'Sécheresse / Retard des pluies (El Niño)',
    category: 'secheresse',
    seasonScope: 'basseSaison',
    fieldLossPercent: 0.22,
    millingLossPoints: 0.02,
    probabilityPercent: 45,
    active: false,
  },
  {
    id: 'coeff-crue-plaine',
    label: 'Inondation / Crue basse plaine',
    category: 'inondation',
    seasonScope: 'both',
    fieldLossPercent: 0.16,
    millingLossPoints: 0.015,
    probabilityPercent: 25,
    active: false,
  },
];

export const CLIMATE_COEFFICIENT_PRESETS: Array<Omit<ClimateLossCoefficient, 'id' | 'active'>> = [
  {
    label: 'Cyclone majeur (Batsirai / Freddy)',
    category: 'cyclone',
    seasonScope: 'hauteSaison',
    fieldLossPercent: 0.38,
    millingLossPoints: 0.04,
    probabilityPercent: 30,
  },
  {
    label: 'Sécheresse Grand Sud / Hautes Terres',
    category: 'secheresse',
    seasonScope: 'basseSaison',
    fieldLossPercent: 0.28,
    millingLossPoints: 0.025,
    probabilityPercent: 40,
  },
  {
    label: 'Engorgement / Crue de contre-saison',
    category: 'inondation',
    seasonScope: 'both',
    fieldLossPercent: 0.18,
    millingLossPoints: 0.02,
    probabilityPercent: 35,
  },
];

export interface AggregatedClimateCoefficientsResult {
  activeCount: number;
  hsFieldShockPercent: number; // negative ratio e.g. -0.22
  bsFieldShockPercent: number;
  hsMillingDeltaPoints: number; // negative pts e.g. -0.02
  bsMillingDeltaPoints: number;
  weightedFieldShockPercent: number;
  weightedMillingDeltaPoints: number;
}

export function aggregateCustomClimateCoefficients(
  climate: ClimateImpactAssumptions,
  monthsHS = 5,
  monthsBS = 7
): AggregatedClimateCoefficientsResult {
  const list = climate.customCoefficients ?? DEFAULT_CLIMATE_COEFFICIENTS;
  const activeItems = list.filter((c) => c.active);
  const mode = climate.coefficientAggregationMode ?? 'expected_probability';

  const calcSeason = (season: 'hauteSaison' | 'basseSaison') => {
    let survival = 1;
    let millingLoss = 0;

    for (const item of activeItems) {
      if (item.seasonScope !== 'both' && item.seasonScope !== season) continue;
      const probWeight =
        mode === 'expected_probability'
          ? Math.max(0, Math.min(1, (Number(item.probabilityPercent) || 0) / 100))
          : 1;
      const effFieldLoss = Math.max(
        0,
        Math.min(0.9, (Number(item.fieldLossPercent) || 0) * probWeight)
      );
      const effMillingLoss = Math.max(
        0,
        Math.min(0.45, (Number(item.millingLossPoints) || 0) * probWeight)
      );
      survival *= 1 - effFieldLoss;
      millingLoss += effMillingLoss;
    }

    const fieldShockPercent = Math.max(-0.9, Math.min(0, survival - 1));
    const millingDeltaPoints = -Math.min(0.45, millingLoss);
    return { fieldShockPercent, millingDeltaPoints };
  };

  const hs = calcSeason('hauteSaison');
  const bs = calcSeason('basseSaison');
  const totalM = Math.max(1, monthsHS + monthsBS);
  const weightedFieldShockPercent =
    (hs.fieldShockPercent * monthsHS + bs.fieldShockPercent * monthsBS) / totalM;
  const weightedMillingDeltaPoints =
    (hs.millingDeltaPoints * monthsHS + bs.millingDeltaPoints * monthsBS) / totalM;

  return {
    activeCount: activeItems.length,
    hsFieldShockPercent: hs.fieldShockPercent,
    bsFieldShockPercent: bs.fieldShockPercent,
    hsMillingDeltaPoints: hs.millingDeltaPoints,
    bsMillingDeltaPoints: bs.millingDeltaPoints,
    weightedFieldShockPercent,
    weightedMillingDeltaPoints,
  };
}

export function getResolvedClimateShocks(
  climate: ClimateImpactAssumptions,
  monthsHS = 5,
  monthsBS = 7
): {
  hsFieldShockPercent: number;
  bsFieldShockPercent: number;
  hsMillingDeltaPoints: number;
  bsMillingDeltaPoints: number;
  effectiveAverageFieldShockPercent: number;
  effectiveAverageMillingDeltaPoints: number;
} {
  if (!climate.enabled) {
    return {
      hsFieldShockPercent: 0,
      bsFieldShockPercent: 0,
      hsMillingDeltaPoints: 0,
      bsMillingDeltaPoints: 0,
      effectiveAverageFieldShockPercent: 0,
      effectiveAverageMillingDeltaPoints: 0,
    };
  }

  if (climate.useCustomCoefficients) {
    const agg = aggregateCustomClimateCoefficients(climate, monthsHS, monthsBS);
    return {
      hsFieldShockPercent: agg.hsFieldShockPercent,
      bsFieldShockPercent: agg.bsFieldShockPercent,
      hsMillingDeltaPoints: agg.hsMillingDeltaPoints,
      bsMillingDeltaPoints: agg.bsMillingDeltaPoints,
      effectiveAverageFieldShockPercent: agg.weightedFieldShockPercent,
      effectiveAverageMillingDeltaPoints: agg.weightedMillingDeltaPoints,
    };
  }

  const applyHS =
    climate.affectedSeason === 'both' || climate.affectedSeason === 'hauteSaison';
  const applyBS =
    climate.affectedSeason === 'both' || climate.affectedSeason === 'basseSaison';

  return {
    hsFieldShockPercent: applyHS ? climate.fieldYieldShockPercent : 0,
    bsFieldShockPercent: applyBS ? climate.fieldYieldShockPercent : 0,
    hsMillingDeltaPoints: applyHS ? climate.millingYieldDeltaPoints : 0,
    bsMillingDeltaPoints: applyBS ? climate.millingYieldDeltaPoints : 0,
    effectiveAverageFieldShockPercent: climate.fieldYieldShockPercent,
    effectiveAverageMillingDeltaPoints: climate.millingYieldDeltaPoints,
  };
}

export function getResolvedClimateImpact(
  assumptions: FinancialAssumptions
): ClimateImpactAssumptions {
  const existing = assumptions.climateImpact;
  return {
    enabled: existing?.enabled ?? true,
    hazardType: existing?.hazardType ?? 'normal',
    nominalYieldKgPerHa: existing?.nominalYieldKgPerHa ?? 3500,
    cultivatedAreaHa: existing?.cultivatedAreaHa ?? 118,
    fieldYieldShockPercent: existing?.fieldYieldShockPercent ?? 0,
    millingYieldDeltaPoints: existing?.millingYieldDeltaPoints ?? 0,
    affectedSeason: existing?.affectedSeason ?? 'both',
    baselinePaddyKgHS:
      existing?.baselinePaddyKgHS ?? assumptions.hauteSaison.paddyBoughtKgPerRotation,
    baselinePaddyKgBS:
      existing?.baselinePaddyKgBS ?? assumptions.basseSaison.paddyBoughtKgPerRotation,
    baselineMillingYieldHS:
      existing?.baselineMillingYieldHS ?? assumptions.hauteSaison.yieldPaddyToRice,
    baselineMillingYieldBS:
      existing?.baselineMillingYieldBS ?? assumptions.basseSaison.yieldPaddyToRice,
    useCustomCoefficients: existing?.useCustomCoefficients ?? false,
    coefficientAggregationMode:
      existing?.coefficientAggregationMode ?? 'expected_probability',
    customCoefficients: existing?.customCoefficients ?? DEFAULT_CLIMATE_COEFFICIENTS,
    fiveYearVulnerability: {
      cycloneAnnualProbPct: existing?.fiveYearVulnerability?.cycloneAnnualProbPct ?? 28,
      droughtAnnualProbPct: existing?.fiveYearVulnerability?.droughtAnnualProbPct ?? 35,
      floodAnnualProbPct: existing?.fiveYearVulnerability?.floodAnnualProbPct ?? 20,
      safetyReserveTargetMonths:
        existing?.fiveYearVulnerability?.safetyReserveTargetMonths ?? 2.5,
    },
  };
}

export function applyClimateToSeasonValues(
  assumptions: FinancialAssumptions,
  climate: ClimateImpactAssumptions
): Pick<FinancialAssumptions, 'hauteSaison' | 'basseSaison'> {
  const shocks = getResolvedClimateShocks(
    climate,
    assumptions.hauteSaison.months,
    assumptions.basseSaison.months
  );

  const hsFactor = Math.max(0.05, 1 + shocks.hsFieldShockPercent);
  const bsFactor = Math.max(0.05, 1 + shocks.bsFieldShockPercent);

  const hsPaddy = Math.max(100, Math.round(climate.baselinePaddyKgHS * hsFactor));
  const bsPaddy = Math.max(100, Math.round(climate.baselinePaddyKgBS * bsFactor));

  const hsYield = Math.max(
    0.2,
    Math.min(
      0.95,
      Number((climate.baselineMillingYieldHS + shocks.hsMillingDeltaPoints).toFixed(4))
    )
  );
  const bsYield = Math.max(
    0.2,
    Math.min(
      0.95,
      Number((climate.baselineMillingYieldBS + shocks.bsMillingDeltaPoints).toFixed(4))
    )
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

export interface ClimateSimulationPreview {
  nominalYieldKgPerHa: number;
  effectiveYieldKgPerHa: number;
  yieldLossKgPerHa: number;
  nominalBasinProductionKg: number;
  effectiveBasinProductionKg: number;
  baselineAnnualTurnoverAr: number;
  shockedAnnualTurnoverAr: number;
  turnoverDeltaAr: number;
  turnoverDeltaPercent: number;
  baselineNetBeforeTaxAr: number;
  shockedNetBeforeTaxAr: number;
  netDeltaAr: number;
  baselinePaddyRotHS: number;
  shockedPaddyRotHS: number;
  baselinePaddyRotBS: number;
  shockedPaddyRotBS: number;
  effectiveFieldShockPercent: number;
  effectiveMillingDeltaPoints: number;
}

export function computeClimateSimulationPreview(
  assumptions: FinancialAssumptions,
  climate: ClimateImpactAssumptions
): ClimateSimulationPreview {
  const simulatedClimate: ClimateImpactAssumptions = { ...climate, enabled: true };
  const shocks = getResolvedClimateShocks(
    simulatedClimate,
    assumptions.hauteSaison.months,
    assumptions.basseSaison.months
  );

  const nominalYieldKgPerHa = Math.max(0, climate.nominalYieldKgPerHa);
  const shockRatio = shocks.effectiveAverageFieldShockPercent;
  const effectiveYieldKgPerHa = Math.max(0, nominalYieldKgPerHa * (1 + shockRatio));
  const yieldLossKgPerHa = effectiveYieldKgPerHa - nominalYieldKgPerHa;

  const areaHa = Math.max(0, climate.cultivatedAreaHa);
  const nominalBasinProductionKg = nominalYieldKgPerHa * areaHa;
  const effectiveBasinProductionKg = effectiveYieldKgPerHa * areaHa;

  // Baseline assumptions (without climate shock)
  const baselineAssumptions: FinancialAssumptions = {
    ...assumptions,
    hauteSaison: {
      ...assumptions.hauteSaison,
      paddyBoughtKgPerRotation: climate.baselinePaddyKgHS,
      yieldPaddyToRice: climate.baselineMillingYieldHS,
    },
    basseSaison: {
      ...assumptions.basseSaison,
      paddyBoughtKgPerRotation: climate.baselinePaddyKgBS,
      yieldPaddyToRice: climate.baselineMillingYieldBS,
    },
  };

  // Shocked assumptions (always simulate the shock preview even if sync toggle is paused)
  const shockedSeasons = applyClimateToSeasonValues(baselineAssumptions, simulatedClimate);
  const shockedAssumptions: FinancialAssumptions = {
    ...baselineAssumptions,
    ...shockedSeasons,
  };

  const baseHS = computeSeason(baselineAssumptions, 'hauteSaison');
  const baseBS = computeSeason(baselineAssumptions, 'basseSaison');
  const baseY1 = computeYear1(
    baseHS,
    baseBS,
    baselineAssumptions.corporateTaxRate,
    baselineAssumptions.investorShare
  );

  const shockHS = computeSeason(shockedAssumptions, 'hauteSaison');
  const shockBS = computeSeason(shockedAssumptions, 'basseSaison');
  const shockY1 = computeYear1(
    shockHS,
    shockBS,
    shockedAssumptions.corporateTaxRate,
    shockedAssumptions.investorShare
  );

  const turnoverDeltaAr = shockY1.totalTurnoverAr - baseY1.totalTurnoverAr;
  const turnoverDeltaPercent =
    baseY1.totalTurnoverAr > 0 ? turnoverDeltaAr / baseY1.totalTurnoverAr : 0;

  return {
    nominalYieldKgPerHa,
    effectiveYieldKgPerHa,
    yieldLossKgPerHa,
    nominalBasinProductionKg,
    effectiveBasinProductionKg,
    baselineAnnualTurnoverAr: baseY1.totalTurnoverAr,
    shockedAnnualTurnoverAr: shockY1.totalTurnoverAr,
    turnoverDeltaAr,
    turnoverDeltaPercent,
    baselineNetBeforeTaxAr: baseY1.netResultBeforeTaxAr,
    shockedNetBeforeTaxAr: shockY1.netResultBeforeTaxAr,
    netDeltaAr: shockY1.netResultBeforeTaxAr - baseY1.netResultBeforeTaxAr,
    baselinePaddyRotHS: climate.baselinePaddyKgHS,
    shockedPaddyRotHS: shockedSeasons.hauteSaison.paddyBoughtKgPerRotation,
    baselinePaddyRotBS: climate.baselinePaddyKgBS,
    shockedPaddyRotBS: shockedSeasons.basseSaison.paddyBoughtKgPerRotation,
    effectiveFieldShockPercent: shocks.effectiveAverageFieldShockPercent,
    effectiveMillingDeltaPoints: shocks.effectiveAverageMillingDeltaPoints,
  };
}

export interface FiveYearClimateResiliencePoint {
  year: 1 | 2 | 3 | 4 | 5;
  label: string;
  cumulativeHazardProbPct: number;
  expectedTurnoverShockAr: number;
  nominalAnnualCashBufferAr: number;
  recommendedSafetyTreasuryAr: number;
  reserveGapAr: number;
}

export interface FiveYearClimateVulnerabilitySummary {
  annualCombinedEventProbPct: number;
  fiveYearAnyEventProbPct: number;
  baselineSafetyReserveAr: number;
  recommendedPeakSafetyReserveAr: number;
  additionalBufferNeededAr: number;
  points: FiveYearClimateResiliencePoint[];
}

export function computeFiveYearClimateVulnerability(
  assumptions: FinancialAssumptions,
  climate: ClimateImpactAssumptions,
  baseAnnualTurnoverAr: number,
  monthlyFixedChargesAr: number,
  bfrPerRotationHSAr: number
): FiveYearClimateVulnerabilitySummary {
  const vuln = climate.fiveYearVulnerability ?? {
    cycloneAnnualProbPct: 28,
    droughtAnnualProbPct: 35,
    floodAnnualProbPct: 20,
    safetyReserveTargetMonths: 2.5,
  };

  const pCyclone = Math.max(0, Math.min(1, vuln.cycloneAnnualProbPct / 100));
  const pDrought = Math.max(0, Math.min(1, vuln.droughtAnnualProbPct / 100));
  const pFlood = Math.max(0, Math.min(1, vuln.floodAnnualProbPct / 100));

  const pSafeYear = (1 - pCyclone) * (1 - pDrought) * (1 - pFlood);
  const annualCombinedProb = Math.max(0, Math.min(1, 1 - pSafeYear));
  const fiveYearAnyEventProb = 1 - Math.pow(1 - annualCombinedProb, 5);

  // Expected weighted shock on turnover per hazard type
  const expectedAnnualLossRatio =
    pCyclone * 0.35 + pDrought * 0.25 + pFlood * 0.18;
  const baselineSafetyReserveAr = Math.round(assumptions.investment.cashBufferAr);
  const growth2 = assumptions.growthRateYear2 || 0.25;
  const growth3 = assumptions.growthRateYear3 || 0.25;

  const points: FiveYearClimateResiliencePoint[] = ([1, 2, 3, 4, 5] as const).map(
    (yr) => {
      const cumProb = 1 - Math.pow(1 - annualCombinedProb, yr);
      const scaleFactor =
        yr === 1
          ? 1
          : yr === 2
          ? 1 + growth2 * 0.45
          : 1 + growth2 * 0.45 + growth3 * (yr - 2) * 0.25;

      const projTurnover = baseAnnualTurnoverAr * scaleFactor;
      const expectedTurnoverShockAr = Math.round(
        projTurnover * expectedAnnualLossRatio * (0.65 + cumProb * 0.35)
      );
      const baseBufferNeeded =
        monthlyFixedChargesAr * vuln.safetyReserveTargetMonths +
        bfrPerRotationHSAr * 0.5;
      const climateContingency = expectedTurnoverShockAr * 0.38;
      const recommendedSafetyTreasuryAr = Math.round(
        (baseBufferNeeded + climateContingency) * (1 + (yr - 1) * 0.06)
      );

      return {
        year: yr,
        label: `Année ${yr}`,
        cumulativeHazardProbPct: Number((cumProb * 100).toFixed(1)),
        expectedTurnoverShockAr,
        nominalAnnualCashBufferAr: baselineSafetyReserveAr,
        recommendedSafetyTreasuryAr,
        reserveGapAr: Math.max(
          0,
          recommendedSafetyTreasuryAr - baselineSafetyReserveAr
        ),
      };
    }
  );

  const recommendedPeakSafetyReserveAr = Math.max(
    ...points.map((p) => p.recommendedSafetyTreasuryAr)
  );

  return {
    annualCombinedEventProbPct: Number((annualCombinedProb * 100).toFixed(1)),
    fiveYearAnyEventProbPct: Number((fiveYearAnyEventProb * 100).toFixed(1)),
    baselineSafetyReserveAr,
    recommendedPeakSafetyReserveAr,
    additionalBufferNeededAr: Math.max(
      0,
      recommendedPeakSafetyReserveAr - baselineSafetyReserveAr
    ),
    points,
  };
}

