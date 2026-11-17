import { FullFinancialModel } from '../types/finance';

export type MalagasyAgLoanPresetId =
  | 'pret_campagne'
  | 'investissement_materiel'
  | 'microfinance_bfr'
  | 'custom';

export type LoanAmortizationMethod = 'annuite_constante' | 'amortissement_constant';
export type LoanPaymentFrequency = 'mensuelle' | 'trimestrielle' | 'annuelle';

export interface AgriculturalLoanParams {
  presetId: MalagasyAgLoanPresetId;
  loanName: string;
  institutionLabel: string;
  principalAr: number;
  annualInterestRatePct: number; // e.g. 16.5 = 16.5 %/an
  durationMonths: number; // e.g. 12, 24, 36, 48
  gracePeriodMonths: number; // différé d'amortissement du capital (0..12 mois)
  frequency: LoanPaymentFrequency;
  amortizationMethod: LoanAmortizationMethod;
  processingFeePct: number; // frais de dossier % du capital (ex: 1.5 %)
  includeDisbursementInCashFlow?: boolean; // intègre le déblocage du capital en M1
}

export interface LoanPresetMeta {
  id: Exclude<MalagasyAgLoanPresetId, 'custom'>;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  params: Omit<AgriculturalLoanParams, 'presetId'>;
}

export const MALAGASY_AG_LOAN_PRESETS: LoanPresetMeta[] = [
  {
    id: 'pret_campagne',
    label: 'Prêt de Campagne / Warrantage (GCV)',
    shortLabel: 'Prêt de Campagne',
    badge: '6–12m',
    description:
      'Financement saisonnier de collecte paddy & stockage (OTIV / CECAM / BOA), taux ~18 %/an avec différé de 3 mois jusqu’à la soudure.',
    params: {
      loanName: 'Prêt de Campagne Collecte Paddy & Warrantage',
      institutionLabel: 'IMF / Banque rurale (CECAM / OTIV / BOA)',
      principalAr: 25000000,
      annualInterestRatePct: 18.0,
      durationMonths: 12,
      gracePeriodMonths: 3,
      frequency: 'mensuelle',
      amortizationMethod: 'annuite_constante',
      processingFeePct: 1.5,
      includeDisbursementInCashFlow: true,
    },
  },
  {
    id: 'investissement_materiel',
    label: 'Crédit Équipement & Décortiqueuse',
    shortLabel: 'Investissement Matériel',
    badge: '36m',
    description:
      'Financement moyen terme matériel de transformation & logistique (BNI / SG Madagasikara / BMOI), taux ~15,5 %/an sur 36 mois.',
    params: {
      loanName: 'Crédit Investissement Matériel & Usinage',
      institutionLabel: 'Banque commerciale (BNI / BOA / SG Madagasikara)',
      principalAr: 35000000,
      annualInterestRatePct: 15.5,
      durationMonths: 36,
      gracePeriodMonths: 3,
      frequency: 'mensuelle',
      amortizationMethod: 'annuite_constante',
      processingFeePct: 1.5,
      includeDisbursementInCashFlow: true,
    },
  },
  {
    id: 'microfinance_bfr',
    label: 'Ligne BFR Microfinance (Trésorerie rapide)',
    shortLabel: 'BFR Microfinance',
    badge: '12m',
    description:
      'Crédit court terme pour rotations supplémentaires & sacs PP (PAMF / SIPEM / ACEP), échéances constantes sur 12 mois.',
    params: {
      loanName: 'Crédit BFR Rotations & Intrants',
      institutionLabel: 'Institution de Microfinance (PAMF / ACEP / SIPEM)',
      principalAr: 15000000,
      annualInterestRatePct: 22.0,
      durationMonths: 12,
      gracePeriodMonths: 0,
      frequency: 'mensuelle',
      amortizationMethod: 'amortissement_constant',
      processingFeePct: 2.0,
      includeDisbursementInCashFlow: true,
    },
  },
];

export const DEFAULT_LOAN_PARAMS: AgriculturalLoanParams = {
  presetId: 'pret_campagne',
  ...MALAGASY_AG_LOAN_PRESETS[0].params,
};

