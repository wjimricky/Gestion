import {
  FinancialAssumptions,
  FullFinancialModel,
} from '../types/finance';
import {
  CALENDAR_MONTHS_FR,
  CALENDAR_MONTHS_SHORT_FR,
  TreasuryPlanSummary,
  TreasurySimulationSettings,
} from './treasury';
import {
  computeSeasonLogisticsBreakdown,
  computeUrbanDistributionBreakdown,
  getResolvedLogistics,
} from './logistics';
import { computeHrPlanningSummary, getResolvedHrPlanning } from './hrPlanning';
import { computeStorageWeightLossRate, getResolvedStorageOptimization } from './storage';
import { getResolvedPaddyStock } from './stockSecurity';

export interface WaterfallStepItem {
  id: string;
  label: string;
  shortLabel: string;
  deltaAr: number;
  baseOffsetAr: number;
  barValueAr: number;
  runningTotalAr: number;
  kind: 'start' | 'cost' | 'subtotal' | 'net';
  color: string;
}

export function buildYear1WaterfallData(model: FullFinancialModel): WaterfallStepItem[] {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const y1 = model.year1;

  const revenueAr = y1.totalTurnoverAr;

  // Estimate logistics share cleanly from rotation costs
  const logistics = getResolvedLogistics(model.assumptions);
  const hsCollect = logistics.enabled
    ? computeSeasonLogisticsBreakdown(logistics, 'hauteSaison').totalCostPerRotationAr
    : 0;
  const bsCollect = logistics.enabled
    ? computeSeasonLogisticsBreakdown(logistics, 'basseSaison').totalCostPerRotationAr
    : 0;
  const hsUrban =
    logistics.enabled && logistics.includeUrbanDistribution
      ? computeUrbanDistributionBreakdown(logistics, hs.riceKgPerRotation, 'hauteSaison')
          .totalCostPerRotationAr
      : 0;
  const bsUrban =
    logistics.enabled && logistics.includeUrbanDistribution
      ? computeUrbanDistributionBreakdown(logistics, bs.riceKgPerRotation, 'basseSaison')
          .totalCostPerRotationAr
      : 0;
  const hsLogPerRot = hsCollect + hsUrban;
  const bsLogPerRot = bsCollect + bsUrban;
  const rawLogisticsAnnual =
    hsLogPerRot * hs.totalRotations + bsLogPerRot * bs.totalRotations;
  const totalVarCosts = Math.max(0, y1.totalPurchaseAndOperatingCostsAr);
  const logisticsAnnualAr = Math.min(totalVarCosts * 0.45, rawLogisticsAnnual);
  const paddyAndMillingAr = Math.max(0, totalVarCosts - logisticsAnnualAr);

  const fixedChargesAr = Math.max(0, y1.annualFixedChargesAr);
  const depreciationAr = Math.max(0, y1.annualDepreciationAr ?? 0);
  const taxAr = Math.max(0, y1.corporateTaxAr);
  const netResultAr = y1.netResultAfterTaxAr;

  const steps: WaterfallStepItem[] = [];
  let cursor = revenueAr;

  steps.push({
    id: 'ca',
    label: "Chiffre d'affaires (A1)",
    shortLabel: 'CA A1',
    deltaAr: revenueAr,
    baseOffsetAr: 0,
    barValueAr: revenueAr,
    runningTotalAr: revenueAr,
    kind: 'start',
    color: '#6366F1',
  });

  const nextAfterPaddy = cursor - paddyAndMillingAr;
  steps.push({
    id: 'paddy_usinage',
    label: 'Achats Paddy & Usinage',
    shortLabel: 'Paddy & Usinage',
    deltaAr: -paddyAndMillingAr,
    baseOffsetAr: Math.min(cursor, nextAfterPaddy),
    barValueAr: paddyAndMillingAr,
    runningTotalAr: nextAfterPaddy,
    kind: 'cost',
    color: '#F59E0B',
  });
  cursor = nextAfterPaddy;

  const nextAfterLog = cursor - logisticsAnnualAr;
  steps.push({
    id: 'logistique',
    label: 'Logistique & Transport',
    shortLabel: 'Logistique',
    deltaAr: -logisticsAnnualAr,
    baseOffsetAr: Math.min(cursor, nextAfterLog),
    barValueAr: logisticsAnnualAr,
    runningTotalAr: nextAfterLog,
    kind: 'cost',
    color: '#FB7185',
  });
  cursor = nextAfterLog;

  const nextAfterFixed = cursor - fixedChargesAr;
  steps.push({
    id: 'fixes',
    label: 'Charges Fixes & Salaires',
    shortLabel: 'Charges Fixes',
    deltaAr: -fixedChargesAr,
    baseOffsetAr: Math.min(cursor, nextAfterFixed),
    barValueAr: fixedChargesAr,
    runningTotalAr: nextAfterFixed,
    kind: 'cost',
    color: '#38BDF8',
  });
  cursor = nextAfterFixed;

  if (depreciationAr > 0) {
    const nextAfterDep = cursor - depreciationAr;
    steps.push({
      id: 'amortissements',
      label: 'Dotations aux Amortissements',
      shortLabel: 'Amortissements',
      deltaAr: -depreciationAr,
      baseOffsetAr: Math.min(cursor, nextAfterDep),
      barValueAr: depreciationAr,
      runningTotalAr: nextAfterDep,
      kind: 'cost',
      color: '#818CF8',
    });
    cursor = nextAfterDep;
  }

  const nextAfterTax = cursor - taxAr;
  steps.push({
    id: 'impot',
    label: `Impôt IR (${Math.round(model.assumptions.corporateTaxRate * 100)} %)`,
    shortLabel: 'Impôt IR',
    deltaAr: -taxAr,
    baseOffsetAr: Math.min(cursor, nextAfterTax),
    barValueAr: taxAr,
    runningTotalAr: nextAfterTax,
    kind: 'cost',
    color: '#A855F7',
  });

  steps.push({
    id: 'resultat_net',
    label: 'Résultat Net Après IR',
    shortLabel: 'Résultat Net',
    deltaAr: netResultAr,
    baseOffsetAr: netResultAr >= 0 ? 0 : netResultAr,
    barValueAr: Math.abs(netResultAr),
    runningTotalAr: netResultAr,
    kind: 'net',
    color: netResultAr >= 0 ? '#14B8A6' : '#EF4444',
  });

  return steps;
}

