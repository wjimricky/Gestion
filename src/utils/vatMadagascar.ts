import {
  FinancialAssumptions,
  PaybackResult,
  SeasonResult,
  VatAssumptions,
  VatMonthlyEntry,
  VatRegime,
  VatRiceOutputMode,
  VatSeasonBreakdown,
  VatSimulationResult,
  Year1Result,
} from '../types/finance';

export const MADAGASCAR_VAT_THRESHOLD_AR = 400_000_000; // Seuil d'assujettissement TVA CGI Madagascar (400 M Ar CA annuel)

export const DEFAULT_VAT_ASSUMPTIONS: VatAssumptions = {
  enabled: false,
  applyToCashFlow: false,
  applyToFinancialStatements: false,
  regime: 'exonere_agricole',
  vatRate: 0.2,
  inputVatRate: 0.2,
  outputVatRate: 0.2,
  riceOutputMode: 'exonere_ppn',
  taxableRiceSharePct: 35,
  byproductTaxable: false,
  fuelVatDeductibleQuotaPct: 80,
  millingAndBagsVatApplicable: true,
  fixedChargesTaxableSharePct: 45,
  capexVatRecoverable: true,
};

export interface VatPresetOption {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  patch: Partial<VatAssumptions>;
}

export const MADAGASCAR_VAT_PRESETS: VatPresetOption[] = [
  {
    id: 'exonere_ppn',
    label: 'Filière Agricole Exonérée (Paddy & Riz PPN)',
    shortLabel: 'Exonéré Agricole (PPN)',
    description:
      'Paddy brut et riz local exonérés (0 % TVA collectée). Subit la TVA rémanente non récupérable sur carburant, sacs et prestations formelles.',
    patch: {
      regime: 'exonere_agricole',
      vatRate: 0.2,
      inputVatRate: 0.2,
      outputVatRate: 0.0,
      riceOutputMode: 'exonere_ppn',
      taxableRiceSharePct: 0,
      byproductTaxable: false,
      fuelVatDeductibleQuotaPct: 80,
      millingAndBagsVatApplicable: true,
      fixedChargesTaxableSharePct: 45,
      capexVatRecoverable: false,
    },
  },
  {
    id: 'assujetti_b2b',
    label: 'Rizerie Industrielle Assujettie TVA (20 %)',
    shortLabel: 'Assujetti Réel 20 %',
    description:
      'CA > 400 M Ar ou option formelle : TVA 20 % collectée sur riz conditionné et sous-produits, déduction intégrale sur intrants & CAPEX (paddy brut reste à 0 %).',
    patch: {
      regime: 'assujetti_reel',
      vatRate: 0.2,
      inputVatRate: 0.2,
      outputVatRate: 0.2,
      riceOutputMode: 'assujetti_20',
      taxableRiceSharePct: 100,
      byproductTaxable: true,
      fuelVatDeductibleQuotaPct: 100,
      millingAndBagsVatApplicable: true,
      fixedChargesTaxableSharePct: 45,
      capexVatRecoverable: true,
    },
  },
  {
    id: 'mixte_prorata',
    label: 'Circuit Mixte (Grossistes B2B 20 % + Marché local 0 %)',
    shortLabel: 'Mixte Prorata B2B',
    description:
      '40 % des ventes en circuit formel/GMS (TVA 20 %) et 60 % marché local exonéré : applique le prorata de déduction CGI sur les intrants communs.',
    patch: {
      regime: 'assujetti_reel',
      vatRate: 0.2,
      inputVatRate: 0.2,
      outputVatRate: 0.2,
      riceOutputMode: 'mixte_b2b',
      taxableRiceSharePct: 40,
      byproductTaxable: true,
      fuelVatDeductibleQuotaPct: 80,
      millingAndBagsVatApplicable: true,
      fixedChargesTaxableSharePct: 45,
      capexVatRecoverable: true,
    },
  },
];

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  assujetti_reel: 'Régime Réel (Assujetti TVA)',
  exonere_agricole: 'Exonéré Agricole (Paddy / Riz PPN)',
  synthetique_is: 'Régime Synthétique (Non assujetti TVA)',
};

