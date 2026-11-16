import {
  FinancialAssumptions,
  SeasonResult,
  Year1Result,
  InvestmentResult,
  BreakEvenResult,
  PaybackResult,
  MonthlyCashFlow,
  ProjectionResult,
  NPVResult,
  DiscountSensitivityItem,
  IRRResult,
  ScenarioDefinition,
  ScenarioResult,
  FullFinancialModel,
  SensitivityMatrix,
} from '../types/finance';

/**
 * Computes the operational and financial results of a single season (Haute or Basse Saison).
 */
export function computeSeason(
  assumptions: FinancialAssumptions,
  seasonKey: 'hauteSaison' | 'basseSaison'
): SeasonResult {
  const s = assumptions[seasonKey];
  const isHS = seasonKey === 'hauteSaison';

  // 1. Volumes
  const totalRotations = s.months * s.rotationsPerMonth;
  const paddyKgPerRotation = s.paddyBoughtKgPerRotation;
  const totalPaddyKg = totalRotations * paddyKgPerRotation;

  const yieldRatio = Math.max(0, Math.min(1, s.yieldPaddyToRice));
  const riceKgPerRotation = paddyKgPerRotation * yieldRatio;
  const totalRiceKg = totalRotations * riceKgPerRotation;

  const byproductsKgPerRotation = Math.max(0, paddyKgPerRotation - riceKgPerRotation);
  const totalByproductsKg = totalRotations * byproductsKgPerRotation;

  const monthlyRiceKgSold = s.rotationsPerMonth * riceKgPerRotation;

  // 2. Turnover (CA)
  const riceSellingPriceAr = s.riceSellingPriceArPerKg;
  const byproductSellingPriceAr = s.byproductSellingPriceArPerKg;

  const riceTurnoverPerRotation = riceKgPerRotation * riceSellingPriceAr;
  const byproductsTurnoverPerRotation = byproductsKgPerRotation * byproductSellingPriceAr;
  const turnoverPerRotationAr = riceTurnoverPerRotation + byproductsTurnoverPerRotation;
  const totalTurnoverAr = turnoverPerRotationAr * totalRotations;

  // 3. Bags calculation
  // Find bag price for selected bag size (or closest)
  const bagOption =
    assumptions.bagOptions.find((b) => b.capacityKg === assumptions.selectedBagCapacityKg) ||
    assumptions.bagOptions[0] || { capacityKg: 60, unitPriceAr: 1700 };

  const bagCapacity = bagOption.capacityKg > 0 ? bagOption.capacityKg : 60;
  // Excel: ROUNDUP(paddyKg / bagCapacity, 0)
  const bagsPerRotation = Math.ceil(paddyKgPerRotation / bagCapacity);
  const bagUnitPriceAr = bagOption.unitPriceAr;
  const bagCostPerRotationAr = bagsPerRotation * bagUnitPriceAr;

  // 4. Costs per kg of paddy
  const costPerKgPaddyAr = assumptions.costsPerKgPaddy.reduce((acc, c) => {
    return acc + (isHS ? c.costHS : c.costBS);
  }, 0);
  const paddyCostPerRotationAr = paddyKgPerRotation * costPerKgPaddyAr;

  // 5. Costs per rotation (hors paddy direct et avec sacs)
  const otherRotationCostsExcludingBags = assumptions.costsPerRotation.reduce((acc, c) => {
    return acc + (isHS ? c.costHS : c.costBS);
  }, 0);
  const otherCostsPerRotationAr = otherRotationCostsExcludingBags + bagCostPerRotationAr;

  const totalCostPerRotationAr = paddyCostPerRotationAr + otherCostsPerRotationAr;
  const totalPurchaseAndOperatingCostsAr = totalCostPerRotationAr * totalRotations;

  // 6. Margins & Results before fixed charges
  const grossProfitPerRotationAr = turnoverPerRotationAr - totalCostPerRotationAr;
  const monthlyGrossProfitAr = grossProfitPerRotationAr * s.rotationsPerMonth;
  const seasonGrossProfitAr = grossProfitPerRotationAr * totalRotations;

  const grossMarginRate =
    totalTurnoverAr > 0 ? seasonGrossProfitAr / totalTurnoverAr : 0;

  // 7. Fixed charges
  const monthlyFixedChargesAr = assumptions.fixedMonthlyCharges.reduce(
    (acc, f) => acc + f.amount,
    0
  );
  const seasonFixedChargesAr = monthlyFixedChargesAr * s.months;

  const monthlyNetResultBeforeTaxAr = monthlyGrossProfitAr - monthlyFixedChargesAr;
  const seasonNetResultBeforeTaxAr = monthlyNetResultBeforeTaxAr * s.months;

  return {
    months: s.months,
    rotationsPerMonth: s.rotationsPerMonth,
    totalRotations,
    paddyKgPerRotation,
    totalPaddyKg,
    yieldRatio,
    riceKgPerRotation,
    totalRiceKg,
    byproductsKgPerRotation,
    totalByproductsKg,
    monthlyRiceKgSold,
    riceSellingPriceAr,
    byproductSellingPriceAr,
    turnoverPerRotationAr,
    totalTurnoverAr,
    bagsPerRotation,
    bagUnitPriceAr,
    bagCostPerRotationAr,
    costPerKgPaddyAr,
    paddyCostPerRotationAr,
    otherCostsPerRotationAr,
    totalCostPerRotationAr,
    totalPurchaseAndOperatingCostsAr,
    grossProfitPerRotationAr,
    monthlyGrossProfitAr,
    seasonGrossProfitAr,
    grossMarginRate,
    seasonFixedChargesAr,
    monthlyNetResultBeforeTaxAr,
    seasonNetResultBeforeTaxAr,
  };
}

