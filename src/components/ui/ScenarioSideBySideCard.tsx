import React, { useMemo, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { calculateFullModel } from '../../engine/calculator';
import { FullFinancialModel, ScenarioResult } from '../../types/finance';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { applyScenarioDefinitionToAssumptions } from '../../utils/scenarioHelpers';
import { AnimatedNumber } from './AnimatedNumber';
import { SelectMenu, SelectMenuOption } from './SelectMenu';
import {
  ArrowLeftRight,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface SelectableScenarioOption {
  id: string;
  label: string;
  group: 'Modèle actif' | 'Scénarios sauvegardés';
  scenarioResult: ScenarioResult;
  fullModel: FullFinancialModel;
}

interface ComparisonRow {
  id: string;
  label: string;
  valA: number;
  valB: number;
  kind: 'currency' | 'currency_millions' | 'percent' | 'months';
  invertFavorability?: boolean; // true for costs or payback where lower is better
  emphasize?: boolean;
}

export const ScenarioSideBySideCard: React.FC<{ onNavigate?: (tabId: string) => void }> = ({
  onNavigate,
}) => {
  const { model, savedScenarios, unitDisplay, assumptions } = useFinancial();
  const inM = unitDisplay === 'millions';
  const taxPct = formatPercent(assumptions.corporateTaxRate, 0);
  const discountPct = formatPercent(assumptions.discountRate, 0);

  // Compute complete FinancialModel (CA, Résultat Net, VAN, Payback) for built-in and saved scenarios
  const options = useMemo<SelectableScenarioOption[]>(() => {
    const optimisteAssumptions = applyScenarioDefinitionToAssumptions(
      assumptions,
      model.scenarios.optimiste.definition
    );
    const pessimisteAssumptions = applyScenarioDefinitionToAssumptions(
      assumptions,
      model.scenarios.pessimiste.definition
    );

    const optimisteModel = calculateFullModel(optimisteAssumptions);
    const pessimisteModel = calculateFullModel(pessimisteAssumptions);

    const builtIn: SelectableScenarioOption[] = [
      {
        id: 'model:realiste',
        label: 'Réaliste (Base active)',
        group: 'Modèle actif',
        scenarioResult: model.scenarios.realiste,
        fullModel: model,
      },
      {
        id: 'model:optimiste',
        label: 'Optimiste (+chocs positifs)',
        group: 'Modèle actif',
        scenarioResult: model.scenarios.optimiste,
        fullModel: optimisteModel,
      },
      {
        id: 'model:pessimiste',
        label: 'Pessimiste (Stress marché)',
        group: 'Modèle actif',
        scenarioResult: model.scenarios.pessimiste,
        fullModel: pessimisteModel,
      },
    ];

    const savedOptions: SelectableScenarioOption[] = savedScenarios.map((sc) => {
      const computed = calculateFullModel(sc.assumptions);
      return {
        id: `saved:${sc.id}`,
        label: sc.name,
        group: 'Scénarios sauvegardés',
        scenarioResult: computed.scenarios.realiste,
        fullModel: computed,
      };
    });

    return [...builtIn, ...savedOptions];
  }, [assumptions, model, savedScenarios]);

  const [scenarioAId, setScenarioAId] = useState<string>('model:realiste');
  const [scenarioBId, setScenarioBId] = useState<string>('model:optimiste');

  const optionA = options.find((o) => o.id === scenarioAId) || options[0];
  const optionB = options.find((o) => o.id === scenarioBId) || options[1] || options[0];

  const handleSwap = () => {
    setScenarioAId(optionB.id);
    setScenarioBId(optionA.id);
  };

  const rows: ComparisonRow[] = [
    {
      id: 'ca',
      label: "Chiffre d'affaires annuel (CA)",
      valA: optionA.fullModel.year1.totalTurnoverAr,
      valB: optionB.fullModel.year1.totalTurnoverAr,
      kind: 'currency',
    },
    {
      id: 'costs',
      label: 'Coûts totaux annuels',
      valA: optionA.scenarioResult.annualTotalCostsAr,
      valB: optionB.scenarioResult.annualTotalCostsAr,
      kind: 'currency',
      invertFavorability: true,
    },
    {
      id: 'ebt',
      label: 'Résultat net avant IR',
      valA: optionA.fullModel.year1.netResultBeforeTaxAr,
      valB: optionB.fullModel.year1.netResultBeforeTaxAr,
      kind: 'currency',
    },
    {
      id: 'net',
      label: `Résultat net après IR (${taxPct})`,
      valA: optionA.fullModel.year1.netResultAfterTaxAr,
      valB: optionB.fullModel.year1.netResultAfterTaxAr,
      kind: 'currency',
      emphasize: true,
    },
    {
      id: 'margin',
      label: 'Marge nette après IR',
      valA: optionA.fullModel.year1.netMarginAfterTaxRate,
      valB: optionB.fullModel.year1.netMarginAfterTaxRate,
      kind: 'percent',
    },
    {
      id: 'npv',
      label: `VAN à 3 ans (r = ${discountPct})`,
      valA: optionA.fullModel.npv.npvAr,
      valB: optionB.fullModel.npv.npvAr,
      kind: 'currency_millions',
      emphasize: true,
    },
    {
      id: 'payback',
      label: 'Payback saisonnier',
      valA: optionA.fullModel.payback.paybackMonths,
      valB: optionB.fullModel.payback.paybackMonths,
      kind: 'months',
      invertFavorability: true,
    },
  ];

  const formatMetricValue = (val: number, kind: ComparisonRow['kind']) => {
    if (kind === 'currency') return formatAriary(val, { inMillions: inM });
    if (kind === 'currency_millions') return formatAriary(val, { inMillions: true });
    if (kind === 'months') return formatMonths(val);
    return formatPercent(val);
  };

  const renderDeltaCells = (row: ComparisonRow) => {
    // Handle non-recovered payback (-1) safely
    if (row.kind === 'months' && (row.valA <= 0 || row.valB <= 0)) {
      return {
        absFormatted: row.valA === row.valB ? '—' : row.valB > 0 ? 'Récupéré' : '> 36 mois',
        pctFormatted: '—',
        toneClass:
          row.valA === row.valB
            ? 'text-zinc-500 dark:text-zinc-400'
            : row.valB > 0
            ? 'text-teal-700 dark:text-teal-400'
            : 'text-rose-700 dark:text-rose-400',
        DeltaIcon: Minus,
      };
    }

    const diffAbs = row.valB - row.valA;
    const isZero = Math.abs(diffAbs) < (row.kind === 'percent' ? 1e-5 : 0.05);
    const pctDiff =
      Math.abs(row.valA) > 1e-6 ? (diffAbs / Math.abs(row.valA)) * 100 : null;

    const isFavorable = row.invertFavorability ? diffAbs < 0 : diffAbs > 0;
    const toneClass = isZero
      ? 'text-zinc-500 dark:text-zinc-400'
      : isFavorable
      ? 'text-teal-700 dark:text-teal-400'
      : 'text-rose-700 dark:text-rose-400';

    let absFormatted = '—';
    if (!isZero) {
      if (row.kind === 'currency') {
        absFormatted = `${diffAbs > 0 ? '+' : ''}${formatAriary(diffAbs, { inMillions: inM })}`;
      } else if (row.kind === 'currency_millions') {
        absFormatted = `${diffAbs > 0 ? '+' : ''}${formatAriary(diffAbs, { inMillions: true })}`;
      } else if (row.kind === 'months') {
        absFormatted = `${diffAbs > 0 ? '+' : ''}${diffAbs.toFixed(2)} mois`;
      } else {
        absFormatted = `${diffAbs > 0 ? '+' : ''}${(diffAbs * 100).toFixed(1)} pts`;
      }
    }

    const pctFormatted =
      isZero || pctDiff === null
        ? '—'
        : `${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)} %`;

    const DeltaIcon = isZero ? Minus : diffAbs > 0 ? TrendingUp : TrendingDown;

    return { absFormatted, pctFormatted, toneClass, DeltaIcon };
  };

  const renderVerdictText = (verdict: ScenarioResult['verdict']) => {
    if (verdict === 'Rentable sur les 2 saisons') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{verdict}</span>
        </span>
      );
    }
    if (verdict === 'Une saison déficitaire') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{verdict}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{verdict}</span>
      </span>
    );
  };

  return (
    <section
      data-tour="scenario-compare"
      aria-label="Comparaison côte à côte de deux scénarios"
      style={{ animationDelay: '320ms' }}
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden transition-colors duration-200"
    >
      {/* Header + Dual Selectors */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Comparaison Côte à Côte (Écarts B vs A)
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Sélectionnez deux scénarios pour comparer CA, Résultat Net, VAN et Payback en valeur absolue et en pourcentage.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 no-print">
          <div className="flex items-center gap-2 min-w-0">
            <label
              htmlFor="compare-scenario-a"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0"
            >
              A :
            </label>
            <SelectMenu
              id="compare-scenario-a"
              ariaLabel="Sélectionner le scénario A"
              value={optionA.id}
              onChange={setScenarioAId}
              options={options.map(
                (o): SelectMenuOption => ({
                  value: o.id,
                  label: o.label,
                  group:
                    o.group === 'Modèle actif'
                      ? 'Scénarios du modèle'
                      : 'Scénarios enregistrés',
                })
              )}
              className="w-full sm:w-[190px]"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Inverser les scénarios A et B"
            aria-label="Permuter le scénario A et le scénario B"
            className="min-h-10 min-w-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-700 dark:text-zinc-200 inline-flex items-center justify-center transition-colors shrink-0 self-center sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <label
              htmlFor="compare-scenario-b"
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0"
            >
              B :
            </label>
            <SelectMenu
              id="compare-scenario-b"
              ariaLabel="Sélectionner le scénario B"
              value={optionB.id}
              onChange={setScenarioBId}
              tone="indigo"
              align="right"
              options={options.map(
                (o): SelectMenuOption => ({
                  value: o.id,
                  label: o.label,
                  group:
                    o.group === 'Modèle actif'
                      ? 'Scénarios du modèle'
                      : 'Scénarios enregistrés',
                })
              )}
              className="w-full sm:w-[190px]"
            />
          </div>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="px-5 py-2 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-[#0E0D18] flex flex-wrap items-center justify-between gap-2 text-xs no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mr-1">Comparaisons rapides :</span>
          {[
            { label: 'Réaliste vs Optimiste', a: 'model:realiste', b: 'model:optimiste' },
            { label: 'Réaliste vs Pessimiste', a: 'model:realiste', b: 'model:pessimiste' },
            { label: 'Pessimiste vs Optimiste', a: 'model:pessimiste', b: 'model:optimiste' },
          ].map((preset) => {
            const active = scenarioAId === preset.a && scenarioBId === preset.b;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setScenarioAId(preset.a);
                  setScenarioBId(preset.b);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-indigo-500/25 dark:text-indigo-200'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-white/[0.06]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('scenarios')}
            className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            Analyse complète 3 axes →
          </button>
        )}
      </div>

      {/* Mobile Compact Cards */}
      <div className="sm:hidden divide-y divide-zinc-200 dark:divide-white/[0.08] no-print">
        {rows.map((row) => {
          const { absFormatted, pctFormatted, toneClass, DeltaIcon } = renderDeltaCells(row);
          return (
            <div
              key={row.id}
              className={`p-3.5 space-y-1.5 ${row.emphasize ? 'bg-teal-500/10' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {row.label}
                </span>
                <span
                  className={`text-xs font-mono font-bold inline-flex items-center gap-1 tabular-nums ${toneClass}`}
                >
                  <DeltaIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{pctFormatted}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400 truncate">
                    {optionA.label}
                  </div>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {row.kind === 'months' && row.valA <= 0 ? (
                      formatMetricValue(row.valA, row.kind)
                    ) : (
                      <AnimatedNumber
                        value={row.valA}
                        format={(v) => formatMetricValue(v, row.kind)}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-sans text-indigo-700 dark:text-indigo-300 truncate">
                    {optionB.label}
                  </div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {row.kind === 'months' && row.valB <= 0 ? (
                      formatMetricValue(row.valB, row.kind)
                    ) : (
                      <AnimatedNumber
                        value={row.valB}
                        format={(v) => formatMetricValue(v, row.kind)}
                      />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                    Écart B−A
                  </div>
                  <div className={`font-bold ${toneClass}`}>{absFormatted}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / Print Compact Comparison Table */}
      <div className="hidden sm:block print:block overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
          <thead>
            <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
              <th className="py-2.5 px-4 font-semibold">Indicateur clé</th>
              <th className="py-2.5 px-4 text-right font-semibold max-w-[160px] truncate">
                A · {optionA.label}
              </th>
              <th className="py-2.5 px-4 text-right font-semibold text-indigo-700 dark:text-indigo-300 max-w-[160px] truncate">
                B · {optionB.label}
              </th>
              <th className="py-2.5 px-4 text-right font-semibold">Écart absolu (B − A)</th>
              <th className="py-2.5 px-4 text-right font-semibold">Écart (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            {rows.map((row) => {
              const { absFormatted, pctFormatted, toneClass, DeltaIcon } = renderDeltaCells(row);
              return (
                <tr
                  key={row.id}
                  className={
                    row.emphasize
                      ? 'bg-teal-500/10 font-bold border-t border-teal-500/25'
                      : 'hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors'
                  }
                >
                  <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-700 dark:text-zinc-300">
                    {row.kind === 'months' && row.valA <= 0 ? (
                      formatMetricValue(row.valA, row.kind)
                    ) : (
                      <AnimatedNumber
                        value={row.valA}
                        format={(v) => formatMetricValue(v, row.kind)}
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-zinc-900 dark:text-white">
                    {row.kind === 'months' && row.valB <= 0 ? (
                      formatMetricValue(row.valB, row.kind)
                    ) : (
                      <AnimatedNumber
                        value={row.valB}
                        format={(v) => formatMetricValue(v, row.kind)}
                      />
                    )}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${toneClass}`}>
                    {absFormatted}
                  </td>
                  <td className={`py-2.5 px-4 text-right font-bold ${toneClass}`}>
                    <span className="inline-flex items-center justify-end gap-1">
                      <DeltaIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{pctFormatted}</span>
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Verdict Row */}
            <tr className="bg-zinc-50/60 dark:bg-white/[0.02] font-sans">
              <td className="py-2.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                Verdict de viabilité
              </td>
              <td className="py-2.5 px-4 text-right">{renderVerdictText(optionA.scenarioResult.verdict)}</td>
              <td className="py-2.5 px-4 text-right">{renderVerdictText(optionB.scenarioResult.verdict)}</td>
              <td colSpan={2} className="py-2.5 px-4 text-right text-xs text-zinc-500 dark:text-zinc-400">
                {optionA.id === optionB.id ? 'Même scénario sélectionné' : 'Comparaison active'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
