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
    },
  },
];

export const DEFAULT_LOAN_PARAMS: AgriculturalLoanParams = {
  presetId: 'pret_campagne',
  ...MALAGASY_AG_LOAN_PRESETS[0].params,
};

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

  // Constant installment amount for amortizing periods
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
      // Clear any rounding residue on final period
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
  };
}
