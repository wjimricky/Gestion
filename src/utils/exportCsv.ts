import { FullFinancialModel, MonthlyCashFlow, ProjectionYear } from '../types/finance';
import { calculateFullModel } from '../engine/calculator';
import { applyScenarioDefinitionToAssumptions } from './scenarioHelpers';
import { buildAnnualComparison5Y } from './annualComparison';

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getFlowTypeLabel(period: MonthlyCashFlow['period']): string {
  switch (period) {
    case 'HS':
      return 'Flux opérationnel Haute Saison (HS)';
    case 'BS':
      return 'Flux opérationnel Basse Saison (BS)';
    case 'A2':
      return 'Flux mensuel projeté Année 2 (A2)';
    case 'A3':
      return 'Flux mensuel projeté Année 3 (A3)';
  }
}

function getYearLabelForMonth(month: number): string {
  if (month <= 0) return 'Initial (t=0)';
  if (month <= 12) return 'Année 1 (A1)';
  if (month <= 24) return 'Année 2 (A2)';
  return 'Année 3 (A3)';
}

function buildAnnualScenarioRows(
  scenarioLabel: 'Réaliste' | 'Ambitieux',
  years: ProjectionYear[],
  initialInvestmentAr: number,
  discountRate: number,
  investorShareRate: number
): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const i0 = Math.round(initialInvestmentAr);
  let cumulative = -i0;

  // Row t=0 (Investissement initial)
  rows.push([
    scenarioLabel,
    0,
    't=0 (Investissement initial I0)',
    '',
    '',
    -i0,
    -i0,
    cumulative,
    '',
    '',
    'Décaissement initial (BFR HS + Matériel + Enregistrement + Cash buffer)',
  ]);

  years.forEach((p) => {
    const cfAfterTax = Math.round(p.netResultAfterTaxAr);
    const cfBeforeTax = Math.round(p.netResultBeforeTaxAr);
    const discountFactor = Math.pow(1 + discountRate, p.year);
    const discountedCf = discountFactor > 0 ? Math.round(cfAfterTax / discountFactor) : cfAfterTax;
    cumulative += cfAfterTax;

    const invShare = cfAfterTax > 0 ? Math.round(cfAfterTax * investorShareRate) : 0;
    const compShare = cfAfterTax > 0 ? Math.round(cfAfterTax * (1 - investorShareRate)) : 0;
    const growthPct = p.growthRate !== null ? (p.growthRate * 100).toFixed(2) : '';

    rows.push([
      scenarioLabel,
      p.year,
      `Année ${p.year} (${p.label})`,
      growthPct,
      cfBeforeTax,
      cfAfterTax,
      discountedCf,
      cumulative,
      invShare,
      compShare,
      p.method,
    ]);
  });

  return rows;
}

function buildMonthlyCashFlowRows(model: FullFinancialModel): (string | number)[][] {
  const i0 = Math.round(model.investment.fundsToRaiseAr);
  const rows: (string | number)[][] = [
    [
      0,
      'M0',
      getYearLabelForMonth(0),
      'Investissement initial (-I0)',
      't=0',
      0,
      -i0,
      -i0,
      'Décaissement initial',
    ],
  ];

  model.payback.monthlyCashFlows.forEach((cf) => {
    rows.push([
      cf.month,
      `M${cf.month}`,
      getYearLabelForMonth(cf.month),
      getFlowTypeLabel(cf.period),
      cf.period,
      Math.round(cf.resultBeforeTaxAr),
      Math.round(cf.netCashFlowAfterTaxAr),
      Math.round(cf.cumulativeCashFlowAr),
      cf.recoveryMonth !== null
        ? `Capital récupéré (${cf.recoveryMonth.toFixed(2)} mois)`
        : cf.cumulativeCashFlowAr >= 0
        ? 'Amorti'
        : 'En cours d’amortissement',
    ]);
  });

  return rows;
}

/**
 * Exporte les données de projection pluriannuelles (CF A1–A3) et le détail mensuel
 * sur 36 mois (colonnes Mois et Type de flux incluses) au format CSV UTF-8 avec BOM
 * pour une analyse directe dans Microsoft Excel et Google Sheets.
 */
