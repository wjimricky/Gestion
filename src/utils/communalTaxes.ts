import {
  CommunalTaxPresetId,
  CommunalTaxesAssumptions,
  FinancialAssumptions,
  FullFinancialModel,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';

export const COMMUNAL_TAX_IDS = {
  ristourneKg: 'tax-ristourne-communale',
  marketFeeRot: 'rot-taxe-communale',
  landRoyaltyFixed: 'fix-redevances-foncieres',
} as const;

export const DEFAULT_COMMUNAL_TAXES: CommunalTaxesAssumptions = {
  enabled: false,
  applyToModel: true,
  presetId: 'alaotra_type1',
  communeName: 'Commune rurale rizicole (Alaotra)',
  ristourneArPerKgPaddy: 15,
  marketFeePerRotationAr: 35000,
  cultivatedLandHa: 118,
  landRoyaltyArPerHaYear: 45000,
  ifpbAndPatentMonthlyAr: 180000,
};

export interface CommunalTaxPreset {
  id: Exclude<CommunalTaxPresetId, 'custom'>;
  shortLabel: string;
  communeName: string;
  description: string;
  patch: Omit<CommunalTaxesAssumptions, 'enabled' | 'applyToModel'>;
}

export const COMMUNAL_TAX_PRESETS: CommunalTaxPreset[] = [
  {
    id: 'alaotra_type1',
    shortLabel: 'Lac Alaotra (Type I)',
    communeName: 'Commune rurale Ambatondrazaka / Alaotra',
    description:
      'Ristourne communale 15 Ar/kg paddy, laissez-passer 35 k Ar/rot, redevance foncière 45 k Ar/ha/an.',
    patch: {
      presetId: 'alaotra_type1',
      communeName: 'Commune rurale Ambatondrazaka / Alaotra',
      ristourneArPerKgPaddy: 15,
      marketFeePerRotationAr: 35000,
      cultivatedLandHa: 118,
      landRoyaltyArPerHaYear: 45000,
      ifpbAndPatentMonthlyAr: 180000,
    },
  },
  {
    id: 'marovoay_irri',
    shortLabel: 'Marovoay (Périmètre + AUE)',
    communeName: 'Périmètre irrigué Marovoay (Betsiboka)',
    description:
      'Redevance hydraulique & foncière AUE renforcée (85 k Ar/ha/an) et ristourne de collecte 20 Ar/kg.',
    patch: {
      presetId: 'marovoay_irri',
      communeName: 'Périmètre irrigué Marovoay (Betsiboka)',
      ristourneArPerKgPaddy: 20,
      marketFeePerRotationAr: 45000,
      cultivatedLandHa: 118,
      landRoyaltyArPerHaYear: 85000,
      ifpbAndPatentMonthlyAr: 210000,
    },
  },
  {
    id: 'hauts_plateaux',
    shortLabel: 'Hauts-Plateaux (IFPB urbain)',
    communeName: 'Commune périurbaine Antsirabe / Vakinankaratra',
    description:
      'Ristourne modérée (10 Ar/kg) mais patente & IFPB entrepôt plus élevés (280 k Ar/mois).',
    patch: {
      presetId: 'hauts_plateaux',
      communeName: 'Commune périurbaine Antsirabe / Vakinankaratra',
      ristourneArPerKgPaddy: 10,
      marketFeePerRotationAr: 30000,
      cultivatedLandHa: 95,
      landRoyaltyArPerHaYear: 55000,
      ifpbAndPatentMonthlyAr: 280000,
    },
  },
];

export function getResolvedCommunalTaxes(
  assumptions: FinancialAssumptions
): CommunalTaxesAssumptions {
  const existing = assumptions.communalTaxes;
  return {
    enabled: existing?.enabled ?? DEFAULT_COMMUNAL_TAXES.enabled,
    applyToModel: existing?.applyToModel ?? DEFAULT_COMMUNAL_TAXES.applyToModel,
    presetId: existing?.presetId ?? DEFAULT_COMMUNAL_TAXES.presetId,
    communeName: existing?.communeName ?? DEFAULT_COMMUNAL_TAXES.communeName,
    ristourneArPerKgPaddy:
      existing?.ristourneArPerKgPaddy ?? DEFAULT_COMMUNAL_TAXES.ristourneArPerKgPaddy,
    marketFeePerRotationAr:
      existing?.marketFeePerRotationAr ?? DEFAULT_COMMUNAL_TAXES.marketFeePerRotationAr,
    cultivatedLandHa: existing?.cultivatedLandHa ?? DEFAULT_COMMUNAL_TAXES.cultivatedLandHa,
    landRoyaltyArPerHaYear:
      existing?.landRoyaltyArPerHaYear ?? DEFAULT_COMMUNAL_TAXES.landRoyaltyArPerHaYear,
    ifpbAndPatentMonthlyAr:
      existing?.ifpbAndPatentMonthlyAr ?? DEFAULT_COMMUNAL_TAXES.ifpbAndPatentMonthlyAr,
  };
}

export function isCommunalTaxIntegrated(taxes: CommunalTaxesAssumptions): boolean {
  return Boolean(taxes.enabled && taxes.applyToModel);
}

/**
 * Injects or removes tagged communal tax & land royalty lines inside costsPerKgPaddy,
 * costsPerRotation, and fixedMonthlyCharges so every downstream KPI (Net Result, IR, VAN, TRI, Payback)
 * reflects communal fiscal charges without changing baseline parity when disabled.
 */
export function applyCommunalTaxesToAssumptions(
  assumptions: FinancialAssumptions,
  taxes: CommunalTaxesAssumptions
): Pick<
  FinancialAssumptions,
  'costsPerKgPaddy' | 'costsPerRotation' | 'fixedMonthlyCharges'
> {
  const active = isCommunalTaxIntegrated(taxes);

  const cleanCostsKg = assumptions.costsPerKgPaddy.filter(
    (c) => c.id !== COMMUNAL_TAX_IDS.ristourneKg
  );
  const cleanCostsRot = assumptions.costsPerRotation.filter(
    (c) => c.id !== COMMUNAL_TAX_IDS.marketFeeRot
  );
  const cleanFixed = assumptions.fixedMonthlyCharges.filter(
    (f) => f.id !== COMMUNAL_TAX_IDS.landRoyaltyFixed
  );

  if (!active) {
    return {
      costsPerKgPaddy: cleanCostsKg,
      costsPerRotation: cleanCostsRot,
      fixedMonthlyCharges: cleanFixed,
    };
  }

  const ristourne = Math.max(0, Number(taxes.ristourneArPerKgPaddy) || 0);
  const marketFee = Math.max(0, Number(taxes.marketFeePerRotationAr) || 0);
  const landHa = Math.max(0, Number(taxes.cultivatedLandHa) || 0);
  const royaltyPerHaYear = Math.max(0, Number(taxes.landRoyaltyArPerHaYear) || 0);
  const ifpbMonthly = Math.max(0, Number(taxes.ifpbAndPatentMonthlyAr) || 0);

  const monthlyLandAndIfpbAr = Math.round((landHa * royaltyPerHaYear) / 12 + ifpbMonthly);

  const nextCostsKg =
    ristourne > 0
      ? [
          ...cleanCostsKg,
          {
            id: COMMUNAL_TAX_IDS.ristourneKg,
            label: 'Ristourne communale (paddy)',
            costHS: ristourne,
            costBS: ristourne,
          },
        ]
      : cleanCostsKg;

  const nextCostsRot =
    marketFee > 0
      ? [
          ...cleanCostsRot,
          {
            id: COMMUNAL_TAX_IDS.marketFeeRot,
            label: 'Droits marché & laissez-passer',
            costHS: marketFee,
            costBS: marketFee,
          },
        ]
      : cleanCostsRot;

  const nextFixed =
    monthlyLandAndIfpbAr > 0
      ? [
          ...cleanFixed,
          {
            id: COMMUNAL_TAX_IDS.landRoyaltyFixed,
            label: 'Redevances foncières & IFPB',
            amount: monthlyLandAndIfpbAr,
          },
        ]
      : cleanFixed;

  return {
    costsPerKgPaddy: nextCostsKg,
    costsPerRotation: nextCostsRot,
    fixedMonthlyCharges: nextFixed,
  };
}

export interface CommunalTaxesBreakdown {
  isAppliedToModel: boolean;
  ristourneAnnualAr: number;
  marketFeesAnnualAr: number;
  landRoyaltyAnnualAr: number;
  ifpbAnnualAr: number;
  monthlyFixedTaxAr: number;
  totalAnnualTaxesAr: number;
  taxPerKgRiceAr: number;
  shareOfTurnoverRate: number;
  taxShieldIrAr: number;
  netResultAfterTaxWithoutTaxesAr: number;
  netResultAfterTaxWithTaxesAr: number;
  netResultDeltaAr: number;
  netMarginWithoutTaxes: number;
  netMarginWithTaxes: number;
  vanWithoutTaxesAr: number;
  vanWithTaxesAr: number;
}

export function computeCommunalTaxesBreakdown(
  assumptions: FinancialAssumptions,
  _currentModel: FullFinancialModel,
  taxesInput?: CommunalTaxesAssumptions
): CommunalTaxesBreakdown {
  const taxes = taxesInput ?? getResolvedCommunalTaxes(assumptions);

  const withoutAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...applyCommunalTaxesToAssumptions(assumptions, { ...taxes, enabled: false }),
  };
  const withAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...applyCommunalTaxesToAssumptions(assumptions, {
      ...taxes,
      enabled: true,
      applyToModel: true,
    }),
  };

  const withoutModel = calculateFullModel(withoutAssumptions);
  const withModel = calculateFullModel(withAssumptions);

  const totalPaddyAnnualKg =
    withoutModel.hauteSaison.totalPaddyKg + withoutModel.basseSaison.totalPaddyKg;
  const totalRotationsAnnual =
    withoutModel.hauteSaison.totalRotations + withoutModel.basseSaison.totalRotations;

  const ristourne = Math.max(0, Number(taxes.ristourneArPerKgPaddy) || 0);
  const marketFee = Math.max(0, Number(taxes.marketFeePerRotationAr) || 0);
  const landHa = Math.max(0, Number(taxes.cultivatedLandHa) || 0);
  const royaltyPerHaYear = Math.max(0, Number(taxes.landRoyaltyArPerHaYear) || 0);
  const ifpbMonthly = Math.max(0, Number(taxes.ifpbAndPatentMonthlyAr) || 0);

  const ristourneAnnualAr = totalPaddyAnnualKg * ristourne;
  const marketFeesAnnualAr = totalRotationsAnnual * marketFee;
  const landRoyaltyAnnualAr = landHa * royaltyPerHaYear;
  const ifpbAnnualAr = ifpbMonthly * 12;
  const monthlyFixedTaxAr = Math.round(landRoyaltyAnnualAr / 12 + ifpbMonthly);

  const totalAnnualTaxesAr =
    ristourneAnnualAr + marketFeesAnnualAr + landRoyaltyAnnualAr + ifpbAnnualAr;

  const totalRiceKg = Math.max(1, withoutModel.year1.totalRiceKgSold);
  const taxPerKgRiceAr = totalAnnualTaxesAr / totalRiceKg;
  const shareOfTurnoverRate =
    withoutModel.year1.totalTurnoverAr > 0
      ? totalAnnualTaxesAr / withoutModel.year1.totalTurnoverAr
      : 0;

  const netResultDeltaAr =
    withModel.year1.netResultAfterTaxAr - withoutModel.year1.netResultAfterTaxAr;
  const taxShieldIrAr = Math.max(
    0,
    withoutModel.year1.corporateTaxAr - withModel.year1.corporateTaxAr
  );

  return {
    isAppliedToModel: isCommunalTaxIntegrated(taxes),
    ristourneAnnualAr,
    marketFeesAnnualAr,
    landRoyaltyAnnualAr,
    ifpbAnnualAr,
    monthlyFixedTaxAr,
    totalAnnualTaxesAr,
    taxPerKgRiceAr,
    shareOfTurnoverRate,
    taxShieldIrAr,
    netResultAfterTaxWithoutTaxesAr: withoutModel.year1.netResultAfterTaxAr,
    netResultAfterTaxWithTaxesAr: withModel.year1.netResultAfterTaxAr,
    netResultDeltaAr,
    netMarginWithoutTaxes: withoutModel.year1.netMarginAfterTaxRate,
    netMarginWithTaxes: withModel.year1.netMarginAfterTaxRate,
    vanWithoutTaxesAr: withoutModel.npv.npvAr,
    vanWithTaxesAr: withModel.npv.npvAr,
  };
}
