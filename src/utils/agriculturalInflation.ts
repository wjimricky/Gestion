import { FinancialAssumptions, FullFinancialModel } from '../types/finance';

export type InflationMacroPreset =
  | 'moderee'
  | 'tendancielle_mg'
  | 'tension_carburant'
  | 'custom';

export type InflationSimulationMode = 'constant' | 'variable';

export interface AnnualVariableInflationRate {
  year: number; // 1..5
  paddyRatePct: number; // % annual variation for year t
  inputsRatePct: number; // % annual variation for inputs, bags, diesel, milling
  fixedRatePct: number; // % annual variation for fixed charges
}

export type VariableInflationCurvePreset =
  | 'pic_climatique_a2'
  | 'choc_carburant_a2_a3'
  | 'desinflation_progressive';

export interface AgriculturalInflationParams {
  preset: InflationMacroPreset;
  inflationMode: InflationSimulationMode;
  paddyInflationRatePct: number; // %/an — hausse prix du paddy producteur (mode constant)
  inputsAndFuelInflationRatePct: number; // %/an — hausse gasoil, sacs PP, décorticage, docker (mode constant)
  fixedChargesInflationRatePct: number; // %/an — hausse salaires, loyers, entretien (mode constant)
  annualVariableRates: AnnualVariableInflationRate[]; // taux variables année par année A1..A5
  generalCpiDeflatorPct: number; // %/an — inflation générale IPC Madagascar pour calcul en Ar constants
  sellingPricePassThroughPct: number; // 0..100 % de répercussion de l'inflation des coûts sur le prix du riz
  volumeGrowthPctPerYear: number; // %/an croissance physique des volumes (0 % pour isoler l'inflation pure)
}

export interface InflationPresetMeta {
  id: Exclude<InflationMacroPreset, 'custom'>;
  label: string;
  shortLabel: string;
  description: string;
  params: Omit<AgriculturalInflationParams, 'preset' | 'inflationMode' | 'annualVariableRates'>;
}

export function buildUniformVariableRates(
  paddyPct: number,
  inputsPct: number,
  fixedPct: number
): AnnualVariableInflationRate[] {
  return [1, 2, 3, 4, 5].map((year) => ({
    year,
    paddyRatePct: year === 1 ? 0 : paddyPct,
    inputsRatePct: year === 1 ? 0 : inputsPct,
    fixedRatePct: year === 1 ? 0 : fixedPct,
  }));
}

export const VARIABLE_INFLATION_CURVE_PRESETS: Array<{
  id: VariableInflationCurvePreset;
  label: string;
  description: string;
  rates: AnnualVariableInflationRate[];
}> = [
  {
    id: 'pic_climatique_a2',
    label: 'Pic climatique A2 (+18 % paddy)',
    description: 'Tension ponctuelle sur le paddy en A2 (+18 %) puis normalisation en A4–A5.',
    rates: [
      { year: 1, paddyRatePct: 0, inputsRatePct: 0, fixedRatePct: 0 },
      { year: 2, paddyRatePct: 18, inputsRatePct: 12, fixedRatePct: 7 },
      { year: 3, paddyRatePct: 9, inputsRatePct: 10, fixedRatePct: 6.5 },
      { year: 4, paddyRatePct: 6, inputsRatePct: 7, fixedRatePct: 6 },
      { year: 5, paddyRatePct: 5, inputsRatePct: 6, fixedRatePct: 5.5 },
    ],
  },
  {
    id: 'choc_carburant_a2_a3',
    label: 'Choc carburant A2–A3 (+16 %)',
    description: 'Flambée persistante des intrants & gasoil sur A2–A3 avant stabilisation.',
    rates: [
      { year: 1, paddyRatePct: 0, inputsRatePct: 0, fixedRatePct: 0 },
      { year: 2, paddyRatePct: 10, inputsRatePct: 16, fixedRatePct: 8 },
      { year: 3, paddyRatePct: 12, inputsRatePct: 15, fixedRatePct: 8.5 },
      { year: 4, paddyRatePct: 7.5, inputsRatePct: 8, fixedRatePct: 6.5 },
      { year: 5, paddyRatePct: 6, inputsRatePct: 6.5, fixedRatePct: 5.5 },
    ],
  },
  {
    id: 'desinflation_progressive',
    label: 'Désinflation A1 → A5',
    description: 'Pression initiale élevée (A1–A2) suivie d’une décélération progressive jusqu’en A5.',
    rates: [
      { year: 1, paddyRatePct: 4, inputsRatePct: 5, fixedRatePct: 3 },
      { year: 2, paddyRatePct: 11, inputsRatePct: 12, fixedRatePct: 7.5 },
      { year: 3, paddyRatePct: 8, inputsRatePct: 8.5, fixedRatePct: 6 },
      { year: 4, paddyRatePct: 5.5, inputsRatePct: 6, fixedRatePct: 5 },
      { year: 5, paddyRatePct: 4, inputsRatePct: 4.5, fixedRatePct: 4 },
    ],
  },
];