export const VAT_OUTPUT_MODE_LABELS: Record<VatRiceOutputMode, string> = {
  exonere_ppn: '0 % Exonéré (Produit agricole / PPN)',
  assujetti_20: 'Assujetti (Riz usiné conditionné / B2B)',
  mixte_b2b: 'Mixte (% B2B assujetti + % local exonéré)',
};

export type { VatSeasonBreakdown, VatMonthlyEntry, VatSimulationResult };

export function getResolvedVatAssumptions(assumptions: FinancialAssumptions): VatAssumptions {
  const merged = {
    ...DEFAULT_VAT_ASSUMPTIONS,
    ...(assumptions.vatSettings || {}),
  };
  const fallbackRate = Math.max(0, Number(merged.vatRate) || 0);
  return {
    ...merged,
    inputVatRate:
      typeof merged.inputVatRate === 'number' && Number.isFinite(merged.inputVatRate)
        ? Math.max(0, merged.inputVatRate)
        : fallbackRate,
    outputVatRate:
      typeof merged.outputVatRate === 'number' && Number.isFinite(merged.outputVatRate)
        ? Math.max(0, merged.outputVatRate)
        : fallbackRate,
    applyToFinancialStatements:
      merged.applyToFinancialStatements ?? merged.applyToCashFlow ?? false,
  };
}

function getEffectiveTaxableShare(settings: VatAssumptions): number {
  if (settings.regime !== 'assujetti_reel') return 0;
  if (settings.riceOutputMode === 'exonere_ppn') return 0;
  if (settings.riceOutputMode === 'assujetti_20') return 1;
  return Math.max(0, Math.min(100, settings.taxableRiceSharePct)) / 100;
}

export interface VatModelInputs {
  hauteSaison: SeasonResult;
  basseSaison: SeasonResult;
  year1: Year1Result;
  payback?: PaybackResult;
}

function computeSeasonInputsBreakdown(
  assumptions: FinancialAssumptions,
  model: VatModelInputs,
  seasonKey: 'hauteSaison' | 'basseSaison',
  settings: VatAssumptions,
  inputVatRate: number
) {
  const seasonAssump = assumptions[seasonKey];
  const seasonRes = model[seasonKey];
  const rotations = Math.max(0, seasonRes.totalRotations);
  const totalPaddyKg = Math.max(0, seasonRes.totalPaddyKg);

  // Paddy brut acheté aux producteurs est exonéré à 0 % (CGI Madagascar)
  // Les prestations de décorticage/usinage (autres coûts/kg hors paddy) et les sacs d'emballage sont taxables au taux intrants si formel
  const millingPerKg = assumptions.costsPerKgPaddy
    .filter((c) => c.id !== 'cost-paddy')
    .reduce((acc, c) => acc + Math.max(0, seasonKey === 'hauteSaison' ? c.costHS : c.costBS), 0);

  const millingTotalAr = totalPaddyKg * millingPerKg;
  const bagsTotalAr = seasonRes.bagCostPerRotationAr * rotations;

  // Coûts par rotation : distinguer carburant/logistique (quote-part déductible) des autres frais
  let fuelRotationTotalAr = 0;
  let otherRotationTotalAr = 0;
  assumptions.costsPerRotation.forEach((c) => {
    const unit = Math.max(0, seasonKey === 'hauteSaison' ? c.costHS : c.costBS);
    if (c.id.includes('carburant') || c.label.toLowerCase().includes('carburant')) {
      fuelRotationTotalAr += unit * rotations;
    } else {
      otherRotationTotalAr += unit * rotations;
    }
  });

  // Charges fixes mensuelles taxables (électricité Jirama, loyer commercial, entretien, télécoms hors salaires)
  const monthlyFixedAr = assumptions.fixedMonthlyCharges.reduce((s, f) => s + Math.max(0, f.amount), 0);
  const seasonFixedAr = monthlyFixedAr * seasonAssump.months;
  const taxableFixedShare = Math.max(0, Math.min(100, settings.fixedChargesTaxableSharePct)) / 100;
  const taxableFixedAr = seasonFixedAr * taxableFixedShare;

  const fuelQuota = Math.max(0, Math.min(100, settings.fuelVatDeductibleQuotaPct)) / 100;

  const millingAndBagsBaseAr = settings.millingAndBagsVatApplicable
    ? millingTotalAr + bagsTotalAr
    : 0;

  // TVA facturée par les fournisseurs formels sur intrants & services au taux TVA intrants
  const tvaFuelBruteAr = fuelRotationTotalAr * inputVatRate;
  const tvaMillingBagsBruteAr = millingAndBagsBaseAr * inputVatRate;
  const tvaOtherRotBruteAr = otherRotationTotalAr * 0.5 * inputVatRate; // ~50% facturé avec TVA formelle
  const tvaFixedBruteAr = taxableFixedAr * inputVatRate;

  const tvaBruteSurIntrantsAr =
    tvaFuelBruteAr + tvaMillingBagsBruteAr + tvaOtherRotBruteAr + tvaFixedBruteAr;

  const tvaEligibleQuotaAr =
    tvaFuelBruteAr * fuelQuota +
    tvaMillingBagsBruteAr +
    tvaOtherRotBruteAr +
    tvaFixedBruteAr;

  const taxableInputsHtAr =
    fuelRotationTotalAr + millingAndBagsBaseAr + otherRotationTotalAr * 0.5 + taxableFixedAr;

  return {
    taxableInputsHtAr,
    tvaBruteSurIntrantsAr,
    tvaEligibleQuotaAr,
  };
}

