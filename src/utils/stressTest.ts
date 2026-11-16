import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { getResolvedLogistics, computeSeasonLogisticsBreakdown } from './logistics';
import {
  buildMonthlyTreasuryPlan,
  TreasuryPlanSummary,
  TreasurySimulationSettings,
} from './treasury';

export type StressTestPresetId =
  | 'custom'
  | 'rupture_paddy'
  | 'choc_gasoil'
  | 'pertes_post_recolte'
  | 'cyclone_total';

export type StressSeasonScope = 'both' | 'hauteSaison' | 'basseSaison';

export interface OperationalStressTestParams {
  presetId: StressTestPresetId;
  affectedSeason: StressSeasonScope;
  paddySupplyDropPercent: number; // 0..60 % reduction in rotations / collected paddy volume
  dieselPriceSurgePercent: number; // 0..120 % sudden fuel cost increase
  extraPostHarvestLossPoints: number; // 0..25 percentage points loss on paddy->rice milling/spoilage
}

export interface StressTestPresetMeta {
  id: Exclude<StressTestPresetId, 'custom'>;
  label: string;
  shortLabel: string;
  severity: 'warning' | 'danger';
  description: string;
  params: Omit<OperationalStressTestParams, 'presetId' | 'affectedSeason'>;
}

export const STRESS_TEST_PRESETS: StressTestPresetMeta[] = [
  {
    id: 'rupture_paddy',
    label: 'Rupture d’approvisionnement paddy',
    shortLabel: 'Rupture paddy',
    severity: 'danger',
    description:
      'Retard de récolte ou blocage de collecte : −35 % de rotations mensuelles et +2 pts de pertes.',
    params: {
      paddySupplyDropPercent: 35,
      dieselPriceSurgePercent: 0,
      extraPostHarvestLossPoints: 2,
    },
  },
  {
    id: 'choc_gasoil',
    label: 'Flambée soudaine du gasoil',
    shortLabel: 'Choc gasoil',
    severity: 'warning',
    description:
      'Hausse brutale du prix du carburant à Madagascar (+55 % à la pompe) alourdissant chaque rotation.',
    params: {
      paddySupplyDropPercent: 0,
      dieselPriceSurgePercent: 55,
      extraPostHarvestLossPoints: 0,
    },
  },
  {
    id: 'pertes_post_recolte',
    label: 'Pertes post-récolte accrues',
    shortLabel: 'Pertes stock',
    severity: 'warning',
    description:
      'Humidité excessive / charançons en stockage : −10 pts de rendement effectif et −10 % de volume valorisable.',
    params: {
      paddySupplyDropPercent: 10,
      dieselPriceSurgePercent: 0,
      extraPostHarvestLossPoints: 10,
    },
  },
  {
    id: 'cyclone_total',
    label: 'Crise combinée (Cyclone + Soudure)',
    shortLabel: 'Crise combinée',
    severity: 'danger',
    description:
      'Coupure de pistes rurales, pénurie de carburant (+45 %) et rupture partielle (−30 % collecte, +8 pts pertes).',
    params: {
      paddySupplyDropPercent: 30,
      dieselPriceSurgePercent: 45,
      extraPostHarvestLossPoints: 8,
    },
  },
];

export const DEFAULT_STRESS_TEST_PARAMS: OperationalStressTestParams = {
  presetId: 'rupture_paddy',
  affectedSeason: 'both',
  paddySupplyDropPercent: 35,
  dieselPriceSurgePercent: 0,
  extraPostHarvestLossPoints: 2,
};

export interface StressMonthlyPoint {
  monthIndex: number;
  label: string;
  phase: 'HS' | 'BS' | 'SOUDURE';
  nominalEndingCashAr: number;
  stressedEndingCashAr: number;
  nominalNetCfAr: number;
  stressedNetCfAr: number;
  stressedIntraMinAr: number;
  cashGapAr: number;
}

export interface OperationalStressTestResult {
  params: OperationalStressTestParams;
  nominalModel: FullFinancialModel;
  stressedModel: FullFinancialModel;
  nominalTreasury: TreasuryPlanSummary;
  stressedTreasury: TreasuryPlanSummary;
  monthlyComparison: StressMonthlyPoint[];
  cashDeltaEndYearAr: number;
  minCashTroughDeltaAr: number;
  stressedNegativeMonthsCount: number;
  nominalNegativeMonthsCount: number;
  additionalCashNeededAr: number;
  dieselExtraCostAnnualAr: number;
  lostPaddyKgAnnual: number;
  netResultDeltaAr: number;
  npvDeltaAr: number;
  irrDeltaPts: number;
}