export const AGRICULTURAL_INFLATION_PRESETS: InflationPresetMeta[] = [
  {
    id: 'moderee',
    label: 'Inflation modérée (Zone stable)',
    shortLabel: 'Modérée (6 %)',
    description: 'Stabilité relative de la campagne agricole et des cours carburants.',
    params: {
      paddyInflationRatePct: 6.0,
      inputsAndFuelInflationRatePct: 6.5,
      fixedChargesInflationRatePct: 5.0,
      generalCpiDeflatorPct: 6.0,
      sellingPricePassThroughPct: 85,
      volumeGrowthPctPerYear: 0,
    },
  },
  {
    id: 'tendancielle_mg',
    label: 'Tendancielle Madagascar (INSTAT)',
    shortLabel: 'Tendancielle MG (8,5 %)',
    description:
      'Trajectoire historique malgache : paddy +8,5 %/an, logistique & intrants +10 %/an, IPC 8 %/an.',
    params: {
      paddyInflationRatePct: 8.5,
      inputsAndFuelInflationRatePct: 10.0,
      fixedChargesInflationRatePct: 6.5,
      generalCpiDeflatorPct: 8.0,
      sellingPricePassThroughPct: 75,
      volumeGrowthPctPerYear: 0,
    },
  },
  {
    id: 'tension_carburant',
    label: 'Forte tension intrants & gasoil',
    shortLabel: 'Tension intrants (13 %)',
    description:
      'Forte inflation importée (carburant, sacs, pièces +14 %/an) avec répercussion limitée face au riz importé.',
    params: {
      paddyInflationRatePct: 11.0,
      inputsAndFuelInflationRatePct: 14.0,
      fixedChargesInflationRatePct: 8.5,
      generalCpiDeflatorPct: 10.5,
      sellingPricePassThroughPct: 60,
      volumeGrowthPctPerYear: 0,
    },
  },
];

export const DEFAULT_AGRICULTURAL_INFLATION_PARAMS: AgriculturalInflationParams = {
  preset: 'tendancielle_mg',
  inflationMode: 'constant',
  ...AGRICULTURAL_INFLATION_PRESETS[1].params,
  annualVariableRates: buildUniformVariableRates(
    AGRICULTURAL_INFLATION_PRESETS[1].params.paddyInflationRatePct,
    AGRICULTURAL_INFLATION_PRESETS[1].params.inputsAndFuelInflationRatePct,
    AGRICULTURAL_INFLATION_PRESETS[1].params.fixedChargesInflationRatePct
  ),
};

export interface InflationProjectionYearRow {
  year: number; // 1..5
  label: string; // A1..A5
  appliedPaddyInflationPct: number;
  appliedInputsInflationPct: number;
  appliedFixedInflationPct: number;
  appliedTotalCostInflationPct: number;
  paddyPriceHsArPerKg: number;
  paddyPriceBsArPerKg: number;
  riceSellingPriceHsArPerKg: number;
  inputsCostIndex: number; // base 100 in A1
  cpiDeflatorFactor: number;
  nominalTurnoverAr: number;
  nominalPaddyCostAr: number;
  nominalInputsAndOpsCostAr: number;
  nominalFixedChargesAr: number;
  nominalTotalProductionCostAr: number;
  nominalNetAfterTaxAr: number;
  realNetAfterTaxAr: number; // deflated to constant A1 Ariary
  nominalMarginRate: number;
  constantBaselineNetAfterTaxAr: number; // A1 net scaled only by physical volume growth (0% inflation benchmark)
  inflationMarginImpactAr: number; // real - constantBaseline
}

export interface AgriculturalInflationSummary {
  params: AgriculturalInflationParams;
  years: InflationProjectionYearRow[];
  cumulativeNominalNet5YAr: number;
  cumulativeRealNet5YAr: number;
  cumulativeConstantBaselineNet5YAr: number;
  realPurchasingPowerErosionAr: number;
  realPurchasingPowerErosionPct: number;
  npv5YNominalAr: number;
  npv5YRealAr: number;
  year5PaddyPriceHsArPerKg: number;
  year5MarginRate: number;
  year1MarginRate: number;
}