/**
 * Computes Year 1 aggregate results from Haute Saison and Basse Saison.
 */
export function computeYear1(
  hs: SeasonResult,
  bs: SeasonResult,
  corporateTaxRate: number,
  investorShare: number
): Year1Result {
  const totalRiceKgSold = hs.totalRiceKg + bs.totalRiceKg;
  const totalTurnoverAr = hs.totalTurnoverAr + bs.totalTurnoverAr;
  const totalPurchaseAndOperatingCostsAr =
    hs.totalPurchaseAndOperatingCostsAr + bs.totalPurchaseAndOperatingCostsAr;
  const annualGrossProfitAr = hs.seasonGrossProfitAr + bs.seasonGrossProfitAr;

  const grossMarginRate =
    totalTurnoverAr > 0 ? annualGrossProfitAr / totalTurnoverAr : 0;

  const annualFixedChargesAr = hs.seasonFixedChargesAr + bs.seasonFixedChargesAr;
  const totalMonths = hs.months + bs.months;
  const monthlyFixedChargesAr = totalMonths > 0 ? annualFixedChargesAr / totalMonths : 0;

  const netResultBeforeTaxAr = annualGrossProfitAr - annualFixedChargesAr;
  const netMarginBeforeTaxRate =
    totalTurnoverAr > 0 ? netResultBeforeTaxAr / totalTurnoverAr : 0;

  // Corporate Tax (IR) is applied on positive net profit
  const corporateTaxAr = Math.max(0, netResultBeforeTaxAr) * corporateTaxRate;
  const netResultAfterTaxAr = netResultBeforeTaxAr - corporateTaxAr;

  const netMarginAfterTaxRate =
    totalTurnoverAr > 0 ? netResultAfterTaxAr / totalTurnoverAr : 0;

  const safeInvestorShare = Math.max(0, Math.min(1, investorShare));
  const investorShareAr = netResultAfterTaxAr * safeInvestorShare;
  const companyShareAr = netResultAfterTaxAr * (1 - safeInvestorShare);

  return {
    totalRiceKgSold,
    totalTurnoverAr,
    totalPurchaseAndOperatingCostsAr,
    annualGrossProfitAr,
    grossMarginRate,
    monthlyFixedChargesAr,
    annualFixedChargesAr,
    netResultBeforeTaxAr,
    netMarginBeforeTaxRate,
    corporateTaxAr,
    netResultAfterTaxAr,
    netMarginAfterTaxRate,
    investorShareAr,
    companyShareAr,
  };
}

/**
 * Computes initial investment and funding requirements.
 */
export function computeInvestment(
  hs: SeasonResult,
  assumptions: FinancialAssumptions,
  year1: Year1Result
): InvestmentResult {
  // Working capital needed for one rotation in HS
  const rotationWorkingCapitalHSAr = hs.totalCostPerRotationAr;
  const materielAr = assumptions.investment.materielAr;
  const enregistrementAr = assumptions.investment.enregistrementAr;
  const workingCapitalTotalAr =
    rotationWorkingCapitalHSAr + materielAr + enregistrementAr;
  const cashBufferAr = assumptions.investment.cashBufferAr;

  // Excel formula: ROUND(I32 + I33, -3) -> rounds to nearest 1,000 Ariary
  const rawFunds = workingCapitalTotalAr + cashBufferAr;
  const fundsToRaiseAr = Math.round(rawFunds / 1000) * 1000;

  const roiRatio =
    fundsToRaiseAr > 0 ? year1.netResultAfterTaxAr / fundsToRaiseAr : 0;

  return {
    rotationWorkingCapitalHSAr,
    materielAr,
    enregistrementAr,
    workingCapitalTotalAr,
    cashBufferAr,
    fundsToRaiseAr,
    roiRatio,
  };
}

/**
 * Computes Break-Even Analysis (Point Mort) for Year 1.
 */