export interface SustainableFinancingProgram {
  id: 'irrigation_goutte' | 'agroecologie_sri' | 'sechage_solaire';
  label: string;
  shortLabel: string;
  subsidizedRatePct: number;
  feePct: number;
  ecoGrantBonusPct: number; // % du principal subventionné / bonification verte
  practiceDescription: string;
  donorReference: string;
}

export const SUSTAINABLE_FINANCING_PROGRAMS: SustainableFinancingProgram[] = [
  {
    id: 'irrigation_goutte',
    label: 'Crédit Vert — Irrigation Goutte-à-Goutte & Maîtrise Eau',
    shortLabel: 'Irrigation Goutte-à-Goutte',
    subsidizedRatePct: 8.5,
    feePct: 0.5,
    ecoGrantBonusPct: 10,
    practiceDescription:
      'Économie d’eau de 40 % et sécurisation du rendement en contre-saison sèche.',
    donorReference: 'Ligne verte FIDA / AFD / BNI Eco-Agri',
  },
  {
    id: 'agroecologie_sri',
    label: 'Prêt Bonifié Agroécologie & SRI (Système Riziculture Intensive)',
    shortLabel: 'Agroécologie & SRI',
    subsidizedRatePct: 9.0,
    feePct: 0.75,
    ecoGrantBonusPct: 8,
    practiceDescription:
      'Repiquage précoce, compostage organique et réduction des engrais chimiques importés.',
    donorReference: 'Facilités Climat / BOA Green Finance',
  },
  {
    id: 'sechage_solaire',
    label: 'Financement Durable — Séchage Solaire & Silos Hermétiques',
    shortLabel: 'Séchage Solaire & Silos',
    subsidizedRatePct: 9.5,
    feePct: 0.75,
    ecoGrantBonusPct: 12,
    practiceDescription:
      'Élimination des pertes post-récolte et baisse de l’empreinte énergétique de l’usinage.',
    donorReference: 'Fonds Transition Énergétique Agro',
  },
];

export interface SustainableLoanComparisonResult {
  program: SustainableFinancingProgram;
  standardAnnualInterestAvgAr: number;
  sustainableAnnualInterestAvgAr: number;
  annualInterestSavingsAr: number;
  totalInterestSavingsAr: number;
  totalFeeSavingsAr: number;
  ecoBonusValueAr: number;
  totalFinancingGainAr: number;
  effectiveRateSpreadPct: number;
  sustainableSummary: LoanRepaymentSummary;
}

export function computeSustainableLoanComparison(
  standardParams: AgriculturalLoanParams,
  model: FullFinancialModel,
  program: SustainableFinancingProgram
): SustainableLoanComparisonResult {
  const standardSummary = computeLoanRepaymentPlan(standardParams, model);
  const effectivePrincipal = Math.max(
    0,
    standardParams.principalAr * (1 - program.ecoGrantBonusPct / 100)
  );
  const sustainableParams: AgriculturalLoanParams = {
    ...standardParams,
    presetId: 'custom',
    loanName: program.label,
    institutionLabel: program.donorReference,
    principalAr: Math.round(effectivePrincipal),
    annualInterestRatePct: program.subsidizedRatePct,
    processingFeePct: program.feePct,
  };
  const sustainableSummary = computeLoanRepaymentPlan(sustainableParams, model);

  const years = Math.max(1, standardParams.durationMonths / 12);
  const standardAnnualInterestAvgAr = Math.round(standardSummary.totalInterestAr / years);
  const sustainableAnnualInterestAvgAr = Math.round(
    sustainableSummary.totalInterestAr / years
  );
  const annualInterestSavingsAr = Math.max(
    0,
    standardAnnualInterestAvgAr - sustainableAnnualInterestAvgAr
  );
  const totalInterestSavingsAr = Math.max(
    0,
    standardSummary.totalInterestAr - sustainableSummary.totalInterestAr
  );
  const totalFeeSavingsAr = Math.max(
    0,
    standardSummary.processingFeeAr - sustainableSummary.processingFeeAr
  );
  const ecoBonusValueAr = Math.round(
    Math.max(0, standardParams.principalAr - effectivePrincipal)
  );
  const totalFinancingGainAr =
    totalInterestSavingsAr + totalFeeSavingsAr + ecoBonusValueAr;

  return {
    program,
    standardAnnualInterestAvgAr,
    sustainableAnnualInterestAvgAr,
    annualInterestSavingsAr,
    totalInterestSavingsAr,
    totalFeeSavingsAr,
    ecoBonusValueAr,
    totalFinancingGainAr,
    effectiveRateSpreadPct: Math.max(
      0,
      standardParams.annualInterestRatePct - program.subsidizedRatePct
    ),
    sustainableSummary,
  };
}