export function buildStressedAssumptions(
  assumptions: FinancialAssumptions,
  params: OperationalStressTestParams
): FinancialAssumptions {
  const applyHS =
    params.affectedSeason === 'both' || params.affectedSeason === 'hauteSaison';
  const applyBS =
    params.affectedSeason === 'both' || params.affectedSeason === 'basseSaison';

  const supplyFactor = Math.max(0.15, 1 - Math.max(0, Math.min(80, params.paddySupplyDropPercent)) / 100);
  const yieldDrop = Math.max(0, Math.min(35, params.extraPostHarvestLossPoints)) / 100;
  const dieselSurgeRatio = Math.max(0, Math.min(200, params.dieselPriceSurgePercent)) / 100;

  const logistics = getResolvedLogistics(assumptions);
  const fuelBreakdownHS = computeSeasonLogisticsBreakdown(logistics, 'hauteSaison');
  const fuelBreakdownBS = computeSeasonLogisticsBreakdown(logistics, 'basseSaison');

  const baseFuelRow = assumptions.costsPerRotation.find(
    (c) => c.id === 'cost-rot-fuel' || c.label.toLowerCase().includes('carburant')
  );
  const baseFuelHS =
    fuelBreakdownHS.fuelCostAr > 0
      ? fuelBreakdownHS.fuelCostAr
      : baseFuelRow?.costHS ?? 100000;
  const baseFuelBS =
    fuelBreakdownBS.fuelCostAr > 0
      ? fuelBreakdownBS.fuelCostAr
      : baseFuelRow?.costBS ?? 450000;

  const extraFuelHS = applyHS ? Math.round(baseFuelHS * dieselSurgeRatio) : 0;
  const extraFuelBS = applyBS ? Math.round(baseFuelBS * dieselSurgeRatio) : 0;

  const updatedCostsPerRotation = assumptions.costsPerRotation.map((c) => {
    if (baseFuelRow && c.id === baseFuelRow.id) {
      return {
        ...c,
        costHS: c.costHS + extraFuelHS,
        costBS: c.costBS + extraFuelBS,
      };
    }
    return c;
  });

  if (!baseFuelRow && (extraFuelHS > 0 || extraFuelBS > 0)) {
    updatedCostsPerRotation.push({
      id: 'stress-diesel-surge',
      label: 'Surcoût gasoil (stress-test)',
      costHS: extraFuelHS,
      costBS: extraFuelBS,
    });
  }

  return {
    ...assumptions,
    hauteSaison: {
      ...assumptions.hauteSaison,
      rotationsPerMonth: applyHS
        ? Math.max(0.1, Number((assumptions.hauteSaison.rotationsPerMonth * supplyFactor).toFixed(2)))
        : assumptions.hauteSaison.rotationsPerMonth,
      yieldPaddyToRice: applyHS
        ? Math.max(0.2, Number((assumptions.hauteSaison.yieldPaddyToRice - yieldDrop).toFixed(4)))
        : assumptions.hauteSaison.yieldPaddyToRice,
    },
    basseSaison: {
      ...assumptions.basseSaison,
      rotationsPerMonth: applyBS
        ? Math.max(0.1, Number((assumptions.basseSaison.rotationsPerMonth * supplyFactor).toFixed(2)))
        : assumptions.basseSaison.rotationsPerMonth,
      yieldPaddyToRice: applyBS
        ? Math.max(0.2, Number((assumptions.basseSaison.yieldPaddyToRice - yieldDrop).toFixed(4)))
        : assumptions.basseSaison.yieldPaddyToRice,
    },
    costsPerRotation: updatedCostsPerRotation,
  };
}