export function computeBreakEven(
  year1: Year1Result,
  avgVolumePerClientKgMonthly: number,
  hs: SeasonResult,
  bs: SeasonResult
): BreakEvenResult {
  const monthlyFixedChargesAr = year1.monthlyFixedChargesAr;
  const annualFixedChargesAr = year1.annualFixedChargesAr;
  const grossMarginRate = year1.grossMarginRate;

  // Annual Break-Even Turnover: Fixed Charges / Gross Margin Rate
  const annualBreakEvenTurnoverAr =
    grossMarginRate > 0 ? annualFixedChargesAr / grossMarginRate : 0;
  const monthlyBreakEvenTurnoverAr = annualBreakEvenTurnoverAr / 12;

  // Weighted Average Selling Price: Annual Turnover / Annual Rice Volume
  const weightedAvgSellingPriceAr =
    year1.totalRiceKgSold > 0 ? year1.totalTurnoverAr / year1.totalRiceKgSold : 0;

  // Break-Even Volume
  const annualBreakEvenVolumeKg =
    weightedAvgSellingPriceAr > 0
      ? annualBreakEvenTurnoverAr / weightedAvgSellingPriceAr
      : 0;
  const monthlyBreakEvenVolumeKg = annualBreakEvenVolumeKg / 12;

  // % of annual target volume
  const breakEvenPercentOfTarget =
    year1.totalRiceKgSold > 0 ? annualBreakEvenVolumeKg / year1.totalRiceKgSold : 0;

  // Safety Margin (Marge de sécurité)
  const safetyMarginRate = 1 - breakEvenPercentOfTarget;

  const avgVol = Math.max(1, avgVolumePerClientKgMonthly);
  const requiredActiveClients = Math.ceil(monthlyBreakEvenVolumeKg / avgVol);

  const nominalMonthlyVolume = year1.totalRiceKgSold / 12;
  const nominalMonthlyTurnover = (nominalMonthlyVolume * weightedAvgSellingPriceAr);

  const vigilanceThresholds = [
    {
      level: 'Break-even (Seuil)',
      monthlyVolumeKg: monthlyBreakEvenVolumeKg,
      monthlyTurnoverAr: monthlyBreakEvenTurnoverAr,
      status: 'Seuil minimum — charges fixes exactement couvertes',
    },
    {
      level: "80 % de l'objectif",
      monthlyVolumeKg: 0.8 * nominalMonthlyVolume,
      monthlyTurnoverAr: 0.8 * nominalMonthlyTurnover,
      status:
        0.8 * nominalMonthlyVolume >= monthlyBreakEvenVolumeKg
          ? 'Au-dessus du seuil — bénéfice positif mais partiel'
          : 'Sous le seuil — perte',
    },
    {
      level: 'Objectif de base (100 %)',
      monthlyVolumeKg: nominalMonthlyVolume,
      monthlyTurnoverAr: nominalMonthlyTurnover,
      status: `Plan nominal — résultat mensuel : HS ${(hs.monthlyNetResultBeforeTaxAr / 1e6).toFixed(2)} M Ar / BS ${(bs.monthlyNetResultBeforeTaxAr / 1e6).toFixed(2)} M Ar`,
    },
    {
      level: "120 % de l'objectif",
      monthlyVolumeKg: 1.2 * nominalMonthlyVolume,
      monthlyTurnoverAr: 1.2 * nominalMonthlyTurnover,
      status: 'Croissance forte — marge de sécurité renforcée',
    },
  ];

  return {
    monthlyFixedChargesAr,
    annualFixedChargesAr,
    grossMarginRate,
    annualBreakEvenTurnoverAr,
    monthlyBreakEvenTurnoverAr,
    weightedAvgSellingPriceAr,
    annualBreakEvenVolumeKg,
    monthlyBreakEvenVolumeKg,
    breakEvenPercentOfTarget,
    safetyMarginRate,
    avgVolumePerClientKgMonthly: avgVol,
    requiredActiveClients,
    vigilanceThresholds,
  };
}

/**
 * Computes 3-Year Net Cash Flow Projections (Projection CF A1-A3).
 */
export function computeProjections(
  year1: Year1Result,
  corporateTaxRate: number,
  growthY2: number,
  growthY3: number,
  ambitiousGrowthY2: number,
  ambitiousGrowthY3: number
): ProjectionResult {
  const cf1 = year1.netResultAfterTaxAr;
  const taxDivisor = Math.max(0.001, 1 - corporateTaxRate);

  // Realistic scenario
  const cf2 = cf1 * (1 + growthY2);
  const cf3 = cf2 * (1 + growthY3);

  const realistic: [number, number, number] = [cf1, cf2, cf3];

  const realisticProjections: ProjectionResult['realistic'] = [
    {
      year: 1,
      label: 'A1',
      netResultAfterTaxAr: cf1,
      growthRate: null,
      netResultBeforeTaxAr: cf1 / taxDivisor,
      method: 'Calcul réel (CA − charges − IR)',
    },
    {
      year: 2,
      label: 'A2',
      netResultAfterTaxAr: cf2,
      growthRate: growthY2,
      netResultBeforeTaxAr: cf2 / taxDivisor,
      method: `A1 × (1 + ${(growthY2 * 100).toFixed(0)} %)`,
    },
    {
      year: 3,
      label: 'A3',
      netResultAfterTaxAr: cf3,
      growthRate: growthY3,
      netResultBeforeTaxAr: cf3 / taxDivisor,
      method: `A2 × (1 + ${(growthY3 * 100).toFixed(0)} %)`,
    },
  ];

  // Ambitious scenario
  const ambCf1 = cf1;
  const ambCf2 = ambCf1 * (1 + ambitiousGrowthY2);
  const ambCf3 = ambCf2 * (1 + ambitiousGrowthY3);

  const ambitiousProjections: ProjectionResult['ambitious'] = [
    {
      year: 1,
      label: 'A1',
      netResultAfterTaxAr: ambCf1,
      growthRate: null,
      netResultBeforeTaxAr: ambCf1 / taxDivisor,
      method: 'Base A1',
    },
    {
      year: 2,
      label: 'A2',
      netResultAfterTaxAr: ambCf2,
      growthRate: ambitiousGrowthY2,
      netResultBeforeTaxAr: ambCf2 / taxDivisor,
      method: `A1 × (1 + ${(ambitiousGrowthY2 * 100).toFixed(0)} %)`,
    },
    {
      year: 3,
      label: 'A3',
      netResultAfterTaxAr: ambCf3,
      growthRate: ambitiousGrowthY3,
      netResultBeforeTaxAr: ambCf3 / taxDivisor,
      method: `A2 × (1 + ${(ambitiousGrowthY3 * 100).toFixed(0)} %)`,
    },
  ];

  return {
    realistic: realisticProjections,
    ambitious: ambitiousProjections,
  };
}

/**
 * Computes Payback Period over 36 months following seasonal cash flows.
 */