export interface LoanScheduleRow {
  periodNumber: number;
  label: string;
  monthsElapsed: number;
  isGracePeriod: boolean;
  openingBalanceAr: number;
  interestAr: number;
  principalAr: number;
  installmentAr: number;
  closingBalanceAr: number;
  cumulativeInterestAr: number;
}

export interface LoanCashFlowMonthRow {
  month: number;
  label: string;
  year: 1 | 2 | 3;
  baselineMonthlyCfAr: number;
  baselineCumulativeCfAr: number;
  loanDisbursementNetAr: number;
  debtServiceAr: number;
  interestPaidAr: number;
  principalPaidAr: number;
  interestTaxShieldAr: number;
  postLoanMonthlyFreeCfAr: number;
  postLoanCumulativeCfAr: number;
}

export interface LoanAnnualCashFlowRow {
  year: 1 | 2 | 3;
  label: string;
  baselineCashFlowAr: number;
  loanInflowNetAr: number;
  totalDebtServiceAr: number;
  interestAndFeesAr: number;
  principalRepaidAr: number;
  taxShieldAr: number;
  postLoanFreeCashFlowAr: number;
  dscr: number | null;
}

export interface LoanRepaymentSummary {
  params: AgriculturalLoanParams;
  schedule: LoanScheduleRow[];
  monthsPerPeriod: number;
  totalPeriods: number;
  firstRegularInstallmentAr: number;
  averageInstallmentAr: number;
  annualizedDebtServiceYear1Ar: number;
  totalInterestAr: number;
  processingFeeAr: number;
  totalCreditCostAr: number; // totalInterestAr + processingFeeAr
  totalRepaidAr: number; // principal + totalCreditCostAr
  effectiveCostRatioPct: number; // totalCreditCostAr / principalAr
  dscrYear1: number | null; // Operating cash generation (netBeforeTax) / Year1 Debt Service
  netResultAfterDebtServiceYear1Ar: number;
  cashFlowImpact36: LoanCashFlowMonthRow[];
  annualCashFlowImpact: LoanAnnualCashFlowRow[];
  baselineMinCashAr: number;
  postLoanMinCashAr: number;
  year3CumulativeCashDeltaAr: number;
  postLoanPaybackMonth: number | null;
}