export function computeMadagascarVatSimulation(
  assumptions: FinancialAssumptions,
  model: VatModelInputs,
  overrideSettings?: VatAssumptions
): VatSimulationResult {
  const settings = overrideSettings ?? getResolvedVatAssumptions(assumptions);
  const inputVatRate = Math.max(0, settings.inputVatRate ?? settings.vatRate);
  const outputVatRate = Math.max(0, settings.outputVatRate ?? settings.vatRate);
  const isAssujetti =
    settings.regime === 'assujetti_reel' &&
    settings.riceOutputMode !== 'exonere_ppn' &&
    outputVatRate > 0;

  const riceTaxableShare = getEffectiveTaxableShare(settings);

  // Compute HS & BS revenue taxable bases
  const hsRiceTurnover = model.hauteSaison.totalRiceKg * model.hauteSaison.riceSellingPriceAr;
  const hsByprodTurnover =
    model.hauteSaison.totalByproductsKg * model.hauteSaison.byproductSellingPriceAr;
  const hsTaxableTurnover =
    (settings.regime === 'assujetti_reel' ? hsRiceTurnover * riceTaxableShare : 0) +
    (settings.regime === 'assujetti_reel' && settings.byproductTaxable ? hsByprodTurnover : 0);

  const bsRiceTurnover = model.basseSaison.totalRiceKg * model.basseSaison.riceSellingPriceAr;
  const bsByprodTurnover =
    model.basseSaison.totalByproductsKg * model.basseSaison.byproductSellingPriceAr;
  const bsTaxableTurnover =
    (settings.regime === 'assujetti_reel' ? bsRiceTurnover * riceTaxableShare : 0) +
    (settings.regime === 'assujetti_reel' && settings.byproductTaxable ? bsByprodTurnover : 0);

  const totalTurnover = Math.max(1, model.year1.totalTurnoverAr);
  const totalTaxableTurnover = hsTaxableTurnover + bsTaxableTurnover;

  // Prorata de déduction CGI = CA taxable / CA total (1.0 si 100% taxable, 0 si non assujetti)
  const prorataDeduction =
    settings.regime === 'assujetti_reel' && totalTaxableTurnover > 0 && outputVatRate > 0
      ? Math.min(1, totalTaxableTurnover / totalTurnover)
      : 0;

  const hsInputs = computeSeasonInputsBreakdown(
    assumptions,
    model,
    'hauteSaison',
    settings,
    inputVatRate
  );
  const bsInputs = computeSeasonInputsBreakdown(
    assumptions,
    model,
    'basseSaison',
    settings,
    inputVatRate
  );

  const hsTvaCollectee = hsTaxableTurnover * outputVatRate;
  const hsTvaDeductible = hsInputs.tvaEligibleQuotaAr * prorataDeduction;
  const hsTvaRemanente = Math.max(0, hsInputs.tvaBruteSurIntrantsAr - hsTvaDeductible);

  const bsTvaCollectee = bsTaxableTurnover * outputVatRate;
  const bsTvaDeductible = bsInputs.tvaEligibleQuotaAr * prorataDeduction;
  const bsTvaRemanente = Math.max(0, bsInputs.tvaBruteSurIntrantsAr - bsTvaDeductible);

  // CAPEX Matériel TVA (taux intrants/équipement)
  const capexTvaBruteAr = assumptions.investment.materielAr * inputVatRate;
  const capexTvaDeductibleAr =
    settings.regime === 'assujetti_reel' && settings.capexVatRecoverable && prorataDeduction > 0
      ? capexTvaBruteAr * prorataDeduction
      : 0;
  const capexTvaRemanenteAr = Math.max(0, capexTvaBruteAr - capexTvaDeductibleAr);

  // Monthly 12-month cash flow simulation with VAT credit carryforward
  const hsMonths = Math.max(1, Math.min(11, Math.round(assumptions.hauteSaison.months)));
  const bsMonths = Math.max(1, 12 - hsMonths);

  let creditCarryforward = capexTvaDeductibleAr; // initial CAPEX VAT credit carried into M1
  let totalTvaVerseeDgi = 0;

  const monthlySchedule: VatMonthlyEntry[] = [];
  const baseYear1Monthly = model.payback ? model.payback.monthlyCashFlows.slice(0, 12) : [];

  for (let m = 1; m <= 12; m++) {
    const isHs = m <= hsMonths;
    const seasonMonths = isHs ? hsMonths : bsMonths;
    const monthCollectee = (isHs ? hsTvaCollectee : bsTvaCollectee) / seasonMonths;
    const monthDeductible = (isHs ? hsTvaDeductible : bsTvaDeductible) / seasonMonths;
    const monthRemanente = (isHs ? hsTvaRemanente : bsTvaRemanente) / seasonMonths;

    const netVatPosition = monthCollectee - monthDeductible - creditCarryforward;
    let monthTvaAPayer = 0;
    if (netVatPosition > 0) {
      monthTvaAPayer = netVatPosition;
      creditCarryforward = 0;
    } else {
      monthTvaAPayer = 0;
      creditCarryforward = Math.abs(netVatPosition);
    }

    totalTvaVerseeDgi += monthTvaAPayer;

    const baseCf =
      baseYear1Monthly[m - 1]?.netCashFlowAfterTaxAr ?? model.year1.netResultAfterTaxAr / 12;

    // Impact sur le flux de trésorerie net réel :
    // + Récupération crédit TVA CAPEX qui vient réduire la TVA due (monthDeductible + crédit utilisé)
    // - TVA rémanente non récupérable sur intrants (coût net après économie IR)
    const vatCreditUsedThisMonth = Math.max(0, monthCollectee - monthDeductible - monthTvaAPayer);
    const afterTaxRemnantDrag =
      monthRemanente * (1 - Math.max(0, Math.min(0.4, assumptions.corporateTaxRate)));
    const vatCashImpactAr = vatCreditUsedThisMonth - afterTaxRemnantDrag;

    monthlySchedule.push({
      month: m,
      label: `M${m}`,
      period: isHs ? 'HS' : 'BS',
      tvaCollecteeAr: monthCollectee,
      tvaDeductibleAr: monthDeductible,
      tvaRemanenteAr: monthRemanente,
      tvaNetteAPayerAr: monthTvaAPayer,
      creditTvaReporteAr: creditCarryforward,
      cashFlowBeforeVatAr: baseCf,
      vatCashImpactAr,
      cashFlowAfterVatAr: baseCf + vatCashImpactAr,
    });
  }

  const annualTvaCollecteeAr = hsTvaCollectee + bsTvaCollectee;
  const annualTvaDeductibleOpexAr = hsTvaDeductible + bsTvaDeductible;
  const annualTvaRemanenteNonDeductibleAr = hsTvaRemanente + bsTvaRemanente + capexTvaRemanenteAr;

  const avgMonthlyCreditTvaAr =
    monthlySchedule.reduce((s, r) => s + r.creditTvaReporteAr, 0) /
    Math.max(1, monthlySchedule.length);
  const avgMonthlyVatPayableAr =
    monthlySchedule.reduce((s, r) => s + r.tvaNetteAPayerAr, 0) /
    Math.max(1, monthlySchedule.length);

  const year1CashFlowBeforeVatAr = model.year1.netResultAfterTaxAr;
  const year1VatCashImpactAr = monthlySchedule.reduce((s, r) => s + r.vatCashImpactAr, 0);
  const year1CashFlowAfterVatAr = year1CashFlowBeforeVatAr + year1VatCashImpactAr;

  const dgiThresholdExceeded =
    model.year1.totalTurnoverAr >= MADAGASCAR_VAT_THRESHOLD_AR &&
    settings.regime !== 'assujetti_reel';

  const dgiThresholdWarning = dgiThresholdExceeded
    ? `Attention : votre CA annuel (${Math.round(model.year1.totalTurnoverAr / 1e6)} M Ar) dépasse le seuil légal d'assujettissement TVA à Madagascar (400 M Ar — CGI). Vérifiez l'exonération spécifique de vos ventes de riz brut ou anticipez le passage au régime réel.`
    : null;

  return {
    settings,
    inputVatRate,
    outputVatRate,
    isAssujetti,
    prorataDeduction,
    hauteSaison: {
      season: 'HS',
      months: hsMonths,
      turnoverHtAr: model.hauteSaison.totalTurnoverAr,
      taxableTurnoverAr: hsTaxableTurnover,
      tvaCollecteeAr: hsTvaCollectee,
      taxableInputsHtAr: hsInputs.taxableInputsHtAr,
      tvaBruteSurIntrantsAr: hsInputs.tvaBruteSurIntrantsAr,
      tvaDeductibleOpexAr: hsTvaDeductible,
      tvaRemanenteOpexAr: hsTvaRemanente,
    },
    basseSaison: {
      season: 'BS',
      months: bsMonths,
      turnoverHtAr: model.basseSaison.totalTurnoverAr,
      taxableTurnoverAr: bsTaxableTurnover,
      tvaCollecteeAr: bsTvaCollectee,
      taxableInputsHtAr: bsInputs.taxableInputsHtAr,
      tvaBruteSurIntrantsAr: bsInputs.tvaBruteSurIntrantsAr,
      tvaDeductibleOpexAr: bsTvaDeductible,
      tvaRemanenteOpexAr: bsTvaRemanente,
    },
    annualTvaCollecteeAr,
    annualTvaDeductibleOpexAr,
    capexTvaBruteAr,
    capexTvaDeductibleAr,
    capexTvaRemanenteAr,
    annualTvaRemanenteNonDeductibleAr,
    annualTvaNetteVerseeDgiAr: totalTvaVerseeDgi,
    yearEndCreditTvaAr: creditCarryforward,
    avgMonthlyCreditTvaAr,
    avgMonthlyVatPayableAr,
    year1CashFlowBeforeVatAr,
    year1VatCashImpactAr,
    year1CashFlowAfterVatAr,
    dgiThresholdExceeded,
    dgiThresholdWarning,
    monthlySchedule,
  };
}