export function computePayback(
  fundsInvestedAr: number,
  hs: SeasonResult,
  bs: SeasonResult,
  year1: Year1Result,
  projections: ProjectionResult,
  corporateTaxRate: number
): PaybackResult {
  const monthlyCashFlows: MonthlyCashFlow[] = [];
  let cumulativeCashFlowAr = -fundsInvestedAr;
  let exactRecoveryMonth: number | null = null;

  const y2MonthlyCashFlow = projections.realistic[1].netResultAfterTaxAr / 12;
  const y3MonthlyCashFlow = projections.realistic[2].netResultAfterTaxAr / 12;

  for (let m = 1; m <= 36; m++) {
    let period: MonthlyCashFlow['period'];
    let resultBeforeTaxAr: number;

    if (m <= 12) {
      if (m <= hs.months) {
        period = 'HS';
        resultBeforeTaxAr = hs.monthlyNetResultBeforeTaxAr;
      } else {
        period = 'BS';
        resultBeforeTaxAr = bs.monthlyNetResultBeforeTaxAr;
      }
    } else if (m <= 24) {
      period = 'A2';
      resultBeforeTaxAr = projections.realistic[1].netResultBeforeTaxAr / 12;
    } else {
      period = 'A3';
      resultBeforeTaxAr = projections.realistic[2].netResultBeforeTaxAr / 12;
    }

    // Monthly cash flow after tax: Excel formula IF(D13>0, D13*(1-taxRate), D13)
    let netCashFlowAfterTaxAr: number;
    if (m <= 12) {
      netCashFlowAfterTaxAr =
        resultBeforeTaxAr > 0
          ? resultBeforeTaxAr * (1 - corporateTaxRate)
          : resultBeforeTaxAr;
    } else if (m <= 24) {
      netCashFlowAfterTaxAr = y2MonthlyCashFlow;
    } else {
      netCashFlowAfterTaxAr = y3MonthlyCashFlow;
    }

    const prevCumul = cumulativeCashFlowAr;
    cumulativeCashFlowAr += netCashFlowAfterTaxAr;

    let recoveryMonth: number | null = null;
    if (m === 1 && cumulativeCashFlowAr >= 0) {
      recoveryMonth = netCashFlowAfterTaxAr > 0 ? fundsInvestedAr / netCashFlowAfterTaxAr : 1;
      exactRecoveryMonth = recoveryMonth;
    } else if (prevCumul < 0 && cumulativeCashFlowAr >= 0) {
      // Linear interpolation: (m - 1) + (-prevCumul) / netCashFlowAfterTaxAr
      recoveryMonth =
        netCashFlowAfterTaxAr > 0
          ? (m - 1) + (-prevCumul) / netCashFlowAfterTaxAr
          : m;
      if (exactRecoveryMonth === null) {
        exactRecoveryMonth = recoveryMonth;
      }
    }

    monthlyCashFlows.push({
      month: m,
      period,
      resultBeforeTaxAr,
      netCashFlowAfterTaxAr,
      cumulativeCashFlowAr,
      recoveryMonth,
    });
  }

  const annualNetCashFlowYear1Ar = year1.netResultAfterTaxAr;
  const simplePaybackMonths =
    annualNetCashFlowYear1Ar > 0 ? (fundsInvestedAr / annualNetCashFlowYear1Ar) * 12 : -1;

  const paybackMonths = exactRecoveryMonth !== null ? exactRecoveryMonth : -1;
  const paybackYears = paybackMonths > 0 ? paybackMonths / 12 : -1;

  return {
    fundsInvestedAr,
    annualNetCashFlowYear1Ar,
    paybackMonths,
    paybackYears,
    simplePaybackMonths,
    monthlyCashFlows,
    isRecoveredWithin36Months: exactRecoveryMonth !== null,
  };
}

/**
 * Computes NPV (Valeur Actuelle Nette) and discount rate sensitivity.
 */
export function computeNPV(
  fundsInvestedAr: number,
  projections: ProjectionResult,
  discountRate: number
): NPVResult {
  const cf0 = -fundsInvestedAr;
  const cf1 = projections.realistic[0].netResultAfterTaxAr;
  const cf2 = projections.realistic[1].netResultAfterTaxAr;
  const cf3 = projections.realistic[2].netResultAfterTaxAr;

  const r = discountRate;
  const pv1 = cf1 / Math.pow(1 + r, 1);
  const pv2 = cf2 / Math.pow(1 + r, 2);
  const pv3 = cf3 / Math.pow(1 + r, 3);
  const totalPv = pv1 + pv2 + pv3;
  const lossFromWaiting = cf1 + cf2 + cf3 - totalPv;
  const npv = totalPv + cf0;

  // Sensitivity table for key discount rates
  const ratesToTest = [0.08, 0.10, 0.12, 0.20, 0.30, 0.50, 0.75, 1.0];
  const sensitivityTable: DiscountSensitivityItem[] = ratesToTest.map((testRate) => {
    const pvY1 = cf1 / Math.pow(1 + testRate, 1);
    const pvY2 = cf2 / Math.pow(1 + testRate, 2);
    const pvY3 = cf3 / Math.pow(1 + testRate, 3);
    const sumPv = pvY1 + pvY2 + pvY3;
    const testNpv = sumPv + cf0;
    return {
      rate: testRate,
      pvYear1Ar: pvY1,
      pvYear2Ar: pvY2,
      pvYear3Ar: pvY3,
      totalPvAr: sumPv,
      npvAr: testNpv,
      decision: testNpv > 0 ? 'Investir ✓' : 'Refuser ✗',
    };
  });

  return {
    discountRate,
    initialInvestmentAr: cf0,
    cfYear1Ar: cf1,
    cfYear2Ar: cf2,
    cfYear3Ar: cf3,
    pvYear1Ar: pv1,
    pvYear2Ar: pv2,
    pvYear3Ar: pv3,
    totalPvAr: totalPv,
    lossFromWaitingAr: lossFromWaiting,
    npvAr: npv,
    decision: npv > 0 ? 'Investir ✓' : 'Refuser ✗',
    sensitivityTable,
  };
}

