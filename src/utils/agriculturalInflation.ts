import { FinancialAssumptions, FullFinancialModel } from '../types/finance';

export type InflationMacroPreset =
  | 'moderee'
  | 'tendancielle_mg'
  | 'tension_carburant'
  | 'custom';

export interface AgriculturalInflationParams {
  preset: InflationMacroPreset;
  paddyInflationRatePct: number; // %/an — hausse prix du paddy producteur
  inputsAndFuelInflationRatePct: number; // %/an — hausse gasoil, sacs PP, décorticage, docker
  fixedChargesInflationRatePct: number; // %/an — hausse salaires, loyers, entretien
  generalCpiDeflatorPct: number; // %/an — inflation générale IPC Madagascar pour calcul en Ar constants
  sellingPricePassThroughPct: number; // 0..100 % de répercussion de l'inflation des coûts sur le prix du riz
  volumeGrowthPctPerYear: number; // %/an croissance physique des volumes (0 % pour isoler l'inflation pure)
}

export interface InflationPresetMeta {
  id: Exclude<InflationMacroPreset, 'custom'>;
  label: string;
  shortLabel: string;
  description: string;
  params: Omit<AgriculturalInflationParams, 'preset'>;
}

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
  ...AGRICULTURAL_INFLATION_PRESETS[1].params,
};

export interface InflationProjectionYearRow {
  year: number; // 1..5
  label: string; // A1..A5
  paddyPriceHsArPerKg: number;
  paddyPriceBsArPerKg: number;
  riceSellingPriceHsArPerKg: number;
  inputsCostIndex: number; // base 100 in A1
  cpiDeflatorFactor: number;
  nominalTurnoverAr: number;
  nominalPaddyCostAr: number;
  nominalInputsAndOpsCostAr: number;
  nominalFixedChargesAr: number;
  nominalNetAfterTaxAr: number;
  realNetAfterTaxAr: number; // deflated to constant A1 Ariary
  nominalMarginRate: number;
  constantBaselineNetAfterTaxAr: number; // A1 net scaled only by physical volume growth (0% inflation benchmark)
  inflationMarginImpactAr: number; // nominal - constantBaseline (or real - constantBaseline)
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

  const iPaddy = params.paddyInflationRatePct / 100;
  const iInputs = params.inputsAndFuelInflationRatePct / 100;
  const iFixed = params.fixedChargesInflationRatePct / 100;
  const iCpi = params.generalCpiDeflatorPct / 100;
  const passThrough = Math.max(0, Math.min(1.5, params.sellingPricePassThroughPct / 100));
  const gVol = params.volumeGrowthPctPerYear / 100;

  // Blended cost inflation rate used for pass-through selling price indexation
  const totalBaseCost = Math.max(basePaddyAnnualCostAr + baseInputsAndOpsCostAr + baseFixedAr, 1);
  const blendedCostInflationRate =
    (basePaddyAnnualCostAr * iPaddy +
      baseInputsAndOpsCostAr * iInputs +
      baseFixedAr * iFixed) /
    totalBaseCost;
  const effectiveSellingPriceInflation = blendedCostInflationRate * passThrough;

  const years: InflationProjectionYearRow[] = [];
  let npv5YNominalSum = 0;
  let npv5YRealSum = 0;

  for (let year = 1; year <= 5; year++) {
    const t = year - 1;
    const volFactor = Math.pow(1 + gVol, t);
    const paddyFactor = Math.pow(1 + iPaddy, t);
    const inputsFactor = Math.pow(1 + iInputs, t);
    const fixedFactor = Math.pow(1 + iFixed, t);
    const sellPriceFactor = Math.pow(1 + effectiveSellingPriceInflation, t);
    const cpiDeflatorFactor = Math.pow(1 + iCpi, t);

    const nominalTurnoverAr = baseTurnoverAr * volFactor * sellPriceFactor;
    const nominalPaddyCostAr = basePaddyAnnualCostAr * volFactor * paddyFactor;
    const nominalInputsAndOpsCostAr = baseInputsAndOpsCostAr * volFactor * inputsFactor;
    const nominalFixedChargesAr = baseFixedAr * fixedFactor;

    const nominalNetBeforeTax =
      nominalTurnoverAr -
      nominalPaddyCostAr -
      nominalInputsAndOpsCostAr -
      nominalFixedChargesAr;
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
      paddyPriceHsArPerKg: Math.round(basePaddyHs * paddyFactor),
      paddyPriceBsArPerKg: Math.round(basePaddyBs * paddyFactor),
      riceSellingPriceHsArPerKg: Math.round(baseRicePriceHs * sellPriceFactor),
      inputsCostIndex: Number((inputsFactor * 100).toFixed(1)),
      cpiDeflatorFactor: Number(cpiDeflatorFactor.toFixed(3)),
      nominalTurnoverAr: Math.round(nominalTurnoverAr),
      nominalPaddyCostAr: Math.round(nominalPaddyCostAr),
      nominalInputsAndOpsCostAr: Math.round(nominalInputsAndOpsCostAr),
      nominalFixedChargesAr: Math.round(nominalFixedChargesAr),
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