export function runOperationalStressTest(
  assumptions: FinancialAssumptions,
  baseModel: FullFinancialModel,
  treasurySettings: TreasurySimulationSettings,
  params: OperationalStressTestParams
): OperationalStressTestResult {
  const stressedAssumptions = buildStressedAssumptions(assumptions, params);
  const stressedModel = calculateFullModel(stressedAssumptions);

  const nominalTreasury = buildMonthlyTreasuryPlan(baseModel, treasurySettings);
  const stressedTreasury = buildMonthlyTreasuryPlan(stressedModel, treasurySettings);

  const monthlyComparison: StressMonthlyPoint[] = nominalTreasury.rows.map((nomRow, idx) => {
    const strRow = stressedTreasury.rows[idx] || nomRow;
    return {
      monthIndex: nomRow.monthIndex,
      label: `${nomRow.calendarMonthShort}`,
      phase: strRow.phase,
      nominalEndingCashAr: Math.round(nomRow.endingCashAr),
      stressedEndingCashAr: Math.round(strRow.endingCashAr),
      nominalNetCfAr: Math.round(nomRow.netMonthlyCashFlowAr),
      stressedNetCfAr: Math.round(strRow.netMonthlyCashFlowAr),
      stressedIntraMinAr: Math.round(strRow.intraMonthMinCashAr),
      cashGapAr: Math.round(strRow.endingCashAr - nomRow.endingCashAr),
    };
  });

  const nominalNegativeMonthsCount = nominalTreasury.rows.filter(
    (r) => r.endingCashAr < 0
  ).length;
  const stressedNegativeMonthsCount = stressedTreasury.rows.filter(
    (r) => r.endingCashAr < 0
  ).length;

  const nominalTotalPaddy =
    baseModel.hauteSaison.totalPaddyKg + baseModel.basseSaison.totalPaddyKg;
  const stressedTotalPaddy =
    stressedModel.hauteSaison.totalPaddyKg + stressedModel.basseSaison.totalPaddyKg;

  const baseDieselCostAnnual =
    (baseModel.assumptions.costsPerRotation.find(
      (c) => c.id === 'cost-rot-fuel' || c.label.toLowerCase().includes('carburant')
    )?.costHS ?? 0) *
      stressedModel.hauteSaison.totalRotations +
    (baseModel.assumptions.costsPerRotation.find(
      (c) => c.id === 'cost-rot-fuel' || c.label.toLowerCase().includes('carburant')
    )?.costBS ?? 0) *
      stressedModel.basseSaison.totalRotations;

  const stressedDieselCostAnnual =
    (stressedModel.assumptions.costsPerRotation.find(
      (c) =>
        c.id === 'cost-rot-fuel' ||
        c.id === 'stress-diesel-surge' ||
        c.label.toLowerCase().includes('carburant')
    )?.costHS ?? 0) *
      stressedModel.hauteSaison.totalRotations +
    (stressedModel.assumptions.costsPerRotation.find(
      (c) =>
        c.id === 'cost-rot-fuel' ||
        c.id === 'stress-diesel-surge' ||
        c.label.toLowerCase().includes('carburant')
    )?.costBS ?? 0) *
      stressedModel.basseSaison.totalRotations;

  const nomIrr = Number.isFinite(baseModel.irr.irrValue) ? baseModel.irr.irrValue : 0;
  const strIrr = Number.isFinite(stressedModel.irr.irrValue) ? stressedModel.irr.irrValue : 0;

  return {
    params,
    nominalModel: baseModel,
    stressedModel,
    nominalTreasury,
    stressedTreasury,
    monthlyComparison,
    cashDeltaEndYearAr: stressedTreasury.endingYearCashAr - nominalTreasury.endingYearCashAr,
    minCashTroughDeltaAr: stressedTreasury.minCashTroughAr - nominalTreasury.minCashTroughAr,
    stressedNegativeMonthsCount,
    nominalNegativeMonthsCount,
    additionalCashNeededAr: Math.max(
      0,
      stressedTreasury.recommendedShortTermFacilityAr -
        nominalTreasury.recommendedShortTermFacilityAr
    ),
    dieselExtraCostAnnualAr: Math.max(0, stressedDieselCostAnnual - baseDieselCostAnnual),
    lostPaddyKgAnnual: Math.max(0, nominalTotalPaddy - stressedTotalPaddy),
    netResultDeltaAr:
      stressedModel.year1.netResultAfterTaxAr - baseModel.year1.netResultAfterTaxAr,
    npvDeltaAr: stressedModel.npv.npvAr - baseModel.npv.npvAr,
    irrDeltaPts: (strIrr - nomIrr) * 100,
  };
}