/**
 * Computes IRR (Taux de Rentabilité Interne) using a robust numerical solver,
 * and includes linear interpolation as in the Excel TRI tab.
 */
export function computeIRR(
  fundsInvestedAr: number,
  projections: ProjectionResult,
  benchmarkDiscountRate: number
): IRRResult {
  const cf0 = -fundsInvestedAr;
  const cf1 = projections.realistic[0].netResultAfterTaxAr;
  const cf2 = projections.realistic[1].netResultAfterTaxAr;
  const cf3 = projections.realistic[2].netResultAfterTaxAr;

  // Function to evaluate NPV at rate r
  const npvFunc = (r: number) => {
    return cf0 + cf1 / (1 + r) + cf2 / Math.pow(1 + r, 2) + cf3 / Math.pow(1 + r, 3);
  };

  // If no positive future flows or all zeros
  if (cf1 <= 0 && cf2 <= 0 && cf3 <= 0) {
    return {
      irrValue: 0,
      npvAtIrrAr: npvFunc(0),
      isAcceptable: false,
      benchmarkDiscountRate,
      linearInterpolation: {
        i1: 4,
        i2: 6,
        npv1Ar: 0,
        npv2Ar: 0,
        approxIrr: 0,
        error: 0,
        bracketValid: false,
      },
    };
  }

  // Bounded bisection search for IRR between -0.90 and 50.0 (5000%)
  let low = -0.90;
  let high = 50.0;
  let npvLow = npvFunc(low);
  let npvHigh = npvFunc(high);

  let irrValue = 0;
  if (npvLow * npvHigh <= 0) {
    for (let iter = 0; iter < 100; iter++) {
      const mid = (low + high) / 2;
      const npvMid = npvFunc(mid);
      if (Math.abs(npvMid) < 1e-4 || (high - low) < 1e-7) {
        irrValue = mid;
        break;
      }
      if (npvLow * npvMid < 0) {
        high = mid;
        npvHigh = npvMid;
      } else {
        low = mid;
        npvLow = mid;
      }
      irrValue = mid;
    }
  } else {
    // Fallback: Newton-Raphson starting at 0.5
    let guess = 0.5;
    for (let i = 0; i < 50; i++) {
      const val = npvFunc(guess);
      const deriv =
        -cf1 / Math.pow(1 + guess, 2) -
        (2 * cf2) / Math.pow(1 + guess, 3) -
        (3 * cf3) / Math.pow(1 + guess, 4);
      if (Math.abs(deriv) < 1e-9) break;
      const nextGuess = guess - val / deriv;
      if (Math.abs(nextGuess - guess) < 1e-7) {
        guess = nextGuess;
        break;
      }
      guess = Math.max(-0.9, nextGuess);
    }
    irrValue = guess;
  }

  const npvAtIrrAr = npvFunc(irrValue);

  // Linear interpolation method between i1 = 4.0 and i2 = 6.0 (from Excel TRI tab)
  const i1 = 4.0;
  const i2 = 6.0;
  const npv1 = npvFunc(i1);
  const npv2 = npvFunc(i2);
  const denom = npv1 - npv2;
  const approxIrr = denom !== 0 ? i1 + (npv1 / denom) * (i2 - i1) : 0;
  const error = approxIrr - irrValue;
  const bracketValid = (npv1 > 0 && npv2 < 0) || (npv1 < 0 && npv2 > 0);

  return {
    irrValue,
    npvAtIrrAr,
    isAcceptable: irrValue > benchmarkDiscountRate,
    benchmarkDiscountRate,
    linearInterpolation: {
      i1,
      i2,
      npv1Ar: npv1,
      npv2Ar: npv2,
      approxIrr,
      error,
      bracketValid,
    },
  };
}

/**
 * Computes a specific scenario given delta adjustments relative to the realistic baseline.
 */
