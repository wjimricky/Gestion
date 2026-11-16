import {
  ClimateHazardType,
  ClimateImpactAssumptions,
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
  };
}

export function applyClimateToSeasonValues(
  assumptions: FinancialAssumptions,
  climate: ClimateImpactAssumptions
): Pick<FinancialAssumptions, 'hauteSaison' | 'basseSaison'> {
  const shockFactor = climate.enabled
    ? Math.max(0.05, 1 + climate.fieldYieldShockPercent)
    : 1;
  const millingDelta = climate.enabled ? climate.millingYieldDeltaPoints : 0;

  const applyHS =
    climate.enabled && (climate.affectedSeason === 'both' || climate.affectedSeason === 'hauteSaison');
  const applyBS =
    climate.enabled && (climate.affectedSeason === 'both' || climate.affectedSeason === 'basseSaison');

  const hsPaddy = applyHS
    ? Math.max(100, Math.round(climate.baselinePaddyKgHS * shockFactor))
    : Math.max(100, Math.round(climate.baselinePaddyKgHS));

  const bsPaddy = applyBS
    ? Math.max(100, Math.round(climate.baselinePaddyKgBS * shockFactor))
    : Math.max(100, Math.round(climate.baselinePaddyKgBS));

  const hsYield = applyHS
    ? Math.max(0.2, Math.min(0.95, Number((climate.baselineMillingYieldHS + millingDelta).toFixed(4))))
    : climate.baselineMillingYieldHS;

  const bsYield = applyBS
    ? Math.max(0.2, Math.min(0.95, Number((climate.baselineMillingYieldBS + millingDelta).toFixed(4))))
    : climate.baselineMillingYieldBS;

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
}

export function computeClimateSimulationPreview(
  assumptions: FinancialAssumptions,
  climate: ClimateImpactAssumptions
): ClimateSimulationPreview {
  const nominalYieldKgPerHa = Math.max(0, climate.nominalYieldKgPerHa);
  const shockRatio = climate.fieldYieldShockPercent;
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
  const simulatedClimate: ClimateImpactAssumptions = { ...climate, enabled: true };
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
  };
}
