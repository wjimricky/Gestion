import { DEFAULT_ASSUMPTIONS } from './defaultAssumptions';
import { calculateFullModel, computeSensitivityMatrix } from './calculator';

export function runTests(): { success: boolean; results: { name: string; passed: boolean; message: string }[] } {
  const model = calculateFullModel(DEFAULT_ASSUMPTIONS);
  const results: { name: string; passed: boolean; message: string }[] = [];

  function assertClose(actual: number, expected: number, tolerance: number, testName: string) {
    const diff = Math.abs(actual - expected);
    const passed = diff <= tolerance;
    results.push({
      name: testName,
      passed,
      message: passed
        ? `✓ ${testName}: ${actual.toFixed(2)} (attendu: ${expected.toFixed(2)})`
        : `✗ ${testName}: ${actual.toFixed(2)} vs attendu ${expected.toFixed(2)} (écart: ${diff})`,
    });
  }

  // 1. Haute Saison
  assertClose(model.hauteSaison.totalTurnoverAr, 276920000, 1, 'CA Haute Saison');
  assertClose(model.hauteSaison.totalPurchaseAndOperatingCostsAr, 165399000, 1, 'Coûts exploitation HS');
  assertClose(model.hauteSaison.seasonGrossProfitAr, 111521000, 1, 'Marge brute HS');
  assertClose(model.hauteSaison.seasonNetResultBeforeTaxAr, 69121000, 1, 'Résultat net avant IR HS');

  // 2. Basse Saison
  assertClose(model.basseSaison.totalTurnoverAr, 539392000, 1, 'CA Basse Saison');
  assertClose(model.basseSaison.totalPurchaseAndOperatingCostsAr, 385838600, 1, 'Coûts exploitation BS');
  assertClose(model.basseSaison.seasonGrossProfitAr, 153553400, 1, 'Marge brute BS');
  assertClose(model.basseSaison.seasonNetResultBeforeTaxAr, 94193400, 1, 'Résultat net avant IR BS');

  // 3. Année 1 (Total)
  assertClose(model.year1.totalTurnoverAr, 816312000, 1, 'CA Annuel Année 1');
  assertClose(model.year1.annualGrossProfitAr, 265074400, 1, 'Marge brute annuelle');
  assertClose(model.year1.grossMarginRate, 0.3247219, 0.0001, 'Taux de marge brute');
  assertClose(model.year1.annualFixedChargesAr, 101760000, 1, 'Charges fixes annuelles');
  assertClose(model.year1.netResultBeforeTaxAr, 163314400, 1, 'Résultat avant IR Année 1');
  assertClose(model.year1.corporateTaxAr, 32662880, 1, 'Impôt IR Année 1 (20%)');
  assertClose(model.year1.netResultAfterTaxAr, 130651520, 1, 'Résultat net après IR Année 1');
  assertClose(model.year1.investorShareAr, 91456064, 1, 'Part Investisseur (70%)');
  assertClose(model.year1.companyShareAr, 39195456, 1, 'Part Société (30%)');

  // 4. Investissement & Financement
  assertClose(model.investment.fundsToRaiseAr, 27540000, 1, 'Fonds à lever (I0)');
  assertClose(model.investment.roiRatio, 4.74406, 0.001, 'ROI Année 1');

  // 5. Point Mort / Break-Even
  assertClose(model.breakEven.annualBreakEvenTurnoverAr, 313375826.26, 50, 'Break-even CA annuel');
  assertClose(model.breakEven.monthlyBreakEvenTurnoverAr, 26114652.19, 5, 'Break-even CA mensuel');
  assertClose(model.breakEven.monthlyBreakEvenVolumeKg, 9244.12, 1, 'Break-even volume mensuel');
  assertClose(model.breakEven.safetyMarginRate, 0.6161, 0.001, 'Marge de sécurité');
  assertClose(model.breakEven.requiredActiveClients, 31, 0, 'Clients actifs requis');

  // 6. Payback Period
  assertClose(model.payback.paybackMonths, 2.4902, 0.01, 'Payback saisonnier (mois)');
  assertClose(model.payback.simplePaybackMonths, 2.5295, 0.01, 'Payback simple (mois)');

  // 7. Projections 3 Ans
  assertClose(model.projections.realistic[0].netResultAfterTaxAr, 130651520, 1, 'CF A1');
  assertClose(model.projections.realistic[1].netResultAfterTaxAr, 193364249.6, 1, 'CF A2');
  assertClose(model.projections.realistic[2].netResultAfterTaxAr, 309382799.36, 1, 'CF A3');

  // 8. VAN (NPV)
  assertClose(model.npv.npvAr, 463474504.37, 50, 'VAN à 12%');
  results.push({
    name: 'Décision VAN',
    passed: model.npv.decision === 'Investir ✓',
    message: `Décision VAN: ${model.npv.decision}`,
  });

  // 9. TRI (IRR)
  assertClose(model.irr.irrValue, 5.17556, 0.01, 'TRI exact (517.56%)');
  assertClose(model.irr.linearInterpolation.approxIrr, 5.37207, 0.01, 'TRI interpolation linéaire');

  // 10. Scénarios
  assertClose(model.scenarios.pessimiste.annualNetBeforeTaxAr, 7087650, 50, 'Scénario Pessimiste net avant IR');
  assertClose(model.scenarios.optimiste.annualNetBeforeTaxAr, 348537125, 50, 'Scénario Optimiste net avant IR');

  // 11. Sensibilité
  const sensMat1 = computeSensitivityMatrix(DEFAULT_ASSUMPTIONS, 'rendement_vs_rotations');
  // At Rendement = 0.70 and Rotations = 2.0 (indices [4][2]) -> must equal 163,314,400 Ar
  assertClose(sensMat1.matrix[4][2], 163314400, 1, 'Sensibilité Rendement 70% × Rotations 2.0');

  const allPassed = results.every((r) => r.passed);
  return { success: allPassed, results };
}

// Auto-run if executed in tsx/node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('calculator.test')) {
  const { success, results } = runTests();
  console.log(`\n=== RÉSULTATS DES TESTS DU MOTEUR FINANCIER ===`);
  results.forEach((r) => console.log(r.message));
  console.log(`\nStatut global : ${success ? 'TOUS LES TESTS ONT RÉUSSI (100% CONFORME EXCEL)' : 'ÉCHEC DE CERTAINS TESTS'}\n`);
}
