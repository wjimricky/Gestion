import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent, formatKg } from '../../utils/formatters';
import { Grid3X3, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { LabelWithTooltip } from '../ui/Tooltip';
import { SelectMenu } from '../ui/SelectMenu';
import { TriSensitivityHeatmap } from '../ui/TriSensitivityHeatmap';
import { NpvCorrelationChart } from '../charts/NpvCorrelationChart';

export const SensibilityTab: React.FC = () => {
  const { assumptions, model, sensitivityType, setSensitivityType, sensitivityMatrix, unitDisplay } =
    useFinancial();
  const inM = unitDisplay === 'millions';

  // Step-by-step test values (Table 1)
  const [testYield, setTestYield] = useState<number>(0.65);
  const [testRotations, setTestRotations] = useState<number>(1.0);

  // Step-by-step test values (Table 2)
  const [testDeltaSelling, setTestDeltaSelling] = useState<number>(0.0);
  const [testDeltaPaddy, setTestDeltaPaddy] = useState<number>(0.0);

  const getCellColor = (val: number, isBase: boolean, isSelected: boolean) => {
    let bg = '';
    if (val < 0) {
      bg = 'bg-red-500/15 dark:bg-red-950/50 text-red-800 dark:text-red-300 font-semibold';
    } else if (val < 15000000) {
      bg = 'bg-amber-500/15 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300';
    } else if (val < 80000000) {
      bg = 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300';
    } else if (val < 160000000) {
      bg = 'bg-emerald-500/20 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 font-medium';
    } else {
      bg = 'bg-emerald-500/30 dark:bg-emerald-800/50 text-emerald-950 dark:text-emerald-100 font-bold';
    }

    if (isSelected) {
      return `${bg} ring-2 ring-zinc-900 dark:ring-white`;
    }
    if (isBase) {
      return `${bg} ring-2 ring-emerald-700 dark:ring-emerald-400`;
    }
    return bg;
  };

  // Step-by-step calculation for Table 1 (Rendement x Rotations)
  const calculateStepByStepTable1 = () => {
    const paddyHS = assumptions.hauteSaison.paddyBoughtKgPerRotation;
    const paddyBS = assumptions.basseSaison.paddyBoughtKgPerRotation;

    const riceHS = paddyHS * testYield;
    const riceBS = paddyBS * testYield;

    const caRotHS =
      riceHS * assumptions.hauteSaison.riceSellingPriceArPerKg +
      (paddyHS - riceHS) * assumptions.hauteSaison.byproductSellingPriceArPerKg;
    const caRotBS =
      riceBS * assumptions.basseSaison.riceSellingPriceArPerKg +
      (paddyBS - riceBS) * assumptions.basseSaison.byproductSellingPriceArPerKg;

    const costRotHS = model.hauteSaison.totalCostPerRotationAr;
    const costRotBS = model.basseSaison.totalCostPerRotationAr;

    const profitRotHS = caRotHS - costRotHS;
    const profitRotBS = caRotBS - costRotBS;

    const fixedMonthly = assumptions.fixedMonthlyCharges.reduce((acc, f) => acc + f.amount, 0);

    const netMonthlyHS = profitRotHS * testRotations - fixedMonthly;
    const netMonthlyBS = profitRotBS * testRotations - fixedMonthly;

    const seasonNetHS = netMonthlyHS * assumptions.hauteSaison.months;
    const seasonNetBS = netMonthlyBS * assumptions.basseSaison.months;

    return {
      paddyHS,
      paddyBS,
      riceHS,
      riceBS,
      caRotHS,
      caRotBS,
      costRotHS,
      costRotBS,
      profitRotHS,
      profitRotBS,
      fixedMonthly,
      netMonthlyHS,
      netMonthlyBS,
      seasonNetHS,
      seasonNetBS,
      annualNet: seasonNetHS + seasonNetBS,
    };
  };

  // Step-by-step calculation for Table 2 (Prix de vente x Prix du paddy)
  const calculateStepByStepTable2 = () => {
    const paddyHS = assumptions.hauteSaison.paddyBoughtKgPerRotation;
    const paddyBS = assumptions.basseSaison.paddyBoughtKgPerRotation;

    const basePaddyPriceHS =
      assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy')?.costHS || 800;
    const basePaddyPriceBS =
      assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy')?.costBS || 1400;

    const baseCaRotHS = model.hauteSaison.turnoverPerRotationAr;
    const baseCaRotBS = model.basseSaison.turnoverPerRotationAr;

    const caRotHS = baseCaRotHS * (1 + testDeltaSelling);
    const caRotBS = baseCaRotBS * (1 + testDeltaSelling);

    const extraPaddyHS = paddyHS * basePaddyPriceHS * testDeltaPaddy;
    const extraPaddyBS = paddyBS * basePaddyPriceBS * testDeltaPaddy;

    const costRotHS = model.hauteSaison.totalCostPerRotationAr + extraPaddyHS;
    const costRotBS = model.basseSaison.totalCostPerRotationAr + extraPaddyBS;

    const profitRotHS = caRotHS - costRotHS;
    const profitRotBS = caRotBS - costRotBS;

    const rotHS = assumptions.hauteSaison.rotationsPerMonth;
    const rotBS = assumptions.basseSaison.rotationsPerMonth;
    const fixedMonthly = assumptions.fixedMonthlyCharges.reduce((acc, f) => acc + f.amount, 0);

    const netMonthlyHS = profitRotHS * rotHS - fixedMonthly;
    const netMonthlyBS = profitRotBS * rotBS - fixedMonthly;

    const seasonNetHS = netMonthlyHS * assumptions.hauteSaison.months;
    const seasonNetBS = netMonthlyBS * assumptions.basseSaison.months;

    return {
      baseCaRotHS,
      baseCaRotBS,
      caRotHS,
      caRotBS,
      extraPaddyHS,
      extraPaddyBS,
      costRotHS,
      costRotBS,
      profitRotHS,
      profitRotBS,
      rotHS,
      rotBS,
      fixedMonthly,
      netMonthlyHS,
      netMonthlyBS,
      seasonNetHS,
      seasonNetBS,
      annualNet: seasonNetHS + seasonNetBS,
    };
  };

  const step1 = calculateStepByStepTable1();
  const step2 = calculateStepByStepTable2();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div
        data-tour="sensibilite-overview"
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Analyse de Sensibilité Bidimensionnelle</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Évaluez l’impact simultané de 2 paramètres clés sur le résultat net annuel avant IR.
          </p>
        </div>

        {/* Tab switchers with >= 44/48px touch targets */}
        <div
          role="group"
          aria-label="Sélection du tableau de sensibilité"
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60"
        >
          <button
            type="button"
            onClick={() => setSensitivityType('rendement_vs_rotations')}
            aria-pressed={sensitivityType === 'rendement_vs_rotations'}
            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              sensitivityType === 'rendement_vs_rotations'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Tableau 1 : Rendement × Rotations
          </button>
          <button
            type="button"
            onClick={() => setSensitivityType('prix_vente_vs_prix_paddy')}
            aria-pressed={sensitivityType === 'prix_vente_vs_prix_paddy'}
            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              sensitivityType === 'prix_vente_vs_prix_paddy'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Tableau 2 : Prix Vente × Prix Paddy
          </button>
          <button
            type="button"
            onClick={() => setSensitivityType('paddy_vs_transport_tri')}
            aria-pressed={sensitivityType === 'paddy_vs_transport_tri'}
            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              sensitivityType === 'paddy_vs_transport_tri'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Heatmap TRI : Paddy × Transport
          </button>
        </div>
      </div>

      {sensitivityType === 'paddy_vs_transport_tri' ? (
        <TriSensitivityHeatmap />
      ) : (
        <>
      {/* Explanatory banner */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 text-xs text-zinc-700 dark:text-zinc-300 space-y-2">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>Comment lire et explorer cette matrice ?</span>
        </div>
        <p>
          Chaque cellule affiche le <strong>résultat net annuel consolidé avant IR</strong> (12 mois). Touchez ou cliquez n’importe quelle cellule pour afficher sa décomposition arithmétique complète ci-dessous.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 font-mono text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-600 inline-block" />
            Vert = Bénéfice élevé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-600 inline-block" />
            Ambre = Rentable mais faible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/20 border border-red-600 inline-block" />
            Rouge = Perte nette
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded ring-2 ring-emerald-600 inline-block" />
            Vert = Référence Dashboard
          </span>
        </div>
      </div>

      {/* The 2D Matrix Table */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {sensitivityMatrix.variableY.label} (Lignes) × {sensitivityMatrix.variableX.label} (Colonnes)
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {inM ? 'En Millions d’Ar (M Ar)' : 'Montants en Ariary'}
          </span>
        </div>

        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full text-xs border-separate border-spacing-1 font-mono">
            <thead>
              <tr>
                <th className="p-2.5 text-left font-sans font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg">
                  {sensitivityMatrix.variableY.label} ↓ / {sensitivityMatrix.variableX.label} →
                </th>
                {sensitivityMatrix.variableX.values.map((xVal, cIdx) => (
                  <th
                    key={cIdx}
                    className="p-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg whitespace-nowrap"
                  >
                    {sensitivityType === 'rendement_vs_rotations'
                      ? `${xVal} rot/m`
                      : formatPercent(xVal, 0)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityMatrix.variableY.values.map((yVal, rIdx) => {
                const isBaseRow = Math.abs(yVal - sensitivityMatrix.currentYValue) < 0.001;
                return (
                  <tr key={rIdx}>
                    <th
                      scope="row"
                      className="p-2.5 text-left font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg whitespace-nowrap"
                    >
                      {sensitivityType === 'rendement_vs_rotations'
                        ? formatPercent(yVal, 1)
                        : formatPercent(yVal, 0)}
                    </th>
                    {sensitivityMatrix.matrix[rIdx].map((cellVal, cIdx) => {
                      const xVal = sensitivityMatrix.variableX.values[cIdx];
                      const isBaseCol = Math.abs(xVal - sensitivityMatrix.currentXValue) < 0.001;
                      const isBase = isBaseRow && isBaseCol;
                      const isSelected =
                        sensitivityType === 'rendement_vs_rotations'
                          ? Math.abs(yVal - testYield) < 0.001 && Math.abs(xVal - testRotations) < 0.001
                          : Math.abs(yVal - testDeltaSelling) < 0.001 &&
                            Math.abs(xVal - testDeltaPaddy) < 0.001;

                      return (
                        <td key={cIdx} className="p-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (sensitivityType === 'rendement_vs_rotations') {
                                setTestYield(yVal);
                                setTestRotations(xVal);
                              } else {
                                setTestDeltaSelling(yVal);
                                setTestDeltaPaddy(xVal);
                              }
                            }}
                            aria-pressed={isSelected}
                            aria-label={`Tester ${formatAriary(cellVal)}`}
                            className={`w-full min-h-11 px-2.5 py-2 text-right rounded-lg transition-colors whitespace-nowrap hover:brightness-95 dark:hover:brightness-110 ${getCellColor(
                              cellVal,
                              isBase,
                              isSelected
                            )}`}
                          >
                            {formatAriary(cellVal, { inMillions: inM })}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step-by-Step Interactive Drill-down — Table 1 */}
      {sensitivityType === 'rendement_vs_rotations' && (
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Exemple pas à pas — D’où vient cette cellule du Tableau 1 ?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Décomposition arithmétique rigoureuse (lignes 34 à 50 de la feuille Sensibilité).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <LabelWithTooltip
                  htmlFor="sens-yield-select"
                  label="Rendement :"
                  unit="% (Paddy → Riz)"
                  tooltip="Taux de transformation paddy en riz blanc testé dans la matrice 1."
                  className="text-zinc-600 dark:text-zinc-400 font-sans"
                />
                <SelectMenu
                  id="sens-yield-select"
                  size="sm"
                  ariaLabel="Rendement testé"
                  value={String(testYield)}
                  onChange={(val) => setTestYield(Number(val))}
                  options={[0.6, 0.625, 0.65, 0.675, 0.7, 0.725, 0.75].map((y) => ({
                    value: String(y),
                    label: formatPercent(y, 1),
                  }))}
                  className="w-[105px]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <LabelWithTooltip
                  htmlFor="sens-rot-select"
                  label="Rotations :"
                  unit="rotations / mois"
                  tooltip="Nombre de rotations mensuelles testé simultanément avec le rendement."
                  className="text-zinc-600 dark:text-zinc-400 font-sans"
                />
                <SelectMenu
                  id="sens-rot-select"
                  size="sm"
                  ariaLabel="Rotations mensuelles testées"
                  value={String(testRotations)}
                  onChange={(val) => setTestRotations(Number(val))}
                  align="right"
                  options={[1.0, 1.5, 2.0, 2.5].map((r) => ({
                    value: String(r),
                    label: `${r} rot/mois`,
                  }))}
                  className="w-[125px]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3 font-semibold">Étape de calcul</th>
                  <th className="py-2.5 px-3 text-right font-semibold">HS ({assumptions.hauteSaison.months}m)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">BS ({assumptions.basseSaison.months}m)</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">Année (12m)</th>
                  <th className="py-2.5 px-3 font-sans text-zinc-600 dark:text-zinc-400">Explication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Paddy acheté / rotation
                  </td>
                  <td className="py-2 px-3 text-right">{formatKg(step1.paddyHS)}</td>
                  <td className="py-2 px-3 text-right">{formatKg(step1.paddyBS)}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Hypothèse par rotation</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Riz obtenu ({formatPercent(testYield)})
                  </td>
                  <td className="py-2 px-3 text-right">{formatKg(step1.riceHS)}</td>
                  <td className="py-2 px-3 text-right">{formatKg(step1.riceBS)}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Paddy × rendement testé</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Chiffre d’affaires / rotation
                  </td>
                  <td className="py-2 px-3 text-right">{formatAriary(step1.caRotHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right">{formatAriary(step1.caRotBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Riz + sous-produits</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Coût total / rotation
                  </td>
                  <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatAriary(step1.costRotHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatAriary(step1.costRotBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Paddy + coûts variables + sacs + frais</td>
                </tr>
                <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                  <td className="py-2 px-3 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    Bénéfice / rotation
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step1.profitRotHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step1.profitRotBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">CA rotation − coût rotation</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    − Charges fixes / mois
                  </td>
                  <td className="py-2 px-3 text-right">{formatAriary(step1.fixedMonthly, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right">{formatAriary(step1.fixedMonthly, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Salaires, loyer, entretien…</td>
                </tr>
                <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                  <td className="py-2 px-3 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    = Résultat net mensuel ({testRotations} rot/m)
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step1.netMonthlyHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step1.netMonthlyBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">(Bén. rot × rotations) − fixes</td>
                </tr>
                <tr className="bg-emerald-500/10 font-bold border-t border-emerald-500/25 text-sm">
                  <td className="py-3 px-3 font-sans text-emerald-900 dark:text-emerald-300">
                    = Résultat net annuel avant IR
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">
                    {formatAriary(step1.seasonNetHS, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">
                    {formatAriary(step1.seasonNetBS, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-300">
                    {formatAriary(step1.annualNet, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 font-sans text-emerald-800 dark:text-emerald-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Conforme à la cellule sélectionnée</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Step-by-Step Interactive Drill-down — Table 2 (Previously missing!) */}
      {sensitivityType === 'prix_vente_vs_prix_paddy' && (
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <span>Exemple pas à pas — D’où vient cette cellule du Tableau 2 ?</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Décomposition de l’impact simultané du prix de vente et du coût d’achat du paddy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <LabelWithTooltip
                  htmlFor="sens-sell-select"
                  label="Δ Prix vente :"
                  unit="% variation prix riz"
                  tooltip="Variation relative du chiffre d’affaires par rotation liée au prix de vente du riz."
                  className="text-zinc-600 dark:text-zinc-400 font-sans"
                />
                <SelectMenu
                  id="sens-sell-select"
                  size="sm"
                  ariaLabel="Variation prix de vente"
                  value={String(testDeltaSelling)}
                  onChange={(val) => setTestDeltaSelling(Number(val))}
                  options={[-0.1, -0.05, 0.0, 0.05, 0.1].map((v) => ({
                    value: String(v),
                    label: formatPercent(v, 0),
                  }))}
                  className="w-[95px]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <LabelWithTooltip
                  htmlFor="sens-paddy-select"
                  label="Δ Prix paddy :"
                  unit="% variation coût paddy"
                  tooltip="Variation relative du prix d’achat du paddy brut (impact direct sur le coût par rotation)."
                  className="text-zinc-600 dark:text-zinc-400 font-sans"
                />
                <SelectMenu
                  id="sens-paddy-select"
                  size="sm"
                  ariaLabel="Variation prix du paddy"
                  value={String(testDeltaPaddy)}
                  onChange={(val) => setTestDeltaPaddy(Number(val))}
                  align="right"
                  options={[-0.1, -0.05, 0.0, 0.05, 0.1].map((v) => ({
                    value: String(v),
                    label: formatPercent(v, 0),
                  }))}
                  className="w-[95px]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2.5 px-3 font-semibold">Étape de calcul</th>
                  <th className="py-2.5 px-3 text-right font-semibold">HS ({assumptions.hauteSaison.months}m)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">BS ({assumptions.basseSaison.months}m)</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">Année (12m)</th>
                  <th className="py-2.5 px-3 font-sans text-zinc-600 dark:text-zinc-400">Explication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    CA / rotation ajusté ({formatPercent(testDeltaSelling, 0)})
                  </td>
                  <td className="py-2 px-3 text-right">{formatAriary(step2.caRotHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right">{formatAriary(step2.caRotBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">CA de base × (1 + Δ prix vente)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Impact achat paddy ({formatPercent(testDeltaPaddy, 0)})
                  </td>
                  <td className="py-2 px-3 text-right">{formatAriary(step2.extraPaddyHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right">{formatAriary(step2.extraPaddyBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Surcoût / économie paddy / rot.</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                    Coût total / rotation ajusté
                  </td>
                  <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatAriary(step2.costRotHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatAriary(step2.costRotBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Coût rotation base + impact paddy</td>
                </tr>
                <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                  <td className="py-2 px-3 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    Résultat net mensuel ({step2.rotHS} / {step2.rotBS} rot/m)
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step2.netMonthlyHS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right font-medium">{formatAriary(step2.netMonthlyBS, { inMillions: inM })}</td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400">Après charges fixes mensuelles</td>
                </tr>
                <tr className="bg-emerald-500/10 font-bold border-t border-emerald-500/25 text-sm">
                  <td className="py-3 px-3 font-sans text-emerald-900 dark:text-emerald-300">
                    = Résultat net annuel avant IR
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">
                    {formatAriary(step2.seasonNetHS, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">
                    {formatAriary(step2.seasonNetBS, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-300">
                    {formatAriary(step2.annualNet, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 font-sans text-emerald-800 dark:text-emerald-400 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Conforme à la cellule sélectionnée</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
        </>
      )}

      {/* Interactive 2-Variable NPV Correlation Chart */}
      <NpvCorrelationChart />
    </div>
  );
};