export function exportProjectionsToCsv(
  model: FullFinancialModel,
  scenarioName: string = 'Réaliste'
): void {
  const i0 = model.investment.fundsToRaiseAr;
  const r = model.npv.discountRate;
  const investorRate = model.assumptions.investorShare;

  const annualHeaders = [
    'Scénario de projection',
    'Année (t)',
    'Exercice',
    'Taux de croissance (%)',
    'Résultat net avant IR (Ar)',
    'Cash-Flow net après IR (Ar)',
    `Flux actualisé à ${(r * 100).toFixed(1)}% (Ar)`,
    'Cumul des flux nets depuis -I0 (Ar)',
    `Part Investisseur ${(investorRate * 100).toFixed(0)}% (Ar)`,
    `Part Société ${((1 - investorRate) * 100).toFixed(0)}% (Ar)`,
    'Méthodologie',
  ];

  const realisticRows = buildAnnualScenarioRows(
    'Réaliste',
    model.projections.realistic,
    i0,
    r,
    investorRate
  );
  const ambitiousRows = buildAnnualScenarioRows(
    'Ambitieux',
    model.projections.ambitious,
    i0,
    r,
    investorRate
  );

  const monthlySectionTitle = [
    [],
    ['DÉTAIL MENSUEL DES FLUX DE TRÉSORERIE (MOIS 0 À 36 · CF A1–A3)'],
  ];

  const monthlyHeaders = [
    'Mois (N°)',
    'Libellé mois',
    'Année',
    'Type de flux',
    'Période',
    'Résultat avant IR (Ar)',
    'Cash-Flow net après IR (Ar)',
    'Cumul des flux nets (Ar)',
    'Statut récupération I0',
  ];

  const monthlyRows = buildMonthlyCashFlowRows(model);

  const metaRows: (string | number)[][] = [
    [],
    ['Synthèse des indicateurs (Scénario actif)', scenarioName],
    ['Investissement initial I0 (Ar)', Math.round(i0)],
    ['Taux d’actualisation r (%)', (r * 100).toFixed(2)],
    ['Taux d’imposition IR (%)', (model.assumptions.corporateTaxRate * 100).toFixed(2)],
    ['VAN calculée à 3 ans (Ar)', Math.round(model.npv.npvAr)],
    ['TRI (%)', Number.isFinite(model.irr.irrValue) ? (model.irr.irrValue * 100).toFixed(2) : 'N/A'],
    ['Payback saisonnier (mois)', model.payback.paybackMonths > 0 ? model.payback.paybackMonths.toFixed(2) : '> 36 mois'],
  ];

  const allRows = [
    annualHeaders,
    ...realisticRows,
    ...ambitiousRows,
    ...monthlySectionTitle,
    monthlyHeaders,
    ...monthlyRows,
    ...metaRows,
  ];
  const csvContent =
    '\uFEFF' + allRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeScenario = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `projections_CF_A1_A3_${safeScenario || 'modele'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface FiveYearAnnualRow {
  scenario: 'Réaliste' | 'Ambitieux';
  year: number;
  label: string;
  growthRate: number | null;
  estimatedTurnoverAr: number;
  estimatedVariableCostsAr: number;
  estimatedFixedChargesAr: number;
  netBeforeTaxAr: number;
  corporateTaxAr: number;
  netAfterTaxAr: number;
  discountedCfAr: number;
  cumulativeCfAr: number;
  investorShareAr: number;
  companyShareAr: number;
  methodology: string;
}

export interface FiveYearMonthlyRow {
  month: number;
  monthLabel: string;
  yearNumber: number;
  yearLabel: string;
  periodCode: 't=0' | 'HS' | 'BS' | 'A2' | 'A3' | 'A4' | 'A5';
  flowType: string;
  estimatedTurnoverAr: number;
  estimatedVariableCostsAr: number;
  estimatedFixedChargesAr: number;
  resultBeforeTaxAr: number;
  corporateTaxAr: number;
  netCashFlowAfterTaxAr: number;
  cumulativeCashFlowAr: number;
}

export function buildFiveYearProjectionData(model: FullFinancialModel): {
  annualRows: FiveYearAnnualRow[];
  monthlyRows: FiveYearMonthlyRow[];
  npv5YearsRealisticAr: number;
  npv5YearsAmbitiousAr: number;
} {
  const i0 = Math.round(model.investment.fundsToRaiseAr);
  const r = model.npv.discountRate;
  const taxRate = model.assumptions.corporateTaxRate;
  const taxDivisor = Math.max(0.001, 1 - taxRate);
  const invRate = model.assumptions.investorShare;

  const y1Turnover = model.year1.totalTurnoverAr;
  const y1VarCosts = model.year1.totalPurchaseAndOperatingCostsAr;
  const y1Fixed = model.year1.annualFixedChargesAr;
  const y1NetAfter = model.year1.netResultAfterTaxAr;

  const buildScenarioYears = (
    scenario: 'Réaliste' | 'Ambitieux',
    baseProjs: ProjectionYear[],
    gY3: number
  ): { rows: FiveYearAnnualRow[]; npv5Y: number } => {
    const rows: FiveYearAnnualRow[] = [];
    let cumul = -i0;
    let pvSum = 0;

    // A1..A3 from existing model, A4..A5 extended with Year 3 growth rate
    const years: Array<{
      year: number;
      label: string;
      growthRate: number | null;
      netAfterTaxAr: number;
      netBeforeTaxAr: number;
      method: string;
    }> = baseProjs.map((p) => ({
      year: p.year,
      label: p.label,
      growthRate: p.growthRate,
      netAfterTaxAr: p.netResultAfterTaxAr,
      netBeforeTaxAr: p.netResultBeforeTaxAr,
      method: p.method,
    }));

    const cf3 = years[2]?.netAfterTaxAr ?? y1NetAfter;
    const cf4 = cf3 * (1 + gY3);
    const cf5 = cf4 * (1 + gY3);

    years.push(
      {
        year: 4,
        label: 'A4',
        growthRate: gY3,
        netAfterTaxAr: cf4,
        netBeforeTaxAr: cf4 / taxDivisor,
        method: `A3 × (1 + ${(gY3 * 100).toFixed(0)} %)`,
      },
      {
        year: 5,
        label: 'A5',
        growthRate: gY3,
        netAfterTaxAr: cf5,
        netBeforeTaxAr: cf5 / taxDivisor,
        method: `A4 × (1 + ${(gY3 * 100).toFixed(0)} %)`,
      }
    );

    years.forEach((yr) => {
      const cfAfter = yr.netAfterTaxAr;
      const cfBefore = yr.netBeforeTaxAr;
      const tax = Math.max(0, cfBefore - cfAfter);
      const scaleFactor =
        Math.abs(y1NetAfter) > 1e-6 ? cfAfter / y1NetAfter : yr.year === 1 ? 1 : 0;

      const estTurnover = yr.year === 1 ? y1Turnover : y1Turnover * Math.max(0, scaleFactor);
      const estVarCosts = yr.year === 1 ? y1VarCosts : y1VarCosts * Math.max(0, scaleFactor);
      const estFixed = yr.year === 1 ? y1Fixed : estTurnover - estVarCosts - cfBefore;

      const disc = Math.pow(1 + r, yr.year);
      const discounted = disc > 0 ? cfAfter / disc : cfAfter;
      pvSum += discounted;
      cumul += cfAfter;

      rows.push({
        scenario,
        year: yr.year,
        label: yr.label,
        growthRate: yr.growthRate,
        estimatedTurnoverAr: Math.round(estTurnover),
        estimatedVariableCostsAr: Math.round(estVarCosts),
        estimatedFixedChargesAr: Math.round(Math.max(0, estFixed)),
        netBeforeTaxAr: Math.round(cfBefore),
        corporateTaxAr: Math.round(tax),
        netAfterTaxAr: Math.round(cfAfter),
        discountedCfAr: Math.round(discounted),
        cumulativeCfAr: Math.round(cumul),
        investorShareAr: cfAfter > 0 ? Math.round(cfAfter * invRate) : 0,
        companyShareAr: cfAfter > 0 ? Math.round(cfAfter * (1 - invRate)) : 0,
        methodology: yr.method,
      });
    });

    return { rows, npv5Y: pvSum - i0 };
  };

  const realistic = buildScenarioYears(
    'Réaliste',
    model.projections.realistic,
    model.assumptions.growthRateYear3
  );
  const ambitious = buildScenarioYears(
    'Ambitieux',
    model.projections.ambitious,
    model.assumptions.ambitiousGrowthRateYear3
  );

  // Build 60 monthly raw rows (M0 to M60) based on the Realistic 5-year trajectory
  const monthlyRows: FiveYearMonthlyRow[] = [
    {
      month: 0,
      monthLabel: 'M0',
      yearNumber: 0,
      yearLabel: 't=0 (Initial)',
      periodCode: 't=0',
      flowType: 'Investissement initial (-I0)',
      estimatedTurnoverAr: 0,
      estimatedVariableCostsAr: 0,
      estimatedFixedChargesAr: 0,
      resultBeforeTaxAr: 0,
      corporateTaxAr: 0,
      netCashFlowAfterTaxAr: -i0,
      cumulativeCashFlowAr: -i0,
    },
  ];

  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const hsMonthlyCA = hs.months > 0 ? hs.totalTurnoverAr / hs.months : 0;
  const bsMonthlyCA = bs.months > 0 ? bs.totalTurnoverAr / bs.months : 0;
  const hsMonthlyVar = hs.months > 0 ? hs.totalPurchaseAndOperatingCostsAr / hs.months : 0;
  const bsMonthlyVar = bs.months > 0 ? bs.totalPurchaseAndOperatingCostsAr / bs.months : 0;
  const monthlyFixedBase = model.year1.monthlyFixedChargesAr;

  let runningCumul = -i0;
  for (let m = 1; m <= 60; m++) {
    const yearNumber = Math.ceil(m / 12);
    const yearRow = realistic.rows[yearNumber - 1];
    let periodCode: FiveYearMonthlyRow['periodCode'];
    let flowType: string;
    let turnover: number;
    let varCosts: number;
    let fixed: number;
    let beforeTax: number;
    let afterTax: number;

    if (m <= 12) {
      const baseCf = model.payback.monthlyCashFlows[m - 1];
      if (m <= hs.months) {
        periodCode = 'HS';
        flowType = 'Exploitation Haute Saison (HS)';
        turnover = hsMonthlyCA;
        varCosts = hsMonthlyVar;
      } else {
        periodCode = 'BS';
        flowType = 'Exploitation Basse Saison (BS)';
        turnover = bsMonthlyCA;
        varCosts = bsMonthlyVar;
      }
      fixed = monthlyFixedBase;
      beforeTax = baseCf ? baseCf.resultBeforeTaxAr : hs.monthlyNetResultBeforeTaxAr;
      afterTax = baseCf ? baseCf.netCashFlowAfterTaxAr : beforeTax;
    } else {
      periodCode = (`A${yearNumber}` as FiveYearMonthlyRow['periodCode']);
      flowType = `Projection mensuelle Année ${yearNumber} (${yearRow.methodology})`;
      turnover = yearRow.estimatedTurnoverAr / 12;
      varCosts = yearRow.estimatedVariableCostsAr / 12;
      fixed = yearRow.estimatedFixedChargesAr / 12;
      beforeTax = yearRow.netBeforeTaxAr / 12;
      afterTax = yearRow.netAfterTaxAr / 12;
    }

    const tax = Math.max(0, beforeTax - afterTax);
    runningCumul += afterTax;

    monthlyRows.push({
      month: m,
      monthLabel: `M${m}`,
      yearNumber,
      yearLabel: `Année ${yearNumber} (A${yearNumber})`,
      periodCode,
      flowType,
      estimatedTurnoverAr: Math.round(turnover),
      estimatedVariableCostsAr: Math.round(varCosts),
      estimatedFixedChargesAr: Math.round(fixed),
      resultBeforeTaxAr: Math.round(beforeTax),
      corporateTaxAr: Math.round(tax),
      netCashFlowAfterTaxAr: Math.round(afterTax),
      cumulativeCashFlowAr: Math.round(runningCumul),
    });
  }

  return {
    annualRows: [...realistic.rows, ...ambitious.rows],
    monthlyRows,
    npv5YearsRealisticAr: realistic.npv5Y,
    npv5YearsAmbitiousAr: ambitious.npv5Y,
  };
}

/**
 * Exporte les données brutes de projection financière sur 5 ans (Années 1–5 + 60 mois)
 * au format CSV (valeurs numériques brutes sans formatage texte pour analyse dans Excel/Sheets).
 */
export function exportFiveYearRawCsv(
  model: FullFinancialModel,
  scenarioName: string = 'Réaliste'
): void {
  const i0 = Math.round(model.investment.fundsToRaiseAr);
  const r = model.npv.discountRate;
  const data = buildFiveYearProjectionData(model);

  const annualHeaders = [
    'Scénario',
    'Année',
    'Code Exercice',
    'Taux croissance (%)',
    'Chiffre d affaires brut (Ar)',
    'Coûts variables exploitation (Ar)',
    'Charges fixes annuelles (Ar)',
    'Résultat net avant IR (Ar)',
    'Impôt IR (Ar)',
    'Cash-Flow net après IR (Ar)',
    'Flux actualisé (Ar)',
    'Cumul trésorerie depuis -I0 (Ar)',
    'Part Investisseur (Ar)',
    'Part Société (Ar)',
    'Méthode de calcul',
  ];

  const annualCsvRows = data.annualRows.map((row) => [
    row.scenario,
    row.year,
    row.label,
    row.growthRate !== null ? Number((row.growthRate * 100).toFixed(2)) : '',
    row.estimatedTurnoverAr,
    row.estimatedVariableCostsAr,
    row.estimatedFixedChargesAr,
    row.netBeforeTaxAr,
    row.corporateTaxAr,
    row.netAfterTaxAr,
    row.discountedCfAr,
    row.cumulativeCfAr,
    row.investorShareAr,
    row.companyShareAr,
    row.methodology,
  ]);

  const monthlyHeaders = [
    'Mois (Numéro)',
    'Code Mois',
    'Année',
    'Libellé Année',
    'Code Période',
    'Nature du flux',
    'Chiffre d affaires mensuel brut (Ar)',
    'Coûts variables mensuels (Ar)',
    'Charges fixes mensuelles (Ar)',
    'Résultat avant IR (Ar)',
    'Impôt IR mensuel (Ar)',
    'Flux net trésorerie après IR (Ar)',
    'Cumul trésorerie net (Ar)',
  ];

  const monthlyCsvRows = data.monthlyRows.map((m) => [
    m.month,
    m.monthLabel,
    m.yearNumber,
    m.yearLabel,
    m.periodCode,
    m.flowType,
    m.estimatedTurnoverAr,
    m.estimatedVariableCostsAr,
    m.estimatedFixedChargesAr,
    m.resultBeforeTaxAr,
    m.corporateTaxAr,
    m.netCashFlowAfterTaxAr,
    m.cumulativeCashFlowAr,
  ]);

  const buildComparativeSimBlock = (): (string | number)[][] => {
    const pessModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        model.assumptions,
        model.scenarios.pessimiste.definition
      )
    );
    const optModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        model.assumptions,
        model.scenarios.optimiste.definition
      )
    );

    const pess5Y = buildAnnualComparison5Y(pessModel, 'realistic');
    const real5Y = buildAnnualComparison5Y(model, 'realistic');
    const opt5Y = buildAnnualComparison5Y(optModel, 'ambitious');

    const simHeaders = [
      'Scénario simulé',
      'Année',
      'Code Exercice',
      'Volume Riz Vendu (kg)',
      'Chiffre d affaires (Ar)',
      'Coûts variables (Ar)',
      'Marge brute (Ar)',
      'Taux marge brute (%)',
      'Charges fixes (Ar)',
      'Résultat Opérationnel EBIT (Ar)',
      'Marge opérationnelle (%)',
      'Impôt IR (Ar)',
      'Résultat net après IR (Ar)',
      'Marge nette (%)',
    ];

    const toSimRows = (label: string, rows: typeof real5Y.rows) =>
      rows.map((row) => [
        label,
        row.year,
        row.shortLabel,
        row.riceVolumeKg,
        row.turnoverAr,
        row.variableCostsAr,
        row.grossProfitAr,
        Number((row.grossMarginRate * 100).toFixed(2)),
        row.fixedChargesAr,
        row.operatingIncomeAr,
        Number((row.operatingMarginRate * 100).toFixed(2)),
        row.corporateTaxAr,
        row.netResultAfterTaxAr,
        Number((row.netMarginRate * 100).toFixed(2)),
      ]);

    return [
      ['SIMULATION COMPARATIVE QUINQUENNALE PAR SCÉNARIO (A1–A5)'],
      simHeaders,
      ...toSimRows('Pessimiste (Stress)', pess5Y.rows),
      ...toSimRows(`Réaliste (${scenarioName})`, real5Y.rows),
      ...toSimRows('Optimiste (Croissance)', opt5Y.rows),
    ];
  };

  const comparativeSimRows = buildComparativeSimBlock();

  const summaryRows: (string | number)[][] = [
    [],
    ['PARAMÈTRES BRUTS & SYNTHÈSE 5 ANS', scenarioName],
    ['Investissement initial I0 (Ar)', i0],
    ['Taux actualisation r (décimal)', r],
    ['Taux impôt IR (décimal)', model.assumptions.corporateTaxRate],
    ['VAN 3 ans Réaliste (Ar)', Math.round(model.npv.npvAr)],
    ['VAN 5 ans Réaliste (Ar)', Math.round(data.npv5YearsRealisticAr)],
    ['VAN 5 ans Ambitieux (Ar)', Math.round(data.npv5YearsAmbitiousAr)],
    ['TRI 3 ans (décimal)', Number.isFinite(model.irr.irrValue) ? Number(model.irr.irrValue.toFixed(4)) : 'N/A'],
    ['Payback saisonnier (mois)', model.payback.paybackMonths > 0 ? Number(model.payback.paybackMonths.toFixed(2)) : '> 36'],
  ];

  const allRows = [
    ['PROJECTIONS ANNUELLES BRUTES SUR 5 ANS (A1–A5)'],
    annualHeaders,
    ...annualCsvRows,
    [],
    ...comparativeSimRows,
    [],
    ['FLUX DE TRÉSORERIE MENSUELS BRUTS SUR 5 ANS (MOIS 0 À 60)'],
    monthlyHeaders,
    ...monthlyCsvRows,
    ...summaryRows,
  ];

  const csvContent =
    '\uFEFF' + allRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeScenario = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `projections_brutes_5ans_${safeScenario || 'modele'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface SeasonalIncomeStatementCsvRow {
  section: string;
  rubrique: string;
  unite: string;
  hauteSaison: number | string;
  basseSaison: number | string;
  totalAnnuelA1: number | string;
  partHSPct: number | string;
  partBSPct: number | string;
}

export interface SeasonalMonthlyIncomeRow {
  month: number;
  monthLabel: string;
  seasonCode: 'HS' | 'BS';
  paddyKg: number;
  riceKg: number;
  riceTurnoverAr: number;
  byproductTurnoverAr: number;
  totalTurnoverAr: number;
  variableCostsPerKgAr: number;
  rotationCostsAr: number;
  totalVariableCostsAr: number;
  grossProfitAr: number;
  fixedChargesAr: number;
  netBeforeTaxAr: number;
  corporateTaxAr: number;
  netAfterTaxAr: number;
}

/**
 * Construit les tableaux bruts du compte de résultat saisonnier (Haute Saison, Basse Saison,
 * Total Année 1 et ventilation mensuelle M1–M12) sans formatage monétaire texte pour un traitement
 * direct dans Microsoft Excel ou Google Sheets.
 */
export function buildSeasonalIncomeStatementData(model: FullFinancialModel): {
  statementRows: SeasonalIncomeStatementCsvRow[];
  monthlyRows: SeasonalMonthlyIncomeRow[];
} {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const y1 = model.year1;
  const assump = model.assumptions;
  const taxRate = assump.corporateTaxRate;
  const invRate = assump.investorShare;

  const pct = (part: number, total: number): number | string =>
    Math.abs(total) > 1e-6 ? Number(((part / total) * 100).toFixed(2)) : 0;

  const hsRiceTurnover = hs.totalRiceKg * hs.riceSellingPriceAr;
  const bsRiceTurnover = bs.totalRiceKg * bs.riceSellingPriceAr;
  const hsByprodTurnover = hs.totalByproductsKg * hs.byproductSellingPriceAr;
  const bsByprodTurnover = bs.totalByproductsKg * bs.byproductSellingPriceAr;

  const hsKgCostsTotal = hs.paddyCostPerRotationAr * hs.totalRotations;
  const bsKgCostsTotal = bs.paddyCostPerRotationAr * bs.totalRotations;
  const hsRotationAndBagTotal =
    (hs.otherCostsPerRotationAr + hs.bagCostPerRotationAr) * hs.totalRotations;
  const bsRotationAndBagTotal =
    (bs.otherCostsPerRotationAr + bs.bagCostPerRotationAr) * bs.totalRotations;

  const hsTax = hs.seasonNetResultBeforeTaxAr > 0 ? hs.seasonNetResultBeforeTaxAr * taxRate : 0;
  const bsTax = bs.seasonNetResultBeforeTaxAr > 0 ? bs.seasonNetResultBeforeTaxAr * taxRate : 0;
  const hsNetAfter = hs.seasonNetResultBeforeTaxAr - hsTax;
  const bsNetAfter = bs.seasonNetResultBeforeTaxAr - bsTax;

  const totalRiceTurn = hsRiceTurnover + bsRiceTurnover;
  const totalByprodTurn = hsByprodTurnover + bsByprodTurnover;

  const statementRows: SeasonalIncomeStatementCsvRow[] = [
    // Paramètres opérationnels saisonniers
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Durée de la saison',
      unite: 'mois',
      hauteSaison: hs.months,
      basseSaison: bs.months,
      totalAnnuelA1: hs.months + bs.months,
      partHSPct: pct(hs.months, hs.months + bs.months),
      partBSPct: pct(bs.months, hs.months + bs.months),
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Rotations mensuelles',
      unite: 'rot/mois',
      hauteSaison: assump.hauteSaison.rotationsPerMonth,
      basseSaison: assump.basseSaison.rotationsPerMonth,
      totalAnnuelA1: Number(
        (
          (hs.totalRotations + bs.totalRotations) /
          Math.max(1, hs.months + bs.months)
        ).toFixed(3)
      ),
      partHSPct: '',
      partBSPct: '',
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Total rotations saisonnières',
      unite: 'rotations',
      hauteSaison: hs.totalRotations,
      basseSaison: bs.totalRotations,
      totalAnnuelA1: hs.totalRotations + bs.totalRotations,
      partHSPct: pct(hs.totalRotations, hs.totalRotations + bs.totalRotations),
      partBSPct: pct(bs.totalRotations, hs.totalRotations + bs.totalRotations),
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Paddy acheté par rotation',
      unite: 'kg',
      hauteSaison: assump.hauteSaison.paddyBoughtKgPerRotation,
      basseSaison: assump.basseSaison.paddyBoughtKgPerRotation,
      totalAnnuelA1: '',
      partHSPct: '',
      partBSPct: '',
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Volume total de paddy collecté',
      unite: 'kg',
      hauteSaison: Math.round(hs.totalPaddyKg),
      basseSaison: Math.round(bs.totalPaddyKg),
      totalAnnuelA1: Math.round(hs.totalPaddyKg + bs.totalPaddyKg),
      partHSPct: pct(hs.totalPaddyKg, hs.totalPaddyKg + bs.totalPaddyKg),
      partBSPct: pct(bs.totalPaddyKg, hs.totalPaddyKg + bs.totalPaddyKg),
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Rendement usinage (Paddy -> Riz)',
      unite: 'ratio décimal',
      hauteSaison: assump.hauteSaison.yieldPaddyToRice,
      basseSaison: assump.basseSaison.yieldPaddyToRice,
      totalAnnuelA1: Number(
        (
          (hs.totalRiceKg + bs.totalRiceKg) /
          Math.max(1, hs.totalPaddyKg + bs.totalPaddyKg)
        ).toFixed(4)
      ),
      partHSPct: '',
      partBSPct: '',
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Volume total de riz blanc produit et vendu',
      unite: 'kg',
      hauteSaison: Math.round(hs.totalRiceKg),
      basseSaison: Math.round(bs.totalRiceKg),
      totalAnnuelA1: Math.round(y1.totalRiceKgSold),
      partHSPct: pct(hs.totalRiceKg, y1.totalRiceKgSold),
      partBSPct: pct(bs.totalRiceKg, y1.totalRiceKgSold),
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Prix de vente unitaire du riz',
      unite: 'Ar/kg',
      hauteSaison: assump.hauteSaison.riceSellingPriceArPerKg,
      basseSaison: assump.basseSaison.riceSellingPriceArPerKg,
      totalAnnuelA1: Number((totalRiceTurn / Math.max(1, y1.totalRiceKgSold)).toFixed(2)),
      partHSPct: '',
      partBSPct: '',
    },
    {
      section: '1. Paramètres Opérationnels',
      rubrique: 'Volume total des sous-produits (Son & Balayures)',
      unite: 'kg',
      hauteSaison: Math.round(hs.totalByproductsKg),
      basseSaison: Math.round(bs.totalByproductsKg),
      totalAnnuelA1: Math.round(hs.totalByproductsKg + bs.totalByproductsKg),
      partHSPct: pct(hs.totalByproductsKg, hs.totalByproductsKg + bs.totalByproductsKg),
      partBSPct: pct(bs.totalByproductsKg, hs.totalByproductsKg + bs.totalByproductsKg),
    },

    // Produits d'exploitation
    {
      section: '2. Produits (Chiffre d affaires)',
      rubrique: 'Ventes de riz blanc',
      unite: 'Ar',
      hauteSaison: Math.round(hsRiceTurnover),
      basseSaison: Math.round(bsRiceTurnover),
      totalAnnuelA1: Math.round(totalRiceTurn),
      partHSPct: pct(hsRiceTurnover, totalRiceTurn),
      partBSPct: pct(bsRiceTurnover, totalRiceTurn),
    },
    {
      section: '2. Produits (Chiffre d affaires)',
      rubrique: 'Ventes de sous-produits (Son & Balayures)',
      unite: 'Ar',
      hauteSaison: Math.round(hsByprodTurnover),
      basseSaison: Math.round(bsByprodTurnover),
      totalAnnuelA1: Math.round(totalByprodTurn),
      partHSPct: pct(hsByprodTurnover, totalByprodTurn),
      partBSPct: pct(bsByprodTurnover, totalByprodTurn),
    },
    {
      section: '2. Produits (Chiffre d affaires)',
      rubrique: 'TOTAL CHIFFRE D AFFAIRES',
      unite: 'Ar',
      hauteSaison: Math.round(hs.totalTurnoverAr),
      basseSaison: Math.round(bs.totalTurnoverAr),
      totalAnnuelA1: Math.round(y1.totalTurnoverAr),
      partHSPct: pct(hs.totalTurnoverAr, y1.totalTurnoverAr),
      partBSPct: pct(bs.totalTurnoverAr, y1.totalTurnoverAr),
    },

    // Détail des coûts variables par kg de paddy
    ...assump.costsPerKgPaddy.map((item) => {
      const totalItemHS = item.costHS * hs.totalPaddyKg;
      const totalItemBS = item.costBS * bs.totalPaddyKg;
      const totalItemY1 = totalItemHS + totalItemBS;
      return {
        section: '3. Coûts Variables / kg Paddy',
        rubrique: `${item.label} (HS: ${item.costHS} Ar/kg | BS: ${item.costBS} Ar/kg)`,
        unite: 'Ar',
        hauteSaison: Math.round(totalItemHS),
        basseSaison: Math.round(totalItemBS),
        totalAnnuelA1: Math.round(totalItemY1),
        partHSPct: pct(totalItemHS, totalItemY1),
        partBSPct: pct(totalItemBS, totalItemY1),
      };
    }),
    {
      section: '3. Coûts Variables / kg Paddy',
      rubrique: 'Sous-total Achats Paddy & Coûts au kg',
      unite: 'Ar',
      hauteSaison: Math.round(hsKgCostsTotal),
      basseSaison: Math.round(bsKgCostsTotal),
      totalAnnuelA1: Math.round(hsKgCostsTotal + bsKgCostsTotal),
      partHSPct: pct(hsKgCostsTotal, hsKgCostsTotal + bsKgCostsTotal),
      partBSPct: pct(bsKgCostsTotal, hsKgCostsTotal + bsKgCostsTotal),
    },

    // Détail des coûts par rotation & emballage sacs
    ...assump.costsPerRotation.map((item) => {
      const totalItemHS = item.costHS * hs.totalRotations;
      const totalItemBS = item.costBS * bs.totalRotations;
      const totalItemY1 = totalItemHS + totalItemBS;
      return {
        section: '4. Coûts par Rotation & Sacs',
        rubrique: `${item.label} (HS: ${item.costHS} Ar/rot | BS: ${item.costBS} Ar/rot)`,
        unite: 'Ar',
        hauteSaison: Math.round(totalItemHS),
        basseSaison: Math.round(totalItemBS),
        totalAnnuelA1: Math.round(totalItemY1),
        partHSPct: pct(totalItemHS, totalItemY1),
        partBSPct: pct(totalItemBS, totalItemY1),
      };
    }),
    {
      section: '4. Coûts par Rotation & Sacs',
      rubrique: `Sacs d'emballage (${assump.selectedBagCapacityKg} kg)`,
      unite: 'Ar',
      hauteSaison: Math.round(hs.bagCostPerRotationAr * hs.totalRotations),
      basseSaison: Math.round(bs.bagCostPerRotationAr * bs.totalRotations),
      totalAnnuelA1: Math.round(
        hs.bagCostPerRotationAr * hs.totalRotations +
          bs.bagCostPerRotationAr * bs.totalRotations
      ),
      partHSPct: pct(
        hs.bagCostPerRotationAr * hs.totalRotations,
        hs.bagCostPerRotationAr * hs.totalRotations +
          bs.bagCostPerRotationAr * bs.totalRotations
      ),
      partBSPct: pct(
        bs.bagCostPerRotationAr * bs.totalRotations,
        hs.bagCostPerRotationAr * hs.totalRotations +
          bs.bagCostPerRotationAr * bs.totalRotations
      ),
    },
    {
      section: '4. Coûts par Rotation & Sacs',
      rubrique: 'Sous-total Coûts de Rotations, Collecte & Sacs',
      unite: 'Ar',
      hauteSaison: Math.round(hsRotationAndBagTotal),
      basseSaison: Math.round(bsRotationAndBagTotal),
      totalAnnuelA1: Math.round(hsRotationAndBagTotal + bsRotationAndBagTotal),
      partHSPct: pct(hsRotationAndBagTotal, hsRotationAndBagTotal + bsRotationAndBagTotal),
      partBSPct: pct(bsRotationAndBagTotal, hsRotationAndBagTotal + bsRotationAndBagTotal),
    },

    // Agrégats de marge brute
    {
      section: '5. Marge Brute Saisonnière',
      rubrique: 'TOTAL COÛTS VARIABLES D EXPLOITATION',
      unite: 'Ar',
      hauteSaison: Math.round(hs.totalPurchaseAndOperatingCostsAr),
      basseSaison: Math.round(bs.totalPurchaseAndOperatingCostsAr),
      totalAnnuelA1: Math.round(y1.totalPurchaseAndOperatingCostsAr),
      partHSPct: pct(hs.totalPurchaseAndOperatingCostsAr, y1.totalPurchaseAndOperatingCostsAr),
      partBSPct: pct(bs.totalPurchaseAndOperatingCostsAr, y1.totalPurchaseAndOperatingCostsAr),
    },
    {
      section: '5. Marge Brute Saisonnière',
      rubrique: 'MARGE BRUTE D EXPLOITATION',
      unite: 'Ar',
      hauteSaison: Math.round(hs.seasonGrossProfitAr),
      basseSaison: Math.round(bs.seasonGrossProfitAr),
      totalAnnuelA1: Math.round(y1.annualGrossProfitAr),
      partHSPct: pct(hs.seasonGrossProfitAr, y1.annualGrossProfitAr),
      partBSPct: pct(bs.seasonGrossProfitAr, y1.annualGrossProfitAr),
    },
    {
      section: '5. Marge Brute Saisonnière',
      rubrique: 'Taux de marge brute',
      unite: 'ratio décimal',
      hauteSaison: Number(
        (hs.totalTurnoverAr > 0 ? hs.seasonGrossProfitAr / hs.totalTurnoverAr : 0).toFixed(4)
      ),
      basseSaison: Number(
        (bs.totalTurnoverAr > 0 ? bs.seasonGrossProfitAr / bs.totalTurnoverAr : 0).toFixed(4)
      ),
      totalAnnuelA1: Number(y1.grossMarginRate.toFixed(4)),
      partHSPct: '',
      partBSPct: '',
    },

    // Charges fixes mensuelles ventilées par saison
    ...assump.fixedMonthlyCharges.map((item) => {
      const hsFixedItem = item.amount * hs.months;
      const bsFixedItem = item.amount * bs.months;
      const totalItem = hsFixedItem + bsFixedItem;
      return {
        section: '6. Charges Fixes Ventilées',
        rubrique: `${item.label} (${item.amount} Ar/mois)`,
        unite: 'Ar',
        hauteSaison: Math.round(hsFixedItem),
        basseSaison: Math.round(bsFixedItem),
        totalAnnuelA1: Math.round(totalItem),
        partHSPct: pct(hsFixedItem, totalItem),
        partBSPct: pct(bsFixedItem, totalItem),
      };
    }),
    {
      section: '6. Charges Fixes Ventilées',
      rubrique: 'TOTAL CHARGES FIXES',
      unite: 'Ar',
      hauteSaison: Math.round(hs.seasonFixedChargesAr),
      basseSaison: Math.round(bs.seasonFixedChargesAr),
      totalAnnuelA1: Math.round(y1.annualFixedChargesAr),
      partHSPct: pct(hs.seasonFixedChargesAr, y1.annualFixedChargesAr),
      partBSPct: pct(bs.seasonFixedChargesAr, y1.annualFixedChargesAr),
    },

    // Résultat net & répartition
    {
      section: '7. Résultat Net & Répartition',
      rubrique: 'RÉSULTAT NET AVANT IMPÔT (IR)',
      unite: 'Ar',
      hauteSaison: Math.round(hs.seasonNetResultBeforeTaxAr),
      basseSaison: Math.round(bs.seasonNetResultBeforeTaxAr),
      totalAnnuelA1: Math.round(y1.netResultBeforeTaxAr),
      partHSPct: pct(hs.seasonNetResultBeforeTaxAr, y1.netResultBeforeTaxAr),
      partBSPct: pct(bs.seasonNetResultBeforeTaxAr, y1.netResultBeforeTaxAr),
    },
    {
      section: '7. Résultat Net & Répartition',
      rubrique: `Impôt sur les Revenus (IR ${(taxRate * 100).toFixed(0)} %)`,
      unite: 'Ar',
      hauteSaison: Math.round(hsTax),
      basseSaison: Math.round(bsTax),
      totalAnnuelA1: Math.round(y1.corporateTaxAr),
      partHSPct: pct(hsTax, y1.corporateTaxAr),
      partBSPct: pct(bsTax, y1.corporateTaxAr),
    },
    {
      section: '7. Résultat Net & Répartition',
      rubrique: 'RÉSULTAT NET APRÈS IMPÔT (IR)',
      unite: 'Ar',
      hauteSaison: Math.round(hsNetAfter),
      basseSaison: Math.round(bsNetAfter),
      totalAnnuelA1: Math.round(y1.netResultAfterTaxAr),
      partHSPct: pct(hsNetAfter, y1.netResultAfterTaxAr),
      partBSPct: pct(bsNetAfter, y1.netResultAfterTaxAr),
    },
    {
      section: '7. Résultat Net & Répartition',
      rubrique: `Part Investisseur (${(invRate * 100).toFixed(0)} %)`,
      unite: 'Ar',
      hauteSaison: Math.round(Math.max(0, hsNetAfter) * invRate),
      basseSaison: Math.round(Math.max(0, bsNetAfter) * invRate),
      totalAnnuelA1: Math.round(y1.investorShareAr),
      partHSPct: pct(Math.max(0, hsNetAfter) * invRate, y1.investorShareAr),
      partBSPct: pct(Math.max(0, bsNetAfter) * invRate, y1.investorShareAr),
    },
    {
      section: '7. Résultat Net & Répartition',
      rubrique: `Part Société (${((1 - invRate) * 100).toFixed(0)} %)`,
      unite: 'Ar',
      hauteSaison: Math.round(Math.max(0, hsNetAfter) * (1 - invRate)),
      basseSaison: Math.round(Math.max(0, bsNetAfter) * (1 - invRate)),
      totalAnnuelA1: Math.round(y1.companyShareAr),
      partHSPct: pct(Math.max(0, hsNetAfter) * (1 - invRate), y1.companyShareAr),
      partBSPct: pct(Math.max(0, bsNetAfter) * (1 - invRate), y1.companyShareAr),
    },
  ];

  // Ventilation mensuelle Année 1 (Mois 1 à 12)
  const monthlyRows: SeasonalMonthlyIncomeRow[] = [];
  const hsMonths = Math.max(1, hs.months);
  const bsMonths = Math.max(1, bs.months);
  const totalMonths = Math.max(12, Math.round(hs.months + bs.months));

  for (let m = 1; m <= totalMonths; m++) {
    const isHS = m <= hs.months;
    const s = isHS ? hs : bs;
    const div = isHS ? hsMonths : bsMonths;
    const sRiceTurn = isHS ? hsRiceTurnover : bsRiceTurnover;
    const sByprodTurn = isHS ? hsByprodTurnover : bsByprodTurnover;
    const sKgCosts = isHS ? hsKgCostsTotal : bsKgCostsTotal;
    const sRotAndBagCosts = isHS ? hsRotationAndBagTotal : bsRotationAndBagTotal;
    const beforeTax = s.seasonNetResultBeforeTaxAr / div;
    const tax = beforeTax > 0 ? beforeTax * taxRate : 0;
    const afterTax = beforeTax - tax;

    monthlyRows.push({
      month: m,
      monthLabel: `M${m}`,
      seasonCode: isHS ? 'HS' : 'BS',
      paddyKg: Math.round(s.totalPaddyKg / div),
      riceKg: Math.round(s.totalRiceKg / div),
      riceTurnoverAr: Math.round(sRiceTurn / div),
      byproductTurnoverAr: Math.round(sByprodTurn / div),
      totalTurnoverAr: Math.round(s.totalTurnoverAr / div),
      variableCostsPerKgAr: Math.round(sKgCosts / div),
      rotationCostsAr: Math.round(sRotAndBagCosts / div),
      totalVariableCostsAr: Math.round(s.totalPurchaseAndOperatingCostsAr / div),
      grossProfitAr: Math.round(s.seasonGrossProfitAr / div),
      fixedChargesAr: Math.round(s.seasonFixedChargesAr / div),
      netBeforeTaxAr: Math.round(beforeTax),
      corporateTaxAr: Math.round(tax),
      netAfterTaxAr: Math.round(afterTax),
    });
  }

  return { statementRows, monthlyRows };
}

export function exportSeasonalIncomeStatementRawCsv(
  model: FullFinancialModel,
  projectName: string = 'Projet actif',
  scenarioName: string = 'Scénario courant'
): void {
  const { statementRows, monthlyRows } = buildSeasonalIncomeStatementData(model);

  const metaRows: (string | number)[][] = [
    ['EXPORT BRUT — COMPTE DE RÉSULTAT SAISONNIER (HAUTE & BASSE SAISON)'],
    ['Projet', projectName],
    ['Scénario', scenarioName],
    ['Date d export', new Date().toISOString().slice(0, 10)],
    ['Unité monétaire', 'Ariary (Ar)'],
    [],
  ];

  const statementHeaders = [
    'Section',
    'Rubrique / Poste',
    'Unité',
    'Haute Saison (HS)',
    'Basse Saison (BS)',
    'Total / Moyenne Année 1',
    'Part HS (%)',
    'Part BS (%)',
  ];

  const statementCsvRows = statementRows.map((row) => [
    row.section,
    row.rubrique,
    row.unite,
    row.hauteSaison,
    row.basseSaison,
    row.totalAnnuelA1,
    row.partHSPct,
    row.partBSPct,
  ]);

  const monthlyHeaders = [
    'Mois (N°)',
    'Code Mois',
    'Saison',
    'Paddy collecté (kg)',
    'Riz blanc vendu (kg)',
    'CA Riz blanc (Ar)',
    'CA Sous-produits (Ar)',
    'CA Total mensuel (Ar)',
    'Coûts variables / kg (Ar)',
    'Coûts rotations (Ar)',
    'Total coûts variables (Ar)',
    'Marge brute mensuelle (Ar)',
    'Charges fixes mensuelles (Ar)',
    'Résultat avant IR (Ar)',
    'Impôt IR mensuel estimé (Ar)',
    'Résultat net après IR (Ar)',
  ];

  const monthlyCsvRows = monthlyRows.map((m) => [
    m.month,
    m.monthLabel,
    m.seasonCode,
    m.paddyKg,
    m.riceKg,
    m.riceTurnoverAr,
    m.byproductTurnoverAr,
    m.totalTurnoverAr,
    m.variableCostsPerKgAr,
    m.rotationCostsAr,
    m.totalVariableCostsAr,
    m.grossProfitAr,
    m.fixedChargesAr,
    m.netBeforeTaxAr,
    m.corporateTaxAr,
    m.netAfterTaxAr,
  ]);

  const allRows = [
    ...metaRows,
    ['A. COMPTE DE RÉSULTAT DÉTAILLÉ PAR SAISON (ANNÉE 1)'],
    statementHeaders,
    ...statementCsvRows,
    [],
    ['B. DÉCOMPOSITION MENSUELLE BRUTE DU COMPTE DE RÉSULTAT (ANNÉE 1)'],
    monthlyHeaders,
    ...monthlyCsvRows,
  ];

  const csvContent =
    '\uFEFF' + allRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeProject = projectName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  const a = document.createElement('a');
  a.href = url;
  a.download = `compte_resultat_saisonnier_brut_${safeProject || 'modele'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