export function computeScenario(
  baseAssumptions: FinancialAssumptions,
  definition: ScenarioDefinition
): ScenarioResult {
  // Yield adjustment (points of %)
  const yieldHS = Math.max(
    0,
    Math.min(1, baseAssumptions.hauteSaison.yieldPaddyToRice + definition.deltaYieldPoints)
  );
  const yieldBS = Math.max(
    0,
    Math.min(1, baseAssumptions.basseSaison.yieldPaddyToRice + definition.deltaYieldPoints)
  );

  // Selling price adjustment (%)
  const ricePriceHS = baseAssumptions.hauteSaison.riceSellingPriceArPerKg * (1 + definition.deltaSellingPricePercent);
  const ricePriceBS = baseAssumptions.basseSaison.riceSellingPriceArPerKg * (1 + definition.deltaSellingPricePercent);

  // Paddy cost adjustment (%)
  const paddyBaseCost = baseAssumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy') || {
    costHS: 800,
    costBS: 1400,
  };
  const paddyPriceHS = paddyBaseCost.costHS * (1 + definition.deltaPaddyPricePercent);
  const paddyPriceBS = paddyBaseCost.costBS * (1 + definition.deltaPaddyPricePercent);

  // Rotations adjustment (added)
  const rotationsHS = Math.max(0, baseAssumptions.hauteSaison.rotationsPerMonth + definition.deltaRotationsPerMonth);
  const rotationsBS = Math.max(0, baseAssumptions.basseSaison.rotationsPerMonth + definition.deltaRotationsPerMonth);

  // High season calculation
  const paddyKgHS = baseAssumptions.hauteSaison.paddyBoughtKgPerRotation;
  const caRotationHS = paddyKgHS * (yieldHS * ricePriceHS + (1 - yieldHS) * baseAssumptions.hauteSaison.byproductSellingPriceArPerKg);

  // Other costs per kg (decorticage, docker, etc.)
  const otherCostPerKgHS = baseAssumptions.costsPerKgPaddy
    .filter((c) => c.id !== 'cost-paddy')
    .reduce((acc, c) => acc + c.costHS, 0);

  // Bags
  const bagOption =
    baseAssumptions.bagOptions.find((b) => b.capacityKg === baseAssumptions.selectedBagCapacityKg) ||
    baseAssumptions.bagOptions[0] || { capacityKg: 60, unitPriceAr: 1700 };
  const bagsHS = Math.ceil(paddyKgHS / (bagOption.capacityKg || 60));
  const bagCostHS = bagsHS * bagOption.unitPriceAr;

  const otherRotationCostsHS =
    baseAssumptions.costsPerRotation.reduce((acc, c) => acc + c.costHS, 0) + bagCostHS;

  const costRotationHS = paddyKgHS * (paddyPriceHS + otherCostPerKgHS) + otherRotationCostsHS;
  const profitRotationHS = caRotationHS - costRotationHS;

  const monthlyFixedCharges = baseAssumptions.fixedMonthlyCharges.reduce((acc, f) => acc + f.amount, 0);
  const monthlyNetHS = profitRotationHS * rotationsHS - monthlyFixedCharges;
  const seasonNetHS = monthlyNetHS * baseAssumptions.hauteSaison.months;
  const caHS = caRotationHS * rotationsHS * baseAssumptions.hauteSaison.months;
  const costsHS = (costRotationHS * rotationsHS + monthlyFixedCharges) * baseAssumptions.hauteSaison.months;

  // Low season calculation
  const paddyKgBS = baseAssumptions.basseSaison.paddyBoughtKgPerRotation;
  const caRotationBS = paddyKgBS * (yieldBS * ricePriceBS + (1 - yieldBS) * baseAssumptions.basseSaison.byproductSellingPriceArPerKg);

  const otherCostPerKgBS = baseAssumptions.costsPerKgPaddy
    .filter((c) => c.id !== 'cost-paddy')
    .reduce((acc, c) => acc + c.costBS, 0);

  const bagsBS = Math.ceil(paddyKgBS / (bagOption.capacityKg || 60));
  const bagCostBS = bagsBS * bagOption.unitPriceAr;

  const otherRotationCostsBS =
    baseAssumptions.costsPerRotation.reduce((acc, c) => acc + c.costBS, 0) + bagCostBS;

  const costRotationBS = paddyKgBS * (paddyPriceBS + otherCostPerKgBS) + otherRotationCostsBS;
  const profitRotationBS = caRotationBS - costRotationBS;

  const monthlyNetBS = profitRotationBS * rotationsBS - monthlyFixedCharges;
  const seasonNetBS = monthlyNetBS * baseAssumptions.basseSaison.months;
  const caBS = caRotationBS * rotationsBS * baseAssumptions.basseSaison.months;
  const costsBS = (costRotationBS * rotationsBS + monthlyFixedCharges) * baseAssumptions.basseSaison.months;

  // Annual
  const annualTurnoverAr = caHS + caBS;
  const annualTotalCostsAr = costsHS + costsBS;
  const annualNetBeforeTaxAr = seasonNetHS + seasonNetBS;
  const annualTaxAr = Math.max(0, annualNetBeforeTaxAr) * baseAssumptions.corporateTaxRate;
  const annualNetAfterTaxAr = annualNetBeforeTaxAr - annualTaxAr;
  const annualNetMarginRate = annualTurnoverAr > 0 ? annualNetBeforeTaxAr / annualTurnoverAr : 0;

  // Realistic annual benchmark for variance
  // When definition is realistic, variance is 0
  const varianceFromRealisticAr = 0; // filled after realistic is calculated if needed

  let verdict: ScenarioResult['verdict'] = 'Rentable sur les 2 saisons';
  if (annualNetBeforeTaxAr < 0) {
    verdict = 'Perte annuelle';
  } else if (monthlyNetHS < 0 || monthlyNetBS < 0) {
    verdict = 'Une saison déficitaire';
  }

  return {
    definition,
    yieldHS,
    yieldBS,
    ricePriceHS,
    ricePriceBS,
    paddyPriceHS,
    paddyPriceBS,
    rotationsHS,
    rotationsBS,
    caRotationHS,
    caRotationBS,
    costRotationHS,
    costRotationBS,
    profitRotationHS,
    profitRotationBS,
    monthlyNetHS,
    monthlyNetBS,
    seasonNetHS,
    seasonNetBS,
    annualTurnoverAr,
    annualTotalCostsAr,
    annualNetBeforeTaxAr,
    annualTaxAr,
    annualNetAfterTaxAr,
    annualNetMarginRate,
    varianceFromRealisticAr,
    verdict,
  };
}

