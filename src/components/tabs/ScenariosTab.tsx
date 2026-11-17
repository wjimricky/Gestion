import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { ScenariosComparisonChart } from '../charts/FinancialCharts';
import { ScenarioRadarChart } from '../charts/ScenarioRadarChart';
import { ScenarioOverlayComparisonCard } from '../ui/ScenarioOverlayComparisonCard';
import { MultiScenarioDcfComparison } from '../ui/MultiScenarioDcfComparison';
import { ScenarioNetCashFlowOverlayChart } from '../charts/ScenarioNetCashFlowOverlayChart';
import { ScenarioDiscussionMode } from '../ui/ScenarioDiscussionMode';
import { ViewToggle } from '../ui/ViewToggle';
import { CheckCircle2, AlertTriangle, XCircle, GitCompare, FolderCog, Mic, Download } from 'lucide-react';

interface ScenariosTabProps {
  onOpenScenarioManager?: () => void;
}

export const ScenariosTab: React.FC<ScenariosTabProps> = ({ onOpenScenarioManager }) => {
  const {
    model,
    assumptions,
    savedScenarios,
    activeScenarioId,
    unitDisplay,
    scenarioVoiceNotes,
    exportFiveYearProjectionsToCsv,
  } = useFinancial();
  const inM = unitDisplay === 'millions';
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');
  const [discussionModeOpen, setDiscussionModeOpen] = useState<boolean>(true);

  const { pessimiste, realiste, optimiste } = model.scenarios;
  const activeSaved = savedScenarios.find((s) => s.id === activeScenarioId);
  const hsMonths = assumptions.hauteSaison.months;
  const bsMonths = assumptions.basseSaison.months;
  const taxPct = formatPercent(assumptions.corporateTaxRate, 0);

  const getVerdictIndicator = (verdict: string) => {
    switch (verdict) {
      case 'Rentable sur les 2 saisons':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{verdict}</span>
          </span>
        );
      case 'Une saison déficitaire':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/12 text-amber-900 dark:text-amber-300 border border-amber-500/25">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{verdict}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/12 text-red-800 dark:text-red-300 border border-red-500/25">
            <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{verdict}</span>
          </span>
        );
    }
  };

  const mobileGroups = [
    {
      section: 'Consolidation Année 1 (12 mois)',
      metrics: [
        {
          label: "Chiffre d'affaires annuel",
          pess: formatAriary(pessimiste.annualTurnoverAr, { inMillions: inM }),
          real: formatAriary(realiste.annualTurnoverAr, { inMillions: inM }),
          opt: formatAriary(optimiste.annualTurnoverAr, { inMillions: inM }),
        },
        {
          label: 'Coûts totaux annuels',
          pess: formatAriary(pessimiste.annualTotalCostsAr, { inMillions: inM }),
          real: formatAriary(realiste.annualTotalCostsAr, { inMillions: inM }),
          opt: formatAriary(optimiste.annualTotalCostsAr, { inMillions: inM }),
        },
        ...(assumptions.riskAnalysis?.enabled && assumptions.riskAnalysis?.integrateIntoScenarios
          ? [
              {
                label: 'Perte espérée (Risques op.)',
                pess: `−${formatAriary(pessimiste.expectedRiskLossAr ?? 0, { inMillions: inM })}`,
                real: `−${formatAriary(realiste.expectedRiskLossAr ?? 0, { inMillions: inM })}`,
                opt: `−${formatAriary(optimiste.expectedRiskLossAr ?? 0, { inMillions: inM })}`,
              },
            ]
          : []),
        {
          label: 'Résultat net avant IR',
          pess: formatAriary(pessimiste.annualNetBeforeTaxAr, { inMillions: inM }),
          real: formatAriary(realiste.annualNetBeforeTaxAr, { inMillions: inM }),
          opt: formatAriary(optimiste.annualNetBeforeTaxAr, { inMillions: inM }),
        },
        {
          label: `Résultat net après IR (${taxPct})`,
          pess: formatAriary(pessimiste.annualNetAfterTaxAr, { inMillions: inM }),
          real: formatAriary(realiste.annualNetAfterTaxAr, { inMillions: inM }),
          opt: formatAriary(optimiste.annualNetAfterTaxAr, { inMillions: inM }),
          highlight: true,
        },
        {
          label: 'Marge nette avant IR',
          pess: formatPercent(pessimiste.annualNetMarginRate),
          real: formatPercent(realiste.annualNetMarginRate),
          opt: formatPercent(optimiste.annualNetMarginRate),
        },
        {
          label: 'Écart vs Réaliste',
          pess: formatAriary(pessimiste.varianceFromRealisticAr, { inMillions: inM }),
          real: 'Réf (0 Ar)',
          opt: `+${formatAriary(optimiste.varianceFromRealisticAr, { inMillions: inM })}`,
        },
      ],
    },
    {
      section: `Saisons (${hsMonths}m HS / ${bsMonths}m BS)`,
      metrics: [
        {
          label: 'Résultat net mensuel HS',
          pess: formatAriary(pessimiste.monthlyNetHS, { inMillions: inM }),
          real: formatAriary(realiste.monthlyNetHS, { inMillions: inM }),
          opt: formatAriary(optimiste.monthlyNetHS, { inMillions: inM }),
        },
        {
          label: 'Résultat net mensuel BS',
          pess: formatAriary(pessimiste.monthlyNetBS, { inMillions: inM }),
          real: formatAriary(realiste.monthlyNetBS, { inMillions: inM }),
          opt: formatAriary(optimiste.monthlyNetBS, { inMillions: inM }),
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Comparaison des Scénarios — Pessimiste, Réaliste, Optimiste</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Base active : <strong className="text-zinc-900 dark:text-zinc-100">{activeSaved?.name || 'Réaliste'}</strong>. Les scénarios Pessimiste et Optimiste appliquent des chocs de marché et d’activité.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDiscussionModeOpen((prev) => !prev)}
            aria-pressed={discussionModeOpen}
            className={`min-h-12 sm:min-h-10 px-4 py-2 rounded-lg border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition-colors whitespace-nowrap ${
              discussionModeOpen
                ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              Mode Discussion ({scenarioVoiceNotes.filter((n) => !n.resolved).length})
            </span>
          </button>

          <button
            type="button"
            onClick={exportFiveYearProjectionsToCsv}
            title="Exporter les projections financières quinquennales (A1–A5 et 60 mois) en CSV"
            className="min-h-12 sm:min-h-10 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 shrink-0 transition-colors whitespace-nowrap no-print"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <span>Exporter CSV (5 ans)</span>
          </button>

          {onOpenScenarioManager && (
            <button
              type="button"
              onClick={onOpenScenarioManager}
              className="min-h-12 sm:min-h-10 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 shrink-0 transition-colors whitespace-nowrap"
            >
              <FolderCog className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Gérer mes scénarios ({savedScenarios.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Risk Expected Loss Integration Banner */}
      {assumptions.riskAnalysis?.enabled && assumptions.riskAnalysis?.integrateIntoScenarios && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-rose-500/35 bg-rose-500/[0.06] text-xs text-zinc-800 dark:text-zinc-200 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <span>
              <strong>Perte espérée des risques opérationnels intégrée</strong> dans les résultats :{' '}
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                Pessimiste −{formatAriary(pessimiste.expectedRiskLossAr ?? 0, { inMillions: true })}
              </span>
              {' · '}
              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                Réaliste −{formatAriary(realiste.expectedRiskLossAr ?? 0, { inMillions: true })}
              </span>
              {' · '}
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                Optimiste −{formatAriary(optimiste.expectedRiskLossAr ?? 0, { inMillions: true })}
              </span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Réglage : Hypothèses → Module 17
          </span>
        </div>
      )}

      {/* Mode Discussion : Notes vocales Web Speech attachées au plan de financement */}
      {discussionModeOpen && <ScenarioDiscussionMode />}

      {/* Comparaison Côte à Côte avec superposition graphique de deux scénarios */}
      <ScenarioOverlayComparisonCard />

      {/* Superposition du Flux de Trésorerie Net de 2 scénarios sélectionnés */}
      <ScenarioNetCashFlowOverlayChart />

      {/* Comparaison Multi-Scénarios : Courbes DCF superposées (2 à 6 scénarios) */}
      <MultiScenarioDcfComparison />

      {/* Visual Chart */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Comparaison Graphique des Performances Annuelles
        </h2>
        <ScenariosComparisonChart scenarios={{ pessimiste, realiste, optimiste }} />
      </section>

      {/* Radar Chart: Forces & Faiblesses multi-axes */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
        <ScenarioRadarChart assumptions={assumptions} model={model} inMillions={inM} />
      </section>

      {/* Side-by-Side Comparison Matrix */}
      <section
        data-tour="scenarios-overview"
        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Tableau Comparatif Détaillé
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              Année 1 ({hsMonths}m HS + {bsMonths}m BS)
            </span>
          </div>
          <ViewToggle mode={mobileView} onChange={setMobileView} />
        </div>

        {/* Mobile Cards View */}
        {mobileView === 'cards' && (
          <div className="sm:hidden p-4 space-y-4">
            {/* Verdicts summary */}
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: 'Pessimiste', res: pessimiste },
                { name: 'Réaliste (Dashboard)', res: realiste },
                { name: 'Optimiste', res: optimiste },
              ].map((item) => (
                <div
                  key={item.name}
                  className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                  {getVerdictIndicator(item.res.verdict)}
                </div>
              ))}
            </div>

            {mobileGroups.map((group) => (
              <div key={group.section} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  {group.section}
                </h3>
                {group.metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`p-3.5 rounded-xl border ${
                      m.highlight
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {m.label}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <div className="text-[11px] font-sans text-amber-700 dark:text-amber-400">Pessimiste</div>
                        <div className="font-semibold mt-0.5">{m.pess}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-sans text-emerald-700 dark:text-emerald-400">Réaliste</div>
                        <div className="font-bold mt-0.5">{m.real}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-sans text-cyan-700 dark:text-cyan-400">Optimiste</div>
                        <div className="font-semibold mt-0.5">{m.opt}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Full Table */}
        <div className={`${mobileView === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 font-semibold">Indicateurs & Hypothèses</th>
                <th className="py-3 px-4 text-right font-semibold text-amber-700 dark:text-amber-400">
                  Pessimiste
                </th>
                <th className="py-3 px-4 text-right font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10">
                  Réaliste (Dashboard)
                </th>
                <th className="py-3 px-4 text-right font-semibold text-cyan-700 dark:text-cyan-400">
                  Optimiste
                </th>
                <th className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-400 font-sans">
                  Remarque métier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {/* SECTION 1: AJUSTEMENTS */}
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/30 font-sans font-bold">
                <td colSpan={5} className="py-2 px-4 uppercase text-xs tracking-wider text-zinc-600 dark:text-zinc-400">
                  Ajustements appliqués
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                  Δ Rendement paddy → riz (points de %)
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">-5.0 pts</td>
                <td className="py-2.5 px-4 text-right font-medium bg-emerald-500/5">0.0 pt</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">+2.5 pts</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Ajouté au rendement de base ({formatPercent(assumptions.hauteSaison.yieldPaddyToRice, 0)})
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                  Δ Prix de vente du riz (%)
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">-5.0 %</td>
                <td className="py-2.5 px-4 text-right font-medium bg-emerald-500/5">0.0 %</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">+5.0 %</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Appliqué au prix de vente (HS et BS)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                  Δ Prix d’achat du paddy (%)
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">+5.0 %</td>
                <td className="py-2.5 px-4 text-right font-medium bg-emerald-500/5">0.0 %</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">-5.0 %</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Surcoût / économie à l’achat du paddy
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                  Δ Rotations par mois
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">-0.5 rot</td>
                <td className="py-2.5 px-4 text-right font-medium bg-emerald-500/5">0.0 rot</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">+0.5 rot</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Ajouté au nombre de rotations (HS et BS)
                </td>
              </tr>

              {/* SECTION 2: HAUTE SAISON */}
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/30 font-sans font-bold">
                <td colSpan={5} className="py-2 px-4 uppercase text-xs tracking-wider text-emerald-700 dark:text-emerald-400">
                  Haute Saison ({hsMonths} mois)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Rendement résultant</td>
                <td className="py-2.5 px-4 text-right">{formatPercent(pessimiste.yieldHS)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatPercent(realiste.yieldHS)}</td>
                <td className="py-2.5 px-4 text-right">{formatPercent(optimiste.yieldHS)}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Taux de conversion paddy en riz</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Prix de vente riz (Ar/kg)</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.ricePriceHS)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.ricePriceHS)}</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(optimiste.ricePriceHS)}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Prix moyen de vente en HS</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Prix paddy (Ar/kg)</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.paddyPriceHS)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.paddyPriceHS)}</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(optimiste.paddyPriceHS)}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Coût matière première</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Rotations par mois</td>
                <td className="py-2.5 px-4 text-right">{pessimiste.rotationsHS}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{realiste.rotationsHS}</td>
                <td className="py-2.5 px-4 text-right">{optimiste.rotationsHS}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Fréquence mensuelle</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Résultat net mensuel (HS)</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.monthlyNetHS, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.monthlyNetHS, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(optimiste.monthlyNetHS, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Après charges fixes du mois</td>
              </tr>

              {/* SECTION 3: BASSE SAISON */}
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/30 font-sans font-bold">
                <td colSpan={5} className="py-2 px-4 uppercase text-xs tracking-wider text-cyan-700 dark:text-cyan-400">
                  Basse Saison ({bsMonths} mois)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Prix de vente riz (Ar/kg)</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.ricePriceBS)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.ricePriceBS)}</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(optimiste.ricePriceBS)}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Prix de vente en période creuse</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Prix paddy (Ar/kg)</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.paddyPriceBS)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.paddyPriceBS)}</td>
                <td className="py-2.5 px-4 text-right">{formatAriary(optimiste.paddyPriceBS)}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Paddy plus cher en BS</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Résultat net mensuel (BS)</td>
                <td className={`py-2.5 px-4 text-right font-bold ${pessimiste.monthlyNetBS < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>
                  {formatAriary(pessimiste.monthlyNetBS, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.monthlyNetBS, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAriary(optimiste.monthlyNetBS, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  {pessimiste.monthlyNetBS < 0 ? 'Déficit mensuel en BS pour le pessimiste' : 'Excédentaire'}
                </td>
              </tr>

              {/* SECTION 4: CONSOLIDATION ANNUELLE */}
              <tr className="bg-zinc-50/70 dark:bg-zinc-800/30 font-sans font-bold">
                <td colSpan={5} className="py-2 px-4 uppercase text-xs tracking-wider text-zinc-700 dark:text-zinc-300">
                  Consolidation Année 1 ({hsMonths + bsMonths} mois)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                  Chiffre d’affaires annuel
                </td>
                <td className="py-2.5 px-4 text-right">{formatAriary(pessimiste.annualTurnoverAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatAriary(realiste.annualTurnoverAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right text-cyan-700 dark:text-cyan-400 font-bold">
                  {formatAriary(optimiste.annualTurnoverAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">CA total consolidé</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Coûts totaux annuels</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{formatAriary(pessimiste.annualTotalCostsAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right font-medium text-red-700 dark:text-red-400 bg-emerald-500/5">
                  {formatAriary(realiste.annualTotalCostsAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{formatAriary(optimiste.annualTotalCostsAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Achats + charges fixes{assumptions.riskAnalysis?.integrateIntoScenarios ? ' + perte espérée' : ''}
                </td>
              </tr>
              {assumptions.riskAnalysis?.enabled && assumptions.riskAnalysis?.integrateIntoScenarios && (
                <tr className="bg-rose-500/[0.04]">
                  <td className="py-2.5 px-4 font-sans text-rose-800 dark:text-rose-300 font-medium">
                    Dont perte espérée (Risques op.)
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700 dark:text-rose-400 font-semibold">
                    −{formatAriary(pessimiste.expectedRiskLossAr ?? 0, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700 dark:text-rose-400 font-semibold bg-emerald-500/5">
                    −{formatAriary(realiste.expectedRiskLossAr ?? 0, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-700 dark:text-rose-400 font-semibold">
                    −{formatAriary(optimiste.expectedRiskLossAr ?? 0, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                    Σ (pᵢ × Impactᵢ) pondérée par scénario
                  </td>
                </tr>
              )}
              <tr className="font-bold">
                <td className="py-2.5 px-4 font-sans text-zinc-900 dark:text-zinc-100">Résultat net avant IR</td>
                <td className="py-2.5 px-4 text-right text-amber-700 dark:text-amber-400">{formatAriary(pessimiste.annualNetBeforeTaxAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 text-sm">
                  {formatAriary(realiste.annualNetBeforeTaxAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-cyan-700 dark:text-cyan-400 text-sm">
                  {formatAriary(optimiste.annualNetBeforeTaxAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Bénéfice imposable</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Impôt sur le Revenu ({taxPct})</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{formatAriary(pessimiste.annualTaxAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 bg-emerald-500/5">{formatAriary(realiste.annualTaxAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{formatAriary(optimiste.annualTaxAr, { inMillions: inM })}</td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">MAX(0, Bénéfice) × {taxPct}</td>
              </tr>
              <tr className="bg-emerald-500/10 font-bold border-t border-emerald-500/25">
                <td className="py-3 px-4 font-sans text-emerald-900 dark:text-emerald-300">
                  Résultat net après IR
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 dark:text-emerald-400">
                  {formatAriary(pessimiste.annualNetAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 dark:text-emerald-300 text-sm bg-emerald-500/10">
                  {formatAriary(realiste.annualNetAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 dark:text-emerald-300 text-sm">
                  {formatAriary(optimiste.annualNetAfterTaxAr, { inMillions: inM })}
                </td>
                <td className="py-3 px-4 font-sans text-emerald-800 dark:text-emerald-400">
                  Dividendes distribuables
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Marge nette avant IR</td>
                <td className="py-2.5 px-4 text-right">{formatPercent(pessimiste.annualNetMarginRate)}</td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">{formatPercent(realiste.annualNetMarginRate)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  {formatPercent(optimiste.annualNetMarginRate)}
                </td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Résultat avant IR / CA</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">Écart vs Réaliste</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">
                  {formatAriary(pessimiste.varianceFromRealisticAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right font-bold bg-emerald-500/5">Réf (0 Ar)</td>
                <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                  +{formatAriary(optimiste.varianceFromRealisticAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">Différence de profit annuel</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                  Verdict de viabilité
                </td>
                <td className="py-3 px-4 text-right">{getVerdictIndicator(pessimiste.verdict)}</td>
                <td className="py-3 px-4 text-right bg-emerald-500/5">{getVerdictIndicator(realiste.verdict)}</td>
                <td className="py-3 px-4 text-right">{getVerdictIndicator(optimiste.verdict)}</td>
                <td className="py-3 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                  Contrôle de rentabilité des 2 saisons
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