export type CampaignActivityCode =
  | 'semis_repiquage'
  | 'croissance_entretien'
  | 'recolte_collecte'
  | 'transformation_vente'
  | 'soudure_stockage';

export interface CampaignMonthSchedule {
  monthIndex: number; // 1..12
  calendarMonthIndex: number; // 0..11
  monthName: string;
  monthShort: string;
  seasonType: 'HS' | 'BS' | 'SOUDURE';
  primaryActivity: CampaignActivityCode;
  activities: CampaignActivityCode[];
  rotationsCount: number;
  inflowsAr: number;
  outflowsAr: number;
  netCashAr: number;
  endingCashAr: number;
  commentary: string;
}

export const CAMPAIGN_ACTIVITY_META: Record<
  CampaignActivityCode,
  { label: string; shortLabel: string; colorClass: string; hex: string }
> = {
  semis_repiquage: {
    label: 'Semis & Repiquage (SRI/Pépinière)',
    shortLabel: 'Semis',
    colorClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/35',
    hex: '#0EA5E9',
  },
  croissance_entretien: {
    label: 'Croissance, Sarclage & Irrigation',
    shortLabel: 'Croissance',
    colorClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/35',
    hex: '#10B981',
  },
  recolte_collecte: {
    label: 'Récolte, Battage & Collecte Bord-Champ',
    shortLabel: 'Récolte',
    colorClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35',
    hex: '#F59E0B',
  },
  transformation_vente: {
    label: 'Décorticage, Usinage & Vente Riz',
    shortLabel: 'Transformation',
    colorClass: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/35',
    hex: '#6366F1',
  },
  soudure_stockage: {
    label: 'Période de Soudure & Libération Stocks',
    shortLabel: 'Soudure',
    colorClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/35',
    hex: '#F43F5E',
  },
};

