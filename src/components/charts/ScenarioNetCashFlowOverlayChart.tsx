import React, { useMemo, useRef, useState } from 'react';
import {
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
import { ArrowLeftRight, TrendingUp } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { calculateFullModel } from '../../engine/calculator';
import { FullFinancialModel } from '../../types/finance';
import { formatAriary } from '../../utils/formatters';
import { applyScenarioDefinitionToAssumptions } from '../../utils/scenarioHelpers';
import { ChartExportButtons } from '../ui/ChartExportButtons';
import { SelectMenu, SelectMenuOption } from '../ui/SelectMenu';

interface SelectableScenarioItem {
  id: string;
  label: string;
  group: 'Scénarios du modèle' | 'Scénarios enregistrés';
  fullModel: FullFinancialModel;
}

type HorizonView = 'monthly_24' | 'monthly_36' | 'annual_3y';

export const ScenarioNetCashFlowOverlayChart: React.FC = () => {
  const { assumptions, model, savedScenarios } = useFinancial();
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const options = useMemo<SelectableScenarioItem[]>(() => {
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

    const builtIn: SelectableScenarioItem[] = [
      {
        id: 'model:realiste',
        label: 'Réaliste (Base active)',
        group: 'Scénarios du modèle',
        fullModel: model,
      },
      {
        id: 'model:optimiste',
        label: 'Optimiste (+chocs positifs)',
        group: 'Scénarios du modèle',
        fullModel: optModel,
      },
      {
        id: 'model:pessimiste',
        label: 'Pessimiste (Stress marché)',
        group: 'Scénarios du modèle',
        fullModel: pessModel,
      },
    ];

    const saved: SelectableScenarioItem[] = savedScenarios.map((sc) => ({
      id: `saved:${sc.id}`,
      label: sc.name,
      group: 'Scénarios enregistrés',
      fullModel: calculateFullModel(sc.assumptions),
    }));

    return [...builtIn, ...saved];
  }, [assumptions, model, savedScenarios]);

  const [scenarioAId, setScenarioAId] = useState<string>('model:pessimiste');
  const [scenarioBId, setScenarioBId] = useState<string>('model:optimiste');
  const [horizon, setHorizon] = useState<HorizonView>('monthly_24');
  const [showDeltaBars, setShowDeltaBars] = useState<boolean>(true);

  const optA = options.find((o) => o.id === scenarioAId) || options[0];
  const optB = options.find((o) => o.id === scenarioBId) || options[1] || options[0];

  const handleSwap = () => {
    setScenarioAId(optB.id);
    setScenarioBId(optA.id);
  };

  const selectOptions: SelectMenuOption[] = options.map((o) => ({
    value: o.id,
    label: o.label,
    group: o.group,
  }));

  const chartDataset = useMemo(() => {
    if (horizon === 'annual_3y') {
      const pA = optA.fullModel.projections.realistic;
      const pB = optB.fullModel.projections.realistic;
      return [0, 1, 2].map((idx) => {
        const netA = Number.isFinite(pA[idx]?.netResultAfterTaxAr)
          ? Number(((pA[idx].netResultAfterTaxAr) / 1e6).toFixed(2))
          : 0;
        const netB = Number.isFinite(pB[idx]?.netResultAfterTaxAr)
          ? Number(((pB[idx].netResultAfterTaxAr) / 1e6).toFixed(2))
          : 0;
        return {
          period: `Année ${idx + 1}`,
          netFlowA: netA,
          netFlowB: netB,
          deltaBMinusA: Number((netB - netA).toFixed(2)),
        };
      });
    }

    const monthsLimit = horizon === 'monthly_36' ? 36 : 24;
    const flowsA = optA.fullModel.payback.monthlyCashFlows;
    const flowsB = optB.fullModel.payback.monthlyCashFlows;
    const count = Math.min(monthsLimit, Math.max(flowsA.length, flowsB.length));

    const rows: Array<{
      period: string;
      netFlowA: number;
      netFlowB: number;
      deltaBMinusA: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      const rawA = flowsA[i]?.netCashFlowAfterTaxAr ?? 0;
      const rawB = flowsB[i]?.netCashFlowAfterTaxAr ?? 0;
      const netA = Number.isFinite(rawA) ? Number((rawA / 1e6).toFixed(2)) : 0;
      const netB = Number.isFinite(rawB) ? Number((rawB / 1e6).toFixed(2)) : 0;
      rows.push({
        period: `M${i + 1}`,
        netFlowA: netA,
        netFlowB: netB,
        deltaBMinusA: Number((netB - netA).toFixed(2)),
      });
    }
    return rows;
  }, [optA, optB, horizon]);

  const summary = useMemo(() => {
    const sumA = chartDataset.reduce((acc, r) => acc + r.netFlowA, 0) * 1e6;
    const sumB = chartDataset.reduce((acc, r) => acc + r.netFlowB, 0) * 1e6;
    const diff = sumB - sumA;
    const avgDiffPerPeriod =
      chartDataset.length > 0 ? diff / chartDataset.length : 0;
    return {
      sumA,
      sumB,
      diff,
      avgDiffPerPeriod,
    };
  }, [chartDataset]);

  return (
    <section
      aria-label="Superposition comparative du flux de trésorerie net"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header + Two Scenario Pickers */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp
              className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0"
              aria-hidden="true"
            />
            <span>Superposition des Flux de Trésorerie Nets (2 Scénarios)</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Comparez directement la capacité d’autofinancement mensuelle ou annuelle après impôt de deux scénarios sélectionnés.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <SelectMenu
              id="net-cashflow-scenario-a"
              size="sm"
              ariaLabel="Choisir le scénario A pour le flux de trésorerie net"
              value={optA.id}
              onChange={setScenarioAId}
              options={selectOptions}
              className="w-full sm:w-[195px]"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Permuter les deux scénarios"
            aria-label="Permuter Scénario A et Scénario B"
            className="min-h-9 min-w-9 px-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 inline-flex items-center justify-center self-center transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <SelectMenu
              id="net-cashflow-scenario-b"
              size="sm"
              tone="indigo"
              align="right"
              ariaLabel="Choisir le scénario B pour le flux de trésorerie net"
              value={optB.id}
              onChange={setScenarioBId}
              options={selectOptions}
              className="w-full sm:w-[195px]"
            />
          </div>
        </div>
      </div>

      {/* Controls: Horizon + Delta Toggle + PNG/SVG Export */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex flex-wrap items-center p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 gap-1">
          {[
            { id: 'monthly_24' as const, label: 'Mensuel M1–M24' },
            { id: 'monthly_36' as const, label: 'Mensuel M1–M36' },
            { id: 'annual_3y' as const, label: 'Annuel A1–A3' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHorizon(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                horizon === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={showDeltaBars}
            onClick={() => setShowDeltaBars((prev) => !prev)}
            className={`min-h-8 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              showDeltaBars
                ? 'border-teal-500/45 bg-teal-500/12 text-teal-800 dark:text-teal-300'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {showDeltaBars ? 'Écart (B − A) affiché' : 'Masquer écart (B − A)'}
          </button>

          <ChartExportButtons
            targetRef={chartContainerRef}
            filenameBase="superposition_flux_tresorerie_net"
            chartTitle="Superposition Flux de Trésorerie Nets"
          />
        </div>
      </div>

      {/* Comparative KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
            Flux nets cumulés · A ({optA.label})
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
            {formatAriary(summary.sumA, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 truncate">
            Flux nets cumulés · B ({optB.label})
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
            {formatAriary(summary.sumB, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Écart total généré (B − A)
          </div>
          <div
            className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
              summary.diff >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {summary.diff >= 0 ? '+' : ''}
            {formatAriary(summary.diff, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            {horizon === 'annual_3y' ? 'Écart moyen / an' : 'Écart moyen / mois'}
          </div>
          <div
            className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
              summary.avgDiffPerPeriod >= 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {summary.avgDiffPerPeriod >= 0 ? '+' : ''}
            {formatAriary(summary.avgDiffPerPeriod, { inMillions: true })}
          </div>
        </div>
      </div>

      {/* Recharts Overlay Chart */}
      <div
        ref={chartContainerRef}
        className="h-[330px] w-full min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0D0C18] p-3"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartDataset}
            margin={{ top: 12, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.16)"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v) => `${v} M`}
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
            {showDeltaBars && (
              <Bar
                dataKey="deltaBMinusA"
                name="Écart net (B − A)"
                fill="rgba(45, 212, 191, 0.35)"
                stroke="#14B8A6"
                radius={[3, 3, 0, 0]}
                barSize={horizon === 'annual_3y' ? 28 : 12}
              />
            )}
            <Line
              type="monotone"
              dataKey="netFlowA"
              name={`A · ${optA.label}`}
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4.5 }}
            />
            <Line
              type="monotone"
              dataKey="netFlowB"
              name={`B · ${optB.label}`}
              stroke="#6366F1"
              strokeWidth={2.5}
              strokeDasharray={optA.id === optB.id ? '4 4' : undefined}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