/**
 * Computes the 3 standard scenarios (Pessimiste, Réaliste, Optimiste) + any user custom scenarios.
 */
export function computeAllScenarios(
  baseAssumptions: FinancialAssumptions,
  customDefs: ScenarioDefinition[] = []
): FullFinancialModel['scenarios'] {
  const pessimisteDef: ScenarioDefinition = {
    id: 'pessimiste',
    name: 'Pessimiste',
    deltaYieldPoints: -0.05,
    deltaSellingPricePercent: -0.05,
    deltaPaddyPricePercent: 0.05,
    deltaRotationsPerMonth: -0.5,
    note: 'Conditions de marché tendues, baisse rendement & rotations',
  };

  const realisteDef: ScenarioDefinition = {
    id: 'realiste',
    name: 'Réaliste',
    deltaYieldPoints: 0,
    deltaSellingPricePercent: 0,
    deltaPaddyPricePercent: 0,
    deltaRotationsPerMonth: 0,
    note: 'Hypothèses de base du modèle (Dashboard)',
  };

  const optimisteDef: ScenarioDefinition = {
    id: 'optimiste',
    name: 'Optimiste',
    deltaYieldPoints: 0.025,
    deltaSellingPricePercent: 0.05,
    deltaPaddyPricePercent: -0.05,
    deltaRotationsPerMonth: 0.5,
    note: 'Rendement supérieur, meilleur pouvoir de négociation',
  };

  const realiste = computeScenario(baseAssumptions, realisteDef);
  const pessimiste = computeScenario(baseAssumptions, pessimisteDef);
  const optimiste = computeScenario(baseAssumptions, optimisteDef);

  pessimiste.varianceFromRealisticAr = pessimiste.annualNetBeforeTaxAr - realiste.annualNetBeforeTaxAr;
  realiste.varianceFromRealisticAr = 0;
  optimiste.varianceFromRealisticAr = optimiste.annualNetBeforeTaxAr - realiste.annualNetBeforeTaxAr;

  const customScenarios = customDefs.map((def) => {
    const sc = computeScenario(baseAssumptions, def);
    sc.varianceFromRealisticAr = sc.annualNetBeforeTaxAr - realiste.annualNetBeforeTaxAr;
    return sc;
  });

  return {
    pessimiste,
    realiste,
    optimiste,
    customScenarios,
  };
}

/**
 * Computes the 2D Sensitivity Matrix.
 * Mode 1: Rendement paddy (Y) vs Rotations par mois (X) (Tableau 1 Excel)
 * Mode 2: Variation prix vente (Y) vs Variation prix paddy (X) (Tableau 2 Excel)
 */