export function buildCampaignCalendar(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  treasuryPlan: TreasuryPlanSummary,
  settings: TreasurySimulationSettings
): CampaignMonthSchedule[] {
  const hsMonths = Math.max(1, Math.round(model.hauteSaison.months));
  return treasuryPlan.rows.map((row, idx) => {
    const calIdx = (settings.startMonthIndex + idx) % 12;
    const isHS = idx < hsMonths;
    const isSoudure = row.phase === 'SOUDURE';

    const activities: CampaignActivityCode[] = ['transformation_vente'];
    let primaryActivity: CampaignActivityCode = 'transformation_vente';
    let commentary = '';

    // Madagascar calendar semantics:
    // Oct–Dec (calIdx 9..11): Semis grande saison & soudure
    // Jan–Mar (calIdx 0..2): Croissance & soudure critique
    // Apr–Jul (calIdx 3..6): Grande Récolte HS & collecte abondante
    // Aug–Sep (calIdx 7..8): Contre-saison (Vary Aloha / Vary Jeby) & préparation sols
    if (calIdx >= 3 && calIdx <= 6) {
      activities.unshift('recolte_collecte');
      primaryActivity = 'recolte_collecte';
      commentary =
        'Grande récolte HS : pic de disponibilité paddy, achats à prix bas et constitution du stock tampon.';
    } else if (calIdx >= 9 && calIdx <= 11) {
      activities.unshift('semis_repiquage');
      if (isSoudure) activities.push('soudure_stockage');
      primaryActivity = isSoudure ? 'soudure_stockage' : 'semis_repiquage';
      commentary =
        'Période de semis & préparation campagne pluviale : forte tension BFR et prix du riz orientés à la hausse.';
    } else if (calIdx === 0 || calIdx === 1 || calIdx === 2) {
      activities.unshift('croissance_entretien');
      if (isSoudure) activities.push('soudure_stockage');
      primaryActivity = isSoudure ? 'soudure_stockage' : 'croissance_entretien';
      commentary =
        'Phase de maturation avant moisson : libération des stocks de riz usiné au tarif optimal de soudure.';
    } else {
      activities.unshift('recolte_collecte');
      primaryActivity = isHS ? 'recolte_collecte' : 'transformation_vente';
      commentary =
        'Transition Haute → Basse Saison : rotation continue de l’unité de décorticage et suivi de l’humidité.';
    }

    const rotCount = isHS
      ? assumptions.hauteSaison.rotationsPerMonth
      : assumptions.basseSaison.rotationsPerMonth;

    return {
      monthIndex: row.monthIndex,
      calendarMonthIndex: calIdx,
      monthName: CALENDAR_MONTHS_FR[calIdx],
      monthShort: CALENDAR_MONTHS_SHORT_FR[calIdx],
      seasonType: row.phase,
      primaryActivity,
      activities: Array.from(new Set(activities)),
      rotationsCount: rotCount,
      inflowsAr: row.inflowsAr,
      outflowsAr: row.totalOutflowsAr,
      netCashAr: row.netMonthlyCashFlowAr,
      endingCashAr: row.endingCashAr,
      commentary,
    };
  });
}

export interface GeneralLiquidityRatioResult {
  ratio: number;
  status: 'solide' | 'equilibre' | 'tendu';
  statusLabel: string;
  // Actifs Courants
  cashBalanceAr: number;
  paddyStockValueAr: number;
  tradeReceivablesAr: number;
  vatCreditReceivableAr: number;
  totalCurrentAssetsAr: number;
  // Passifs Courants
  shortTermSupplierDebtAr: number;
  seasonalSalariesDueAr: number;
  currentTaxAndFixedLiabilitiesAr: number;
  vatPayableDueAr: number;
  totalCurrentLiabilitiesAr: number;
  netWorkingCapitalAr: number; // Fonds de roulement net = Actifs CT - Passifs CT
  vatApplied: boolean;
}

