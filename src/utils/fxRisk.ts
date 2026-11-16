import {
  FinancialAssumptions,
  FxCurrencyReference,
  FxRiskAssumptions,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';

export interface FxCurrencyMeta {
  label: string;
  shortLabel: string;
  symbol: string;
  description: string;
}

export const FX_CURRENCY_META: Record<FxCurrencyReference, FxCurrencyMeta> = {
  EUR: {
    label: 'Euro (EUR / MGA)',
    shortLabel: 'EUR',
    symbol: '€',
    description:
      'Devise principale pour le matériel d’usinage européen et certains intrants agricoles importés.',
  },
  USD: {
    label: 'Dollar US (USD / MGA)',
    shortLabel: 'USD',
    symbol: '$',
    description:
      'Devise de référence pour les engrais minéraux (NPK, urée), sacs polypropylène et fret maritime.',
  },
  mixte: {
    label: 'Panier mixte (60 % EUR · 40 % USD)',
    shortLabel: 'EUR/USD',
    symbol: '€/$',
    description:
      'Exposition combinée représentative d’une PME rizicole malgache (équipements EUR + intrants USD).',
  },
};

export function getResolvedFxRisk(assumptions: FinancialAssumptions): FxRiskAssumptions {
  const existing = assumptions.fxRisk;
  return {
    enabled: existing?.enabled ?? true,
    referenceCurrency: existing?.referenceCurrency ?? 'EUR',
    eurArRateBaseline: existing?.eurArRateBaseline ?? 4950,
    usdArRateBaseline: existing?.usdArRateBaseline ?? 4600,
    ariaryFluctuationPercent: existing?.ariaryFluctuationPercent ?? 0,
    fertilizerBaseCostArPerKgPaddy: existing?.fertilizerBaseCostArPerKgPaddy ?? 65,
    importedFertilizerShare: existing?.importedFertilizerShare ?? 0.85,
    baselineMaterielAr: existing?.baselineMaterielAr ?? assumptions.investment.materielAr,
    importedMachineryShare: existing?.importedMachineryShare ?? 0.75,
  };
}

export function getEffectiveReferenceRate(fx: FxRiskAssumptions): {
  baseRateAr: number;
  shockedRateAr: number;
  unitLabel: string;
} {
  const factor = 1 + fx.ariaryFluctuationPercent;
  if (fx.referenceCurrency === 'EUR') {
    return {
      baseRateAr: fx.eurArRateBaseline,
      shockedRateAr: Math.round(fx.eurArRateBaseline * factor),
      unitLabel: 'Ar / 1 EUR',
    };
  }
  if (fx.referenceCurrency === 'USD') {
    return {
      baseRateAr: fx.usdArRateBaseline,
      shockedRateAr: Math.round(fx.usdArRateBaseline * factor),
      unitLabel: 'Ar / 1 USD',
    };
  }
  const mixBase = fx.eurArRateBaseline * 0.6 + fx.usdArRateBaseline * 0.4;
  return {
    baseRateAr: Math.round(mixBase),
    shockedRateAr: Math.round(mixBase * factor),
    unitLabel: 'Ar / Panier mixte',
  };
}

/**
 * Applies Ariary exchange rate fluctuation to imported variable inputs (fertilizers/inputs per kg)
 * and imported initial machinery CAPEX (`investment.materielAr`).
 * Preserves 0 Ar drift when `ariaryFluctuationPercent === 0` or `enabled === false`.
 */
export function applyFxRiskToAssumptions(
  assumptions: FinancialAssumptions,
  fx: FxRiskAssumptions
): Pick<FinancialAssumptions, 'costsPerKgPaddy' | 'investment'> {
  const cleanCosts = assumptions.costsPerKgPaddy.filter((c) => c.id !== 'cost-fx-intrants');

  if (!fx.enabled || Math.abs(fx.ariaryFluctuationPercent) < 1e-6) {
    return {
      costsPerKgPaddy: cleanCosts,
      investment: {
        ...assumptions.investment,
        materielAr: Math.max(0, Math.round(fx.baselineMaterielAr)),
      },
    };
  }

  // Variable imported input delta (Ar / kg paddy)
  // Note: validation requires costsPerKgPaddy items >= 0, so positive depreciation adds `cost-fx-intrants`.
  const fertilizerDeltaArPerKg = Math.round(
    fx.fertilizerBaseCostArPerKgPaddy *
      Math.max(0, Math.min(1, fx.importedFertilizerShare)) *
      fx.ariaryFluctuationPercent
  );

  const nextCosts =
    fertilizerDeltaArPerKg > 0
      ? [
          ...cleanCosts,
          {
            id: 'cost-fx-intrants',
            label: 'Impact change intrants importés',
            costHS: fertilizerDeltaArPerKg,
            costBS: fertilizerDeltaArPerKg,
          },
        ]
      : cleanCosts;

  const materielFactor =
    1 + Math.max(0, Math.min(1, fx.importedMachineryShare)) * fx.ariaryFluctuationPercent;
  const nextMaterielAr = Math.max(0, Math.round(fx.baselineMaterielAr * materielFactor));

  return {
    costsPerKgPaddy: nextCosts,
    investment: {
      ...assumptions.investment,
      materielAr: nextMaterielAr,
    },
  };
}

export interface FxSimulationPoint {
  label: string;
  shockPercent: number;
  grossMarginPct: number;
  netMarginPct: number;
  netResultMillions: number;
  isCurrent: boolean;
}

export interface FxRiskSimulationPreview {
  baseRateAr: number;
  shockedRateAr: number;
  unitLabel: string;
  fertilizerDeltaArPerKg: number;
  annualImportedInputDeltaAr: number;
  baselineMaterielAr: number;
  shockedMaterielAr: number;
  materielDeltaAr: number;
  baselineGrossMarginRate: number;
  shockedGrossMarginRate: number;
  grossMarginDeltaPts: number;
  baselineNetMarginRate: number;
  shockedNetMarginRate: number;
  netMarginDeltaPts: number;
  baselineNpvAr: number;
  shockedNpvAr: number;
  npvDeltaAr: number;
  sensitivitySeries: FxSimulationPoint[];
}

export function computeFxRiskPreview(
  assumptions: FinancialAssumptions,
  fx: FxRiskAssumptions
): FxRiskSimulationPreview {
  const rateInfo = getEffectiveReferenceRate(fx);

  // Baseline model (0% FX shock)
  const baselineFx: FxRiskAssumptions = { ...fx, enabled: false, ariaryFluctuationPercent: 0 };
  const baselinePatch = applyFxRiskToAssumptions(assumptions, baselineFx);
  const baselineAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...baselinePatch,
  };
  const baseModel = calculateFullModel(baselineAssumptions);

  // Shocked model (always preview current slider value even if sync toggle paused)
  const simulatedFx: FxRiskAssumptions = { ...fx, enabled: true };
  const shockedPatch = applyFxRiskToAssumptions(baselineAssumptions, simulatedFx);
  const shockedAssumptions: FinancialAssumptions = {
    ...baselineAssumptions,
    ...shockedPatch,
  };
  const shockedModel = calculateFullModel(shockedAssumptions);

  const fertilizerDeltaArPerKg =
    fx.fertilizerBaseCostArPerKgPaddy *
    Math.max(0, Math.min(1, fx.importedFertilizerShare)) *
    fx.ariaryFluctuationPercent;

  const totalAnnualPaddyKg =
    baseModel.hauteSaison.totalPaddyKg + baseModel.basseSaison.totalPaddyKg;
  const annualImportedInputDeltaAr = fertilizerDeltaArPerKg * totalAnnualPaddyKg;

  const materielDeltaAr = shockedPatch.investment.materielAr - fx.baselineMaterielAr;

  const sampleShocks = [-0.1, 0, 0.1, 0.2, 0.3];
  const currentPct = Math.round(fx.ariaryFluctuationPercent * 100);
  const sensitivitySeries: FxSimulationPoint[] = sampleShocks.map((shock) => {
    const pointPatch = applyFxRiskToAssumptions(baselineAssumptions, {
      ...fx,
      enabled: true,
      ariaryFluctuationPercent: shock,
    });
    const ptModel = calculateFullModel({
      ...baselineAssumptions,
      ...pointPatch,
    });
    const pct = Math.round(shock * 100);
    return {
      label: pct > 0 ? `+${pct}%` : `${pct}%`,
      shockPercent: pct,
      grossMarginPct: Number((ptModel.year1.grossMarginRate * 100).toFixed(2)),
      netMarginPct: Number((ptModel.year1.netMarginAfterTaxRate * 100).toFixed(2)),
      netResultMillions: Number((ptModel.year1.netResultAfterTaxAr / 1e6).toFixed(2)),
      isCurrent: Math.abs(pct - currentPct) <= 4,
    };
  });

  return {
    baseRateAr: rateInfo.baseRateAr,
    shockedRateAr: rateInfo.shockedRateAr,
    unitLabel: rateInfo.unitLabel,
    fertilizerDeltaArPerKg,
    annualImportedInputDeltaAr,
    baselineMaterielAr: fx.baselineMaterielAr,
    shockedMaterielAr: shockedPatch.investment.materielAr,
    materielDeltaAr,
    baselineGrossMarginRate: baseModel.year1.grossMarginRate,
    shockedGrossMarginRate: shockedModel.year1.grossMarginRate,
    grossMarginDeltaPts:
      (shockedModel.year1.grossMarginRate - baseModel.year1.grossMarginRate) * 100,
    baselineNetMarginRate: baseModel.year1.netMarginAfterTaxRate,
    shockedNetMarginRate: shockedModel.year1.netMarginAfterTaxRate,
    netMarginDeltaPts:
      (shockedModel.year1.netMarginAfterTaxRate - baseModel.year1.netMarginAfterTaxRate) * 100,
    baselineNpvAr: baseModel.npv.npvAr,
    shockedNpvAr: shockedModel.npv.npvAr,
    npvDeltaAr: shockedModel.npv.npvAr - baseModel.npv.npvAr,
    sensitivitySeries,
  };
}
