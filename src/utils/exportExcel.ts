import * as XLSX from 'xlsx';
import { FullFinancialModel } from '../types/finance';

export function exportModelToExcel(model: FullFinancialModel, scenarioName: string = 'Réaliste'): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Dashboard
  const dashboardData = [
    ['MODÉLISATION FINANCIÈRE RIZICULTURE MADAGASCAR', '', '', '', ''],
    ['Scénario actif', scenarioName, '', 'Date', new Date().toLocaleDateString('fr-FR')],
    [],
    ['COMPTE DE RÉSULTAT', 'Haute Saison', 'Basse Saison', 'Année 1', 'Unité'],
    ['Durée (mois)', model.hauteSaison.months, model.basseSaison.months, 12, 'mois'],
    ['Rotations par mois', model.hauteSaison.rotationsPerMonth, model.basseSaison.rotationsPerMonth, '', 'rot/mois'],
    ['Total rotations', model.hauteSaison.totalRotations, model.basseSaison.totalRotations, model.hauteSaison.totalRotations + model.basseSaison.totalRotations, 'rotations'],
    ['Paddy acheté par rotation', model.hauteSaison.paddyKgPerRotation, model.basseSaison.paddyKgPerRotation, '', 'kg'],
    ['Rendement paddy → riz', model.hauteSaison.yieldRatio, model.basseSaison.yieldRatio, '', '%'],
    ['Riz vendu total', model.hauteSaison.totalRiceKg, model.basseSaison.totalRiceKg, model.year1.totalRiceKgSold, 'kg'],
    ['Prix de vente du riz', model.hauteSaison.riceSellingPriceAr, model.basseSaison.riceSellingPriceAr, model.breakEven.weightedAvgSellingPriceAr, 'Ar / kg'],
    ['Chiffre d\'affaires', model.hauteSaison.totalTurnoverAr, model.basseSaison.totalTurnoverAr, model.year1.totalTurnoverAr, 'Ar'],
    ['Coûts d\'achat et d\'exploitation', model.hauteSaison.totalPurchaseAndOperatingCostsAr, model.basseSaison.totalPurchaseAndOperatingCostsAr, model.year1.totalPurchaseAndOperatingCostsAr, 'Ar'],
    ['Marge brute', model.hauteSaison.seasonGrossProfitAr, model.basseSaison.seasonGrossProfitAr, model.year1.annualGrossProfitAr, 'Ar'],
    ['Taux de marge brute', model.hauteSaison.grossMarginRate, model.basseSaison.grossMarginRate, model.year1.grossMarginRate, '%'],
    ['Charges fixes', model.hauteSaison.seasonFixedChargesAr, model.basseSaison.seasonFixedChargesAr, model.year1.annualFixedChargesAr, 'Ar'],
    ['Résultat net avant IR', model.hauteSaison.seasonNetResultBeforeTaxAr, model.basseSaison.seasonNetResultBeforeTaxAr, model.year1.netResultBeforeTaxAr, 'Ar'],
    ['Impôt sur le Revenu (IR 20%)', '', '', model.year1.corporateTaxAr, 'Ar'],
    ['Bénéfice net après IR', '', '', model.year1.netResultAfterTaxAr, 'Ar'],
    ['Marge nette après IR', '', '', model.year1.netMarginAfterTaxRate, '%'],
    [],
    ['RÉPARTITION DU BÉNÉFICE NET', '', '', '', ''],
    ['Part Investisseur (70%)', model.year1.investorShareAr, 'Ar', '', ''],
    ['Part Société (30%)', model.year1.companyShareAr, 'Ar', '', ''],
    [],
    ['INVESTISSEMENT ET BESOIN EN FONDS', '', '', '', ''],
    ['BFR 1 rotation HS', model.investment.rotationWorkingCapitalHSAr, 'Ar', '', ''],
    ['Matériel', model.investment.materielAr, 'Ar', '', ''],
    ['Enregistrement', model.investment.enregistrementAr, 'Ar', '', ''],
    ['Fonds de roulement', model.investment.workingCapitalTotalAr, 'Ar', '', ''],
    ['Cash buffer', model.investment.cashBufferAr, 'Ar', '', ''],
    ['FONDS À LEVER (I0)', model.investment.fundsToRaiseAr, 'Ar', '', ''],
    [],
    ['INDICATEURS CLÉS (KPI)', '', '', '', ''],
    ['ROI (Résultat net / Fonds)', model.investment.roiRatio, 'x', '', ''],
    ['VAN (12%)', model.npv.npvAr, 'Ar', '', ''],
    ['TRI', model.irr.irrValue, '%', '', ''],
    ['Payback saisonnier', model.payback.paybackMonths, 'mois', '', ''],
    ['Point mort CA mensuel', model.breakEven.monthlyBreakEvenTurnoverAr, 'Ar', '', ''],
    ['Point mort volume mensuel', model.breakEven.monthlyBreakEvenVolumeKg, 'kg', '', ''],
    ['Marge de sécurité', model.breakEven.safetyMarginRate, '%', '', ''],
  ];

  const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData);
  XLSX.utils.book_append_sheet(wb, wsDashboard, 'Dashboard');

  // 2. Sheet: Scénarios
  const scenariosData = [
    ['COMPARAISON DES SCÉNARIOS', '', '', ''],
    ['Indicateur', 'Pessimiste', 'Réaliste', 'Optimiste'],
    ['Δ Rendement paddy (pts %)', model.scenarios.pessimiste.definition.deltaYieldPoints, 0, model.scenarios.optimiste.definition.deltaYieldPoints],
    ['Δ Prix de vente riz (%)', model.scenarios.pessimiste.definition.deltaSellingPricePercent, 0, model.scenarios.optimiste.definition.deltaSellingPricePercent],
    ['Δ Prix achat paddy (%)', model.scenarios.pessimiste.definition.deltaPaddyPricePercent, 0, model.scenarios.optimiste.definition.deltaPaddyPricePercent],
    ['Δ Rotations / mois', model.scenarios.pessimiste.definition.deltaRotationsPerMonth, 0, model.scenarios.optimiste.definition.deltaRotationsPerMonth],
    ['Chiffre d\'affaires annuel (Ar)', model.scenarios.pessimiste.annualTurnoverAr, model.scenarios.realiste.annualTurnoverAr, model.scenarios.optimiste.annualTurnoverAr],
    ['Coûts totaux annuels (Ar)', model.scenarios.pessimiste.annualTotalCostsAr, model.scenarios.realiste.annualTotalCostsAr, model.scenarios.optimiste.annualTotalCostsAr],
    ['Résultat net avant IR (Ar)', model.scenarios.pessimiste.annualNetBeforeTaxAr, model.scenarios.realiste.annualNetBeforeTaxAr, model.scenarios.optimiste.annualNetBeforeTaxAr],
    ['Impôt IR (Ar)', model.scenarios.pessimiste.annualTaxAr, model.scenarios.realiste.annualTaxAr, model.scenarios.optimiste.annualTaxAr],
    ['Résultat net après IR (Ar)', model.scenarios.pessimiste.annualNetAfterTaxAr, model.scenarios.realiste.annualNetAfterTaxAr, model.scenarios.optimiste.annualNetAfterTaxAr],
    ['Marge nette avant IR (%)', model.scenarios.pessimiste.annualNetMarginRate, model.scenarios.realiste.annualNetMarginRate, model.scenarios.optimiste.annualNetMarginRate],
    ['Écart avec le Réaliste (Ar)', model.scenarios.pessimiste.varianceFromRealisticAr, 0, model.scenarios.optimiste.varianceFromRealisticAr],
    ['Verdict', model.scenarios.pessimiste.verdict, model.scenarios.realiste.verdict, model.scenarios.optimiste.verdict],
  ];
  const wsScenarios = XLSX.utils.aoa_to_sheet(scenariosData);
  XLSX.utils.book_append_sheet(wb, wsScenarios, 'Scénarios');

  // 3. Sheet: Break-Even
  const breakEvenData = [
    ['SEUIL DE RENTABILITÉ (BREAK-EVEN)', '', '', ''],
    ['Indicateur', 'Formule / Source', 'Valeur', 'Unité'],
    ['Charges fixes mensuelles', 'Total charges fixes / mois', model.breakEven.monthlyFixedChargesAr, 'Ar'],
    ['Charges fixes annuelles', 'CF mensuelles × 12 mois', model.breakEven.annualFixedChargesAr, 'Ar'],
    ['Taux de marge brute', 'Marge brute / CA', model.breakEven.grossMarginRate, '%'],
    ['Break-even CA annuel', 'CF annuelles / Taux marge brute', model.breakEven.annualBreakEvenTurnoverAr, 'Ar'],
    ['Break-even CA mensuel', 'CA annuel / 12', model.breakEven.monthlyBreakEvenTurnoverAr, 'Ar'],
    ['Prix moyen pondéré', 'CA annuel / Volume annuel', model.breakEven.weightedAvgSellingPriceAr, 'Ar / kg'],
    ['Break-even volume annuel', 'Break-even CA / Prix moyen', model.breakEven.annualBreakEvenVolumeKg, 'kg'],
    ['Break-even volume mensuel', 'Volume annuel / 12', model.breakEven.monthlyBreakEvenVolumeKg, 'kg / mois'],
    ['Break-even en % de l\'objectif', 'Volume Break-even / Volume prévu', model.breakEven.breakEvenPercentOfTarget, '%'],
    ['Marge de sécurité', '1 - Break-even %', model.breakEven.safetyMarginRate, '%'],
    ['Volume moyen par client', 'Hypothèse', model.breakEven.avgVolumePerClientKgMonthly, 'kg / mois'],
    ['Clients actifs nécessaires', 'Volume mensuel / Vol par client', model.breakEven.requiredActiveClients, 'clients'],
  ];
  const wsBreakEven = XLSX.utils.aoa_to_sheet(breakEvenData);
  XLSX.utils.book_append_sheet(wb, wsBreakEven, 'Break-Even');

  // 4. Sheet: Payback Period
  const paybackRows: (string | number)[][] = [
    ['DÉLAI DE RÉCUPÉRATION DU CAPITAL (PAYBACK)', '', '', '', '', ''],
    ['Fonds investi (I0)', model.investment.fundsToRaiseAr, 'Ar', '', '', ''],
    ['Payback saisonnier', model.payback.paybackMonths, 'mois', '', '', ''],
    ['Payback simple', model.payback.simplePaybackMonths, 'mois', '', '', ''],
    [],
    ['Mois', 'Période', 'Résultat avant IR', 'Flux net après IR', 'Cumul après I0', 'Mois récupération'],
  ];

  model.payback.monthlyCashFlows.forEach((cf) => {
    paybackRows.push([
      cf.month,
      cf.period,
      cf.resultBeforeTaxAr,
      cf.netCashFlowAfterTaxAr,
      cf.cumulativeCashFlowAr,
      cf.recoveryMonth !== null ? cf.recoveryMonth.toFixed(2) : '',
    ]);
  });
  const wsPayback = XLSX.utils.aoa_to_sheet(paybackRows);
  XLSX.utils.book_append_sheet(wb, wsPayback, 'Payback Period');

  // 5. Sheet: Projections A1-A3
  const projData: (string | number)[][] = [
    ['PROJECTION DES FLUX NETS (A1 - A3)', '', '', '', ''],
    ['Année', 'Résultat net après IR (Ar)', 'Taux de croissance', 'Résultat avant IR (Ar)', 'Méthode'],
  ];
  model.projections.realistic.forEach((p) => {
    projData.push([
      p.label,
      p.netResultAfterTaxAr,
      p.growthRate !== null ? p.growthRate : '—',
      p.netResultBeforeTaxAr,
      p.method,
    ]);
  });
  const wsProj = XLSX.utils.aoa_to_sheet(projData);
  XLSX.utils.book_append_sheet(wb, wsProj, 'Projection(CF) A1-A3');

  // 6. Sheet: VAN & TRI
  const vanData = [
    ['VALEUR ACTUELLE NETTE (VAN) & TAUX DE RENTABILITÉ INTERNE (TRI)', '', '', '', ''],
    ['Capital investi (CF0)', -model.investment.fundsToRaiseAr, 'Ar', '', ''],
    ['Taux d\'actualisation retenu (r)', model.npv.discountRate, '%', '', ''],
    ['VAN calculée', model.npv.npvAr, 'Ar', '', ''],
    ['Décision VAN', model.npv.decision, '', '', ''],
    ['TRI exact (IRR)', model.irr.irrValue, '%', '', ''],
    ['TRI interpolation linéaire', model.irr.linearInterpolation.approxIrr, '%', '', ''],
    [],
    ['SENSIBILITÉ AUX TAUX D\'ACTUALISATION', '', '', '', ''],
    ['Taux exigé', 'Flux actualisé A1', 'Flux actualisé A2', 'Flux actualisé A3', 'Somme flux actualisés', 'VAN', 'Décision'],
  ];
  model.npv.sensitivityTable.forEach((item) => {
    vanData.push([
      item.rate,
      item.pvYear1Ar,
      item.pvYear2Ar,
      item.pvYear3Ar,
      item.totalPvAr,
      item.npvAr,
      item.decision,
    ]);
  });
  const wsVan = XLSX.utils.aoa_to_sheet(vanData);
  XLSX.utils.book_append_sheet(wb, wsVan, 'VAN & TRI');

  // Save workbook file
  const fileName = `Modele_Financier_Riz_Madagascar_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