export function computeGeneralLiquidityRatio(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  treasuryPlan: TreasuryPlanSummary,
  settings: TreasurySimulationSettings
): GeneralLiquidityRatioResult {
  const paddyStock = getResolvedPaddyStock(assumptions);
  const avgPaddyCostPerKg =
    (model.hauteSaison.paddyKgPerRotation > 0
      ? model.hauteSaison.paddyCostPerRotationAr /
        model.hauteSaison.paddyKgPerRotation
      : 800) *
      0.5 +
    (model.basseSaison.paddyKgPerRotation > 0
      ? model.basseSaison.paddyCostPerRotationAr /
        model.basseSaison.paddyKgPerRotation
      : 1400) *
      0.5;

  const paddyStockValueAr = Math.round(
    Math.max(0, paddyStock.currentStockKg) * avgPaddyCostPerKg
  );

  // Average or initial liquidity + credit buffer
  const avgMonthlyCash =
    treasuryPlan.rows.length > 0
      ? treasuryPlan.rows.reduce((s, r) => s + Math.max(0, r.endingCashAr), 0) /
        treasuryPlan.rows.length
      : model.investment.cashBufferAr;
  const cashBalanceAr = Math.round(
    Math.max(model.investment.cashBufferAr, avgMonthlyCash)
  );

  const avgMonthlyTurnover = model.year1.totalTurnoverAr / 12;
  const tradeReceivablesAr = Math.round(
    avgMonthlyTurnover * ((settings.clientDsoDays || 0) / 30)
  );

  const vatApplied = Boolean(model.year1.vatActive && model.vatSummary);
  const vatCreditReceivableAr = vatApplied
    ? Math.round(model.vatSummary?.avgMonthlyCreditTvaAr ?? 0)
    : 0;
  const vatPayableDueAr = vatApplied
    ? Math.round(model.vatSummary?.avgMonthlyVatPayableAr ?? 0)
    : 0;

  const totalCurrentAssetsAr =
    cashBalanceAr + paddyStockValueAr + tradeReceivablesAr + vatCreditReceivableAr;

  // Current Liabilities: Short-term supplier payables + seasonal wages + monthly tax/fixed obligations
  const monthlyVarPurchases = model.year1.totalPurchaseAndOperatingCostsAr / 12;
  const dpoMonths = Math.max(0.25, (settings.supplierDpoDays ?? 0) / 30);
  const shortTermSupplierDebtAr = Math.round(monthlyVarPurchases * dpoMonths);

  const hr = getResolvedHrPlanning(assumptions);
  const hrSummary = computeHrPlanningSummary(assumptions, hr);
  const seasonalSalariesDueAr = hr.enabled
    ? Math.round(hrSummary.averageMonthlyCostAr)
    : Math.round(model.year1.monthlyFixedChargesAr * 0.45);

  const currentTaxAndFixedLiabilitiesAr = Math.round(
    model.year1.corporateTaxAr / 4 + model.year1.monthlyFixedChargesAr * 0.5
  );

  const totalCurrentLiabilitiesAr = Math.max(
    1,
    shortTermSupplierDebtAr +
      seasonalSalariesDueAr +
      currentTaxAndFixedLiabilitiesAr +
      vatPayableDueAr
  );

  const ratio = totalCurrentAssetsAr / totalCurrentLiabilitiesAr;
  const status: GeneralLiquidityRatioResult['status'] =
    ratio >= 1.5 ? 'solide' : ratio >= 1.0 ? 'equilibre' : 'tendu';
  const statusLabel =
    status === 'solide'
      ? 'Liquidité Solide (≥ 1,50x)'
      : status === 'equilibre'
      ? 'Équilibre Court Terme (1,0–1,49x)'
      : 'Tension Liquidité (< 1,00x)';

  return {
    ratio,
    status,
    statusLabel,
    cashBalanceAr,
    paddyStockValueAr,
    tradeReceivablesAr,
    vatCreditReceivableAr,
    totalCurrentAssetsAr,
    shortTermSupplierDebtAr,
    seasonalSalariesDueAr,
    currentTaxAndFixedLiabilitiesAr,
    vatPayableDueAr,
    totalCurrentLiabilitiesAr,
    netWorkingCapitalAr: totalCurrentAssetsAr - totalCurrentLiabilitiesAr,
    vatApplied,
  };
}

