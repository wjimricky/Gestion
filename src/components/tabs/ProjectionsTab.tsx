import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { ProjectionsChart } from '../charts/FinancialCharts';
import { CashBurnChart } from '../charts/CashBurnChart';
import { PaddySankeyChart } from '../charts/PaddySankeyChart';
import { BagValueBreakdownChart } from '../charts/BagValueBreakdownChart';
import { AnnualComparisonView } from '../ui/AnnualComparisonView';
import { ViewToggle } from '../ui/ViewToggle';
import { TrendingUp, Compass, ArrowUpRight, Download } from 'lucide-react';

export const ProjectionsTab: React.FC = () => {
  const {
    model,
    assumptions,
    unitDisplay,
    exportProjectionsToCsv,
    exportFiveYearProjectionsToCsv,
  } = useFinancial();
  const inM = unitDisplay === 'millions';
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const { realistic, ambitious } = model.projections;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Projections des Flux Nets — Années 1 à 3</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Évolution pluriannuelle des flux nets de trésorerie après impôt (IR) et justification des hypothèses de croissance.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={exportProjectionsToCsv}
            title="Télécharger les flux nets projetés A1–A3 (Réaliste & Ambitieux) au format CSV pour Excel ou Google Sheets"
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-900 dark:text-zinc-100 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>CSV (CF A1–A3)</span>
          </button>
          <button
            type="button"
            onClick={exportFiveYearProjectionsToCsv}
            title="Exporter les données numériques brutes sur 5 ans (Années 1–5 et 60 mois) pour analyse complète dans Excel ou Google Sheets"
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-indigo-600/25 dark:border-indigo-400/25 bg-indigo-600 hover:bg-indigo-500 dark:bg-[#23213D] dark:hover:bg-[#2E2B50] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-teal-300" aria-hidden="true" />
            <span>Exporter CSV brut (5 ans)</span>
          </button>
        </div>
      </div>

      {/* Visual Chart */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Trajectoire des Bénéfices Nets : Réaliste vs Ambitieux
        </h2>
        <ProjectionsChart
          realistic={realistic}
          ambitious={ambitious}
          realisticGrowthY2={assumptions.growthRateYear2}
          realisticGrowthY3={assumptions.growthRateYear3}
          ambitiousGrowthY2={assumptions.ambitiousGrowthRateYear2}
          ambitiousGrowthY3={assumptions.ambitiousGrowthRateYear3}
        />
      </section>

      {/* Cash Burn & Runway before break-even */}
      <CashBurnChart />

      {/* Diagramme Sankey — Flux de transformation du paddy */}
      <PaddySankeyChart />

      {/* Répartition de la valeur du sac de riz */}
      <BagValueBreakdownChart />

      {/* Comparaison Annuelle 5 ans (Compte de Résultat + CAGR) */}
      <AnnualComparisonView />

      {/* Projections Table: Realistic Baseline */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Scénario Réaliste Retenu (Base de Calcul VAN & TRI)
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              Résultats nets après IR
            </span>
          </div>
          <div className="no-print">
            <ViewToggle mode={mobileView} onChange={setMobileView} />
          </div>
        </div>

        {/* Mobile Cards */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800 no-print">
            {realistic.map((p) => (
              <div key={p.year} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Année {p.year} ({p.label})
                  </span>
                  {p.growthRate !== null ? (
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      +{formatPercent(p.growthRate, 0)}
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">Base A1</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      Résultat net après IR
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatAriary(p.netResultAfterTaxAr, { inMillions: inM })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      Avant IR (info)
                    </div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                      {formatAriary(p.netResultBeforeTaxAr, { inMillions: inM })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{p.method}</div>
              </div>
            ))}
          </div>
        )}

        <div className={`${mobileView === 'cards' ? 'hidden sm:block print:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 font-semibold">Exercice</th>
                <th className="py-3 px-4 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  Résultat net après IR
                </th>
                <th className="py-3 px-4 text-right font-semibold">Taux de croissance</th>
                <th className="py-3 px-4 text-right font-semibold">Résultat avant IR (info)</th>
                <th className="py-3 px-4 font-sans font-semibold">Méthodologie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {realistic.map((p) => (
                <tr key={p.year}>
                  <td className="py-3 px-4 font-sans font-bold text-zinc-900 dark:text-zinc-100">
                    Année {p.year} ({p.label})
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatAriary(p.netResultAfterTaxAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {p.growthRate !== null ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{formatPercent(p.growthRate, 0)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-700 dark:text-zinc-300">
                    {formatAriary(p.netResultBeforeTaxAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-4 font-sans text-zinc-600 dark:text-zinc-400">{p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Justification of Growth Drivers */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Tableau de Justification des Hypothèses de Croissance</span>
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Leviers opérationnels de référence</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-4 font-semibold">Facteur de croissance</th>
                <th className="py-2.5 px-4 text-right font-semibold">Année 1 (Réf)</th>
                <th className="py-2.5 px-4 text-right font-semibold">Année 2</th>
                <th className="py-2.5 px-4 text-right font-semibold">Année 3</th>
                <th className="py-2.5 px-4 font-sans font-semibold">Impact sur bénéfice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Volumes vendus
                </td>
                <td className="py-2.5 px-4 text-right">{model.year1.totalRiceKgSold.toLocaleString('fr-FR')} kg</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">+20 %</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">+25 %</td>
                <td className="py-2.5 px-4 font-sans text-emerald-700 dark:text-emerald-400 font-medium">
                  ↑ Bénéfice (gains d’échelle)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Prix de vente moyen
                </td>
                <td className="py-2.5 px-4 text-right">
                  {formatAriary(model.breakEven.weightedAvgSellingPriceAr)} / kg
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">+10 %</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">+10 %</td>
                <td className="py-2.5 px-4 font-sans text-emerald-700 dark:text-emerald-400 font-medium">
                  ↑ Chiffre d’affaires
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Charges fixes d’exploitation
                </td>
                <td className="py-2.5 px-4 text-right">
                  {formatAriary(model.year1.annualFixedChargesAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">+10 %</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">+15 %</td>
                <td className="py-2.5 px-4 font-sans text-red-700 dark:text-red-400 font-medium">
                  ↓ Bénéfice (renfort équipe & logistique)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Optimisation des coûts d’achat
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-500">—</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">-5 %</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">-5 %</td>
                <td className="py-2.5 px-4 font-sans text-emerald-700 dark:text-emerald-400 font-medium">
                  ↑ Marge brute
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Diversification épices (girofle, vanille)
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-500">—</td>
                <td className="py-2.5 px-4 text-right text-zinc-500">—</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">+20 %</td>
                <td className="py-2.5 px-4 font-sans text-emerald-700 dark:text-emerald-400 font-medium">
                  ↑ Bénéfice (+20 % CA en A3)
                </td>
              </tr>
              <tr className="bg-emerald-500/10 font-bold">
                <td className="py-2.5 px-4 font-sans text-emerald-900 dark:text-emerald-300">
                  Résultat net après IR résultant
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-800 dark:text-emerald-400">
                  {formatAriary(realistic[0].netResultAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-800 dark:text-emerald-400">
                  {formatAriary(realistic[1].netResultAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-800 dark:text-emerald-400">
                  {formatAriary(realistic[2].netResultAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 font-sans text-emerald-800 dark:text-emerald-400 text-xs">
                  Validé pour actualisation (VAN / TRI)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Ambitious Comparison */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <span>Scénario Ambitieux (Comparaison Haute Croissance)</span>
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Hypothèse d’expansion rapide avec commercialisation à grande échelle (+
          {formatPercent(assumptions.ambitiousGrowthRateYear2, 0)} en A2, +
          {formatPercent(assumptions.ambitiousGrowthRateYear3, 0)} en A3).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          {ambitious.map((item) => (
            <div
              key={item.year}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40"
            >
              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 mb-1">
                <span className="font-sans font-bold">Année {item.year}</span>
                {item.growthRate !== null && (
                  <span className="text-blue-700 dark:text-blue-400 font-bold">
                    +{formatPercent(item.growthRate, 0)}
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-blue-700 dark:text-blue-400">
                {formatAriary(item.netResultAfterTaxAr, { inMillions: inM })}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-sans">
                {item.method}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
