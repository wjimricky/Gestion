import { FullFinancialModel } from '../types/finance';

export const CALENDAR_MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const CALENDAR_MONTHS_SHORT_FR = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export type TreasurySeasonPhase = 'HS' | 'BS' | 'SOUDURE';
export type TreasuryRiskLevel = 'optimal' | 'vigilance' | 'critique';

export interface TreasurySimulationSettings {
  startMonthIndex: number; // 0..11, default 4 (Mai: début Haute Saison à Madagascar)
  clientDsoDays: 0 | 15 | 30 | 45; // Délai d'encaissement clients simulé
  soudurePrestockRatio: number; // 0 to 0.50: constitution de stock paddy HS pour sécuriser la soudure
  creditLineAr: number; // Ligne de trésorerie / découvert court terme autorisé
}

export const DEFAULT_TREASURY_SETTINGS: TreasurySimulationSettings = {
  startMonthIndex: 4, // Mai
  clientDsoDays: 0,
  soudurePrestockRatio: 0,
  creditLineAr: 0,
};

export interface MonthlyTreasuryRow {
  monthIndex: number; // 1..12
  calendarMonthName: string;
  calendarMonthShort: string;
  phase: TreasurySeasonPhase;
  phaseLabel: string;
  isSoudure: boolean;
  openingCashAr: number;
  inflowsAr: number;
  variableOutflowsAr: number;
  fixedOutflowsAr: number;
  taxOutflowsAr: number;
  prestockOutflowAr: number;
  totalOutflowsAr: number;
  netMonthlyCashFlowAr: number;
  endingCashAr: number;
  bfrPerRotationAr: number;
  intraMonthMinCashAr: number;
  riskLevel: TreasuryRiskLevel;
  riskReason: string;
}

export interface TreasuryPlanSummary {
  settings: TreasurySimulationSettings;
  rows: MonthlyTreasuryRow[];
  initialOperationalLiquidityAr: number;
  cashBufferAr: number;
  endingYearCashAr: number;
  minCashTroughAr: number;
  minCashTroughMonthLabel: string;
  peakSoudureBfrAr: number;
  hsBfrPerRotationAr: number;
  bfrSoudureIncreasePct: number;
  bufferCoverageOfPeakBfr: number;
  soudureMonthsCount: number;
  criticalMonthsCount: number;
  vigilanceMonthsCount: number;
  recommendedShortTermFacilityAr: number;
  overallRisk: TreasuryRiskLevel;
}

