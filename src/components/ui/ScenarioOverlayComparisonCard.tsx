import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeftRight, GitCompare, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { calculateFullModel } from '../../engine/calculator';
import { FullFinancialModel, ScenarioResult } from '../../types/finance';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { applyScenarioDefinitionToAssumptions } from '../../utils/scenarioHelpers';
import { SelectMenu, SelectMenuOption } from './SelectMenu';

interface SelectableScenario {
  id: string;
  label: string;
  group: 'Scénarios du modèle' | 'Scénarios enregistrés';
  scenarioResult: ScenarioResult;
  fullModel: FullFinancialModel;
}

type OverlayChartMode = 'cumul_payback' | 'projections_3y' | 'seasonal_profit';

export const ScenarioOverlayComparisonCard: React.FC = () => {
  const { assumptions, model, savedScenarios, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const options = useMemo<SelectableScenario[]>(() => {
    const optModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        assumptions,
        model.scenarios.optimiste.definition
      )
    );
    const pessModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        assumptions,
        model.scenarios.pessimiste.definition
      )
    );

    const builtIn: SelectableScenario[] = [
      {
        id: 'model:realiste',
        label: 'Réaliste (Base active)',
        group: 'Scénarios du modèle',
        scenarioResult: model.scenarios.realiste,
        fullModel: model,
      },
      {
        id: 'model:optimiste',
        label: 'Optimiste (+chocs positifs)',
        group: 'Scénarios du modèle',
        scenarioResult: model.scenarios.optimiste,
        fullModel: optModel,
      },
      {
        id: 'model:pessimiste',
        label: 'Pessimiste (Stress marché)',
        group: 'Scénarios du modèle',
        scenarioResult: model.scenarios.pessimiste,
        fullModel: pessModel,
      },
    ];

    const saved: SelectableScenario[] = savedScenarios.map((sc) => {
      const m = calculateFullModel(sc.assumptions);
      return {
        id: `saved:${sc.id}`,
        label: sc.name,
        group: 'Scénarios enregistrés',
        scenarioResult: m.scenarios.realiste,
        fullModel: m,
      };
    });

    return [...builtIn, ...saved];
  }, [assumptions, model, savedScenarios]);

  const [scenarioAId, setScenarioAId] = useState<string>('model:realiste');
  const [scenarioBId, setScenarioBId] = useState<string>('model:optimiste');
  const [chartMode, setChartMode] = useState<OverlayChartMode>('cumul_payback');

  const optA = options.find((o) => o.id === scenarioAId) || options[0];
  const optB = options.find((o) => o.id === scenarioBId) || options[1] || options[0];

  const handleSwap = () => {
    setScenarioAId(optB.id);
    setScenarioBId(optA.id);
  };

  // Overlay Chart Datasets
  const cumulChartData = useMemo(() => {
    const flowsA = optA.fullModel.payback.monthlyCashFlows;
    const flowsB = optB.fullModel.payback.monthlyCashFlows;
    const count = Math.min(24, Math.max(flowsA.length, flowsB.length));
    const rows: Array<{
      label: string;
      cumA: number;
      cumB: number;
    }> = [
      {
        label: 'M0',
        cumA: Number((-optA.fullModel.investment.fundsToRaiseAr / 1e6).toFixed(2)),
        cumB: Number((-optB.fullModel.investment.fundsToRaiseAr / 1e6).toFixed(2)),
      },
    ];

    for (let i = 0; i < count; i++) {
      const a = flowsA[i];
      const b = flowsB[i];
      rows.push({
        label: `M${i + 1}`,
        cumA: Number(((a?.cumulativeCashFlowAr ?? 0) / 1e6).toFixed(2)),
        cumB: Number(((b?.cumulativeCashFlowAr ?? 0) / 1e6).toFixed(2)),
      });
    }
    return rows;
  }, [optA, optB]);

  const projections3YData = useMemo(() => {
    const pA = optA.fullModel.projections.realistic;
    const pB = optB.fullModel.projections.realistic;
    return [
      {
        label: 'Invest. (-I₀)',
        valA: Number((-optA.fullModel.investment.fundsToRaiseAr / 1e6).toFixed(2)),
        valB: Number((-optB.fullModel.investment.fundsToRaiseAr / 1e6).toFixed(2)),
      },
      ...[0, 1, 2].map((idx) => ({
        label: `Année ${idx + 1}`,
        valA: Number(((pA[idx]?.netResultAfterTaxAr ?? 0) / 1e6).toFixed(2)),
        valB: Number(((pB[idx]?.netResultAfterTaxAr ?? 0) / 1e6).toFixed(2)),
      })),
      {
        label: 'VAN (3 ans)',
        valA: Number((optA.fullModel.npv.npvAr / 1e6).toFixed(2)),
        valB: Number((optB.fullModel.npv.npvAr / 1e6).toFixed(2)),
      },
    ];
  }, [optA, optB]);

  const seasonalData = useMemo(() => {
    return [
      {
        label: 'CA Haute Saison',
        valA: Number((optA.fullModel.hauteSaison.totalTurnoverAr / 1e6).toFixed(2)),
        valB: Number((optB.fullModel.hauteSaison.totalTurnoverAr / 1e6).toFixed(2)),
      },
      {
        label: 'CA Basse Saison',
        valA: Number((optA.fullModel.basseSaison.totalTurnoverAr / 1e6).toFixed(2)),
        valB: Number((optB.fullModel.basseSaison.totalTurnoverAr / 1e6).toFixed(2)),
      },
      {
        label: 'Marge brute A1',
        valA: Number((optA.fullModel.year1.annualGrossProfitAr / 1e6).toFixed(2)),
        valB: Number((optB.fullModel.year1.annualGrossProfitAr / 1e6).toFixed(2)),
      },
      {
        label: 'Résultat net IR',
        valA: Number((optA.fullModel.year1.netResultAfterTaxAr / 1e6).toFixed(2)),
        valB: Number((optB.fullModel.year1.netResultAfterTaxAr / 1e6).toFixed(2)),
      },
    ];
  }, [optA, optB]);

  const selectOptions: SelectMenuOption[] = options.map((o) => ({
    value: o.id,
    label: o.label,
    group: o.group,
  }));

  const kpiRows = [
    {
      label: "Chiffre d'affaires A1",
      a: optA.fullModel.year1.totalTurnoverAr,
      b: optB.fullModel.year1.totalTurnoverAr,
      fmt: (v: number) => formatAriary(v, { inMillions: inM }),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${formatAriary(d, { inMillions: inM })}`,
    },
    {
      label: 'Résultat net après IR',
      a: optA.fullModel.year1.netResultAfterTaxAr,
      b: optB.fullModel.year1.netResultAfterTaxAr,
      fmt: (v: number) => formatAriary(v, { inMillions: inM }),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${formatAriary(d, { inMillions: inM })}`,
    },
    {
      label: 'Marge nette après IR',
      a: optA.fullModel.year1.netMarginAfterTaxRate,
      b: optB.fullModel.year1.netMarginAfterTaxRate,
      fmt: (v: number) => formatPercent(v, 1),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`,
    },
    {
      label: 'VAN à 3 ans',
      a: optA.fullModel.npv.npvAr,
      b: optB.fullModel.npv.npvAr,
      fmt: (v: number) => formatAriary(v, { inMillions: true }),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${formatAriary(d, { inMillions: true })}`,
    },
    {
      label: 'TRI (3 ans)',
      a: Number.isFinite(optA.fullModel.irr.irrValue) ? optA.fullModel.irr.irrValue : 0,
      b: Number.isFinite(optB.fullModel.irr.irrValue) ? optB.fullModel.irr.irrValue : 0,
      fmt: (v: number) => formatPercent(v, 1),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`,
    },
    {
      label: 'Payback saisonnier',
      a: optA.fullModel.payback.paybackMonths,
      b: optB.fullModel.payback.paybackMonths,
      fmt: (v: number) => formatMonths(v),
      deltaFmt: (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(2)} mois`,
      invert: true,
    },
  ];

  return (
    <section
      aria-label="Comparaison côte à côte et superposition graphique de deux scénarios"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header + Selectors */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Comparaison Côte à Côte — Superposition de Rentabilité</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Superposez deux scénarios (modèles standards ou sauvegardés) sur un même graphique pour analyser leurs écarts de rentabilité.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <SelectMenu
              id="scenarios-overlay-a"
              size="sm"
              ariaLabel="Sélectionner le scénario A"
              value={optA.id}
              onChange={setScenarioAId}
              options={selectOptions}
              className="w-full sm:w-[195px]"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Permuter les scénarios A et B"
            aria-label="Permuter A et B"
            className="min-h-9 min-w-9 px-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 inline-flex items-center justify-center self-center transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <SelectMenu
              id="scenarios-overlay-b"
              size="sm"
              tone="indigo"
              align="right"
              ariaLabel="Sélectionner le scénario B"
              value={optB.id}
              onChange={setScenarioBId}
              options={selectOptions}
              className="w-full sm:w-[195px]"
            />
          </div>
        </div>
      </div>

      {/* Mode Switcher + Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 gap-1">
          {[
            { id: 'cumul_payback' as const, label: 'Flux cumulés (24 mois)' },
            { id: 'projections_3y' as const, label: 'Rentabilité 3 ans & VAN' },
            { id: 'seasonal_profit' as const, label: 'Saisons & Marges A1' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setChartMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                chartMode === m.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {[
            { label: 'Réaliste vs Optimiste', a: 'model:realiste', b: 'model:optimiste' },
            { label: 'Réaliste vs Pessimiste', a: 'model:realiste', b: 'model:pessimiste' },
            { label: 'Pessimiste vs Optimiste', a: 'model:pessimiste', b: 'model:optimiste' },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setScenarioAId(p.a);
                setScenarioBId(p.b);
              }}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                scenarioAId === p.a && scenarioBId === p.b
                  ? 'border-indigo-500/45 bg-indigo-500/12 text-indigo-800 dark:text-indigo-200'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Overlaid Chart + Side-by-Side KPI Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 h-[310px] min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0D0C18] p-3">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'cumul_payback' ? (
              <ComposedChart
                data={cumulChartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="overlayGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.16)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => `${v}M`}
                />
                <ReferenceLine y={0} stroke="#F43F5E" strokeDasharray="3 3" />
                <RechartsTooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(2)} M Ar`,
                    String(name ?? ''),
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 14, 28, 0.94)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#F4F4F5',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="cumA"
                  name={`A · ${optA.label}`}
                  stroke="#10B981"
                  strokeWidth={2.3}
                  fill="url(#overlayGradA)"
                />
                <Line
                  type="monotone"
                  dataKey="cumB"
                  name={`B · ${optB.label}`}
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={chartMode === 'projections_3y' ? projections3YData : seasonalData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.16)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => `${v}M`}
                />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" />
                <RechartsTooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(2)} M Ar`,
                    String(name ?? ''),
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 14, 28, 0.94)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#F4F4F5',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="valA"
                  name={`A · ${optA.label}`}
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
                <Bar
                  dataKey="valB"
                  name={`B · ${optB.label}`}
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  barSize={22}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Side-by-Side Metrics Table */}
        <div className="lg:col-span-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">Indicateur</th>
                <th className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  A
                </th>
                <th className="py-2.5 px-3 text-right font-semibold text-indigo-700 dark:text-indigo-400">
                  B
                </th>
                <th className="py-2.5 px-3 text-right font-semibold">Écart B−A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {kpiRows.map((row) => {
                const diff = row.b - row.a;
                const isZero = Math.abs(diff) < 1e-4;
                const favorable = row.invert ? diff < 0 : diff > 0;
                const Icon = isZero ? Minus : diff > 0 ? TrendingUp : TrendingDown;
                return (
                  <tr
                    key={row.label}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/25"
                  >
                    <td className="py-2.5 px-3 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                      {row.label}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {row.fmt(row.a)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                      {row.fmt(row.b)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap ${
                        isZero
                          ? 'text-zinc-500 dark:text-zinc-400'
                          : favorable
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{isZero ? '—' : row.deltaFmt(diff)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
