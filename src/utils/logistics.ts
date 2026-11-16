import {
  FinancialAssumptions,
  FullFinancialModel,
  KpiAlertThresholds,
  LogisticsAssumptions,
  RoadCondition,
} from '../types/finance';
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

export const DEFAULT_LOGISTICS_ASSUMPTIONS: LogisticsAssumptions = {
  enabled: true,
  distanceOneWayKmHS: 25,
  distanceOneWayKmBS: 125,
  roadConditionHS: 'goudronnee',
  roadConditionBS: 'piste_praticable',
  fuelPriceArPerLiter: 5000,
  fuelConsumptionLPer100Km: 25,
  truckTollAndWearArPerKm: 750,
};

export const DEFAULT_KPI_THRESHOLDS: Required<KpiAlertThresholds> = {
  minNpvAr: 0,
  minIrrRate: 0.12,
  maxPaybackMonths: 24,
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

export interface KpiAlertItem {
  id: 'operatingMargin' | 'grossMargin' | 'van' | 'tri' | 'payback';
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
    operatingMarginItem,
    grossMarginItem,
    vanItem,
    triItem,
    paybackItem,
  ].filter((item) => item.breached);

  return {
    thresholds,
    items: {
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