export function buildMonthlyTreasuryPlan(
  model: FullFinancialModel,
  settings: TreasurySimulationSettings
): TreasuryPlanSummary {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const taxRate = model.assumptions.corporateTaxRate;
  const cashBufferAr = model.investment.cashBufferAr;

  const hsMonths = Math.max(1, Math.round(hs.months));
  const bsMonths = Math.max(1, Math.round(bs.months));
  const totalMonths = Math.min(12, hsMonths + bsMonths);

  // Operational cash pool available at start of campaign: Cash buffer + initial 1st rotation working capital raised in I0
  const initialOperationalLiquidityAr =
    cashBufferAr + model.investment.rotationWorkingCapitalHSAr;

  const hsMonthlyCA = hs.months > 0 ? hs.totalTurnoverAr / hs.months : 0;
  const bsMonthlyCA = bs.months > 0 ? bs.totalTurnoverAr / bs.months : 0;

  const hsMonthlyVarOut =
    hs.months > 0 ? hs.totalPurchaseAndOperatingCostsAr / hs.months : 0;
  const bsMonthlyVarOut =
    bs.months > 0 ? bs.totalPurchaseAndOperatingCostsAr / bs.months : 0;

  const monthlyFixed = model.year1.monthlyFixedChargesAr;

  // Compute raw theoretical monthly CA series for DSO shift
  const rawMonthlyInflows: number[] = [];
  for (let m = 0; m < totalMonths; m++) {
    rawMonthlyInflows.push(m < hsMonths ? hsMonthlyCA : bsMonthlyCA);
  }

  // DSO lag ratio (0, 0.5, 1.0, 1.5 months)
  const lagMonths = settings.clientDsoDays / 30;

  // Optional strategic prestock during last 2 HS months released into Soudure months
  const prestockMonthsWindow = Math.min(2, hsMonths);
  const totalPaddyValueBS =
    bs.paddyCostPerRotationAr * bs.totalRotations;
  const totalPrestockBudget = totalPaddyValueBS * Math.max(0, Math.min(0.5, settings.soudurePrestockRatio));
  const monthlyPrestockPurchase =
    prestockMonthsWindow > 0 ? totalPrestockBudget / prestockMonthsWindow : 0;
  const monthlyPrestockRelease =
    bsMonths > 0 ? totalPrestockBudget / bsMonths : 0;

  // Identify Soudure window: Basse Saison, with peak criticality in the final 4 months of Basse Saison
  // (corresponding to Dec–Mar before the new main harvest in Madagascar)
  const soudureStartRelative = hsMonths + Math.max(0, bsMonths - 4);

  const rows: MonthlyTreasuryRow[] = [];
  let runningCash = initialOperationalLiquidityAr;
  let minCashTroughAr = initialOperationalLiquidityAr;
  let minCashTroughMonthLabel = CALENDAR_MONTHS_FR[settings.startMonthIndex % 12];

  for (let m = 0; m < totalMonths; m++) {
    const calIdx = (settings.startMonthIndex + m) % 12;
    const isHS = m < hsMonths;
    const isPeakSoudure = !isHS && m >= soudureStartRelative;
    const phase: TreasurySeasonPhase = isHS
      ? 'HS'
      : isPeakSoudure
      ? 'SOUDURE'
      : 'BS';

    // Delayed cash collections under client DSO
    let inflowsAr = rawMonthlyInflows[m];
    if (lagMonths > 0) {
      const wholeLag = Math.floor(lagMonths);
      const fracLag = lagMonths - wholeLag;
      const prevA = m - wholeLag >= 0 ? rawMonthlyInflows[m - wholeLag] : 0;
      const prevB = m - wholeLag - 1 >= 0 ? rawMonthlyInflows[m - wholeLag - 1] : 0;
      inflowsAr = prevA * (1 - fracLag) + prevB * fracLag;
    }

    const baseVarOut = isHS ? hsMonthlyVarOut : bsMonthlyVarOut;
    // If prestocking in late HS, outflows rise in late HS and drop during BS
    const isPrestockBuildMonth =
      isHS && m >= hsMonths - prestockMonthsWindow;
    const prestockOutflowAr = isPrestockBuildMonth
      ? monthlyPrestockPurchase
      : !isHS
      ? -monthlyPrestockRelease
      : 0;

    const variableOutflowsAr = Math.max(0, baseVarOut + prestockOutflowAr);
    const fixedOutflowsAr = monthlyFixed;

    const monthlyBeforeTax = (isHS ? hs.monthlyNetResultBeforeTaxAr : bs.monthlyNetResultBeforeTaxAr);
    const taxOutflowsAr = monthlyBeforeTax > 0 ? monthlyBeforeTax * taxRate : 0;
    const totalOutflowsAr = variableOutflowsAr + fixedOutflowsAr + taxOutflowsAr;
    const netMonthlyCashFlowAr = inflowsAr - totalOutflowsAr;

    const openingCashAr = runningCash;
    const endingCashAr = openingCashAr + netMonthlyCashFlowAr;

    // Intra-month working capital peak: before monthly sales are collected,
    // operator must fund at least 1 rotation's BFR + fixed charges upfront
    const bfrPerRotationAr = isHS ? hs.totalCostPerRotationAr : bs.totalCostPerRotationAr;
    const intraMonthMinCashAr = openingCashAr - bfrPerRotationAr - fixedOutflowsAr * 0.5;
    const effectiveFloorWithCredit = intraMonthMinCashAr + settings.creditLineAr;
    const effectiveEndingWithCredit = endingCashAr + settings.creditLineAr;

    if (intraMonthMinCashAr < minCashTroughAr) {
      minCashTroughAr = intraMonthMinCashAr;
      minCashTroughMonthLabel = CALENDAR_MONTHS_FR[calIdx];
    }

    let riskLevel: TreasuryRiskLevel = 'optimal';
    let riskReason = 'Trésorerie suffisante pour couvrir le cycle de rotation.';

    if (effectiveFloorWithCredit < 0 || effectiveEndingWithCredit < 0) {
      riskLevel = 'critique';
      riskReason =
        effectiveEndingWithCredit < 0
          ? 'Solde mensuel déficitaire dépassant le coussin de trésorerie.'
          : 'Point bas intra-mensuel négatif lors de l’avance de BFR avant encaissement.';
    } else if (
      netMonthlyCashFlowAr < 0 ||
      intraMonthMinCashAr < cashBufferAr * 0.4 ||
      (isPeakSoudure && endingCashAr < bfrPerRotationAr * 1.15)
    ) {
      riskLevel = 'vigilance';
      riskReason =
        netMonthlyCashFlowAr < 0
          ? 'Flux net mensuel négatif — ponction sur le cash buffer.'
          : 'Marge de manœuvre serrée face au pic de BFR en période de soudure.';
    }

    rows.push({
      monthIndex: m + 1,
      calendarMonthName: CALENDAR_MONTHS_FR[calIdx],
      calendarMonthShort: CALENDAR_MONTHS_SHORT_FR[calIdx],
      phase,
      phaseLabel:
        phase === 'HS'
          ? 'Haute Saison (Récolte)'
          : phase === 'SOUDURE'
          ? 'Soudure Critique'
          : 'Basse Saison (Transition)',
      isSoudure: !isHS,
      openingCashAr,
      inflowsAr,
      variableOutflowsAr,
      fixedOutflowsAr,
      taxOutflowsAr,
      prestockOutflowAr,
      totalOutflowsAr,
      netMonthlyCashFlowAr,
      endingCashAr,
      bfrPerRotationAr,
      intraMonthMinCashAr,
      riskLevel,
      riskReason,
    });

    runningCash = endingCashAr;
  }

  const peakSoudureBfrAr = Math.max(hs.totalCostPerRotationAr, bs.totalCostPerRotationAr);
  const hsBfrPerRotationAr = hs.totalCostPerRotationAr;
  const bfrSoudureIncreasePct =
    hsBfrPerRotationAr > 0
      ? (bs.totalCostPerRotationAr - hsBfrPerRotationAr) / hsBfrPerRotationAr
      : 0;
  const bufferCoverageOfPeakBfr =
    peakSoudureBfrAr > 0 ? cashBufferAr / peakSoudureBfrAr : 0;

  const criticalMonthsCount = rows.filter((r) => r.riskLevel === 'critique').length;
  const vigilanceMonthsCount = rows.filter((r) => r.riskLevel === 'vigilance').length;
  const soudureMonthsCount = rows.filter((r) => r.isSoudure).length;

  const worstNetFloorWithCredit = minCashTroughAr + settings.creditLineAr;
  const recommendedShortTermFacilityAr =
    worstNetFloorWithCredit < 0
      ? Math.ceil(Math.abs(worstNetFloorWithCredit) / 500000) * 500000
      : 0;

  const overallRisk: TreasuryRiskLevel =
    criticalMonthsCount > 0
      ? 'critique'
      : vigilanceMonthsCount > 0
      ? 'vigilance'
      : 'optimal';

  return {
    settings,
    rows,
    initialOperationalLiquidityAr,
    cashBufferAr,
    endingYearCashAr: runningCash,
    minCashTroughAr,
    minCashTroughMonthLabel,
    peakSoudureBfrAr,
    hsBfrPerRotationAr,
    bfrSoudureIncreasePct,
    bufferCoverageOfPeakBfr,
    soudureMonthsCount,
    criticalMonthsCount,
    vigilanceMonthsCount,
    recommendedShortTermFacilityAr,
    overallRisk,
  };
}