export function computeAgriculturalInflation5Y(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  params: AgriculturalInflationParams
): AgriculturalInflationSummary {
  const paddyCostRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy') || {
    costHS: 800,
    costBS: 1400,
  };

  const basePaddyHs = paddyCostRow.costHS;
  const basePaddyBs = paddyCostRow.costBS;
  const baseRicePriceHs = assumptions.hauteSaison.riceSellingPriceArPerKg;

  // Base Year 1 split between pure paddy purchase vs other inputs/transport/bags/milling
  const basePaddyAnnualCostAr =
    model.hauteSaison.paddyCostPerRotationAr * model.hauteSaison.totalRotations +
    model.basseSaison.paddyCostPerRotationAr * model.basseSaison.totalRotations;

  const baseInputsAndOpsCostAr = Math.max(
    0,
    model.year1.totalPurchaseAndOperatingCostsAr - basePaddyAnnualCostAr
  );
  const baseTurnoverAr = model.year1.totalTurnoverAr;
  const baseFixedAr = model.year1.annualFixedChargesAr;
  const taxRate = assumptions.corporateTaxRate;
  const discountRate = assumptions.discountRate;
  const i0 = model.investment.fundsToRaiseAr;

  const iCpi = params.generalCpiDeflatorPct / 100;
  const passThrough = Math.max(0, Math.min(1.5, params.sellingPricePassThroughPct / 100));
  const gVol = params.volumeGrowthPctPerYear / 100;

  const isVariable = params.inflationMode === 'variable';
  const totalBaseCost = Math.max(basePaddyAnnualCostAr + baseInputsAndOpsCostAr + baseFixedAr, 1);

  const years: InflationProjectionYearRow[] = [];
  let npv5YNominalSum = 0;
  let npv5YRealSum = 0;

  let paddyFactor = 1;
  let inputsFactor = 1;
  let fixedFactor = 1;
  let sellPriceFactor = 1;

  for (let year = 1; year <= 5; year++) {
    const t = year - 1;
    const varRow = params.annualVariableRates?.find((r) => r.year === year);

    const stepPaddyPct = isVariable
      ? (varRow?.paddyRatePct ?? params.paddyInflationRatePct)
      : year === 1
      ? 0
      : params.paddyInflationRatePct;
    const stepInputsPct = isVariable
      ? (varRow?.inputsRatePct ?? params.inputsAndFuelInflationRatePct)
      : year === 1
      ? 0
      : params.inputsAndFuelInflationRatePct;
    const stepFixedPct = isVariable
      ? (varRow?.fixedRatePct ?? params.fixedChargesInflationRatePct)
      : year === 1
      ? 0
      : params.fixedChargesInflationRatePct;

    const rPaddy = stepPaddyPct / 100;
    const rInputs = stepInputsPct / 100;
    const rFixed = stepFixedPct / 100;

    // Weight cost inflation by current cost shares for realistic annual pass-through
    const curPaddyWeight = basePaddyAnnualCostAr * paddyFactor;
    const curInputsWeight = baseInputsAndOpsCostAr * inputsFactor;
    const curFixedWeight = baseFixedAr * fixedFactor;
    const curWeightSum = Math.max(curPaddyWeight + curInputsWeight + curFixedWeight, totalBaseCost);

    const stepBlendedCostInflation =
      (curPaddyWeight * rPaddy + curInputsWeight * rInputs + curFixedWeight * rFixed) /
      curWeightSum;

    paddyFactor = paddyFactor * (1 + rPaddy);
    inputsFactor = inputsFactor * (1 + rInputs);
    fixedFactor = fixedFactor * (1 + rFixed);
    sellPriceFactor = sellPriceFactor * (1 + stepBlendedCostInflation * passThrough);

    const volFactor = Math.pow(1 + gVol, t);
    const cpiDeflatorFactor = Math.pow(1 + iCpi, t);

    const nominalTurnoverAr = baseTurnoverAr * volFactor * sellPriceFactor;
    const nominalPaddyCostAr = basePaddyAnnualCostAr * volFactor * paddyFactor;
    const nominalInputsAndOpsCostAr = baseInputsAndOpsCostAr * volFactor * inputsFactor;
    const nominalFixedChargesAr = baseFixedAr * fixedFactor;
    const nominalTotalProductionCostAr =
      nominalPaddyCostAr + nominalInputsAndOpsCostAr + nominalFixedChargesAr;

    const nominalNetBeforeTax = nominalTurnoverAr - nominalTotalProductionCostAr;
    const nominalTax = Math.max(0, nominalNetBeforeTax) * taxRate;
    const nominalNetAfterTaxAr = nominalNetBeforeTax - nominalTax;
    const realNetAfterTaxAr =
      cpiDeflatorFactor > 0 ? nominalNetAfterTaxAr / cpiDeflatorFactor : nominalNetAfterTaxAr;

    const baseBeforeTaxVol =
      baseTurnoverAr * volFactor -
      (basePaddyAnnualCostAr + baseInputsAndOpsCostAr) * volFactor -
      baseFixedAr;
    const constantBaselineNetAfterTaxAr =
      baseBeforeTaxVol - Math.max(0, baseBeforeTaxVol) * taxRate;

    npv5YNominalSum += nominalNetAfterTaxAr / Math.pow(1 + discountRate, year);
    npv5YRealSum += realNetAfterTaxAr / Math.pow(1 + discountRate, year);

    years.push({
      year,
      label: `A${year}`,
      appliedPaddyInflationPct: Number(stepPaddyPct.toFixed(1)),
      appliedInputsInflationPct: Number(stepInputsPct.toFixed(1)),
      appliedFixedInflationPct: Number(stepFixedPct.toFixed(1)),
      appliedTotalCostInflationPct: Number((stepBlendedCostInflation * 100).toFixed(1)),
      paddyPriceHsArPerKg: Math.round(basePaddyHs * paddyFactor),
      paddyPriceBsArPerKg: Math.round(basePaddyBs * paddyFactor),
      riceSellingPriceHsArPerKg: Math.round(baseRicePriceHs * sellPriceFactor),
      inputsCostIndex: Number((inputsFactor * 100).toFixed(1)),
      cpiDeflatorFactor: Number(cpiDeflatorFactor.toFixed(3)),
      nominalTurnoverAr: Math.round(nominalTurnoverAr),
      nominalPaddyCostAr: Math.round(nominalPaddyCostAr),
      nominalInputsAndOpsCostAr: Math.round(nominalInputsAndOpsCostAr),
      nominalFixedChargesAr: Math.round(nominalFixedChargesAr),
      nominalTotalProductionCostAr: Math.round(nominalTotalProductionCostAr),
      nominalNetAfterTaxAr: Math.round(nominalNetAfterTaxAr),
      realNetAfterTaxAr: Math.round(realNetAfterTaxAr),
      nominalMarginRate: nominalTurnoverAr > 0 ? nominalNetAfterTaxAr / nominalTurnoverAr : 0,
      constantBaselineNetAfterTaxAr: Math.round(constantBaselineNetAfterTaxAr),
      inflationMarginImpactAr: Math.round(realNetAfterTaxAr - constantBaselineNetAfterTaxAr),
    });
  }

  const cumulativeNominalNet5YAr = years.reduce((s, r) => s + r.nominalNetAfterTaxAr, 0);
  const cumulativeRealNet5YAr = years.reduce((s, r) => s + r.realNetAfterTaxAr, 0);
  const cumulativeConstantBaselineNet5YAr = years.reduce(
    (s, r) => s + r.constantBaselineNetAfterTaxAr,
    0
  );

  const realPurchasingPowerErosionAr =
    cumulativeRealNet5YAr - cumulativeConstantBaselineNet5YAr;
  const realPurchasingPowerErosionPct =
    cumulativeConstantBaselineNet5YAr !== 0
      ? realPurchasingPowerErosionAr / Math.abs(cumulativeConstantBaselineNet5YAr)
      : 0;

  return {
    params,
    years,
    cumulativeNominalNet5YAr,
    cumulativeRealNet5YAr,
    cumulativeConstantBaselineNet5YAr,
    realPurchasingPowerErosionAr,
    realPurchasingPowerErosionPct,
    npv5YNominalAr: Math.round(npv5YNominalSum - i0),
    npv5YRealAr: Math.round(npv5YRealSum - i0),
    year5PaddyPriceHsArPerKg: years[4]?.paddyPriceHsArPerKg ?? basePaddyHs,
    year5MarginRate: years[4]?.nominalMarginRate ?? 0,
    year1MarginRate: years[0]?.nominalMarginRate ?? 0,
  };
}