export function computeLoanRepaymentPlan(
  params: AgriculturalLoanParams,
  model: FullFinancialModel
): LoanRepaymentSummary {
  const principal = Math.max(0, params.principalAr);
  const annualRate = Math.max(0, params.annualInterestRatePct) / 100;
  const monthsPerPeriod =
    params.frequency === 'annuelle' ? 12 : params.frequency === 'trimestrielle' ? 3 : 1;

  const durationMonths = Math.max(monthsPerPeriod, Math.round(params.durationMonths));
  const totalPeriods = Math.max(1, Math.round(durationMonths / monthsPerPeriod));
  const periodRate = annualRate * (monthsPerPeriod / 12);

  const rawGracePeriods = Math.floor(Math.max(0, params.gracePeriodMonths) / monthsPerPeriod);
  const gracePeriods = Math.min(Math.max(0, totalPeriods - 1), rawGracePeriods);
  const amortizingPeriods = Math.max(1, totalPeriods - gracePeriods);

  const schedule: LoanScheduleRow[] = [];
  let balance = principal;
  let cumulativeInterest = 0;

  const fixedAnnuity =
    periodRate > 1e-9
      ? (principal * periodRate) / (1 - Math.pow(1 + periodRate, -amortizingPeriods))
      : principal / amortizingPeriods;

  const fixedPrincipal = principal / amortizingPeriods;

  for (let k = 1; k <= totalPeriods; k++) {
    const isGrace = k <= gracePeriods;
    const opening = balance;
    const interest = opening * periodRate;
    let amortPrincipal = 0;
    let installment = 0;

    if (isGrace) {
      amortPrincipal = 0;
      installment = interest;
    } else if (k === totalPeriods) {
      amortPrincipal = opening;
      installment = amortPrincipal + interest;
    } else if (params.amortizationMethod === 'annuite_constante') {
      installment = fixedAnnuity;
      amortPrincipal = Math.min(opening, Math.max(0, installment - interest));
    } else {
      amortPrincipal = Math.min(opening, fixedPrincipal);
      installment = amortPrincipal + interest;
    }

    const closing = Math.max(0, opening - amortPrincipal);
    cumulativeInterest += interest;

    schedule.push({
      periodNumber: k,
      label:
        params.frequency === 'mensuelle'
          ? `M${k}`
          : params.frequency === 'trimestrielle'
          ? `T${k} (M${k * 3})`
          : `Année ${k}`,
      monthsElapsed: k * monthsPerPeriod,
      isGracePeriod: isGrace,
      openingBalanceAr: Math.round(opening),
      interestAr: Math.round(interest),
      principalAr: Math.round(amortPrincipal),
      installmentAr: Math.round(installment),
      closingBalanceAr: Math.round(closing),
      cumulativeInterestAr: Math.round(cumulativeInterest),
    });

    balance = closing;
  }

  const totalInterestAr = Math.round(cumulativeInterest);
  const processingFeeAr = Math.round(principal * (Math.max(0, params.processingFeePct) / 100));
  const totalCreditCostAr = totalInterestAr + processingFeeAr;
  const totalRepaidAr = Math.round(principal) + totalCreditCostAr;

  const regularRows = schedule.filter((r) => !r.isGracePeriod);
  const firstRegularInstallmentAr = regularRows[0]?.installmentAr ?? schedule[0]?.installmentAr ?? 0;
  const averageInstallmentAr =
    schedule.length > 0
      ? Math.round(schedule.reduce((s, r) => s + r.installmentAr, 0) / schedule.length)
      : 0;

  const year1Rows = schedule.filter((r) => r.monthsElapsed <= 12);
  const year1Interest = year1Rows.reduce((s, r) => s + r.interestAr, 0);
  const annualizedDebtServiceYear1Ar =
    year1Rows.reduce((s, r) => s + r.installmentAr, 0) + processingFeeAr;

  const operatingCashBeforeDebtAr = model.year1.netResultBeforeTaxAr;
  const dscrYear1 =
    annualizedDebtServiceYear1Ar > 0
      ? operatingCashBeforeDebtAr / annualizedDebtServiceYear1Ar
      : null;

  const taxableAfterInterest = Math.max(
    0,
    model.year1.netResultBeforeTaxAr - (year1Interest + processingFeeAr)
  );
  const taxAfterInterest = taxableAfterInterest * model.assumptions.corporateTaxRate;
  const netResultAfterDebtServiceYear1Ar = Math.round(
    model.year1.netResultBeforeTaxAr -
      (year1Interest + processingFeeAr) -
      taxAfterInterest
  );

  // 36-Month Free Cash Flow Impact (Avant vs Après Prêt)
  const includeDisbursement = params.includeDisbursementInCashFlow ?? true;
  const taxRate = model.assumptions.corporateTaxRate;
  const monthlyScheduleMap = new Map<number, LoanScheduleRow>();
  schedule.forEach((row) => {
    monthlyScheduleMap.set(row.monthsElapsed, row);
  });

  const cashFlowImpact36: LoanCashFlowMonthRow[] = [];
  let runningPostLoanCum = -model.investment.fundsToRaiseAr;
  let postLoanPaybackMonth: number | null = null;

  for (let m = 1; m <= 36; m++) {
    const baseRow = model.payback.monthlyCashFlows[m - 1];
    const baselineMonthlyCfAr = baseRow ? baseRow.netCashFlowAfterTaxAr : 0;
    const baselineCumulativeCfAr = baseRow ? baseRow.cumulativeCashFlowAr : 0;

    const schedRow = monthlyScheduleMap.get(m);
    const interestPaidAr = schedRow ? schedRow.interestAr : 0;
    const principalPaidAr = schedRow ? schedRow.principalAr : 0;
    const installmentAr = schedRow ? schedRow.installmentAr : 0;

    const feeAtM1 = m === 1 ? processingFeeAr : 0;
    const loanDisbursementNetAr =
      m === 1 ? (includeDisbursement ? Math.round(principal) - processingFeeAr : -processingFeeAr) : 0;

    const taxShieldAr = Math.round((interestPaidAr + feeAtM1) * taxRate);
    const postLoanMonthlyFreeCfAr = Math.round(
      baselineMonthlyCfAr + loanDisbursementNetAr - installmentAr + taxShieldAr
    );

    const prevCum = runningPostLoanCum;
    runningPostLoanCum += postLoanMonthlyFreeCfAr;
    if (postLoanPaybackMonth === null && prevCum < 0 && runningPostLoanCum >= 0) {
      postLoanPaybackMonth = m;
    }

    const year: 1 | 2 | 3 = m <= 12 ? 1 : m <= 24 ? 2 : 3;

    cashFlowImpact36.push({
      month: m,
      label: `M${m}`,
      year,
      baselineMonthlyCfAr: Math.round(baselineMonthlyCfAr),
      baselineCumulativeCfAr: Math.round(baselineCumulativeCfAr),
      loanDisbursementNetAr,
      debtServiceAr: installmentAr + feeAtM1,
      interestPaidAr,
      principalPaidAr,
      interestTaxShieldAr: taxShieldAr,
      postLoanMonthlyFreeCfAr,
      postLoanCumulativeCfAr: Math.round(runningPostLoanCum),
    });
  }

  const annualCashFlowImpact: LoanAnnualCashFlowRow[] = ([1, 2, 3] as const).map((yr) => {
    const rows = cashFlowImpact36.filter((r) => r.year === yr);
    const baselineCashFlowAr = rows.reduce((s, r) => s + r.baselineMonthlyCfAr, 0);
    const loanInflowNetAr = rows.reduce((s, r) => s + r.loanDisbursementNetAr, 0);
    const interestAndFeesAr =
      rows.reduce((s, r) => s + r.interestPaidAr, 0) + (yr === 1 ? processingFeeAr : 0);
    const principalRepaidAr = rows.reduce((s, r) => s + r.principalPaidAr, 0);
    const totalDebtServiceAr = principalRepaidAr + interestAndFeesAr;
    const taxShieldAr = rows.reduce((s, r) => s + r.interestTaxShieldAr, 0);
    const postLoanFreeCashFlowAr = rows.reduce((s, r) => s + r.postLoanMonthlyFreeCfAr, 0);

    const projBeforeTax =
      model.projections.realistic.find((p) => p.year === yr)?.netResultBeforeTaxAr ??
      model.year1.netResultBeforeTaxAr;
    const dscr = totalDebtServiceAr > 0 ? projBeforeTax / totalDebtServiceAr : null;

    return {
      year: yr,
      label: `Année ${yr}`,
      baselineCashFlowAr,
      loanInflowNetAr,
      totalDebtServiceAr,
      interestAndFeesAr,
      principalRepaidAr,
      taxShieldAr,
      postLoanFreeCashFlowAr,
      dscr,
    };
  });

  const baselineMinCashAr =
    cashFlowImpact36.length > 0
      ? Math.min(...cashFlowImpact36.map((r) => r.baselineCumulativeCfAr))
      : 0;
  const postLoanMinCashAr =
    cashFlowImpact36.length > 0
      ? Math.min(...cashFlowImpact36.map((r) => r.postLoanCumulativeCfAr))
      : 0;

  const lastRow = cashFlowImpact36[cashFlowImpact36.length - 1];
  const year3CumulativeCashDeltaAr = lastRow
    ? lastRow.postLoanCumulativeCfAr - lastRow.baselineCumulativeCfAr
    : 0;

  return {
    params,
    schedule,
    monthsPerPeriod,
    totalPeriods,
    firstRegularInstallmentAr,
    averageInstallmentAr,
    annualizedDebtServiceYear1Ar,
    totalInterestAr,
    processingFeeAr,
    totalCreditCostAr,
    totalRepaidAr,
    effectiveCostRatioPct: principal > 0 ? totalCreditCostAr / principal : 0,
    dscrYear1,
    netResultAfterDebtServiceYear1Ar,
    cashFlowImpact36,
    annualCashFlowImpact,
    baselineMinCashAr,
    postLoanMinCashAr,
    year3CumulativeCashDeltaAr,
    postLoanPaybackMonth,
  };
}