export function computeSensitivityMatrix(
  baseAssumptions: FinancialAssumptions,
  type: 'rendement_vs_rotations' | 'prix_vente_vs_prix_paddy' | 'custom',
  customConfig?: {
    varXId: string;
    varYId: string;
    xValues: number[];
    yValues: number[];
  }
): SensitivityMatrix {
  const hs = computeSeason(baseAssumptions, 'hauteSaison');
  const bs = computeSeason(baseAssumptions, 'basseSaison');

  const paddyKgHS = baseAssumptions.hauteSaison.paddyBoughtKgPerRotation;
  const paddyKgBS = baseAssumptions.basseSaison.paddyBoughtKgPerRotation;
  const ricePriceHS = baseAssumptions.hauteSaison.riceSellingPriceArPerKg;
  const ricePriceBS = baseAssumptions.basseSaison.riceSellingPriceArPerKg;
  const byproductsPriceHS = baseAssumptions.hauteSaison.byproductSellingPriceArPerKg;
  const byproductsPriceBS = baseAssumptions.basseSaison.byproductSellingPriceArPerKg;

  const costPerRotationHS = hs.totalCostPerRotationAr;
  const costPerRotationBS = bs.totalCostPerRotationAr;

  const fixedMonthlyHS = hs.seasonFixedChargesAr / hs.months;
  const fixedMonthlyBS = bs.seasonFixedChargesAr / bs.months;

  const monthsHS = baseAssumptions.hauteSaison.months;
  const monthsBS = baseAssumptions.basseSaison.months;

  if (type === 'rendement_vs_rotations') {
    const yValues = [0.60, 0.625, 0.65, 0.675, 0.70, 0.725, 0.75]; // Rendement
    const xValues = [1.0, 1.5, 2.0, 2.5]; // Rotations / mois

    const matrix: number[][] = [];

    for (let rIdx = 0; rIdx < yValues.length; rIdx++) {
      const yieldTest = yValues[rIdx];
      const row: number[] = [];

      for (let cIdx = 0; cIdx < xValues.length; cIdx++) {
        const rotTest = xValues[cIdx];

        // Excel formula for Table 1:
        // monthsHS * (rotTest * (paddyHS * (yieldTest * ricePriceHS + (1 - yieldTest)*byproductPriceHS) - costRotationHS) - fixedMonthlyHS)
        // + monthsBS * (rotTest * (paddyBS * (yieldTest * ricePriceBS + (1 - yieldTest)*byproductPriceBS) - costRotationBS) - fixedMonthlyBS)
        const caRotHS = paddyKgHS * (yieldTest * ricePriceHS + (1 - yieldTest) * byproductsPriceHS);
        const profitRotHS = caRotHS - costPerRotationHS;
        const netMonthlyHS = profitRotHS * rotTest - fixedMonthlyHS;
        const seasonHS = netMonthlyHS * monthsHS;

        const caRotBS = paddyKgBS * (yieldTest * ricePriceBS + (1 - yieldTest) * byproductsPriceBS);
        const profitRotBS = caRotBS - costPerRotationBS;
        const netMonthlyBS = profitRotBS * rotTest - fixedMonthlyBS;
        const seasonBS = netMonthlyBS * monthsBS;

        const annualNetBeforeTax = seasonHS + seasonBS;
        row.push(annualNetBeforeTax);
      }
      matrix.push(row);
    }

    return {
      variableX: {
        id: 'rotations',
        label: 'Rotations par mois',
        unit: 'rot/mois',
        values: xValues,
      },
      variableY: {
        id: 'rendement',
        label: 'Rendement paddy → riz',
        unit: '%',
        values: yValues,
      },
      matrix,
      currentXValue: baseAssumptions.hauteSaison.rotationsPerMonth,
      currentYValue: baseAssumptions.hauteSaison.yieldPaddyToRice,
    };
  }

  // Type: prix_vente_vs_prix_paddy (Tableau 2 Excel)
  const yValues = [-0.10, -0.05, 0.0, 0.05, 0.10]; // Variation prix vente
  const xValues = [-0.10, -0.05, 0.0, 0.05, 0.10]; // Variation prix paddy

  const basePaddyPriceHS = baseAssumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy')?.costHS || 800;
  const basePaddyPriceBS = baseAssumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy')?.costBS || 1400;

  const baseRotHS = baseAssumptions.hauteSaison.rotationsPerMonth;
  const baseRotBS = baseAssumptions.basseSaison.rotationsPerMonth;

  const baseCaRotHS = hs.turnoverPerRotationAr;
  const baseCaRotBS = bs.turnoverPerRotationAr;

  const matrix: number[][] = [];

  for (let rIdx = 0; rIdx < yValues.length; rIdx++) {
    const varSelling = yValues[rIdx];
    const row: number[] = [];

    for (let cIdx = 0; cIdx < xValues.length; cIdx++) {
      const varPaddy = xValues[cIdx];

      // Excel Table 2 exact logic:
      // CA rotation after variation = baseCaRot * (1 + varSelling)
      // Paddy extra cost = paddyKg * basePaddyPrice * varPaddy
      // Cost rotation after variation = costPerRotation + extraCost
      const caRotHS = baseCaRotHS * (1 + varSelling);
      const extraPaddyHS = paddyKgHS * basePaddyPriceHS * varPaddy;
      const totalCostRotHS = costPerRotationHS + extraPaddyHS;
      const profitRotHS = caRotHS - totalCostRotHS;
      const netMonthlyHS = profitRotHS * baseRotHS - fixedMonthlyHS;
      const seasonHS = netMonthlyHS * monthsHS;

      const caRotBS = baseCaRotBS * (1 + varSelling);
      const extraPaddyBS = paddyKgBS * basePaddyPriceBS * varPaddy;
      const totalCostRotBS = costPerRotationBS + extraPaddyBS;
      const profitRotBS = caRotBS - totalCostRotBS;
      const netMonthlyBS = profitRotBS * baseRotBS - fixedMonthlyBS;
      const seasonBS = netMonthlyBS * monthsBS;

      const annualNetBeforeTax = seasonHS + seasonBS;
      row.push(annualNetBeforeTax);
    }
    matrix.push(row);
  }

  return {
    variableX: {
      id: 'var_prix_paddy',
      label: "Variation prix d'achat du paddy",
      unit: '%',
      values: xValues,
    },
    variableY: {
      id: 'var_prix_vente',
      label: 'Variation prix de vente du riz',
      unit: '%',
      values: yValues,
    },
    matrix,
    currentXValue: 0,
    currentYValue: 0,
  };
}

/**
 * Top-level master function: calculates entire financial model.
 */
export function calculateFullModel(
  assumptions: FinancialAssumptions,
  customScenarioDefs: ScenarioDefinition[] = []
): FullFinancialModel {
  const hauteSaison = computeSeason(assumptions, 'hauteSaison');
  const basseSaison = computeSeason(assumptions, 'basseSaison');

  const year1 = computeYear1(
    hauteSaison,
    basseSaison,
    assumptions.corporateTaxRate,
    assumptions.investorShare
  );

  const investment = computeInvestment(hauteSaison, assumptions, year1);

  const breakEven = computeBreakEven(
    year1,
    assumptions.avgVolumePerClientKgMonthly,
    hauteSaison,
    basseSaison
  );

  const projections = computeProjections(
    year1,
    assumptions.corporateTaxRate,
    assumptions.growthRateYear2,
    assumptions.growthRateYear3,
    assumptions.ambitiousGrowthRateYear2,
    assumptions.ambitiousGrowthRateYear3
  );

  const payback = computePayback(
    investment.fundsToRaiseAr,
    hauteSaison,
    basseSaison,
    year1,
    projections,
    assumptions.corporateTaxRate
  );

  const npv = computeNPV(
    investment.fundsToRaiseAr,
    projections,
    assumptions.discountRate
  );

  const irr = computeIRR(
    investment.fundsToRaiseAr,
    projections,
    assumptions.discountRate
  );

  const scenarios = computeAllScenarios(assumptions, customScenarioDefs);

  return {
    assumptions,
    hauteSaison,
    basseSaison,
    year1,
    investment,
    breakEven,
    payback,
    projections,
    npv,
    irr,
    scenarios,
  };
}