export function exportTreasuryCsv(summary: TreasuryPlanSummary): void {
  const sep = ';';
  const lines: string[] = [
    [
      'Mois_Num',
      'Calendrier',
      'Phase',
      'Tresorerie_Debut_Ar',
      'Encaissements_Ar',
      'Decaissements_Variables_Ar',
      'Charges_Fixes_Ar',
      'Impots_IR_Ar',
      'Flux_Net_Mensuel_Ar',
      'BFR_Rotation_Ar',
      'Point_Bas_Intra_Mensuel_Ar',
      'Tresorerie_Fin_Mois_Ar',
      'Niveau_Risque',
    ].join(sep),
  ];

  for (const row of summary.rows) {
    lines.push(
      [
        row.monthIndex,
        row.calendarMonthName,
        row.phaseLabel,
        row.openingCashAr.toFixed(0),
        row.inflowsAr.toFixed(0),
        row.variableOutflowsAr.toFixed(0),
        row.fixedOutflowsAr.toFixed(0),
        row.taxOutflowsAr.toFixed(0),
        row.netMonthlyCashFlowAr.toFixed(0),
        row.bfrPerRotationAr.toFixed(0),
        row.intraMonthMinCashAr.toFixed(0),
        row.endingCashAr.toFixed(0),
        row.riskLevel.toUpperCase(),
      ].join(sep)
    );
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `plan_tresorerie_soudure_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
