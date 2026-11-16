import {
  FinancialAssumptions,
  SubsidiesAssumptions,
  SubsidyDonorType,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';
import { getResolvedFxRisk } from './fxRisk';

export interface SubsidyProgramPreset {
  id: string;
  label: string;
  programName: string;
  donorType: SubsidyDonorType;
  capexGrantPercent: number;
  capexGrantFixedAr: number;
  bfrWorkingCapitalGrantAr: number;
  opexPaddySubsidyArPerKg: number;
  opexFixedMonthlySubsidyAr: number;
  description: string;
}

export const SUBSIDY_PRESETS: SubsidyProgramPreset[] = [
  {
    id: 'none',
    label: 'Base sans subvention',
    programName: 'Aucun programme actif (Base nominale)',
    donorType: 'national',
    capexGrantPercent: 0,
    capexGrantFixedAr: 0,
    bfrWorkingCapitalGrantAr: 0,
    opexPaddySubsidyArPerKg: 0,
    opexFixedMonthlySubsidyAr: 0,
    description: 'Modèle autonome sans appui financier public ni subvention internationale.',
  },
  {
    id: 'fda_maep',
    label: 'FDA / MAEP (National)',
    programName: 'Fonds de Développement Agricole (FDA / MAEP)',
    donorType: 'national',
    capexGrantPercent: 0.4,
    capexGrantFixedAr: 0,
    bfrWorkingCapitalGrantAr: 2000000,
    opexPaddySubsidyArPerKg: 25,
    opexFixedMonthlySubsidyAr: 0,
    description:
      'Cofinancement 40 % équipements, dotation BFR campagne 2 M Ar et appui intrants/usinage 25 Ar/kg paddy.',
  },
  {
    id: 'fida_ad2m',
    label: 'FIDA / AD2M (International)',
    programName: 'Programme FIDA / AD2M — Chaîne de valeur riz',
    donorType: 'international',
    capexGrantPercent: 0.5,
    capexGrantFixedAr: 1000000,
    bfrWorkingCapitalGrantAr: 3500000,
    opexPaddySubsidyArPerKg: 35,
    opexFixedMonthlySubsidyAr: 800000,
    description:
      'Subvention internationale matériel (50 % + 1 M Ar), fonds de roulement 3,5 M Ar, bon intrants 35 Ar/kg et appui 800 k Ar/m.',
  },
  {
    id: 'fao_resilience',
    label: 'FAO / UE Résilience',
    programName: 'Appui FAO / Union Européenne — Sécurité alimentaire',
    donorType: 'international',
    capexGrantPercent: 0.3,
    capexGrantFixedAr: 500000,
    bfrWorkingCapitalGrantAr: 4000000,
    opexPaddySubsidyArPerKg: 60,
    opexFixedMonthlySubsidyAr: 400000,
    description:
      'Priorité baisse coût matière (60 Ar/kg) et dotation BFR soudure 4 M Ar pour stabiliser la collecte.',
  },
  {
    id: 'bm_prosperer',
    label: 'Banque Mondiale / AFD',
    programName: 'Facilité Agro-Industrielle BM / AFD',
    donorType: 'mixte',
    capexGrantPercent: 0.65,
    capexGrantFixedAr: 1500000,
    bfrWorkingCapitalGrantAr: 5000000,
    opexPaddySubsidyArPerKg: 40,
    opexFixedMonthlySubsidyAr: 1200000,
    description:
      'Forte réduction CAPEX (65 % + 1,5 M Ar), dotation BFR 5 M Ar et prise en charge partielle des frais fixes.',
  },
];

export function getResolvedSubsidies(
  assumptions: FinancialAssumptions
): SubsidiesAssumptions {
  const existing = assumptions.subsidies;
  const paddyRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const decortRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-decorticage');

  return {
    enabled: existing?.enabled ?? true,
    programName: existing?.programName ?? 'Aucun programme actif (Base nominale)',
    donorType: existing?.donorType ?? 'national',
    capexGrantPercent: existing?.capexGrantPercent ?? 0,
    capexGrantFixedAr: existing?.capexGrantFixedAr ?? 0,
    bfrWorkingCapitalGrantAr: existing?.bfrWorkingCapitalGrantAr ?? 0,
    opexPaddySubsidyArPerKg: existing?.opexPaddySubsidyArPerKg ?? 0,
    opexFixedMonthlySubsidyAr: existing?.opexFixedMonthlySubsidyAr ?? 0,
    baselineMaterielAr: existing?.baselineMaterielAr ?? assumptions.investment.materielAr,
    baselineEnregistrementAr:
      existing?.baselineEnregistrementAr ?? assumptions.investment.enregistrementAr,
    baselineCashBufferAr:
      existing?.baselineCashBufferAr ?? assumptions.investment.cashBufferAr,
    baselineCostPaddyHS: existing?.baselineCostPaddyHS ?? paddyRow?.costHS ?? 800,
    baselineCostPaddyBS: existing?.baselineCostPaddyBS ?? paddyRow?.costBS ?? 1400,
    baselineCostDecorticageHS: existing?.baselineCostDecorticageHS ?? decortRow?.costHS ?? 100,
    baselineCostDecorticageBS: existing?.baselineCostDecorticageBS ?? decortRow?.costBS ?? 100,
    baselineFixedCharges:
      existing?.baselineFixedCharges && existing.baselineFixedCharges.length > 0
        ? existing.baselineFixedCharges
        : assumptions.fixedMonthlyCharges.map((f) => ({ id: f.id, amount: f.amount })),
  };
}

export function hasNonZeroSubsidy(subsidies: SubsidiesAssumptions): boolean {
  return (
    subsidies.capexGrantPercent > 1e-6 ||
    subsidies.capexGrantFixedAr > 0.5 ||
    (subsidies.bfrWorkingCapitalGrantAr ?? 0) > 0.5 ||
    subsidies.opexPaddySubsidyArPerKg > 0.5 ||
    subsidies.opexFixedMonthlySubsidyAr > 0.5
  );
}

/**
 * Applies CAPEX and OPEX subsidies cleanly onto investment, costsPerKgPaddy, and fixedMonthlyCharges,
 * respecting any active FX shock on equipment and returning exact baseline values when subsidies = 0.
 */
export function applySubsidiesToAssumptions(
  assumptions: FinancialAssumptions,
  subsidies: SubsidiesAssumptions
): Pick<FinancialAssumptions, 'investment' | 'costsPerKgPaddy' | 'fixedMonthlyCharges'> {
  const fx = getResolvedFxRisk(assumptions);
  const fxMaterielFactor =
    fx.enabled && Math.abs(fx.ariaryFluctuationPercent) >= 1e-6
      ? 1 + Math.max(0, Math.min(1, fx.importedMachineryShare)) * fx.ariaryFluctuationPercent
      : 1;
  const effectiveBaseMateriel = Math.max(
    0,
    Math.round(subsidies.baselineMaterielAr * fxMaterielFactor)
  );
  const effectiveBaseEnreg = Math.max(0, Math.round(subsidies.baselineEnregistrementAr));

  const baselineMap = new Map(
    subsidies.baselineFixedCharges.map((b) => [b.id, b.amount])
  );

  const restoredFixedCharges = assumptions.fixedMonthlyCharges.map((f) => ({
    ...f,
    amount: baselineMap.has(f.id) ? baselineMap.get(f.id)! : f.amount,
  }));

  const restoredCostsPerKg = assumptions.costsPerKgPaddy.map((c) => {
    if (c.id === 'cost-paddy') {
      return {
        ...c,
        costHS: subsidies.baselineCostPaddyHS,
        costBS: subsidies.baselineCostPaddyBS,
      };
    }
    if (c.id === 'cost-decorticage') {
      return {
        ...c,
        costHS: subsidies.baselineCostDecorticageHS,
        costBS: subsidies.baselineCostDecorticageBS,
      };
    }
    return c;
  });

  const effectiveBaseCashBuffer = Math.max(
    0,
    Math.round(subsidies.baselineCashBufferAr ?? assumptions.investment.cashBufferAr)
  );

  if (!subsidies.enabled || !hasNonZeroSubsidy(subsidies)) {
    return {
      investment: {
        ...assumptions.investment,
        materielAr: effectiveBaseMateriel,
        enregistrementAr: effectiveBaseEnreg,
        cashBufferAr: effectiveBaseCashBuffer,
      },
      costsPerKgPaddy: restoredCostsPerKg,
      fixedMonthlyCharges: restoredFixedCharges,
    };
  }

  // 1. CAPEX Grant applied first to Materiel, then remainder to Enregistrement
  const totalBaseCapex = effectiveBaseMateriel + effectiveBaseEnreg;
  const totalCapexGrant = Math.min(
    totalBaseCapex,
    Math.round(
      totalBaseCapex * Math.max(0, Math.min(0.9, subsidies.capexGrantPercent)) +
        Math.max(0, subsidies.capexGrantFixedAr)
    )
  );

  const grantOnMateriel = Math.min(effectiveBaseMateriel, totalCapexGrant);
  const remainingGrant = Math.max(0, totalCapexGrant - grantOnMateriel);
  const grantOnEnreg = Math.min(effectiveBaseEnreg, remainingGrant);

  const nextMateriel = Math.max(0, effectiveBaseMateriel - grantOnMateriel);
  const nextEnreg = Math.max(0, effectiveBaseEnreg - grantOnEnreg);

  // 2. OPEX variable subsidy per kg paddy (reduces decorticage first, then paddy keeping minimum 100 Ar/kg)
  const varSub = Math.max(0, Math.round(subsidies.opexPaddySubsidyArPerKg));
  const nextCostsPerKg = restoredCostsPerKg.map((c) => {
    if (c.id === 'cost-decorticage') {
      return {
        ...c,
        costHS: Math.max(0, subsidies.baselineCostDecorticageHS - Math.min(subsidies.baselineCostDecorticageHS, varSub)),
        costBS: Math.max(0, subsidies.baselineCostDecorticageBS - Math.min(subsidies.baselineCostDecorticageBS, varSub)),
      };
    }
    if (c.id === 'cost-paddy') {
      const remHS = Math.max(0, varSub - subsidies.baselineCostDecorticageHS);
      const remBS = Math.max(0, varSub - subsidies.baselineCostDecorticageBS);
      return {
        ...c,
        costHS: Math.max(50, subsidies.baselineCostPaddyHS - remHS),
        costBS: Math.max(50, subsidies.baselineCostPaddyBS - remBS),
      };
    }
    return c;
  });

  // 3. OPEX fixed monthly subsidy (reduces fixed charges proportionally without any item < 0)
  const fixedSub = Math.max(0, Math.round(subsidies.opexFixedMonthlySubsidyAr));
  const totalBaseFixed = restoredFixedCharges.reduce((s, f) => s + Math.max(0, f.amount), 0);
  const clampedFixedSub = Math.min(totalBaseFixed, fixedSub);
  const fixedReductionRatio = totalBaseFixed > 0 ? 1 - clampedFixedSub / totalBaseFixed : 1;

  const nextFixedCharges = restoredFixedCharges.map((f) => ({
    ...f,
    amount: Math.max(0, Math.round(f.amount * fixedReductionRatio)),
  }));

  const bfrGrant = Math.max(0, Math.round(subsidies.bfrWorkingCapitalGrantAr ?? 0));
  const nextCashBuffer = Math.max(0, effectiveBaseCashBuffer - bfrGrant);

  return {
    investment: {
      ...assumptions.investment,
      materielAr: nextMateriel,
      enregistrementAr: nextEnreg,
      cashBufferAr: nextCashBuffer,
    },
    costsPerKgPaddy: nextCostsPerKg,
    fixedMonthlyCharges: nextFixedCharges,
  };
}

export interface SubsidiesSimulationPreview {
  beforeModel: ReturnType<typeof calculateFullModel>;
  afterModel: ReturnType<typeof calculateFullModel>;
  capexGrantTotalAr: number;
  bfrGrantAppliedAr: number;
  annualOpexGrantTotalAr: number;
  totalAnnualSupportAr: number;
  i0BeforeAr: number;
  i0AfterAr: number;
  i0ReductionAr: number;
  bfrBeforeAr: number; // rotationWorkingCapitalHSAr + cashBufferAr before grants
  bfrAfterAr: number; // rotationWorkingCapitalHSAr + cashBufferAr after OPEX & BFR grants
  bfrReductionAr: number;
  bfrReductionPct: number;
  npvBeforeAr: number;
  npvAfterAr: number;
  npvDeltaAr: number;
  irrBefore: number;
  irrAfter: number;
  irrDeltaPts: number;
  paybackBeforeMonths: number;
  paybackAfterMonths: number;
  paybackDeltaMonths: number;
  netProfitBeforeAr: number;
  netProfitAfterAr: number;
  netProfitDeltaAr: number;
  netMarginBeforeRate: number;
  netMarginAfterRate: number;
  netMarginDeltaPts: number;
}

export function computeSubsidiesPreview(
  assumptions: FinancialAssumptions,
  subsidies: SubsidiesAssumptions
): SubsidiesSimulationPreview {
  const basePatch = applySubsidiesToAssumptions(assumptions, {
    ...subsidies,
    enabled: false,
  });
  const beforeModel = calculateFullModel({
    ...assumptions,
    ...basePatch,
  });

  const simPatch = applySubsidiesToAssumptions(assumptions, {
    ...subsidies,
    enabled: true,
  });
  const afterModel = calculateFullModel({
    ...assumptions,
    ...simPatch,
  });

  const capexGrantTotalAr = Math.max(
    0,
    basePatch.investment.materielAr +
      basePatch.investment.enregistrementAr -
      (simPatch.investment.materielAr + simPatch.investment.enregistrementAr)
  );

  const bfrGrantAppliedAr = Math.max(
    0,
    basePatch.investment.cashBufferAr - simPatch.investment.cashBufferAr
  );

  const bfrBeforeAr =
    beforeModel.investment.rotationWorkingCapitalHSAr + beforeModel.investment.cashBufferAr;
  const bfrAfterAr =
    afterModel.investment.rotationWorkingCapitalHSAr + afterModel.investment.cashBufferAr;
  const bfrReductionAr = Math.max(0, bfrBeforeAr - bfrAfterAr);
  const bfrReductionPct = bfrBeforeAr > 0 ? bfrReductionAr / bfrBeforeAr : 0;

  const annualOpexGrantTotalAr = Math.max(
    0,
    beforeModel.year1.totalPurchaseAndOperatingCostsAr +
      beforeModel.year1.annualFixedChargesAr -
      (afterModel.year1.totalPurchaseAndOperatingCostsAr + afterModel.year1.annualFixedChargesAr)
  );

  const irrBefore = Number.isFinite(beforeModel.irr.irrValue) ? beforeModel.irr.irrValue : 0;
  const irrAfter = Number.isFinite(afterModel.irr.irrValue) ? afterModel.irr.irrValue : 0;

  return {
    beforeModel,
    afterModel,
    capexGrantTotalAr,
    bfrGrantAppliedAr,
    annualOpexGrantTotalAr,
    totalAnnualSupportAr: capexGrantTotalAr + bfrGrantAppliedAr + annualOpexGrantTotalAr,
    i0BeforeAr: beforeModel.investment.fundsToRaiseAr,
    i0AfterAr: afterModel.investment.fundsToRaiseAr,
    i0ReductionAr: Math.max(
      0,
      beforeModel.investment.fundsToRaiseAr - afterModel.investment.fundsToRaiseAr
    ),
    bfrBeforeAr,
    bfrAfterAr,
    bfrReductionAr,
    bfrReductionPct,
    npvBeforeAr: beforeModel.npv.npvAr,
    npvAfterAr: afterModel.npv.npvAr,
    npvDeltaAr: afterModel.npv.npvAr - beforeModel.npv.npvAr,
    irrBefore,
    irrAfter,
    irrDeltaPts: (irrAfter - irrBefore) * 100,
    paybackBeforeMonths: beforeModel.payback.paybackMonths,
    paybackAfterMonths: afterModel.payback.paybackMonths,
    paybackDeltaMonths:
      afterModel.payback.paybackMonths - beforeModel.payback.paybackMonths,
    netProfitBeforeAr: beforeModel.year1.netResultAfterTaxAr,
    netProfitAfterAr: afterModel.year1.netResultAfterTaxAr,
    netProfitDeltaAr:
      afterModel.year1.netResultAfterTaxAr - beforeModel.year1.netResultAfterTaxAr,
    netMarginBeforeRate: beforeModel.year1.netMarginAfterTaxRate,
    netMarginAfterRate: afterModel.year1.netMarginAfterTaxRate,
    netMarginDeltaPts:
      (afterModel.year1.netMarginAfterTaxRate - beforeModel.year1.netMarginAfterTaxRate) * 100,
  };
}