export interface PaddyStockOptPoint {
  holdingDays: number;
  label: string;
  targetStockKg: number;
  spoilageLossPct: number;
  spoilageLossValueAr: number;
  holdingAndBfrCostAr: number;
  totalStockFrictionAr: number;
  effectiveMilledRecoveryPct: number;
  isOptimalPoint: boolean;
  isCurrentSetting: boolean;
}

export function computePaddyStockOptimizationCurve(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel
): {
  points: PaddyStockOptPoint[];
  optimalHoldingDays: number;
  optimalStockKg: number;
  currentHoldingDays: number;
  dailyPaddyNeedKg: number;
  estimatedAnnualSavingsAtOptimalAr: number;
} {
  const storage = getResolvedStorageOptimization(assumptions);
  const dailyPaddyNeedKg =
    (model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg) / 360;
  const avgPaddyCostPerKg =
    (model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg) > 0
      ? (model.hauteSaison.paddyCostPerRotationAr * model.hauteSaison.totalRotations +
          model.basseSaison.paddyCostPerRotationAr * model.basseSaison.totalRotations) /
        (model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg)
      : 1100;
  const avgRicePrice =
    (assumptions.hauteSaison.riceSellingPriceArPerKg +
      assumptions.basseSaison.riceSellingPriceArPerKg) /
    2;

  const candidateDays = [7, 15, 21, 30, 45, 60, 75, 90, 120];
  const currentHoldingDays = Math.max(7, Math.round(storage.storageDurationDays || 30));
  if (!candidateDays.includes(currentHoldingDays)) {
    candidateDays.push(currentHoldingDays);
    candidateDays.sort((a, b) => a - b);
  }

  const rawPoints = candidateDays.map((days) => {
    const lossRes = computeStorageWeightLossRate({
      ...storage,
      storageDurationDays: days,
    });
    const targetStockKg = Math.round(dailyPaddyNeedKg * days);
    // Understock rupture penalty for very short holding windows (< 14 days)
    const rupturePenaltyAr =
      days < 14
        ? Math.round((14 - days) * dailyPaddyNeedKg * 0.7 * (avgRicePrice * 0.18))
        : 0;
    const annualPaddyKg = model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg;
    const spoilageLossValueAr = Math.round(
      annualPaddyKg * lossRes.totalLossRate * 0.7 * avgRicePrice * (days / 90)
    );
    const holdingAndBfrCostAr = Math.round(
      targetStockKg * avgPaddyCostPerKg * 0.18 + targetStockKg * 12 * 18 // BFR 18%/an + magasinage
    );
    const totalStockFrictionAr =
      spoilageLossValueAr + holdingAndBfrCostAr + rupturePenaltyAr;

    return {
      holdingDays: days,
      label: `${days} j`,
      targetStockKg,
      spoilageLossPct: Number((lossRes.totalLossRate * 100).toFixed(2)),
      spoilageLossValueAr,
      holdingAndBfrCostAr,
      totalStockFrictionAr,
      effectiveMilledRecoveryPct: Number(
        (assumptions.hauteSaison.yieldPaddyToRice * (1 - lossRes.totalLossRate) * 100).toFixed(1)
      ),
      isOptimalPoint: false,
      isCurrentSetting: days === currentHoldingDays,
    };
  });

  let minIdx = 0;
  for (let i = 1; i < rawPoints.length; i++) {
    if (rawPoints[i].totalStockFrictionAr < rawPoints[minIdx].totalStockFrictionAr) {
      minIdx = i;
    }
  }
  rawPoints[minIdx].isOptimalPoint = true;

  const currentPoint =
    rawPoints.find((p) => p.isCurrentSetting) ?? rawPoints[minIdx];

  return {
    points: rawPoints,
    optimalHoldingDays: rawPoints[minIdx].holdingDays,
    optimalStockKg: rawPoints[minIdx].targetStockKg,
    currentHoldingDays,
    dailyPaddyNeedKg: Math.round(dailyPaddyNeedKg),
    estimatedAnnualSavingsAtOptimalAr: Math.max(
      0,
      currentPoint.totalStockFrictionAr - rawPoints[minIdx].totalStockFrictionAr
    ),
  };
}
