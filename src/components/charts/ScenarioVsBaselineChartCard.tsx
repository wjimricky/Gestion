import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { calculateFullModel } from '../../engine/calculator';
import { DEFAULT_ASSUMPTIONS } from '../../engine/defaultAssumptions';
import { buildAnnualComparison5Y } from '../../utils/annualComparison';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { applyScenarioDefinitionToAssumptions } from '../../utils/scenarioHelpers';
import { ChartExportButtons } from '../ui/ChartExportButtons';
import { SelectMenu, SelectMenuOption } from '../ui/SelectMenu';
import { FullFinancialModel } from '../../types/finance';

type ViewHorizonMode = 'multi_year' | 'seasonal_y1';

interface ChartPoint {
  period: string;
  currentTurnoverM: number;
  refTurnoverM: number;
  currentNetMarginPct: number;
  refNetMarginPct: number;
  currentTurnoverAr: number;
  refTurnoverAr: number;
  currentNetAfterTaxAr: number;
  refNetAfterTaxAr: number;
}

const safeNum = (v: number): number => (Number.isFinite(v) ? v : 0);

function computeSeasonNetAfterTax(
  beforeTax: number,
  corporateTaxRate: number
): number {
  return beforeTax > 0 ? beforeTax * (1 - corporateTaxRate) : beforeTax;
}

export const ScenarioVsBaselineChartCard: React.FC = () => {
  const { model, assumptions, savedScenarios, activeScenarioId, unitDisplay } =
    useFinancial();
  const inM = unitDisplay === 'millions';

  const [referenceId, setReferenceId] = useState<string>('baseline:v6');
  const [horizonMode, setHorizonMode] = useState<ViewHorizonMode>('multi_year');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const activeScenarioName =
    savedScenarios.find((s) => s.id === activeScenarioId)?.name ||
    'Scénario actuel';

  const referenceOptions = useMemo(() => {
    const defaultModel = calculateFullModel(DEFAULT_ASSUMPTIONS);
    const pessimisticModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        assumptions,
        model.scenarios.pessimiste.definition
      )
    );
    const optimisticModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(
        assumptions,
        model.scenarios.optimiste.definition
      )
    );

    const list: Array<{
      id: string;
      label: string;
      group: string;
      computedModel: FullFinancialModel;
    }> = [
      {
        id: 'baseline:v6',
        label: 'Référence v6.0 (Baseline)',
        group: 'Références du modèle',
        computedModel: defaultModel,
      },
      {
        id: 'model:pessimiste',
        label: 'Scénario Pessimiste (Stress)',
        group: 'Références du modèle',
        computedModel: pessimisticModel,
      },
      {
        id: 'model:optimiste',
        label: 'Scénario Optimiste',
        group: 'Références du modèle',
        computedModel: optimisticModel,
      },
    ];

    savedScenarios.forEach((sc) => {
      list.push({
        id: `saved:${sc.id}`,
        label: sc.name,
        group: 'Scénarios sauvegardés',
        computedModel: calculateFullModel(sc.assumptions),
      });
    });

    return list;
  }, [assumptions, model.scenarios.optimiste.definition, model.scenarios.pessimiste.definition, savedScenarios]);

  const selectedRef =
    referenceOptions.find((o) => o.id === referenceId) || referenceOptions[0];
  const refModel = selectedRef.computedModel;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (horizonMode === 'seasonal_y1') {
      const hsCurNet = computeSeasonNetAfterTax(
        model.hauteSaison.seasonNetResultBeforeTaxAr,
        model.assumptions.corporateTaxRate
      );
      const hsRefNet = computeSeasonNetAfterTax(
        refModel.hauteSaison.seasonNetResultBeforeTaxAr,
        refModel.assumptions.corporateTaxRate
      );
      const bsCurNet = computeSeasonNetAfterTax(
        model.basseSaison.seasonNetResultBeforeTaxAr,
        model.assumptions.corporateTaxRate
      );
      const bsRefNet = computeSeasonNetAfterTax(
        refModel.basseSaison.seasonNetResultBeforeTaxAr,
        refModel.assumptions.corporateTaxRate
      );

      const pointsRaw = [
        {
          period: `Haute Saison (${model.hauteSaison.months}m)`,
          cTo: model.hauteSaison.totalTurnoverAr,
          rTo: refModel.hauteSaison.totalTurnoverAr,
          cNet: hsCurNet,
          rNet: hsRefNet,
        },
        {
          period: `Basse Saison (${model.basseSaison.months}m)`,
          cTo: model.basseSaison.totalTurnoverAr,
          rTo: refModel.basseSaison.totalTurnoverAr,
          cNet: bsCurNet,
          rNet: bsRefNet,
        },
        {
          period: 'Année 1 (Total)',
          cTo: model.year1.totalTurnoverAr,
          rTo: refModel.year1.totalTurnoverAr,
          cNet: model.year1.netResultAfterTaxAr,
          rNet: refModel.year1.netResultAfterTaxAr,
        },
      ];

      return pointsRaw.map((p) => {
        const cMargin = p.cTo > 0 ? (p.cNet / p.cTo) * 100 : 0;
        const rMargin = p.rTo > 0 ? (p.rNet / p.rTo) * 100 : 0;
        return {
          period: p.period,
          currentTurnoverM: Number(safeNum(p.cTo / 1e6).toFixed(2)),
          refTurnoverM: Number(safeNum(p.rTo / 1e6).toFixed(2)),
          currentNetMarginPct: Number(safeNum(cMargin).toFixed(1)),
          refNetMarginPct: Number(safeNum(rMargin).toFixed(1)),
          currentTurnoverAr: safeNum(p.cTo),
          refTurnoverAr: safeNum(p.rTo),
          currentNetAfterTaxAr: safeNum(p.cNet),
          refNetAfterTaxAr: safeNum(p.rNet),
        };
      });
    }

    const cur5Y = buildAnnualComparison5Y(model, 'realistic');
    const ref5Y = buildAnnualComparison5Y(refModel, 'realistic');

    return cur5Y.rows.map((cRow, idx) => {
      const rRow = ref5Y.rows[idx] || cRow;
      return {
        period: cRow.label,
        currentTurnoverM: Number(safeNum(cRow.turnoverAr / 1e6).toFixed(2)),
        refTurnoverM: Number(safeNum(rRow.turnoverAr / 1e6).toFixed(2)),
        currentNetMarginPct: Number(safeNum(cRow.netMarginRate * 100).toFixed(1)),
        refNetMarginPct: Number(safeNum(rRow.netMarginRate * 100).toFixed(1)),
        currentTurnoverAr: safeNum(cRow.turnoverAr),
        refTurnoverAr: safeNum(rRow.turnoverAr),
        currentNetAfterTaxAr: safeNum(cRow.netResultAfterTaxAr),
        refNetAfterTaxAr: safeNum(rRow.netResultAfterTaxAr),
      };
    });
  }, [horizonMode, model, refModel]);

  const y1TurnoverDeltaAr = model.year1.totalTurnoverAr - refModel.year1.totalTurnoverAr;
  const y1TurnoverDeltaPct =
    refModel.year1.totalTurnoverAr > 0
      ? (y1TurnoverDeltaAr / refModel.year1.totalTurnoverAr) * 100
      : 0;
  const y1MarginDeltaPts =
    (model.year1.netMarginAfterTaxRate - refModel.year1.netMarginAfterTaxRate) * 100;

  return (
    <section
      data-pdf-chart="scenario-vs-baseline"
      aria-label="Comparaison visuelle du chiffre d'affaires et de la marge nette entre le scénario actuel et la référence"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header + Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              Chiffre d&apos;Affaires &amp; Marge Nette : Scénario Actuel vs Référence
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Comparatif visuel entre{' '}
            <strong className="text-zinc-900 dark:text-zinc-200">{activeScenarioName}</strong> et{' '}
            <strong className="text-zinc-900 dark:text-zinc-200">{selectedRef.label}</strong> (barres en M Ar, courbes de marge nette après IR en %).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="baseline-ref-select"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
            >
              Référence :
            </label>
            <SelectMenu
              id="baseline-ref-select"
              ariaLabel="Sélectionner le scénario de référence"
              value={selectedRef.id}
              onChange={setReferenceId}
              options={referenceOptions.map(
                (o): SelectMenuOption => ({
                  value: o.id,
                  label: o.label,
                  group: o.group,
                })
              )}
              size="sm"
              className="w-[215px]"
            />
          </div>

          <div
            role="group"
            aria-label="Horizon d'analyse comparatif"
            className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627]"
          >
            <button
              type="button"
              onClick={() => setHorizonMode('multi_year')}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                horizonMode === 'multi_year'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Quinquennal (A1–A5)
            </button>
            <button
              type="button"
              onClick={() => setHorizonMode('seasonal_y1')}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                horizonMode === 'seasonal_y1'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Saisons &amp; A1
            </button>
          </div>

          <ChartExportButtons
            targetRef={chartContainerRef}
            filenameBase="comparaison_ca_marge_nette"
            chartTitle="Chiffre d'affaires et Marge nette : Actuel vs Référence"
          />
        </div>
      </div>

      {/* Inline Delta Summary Strip (Hairline grid, no card clutter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-white/[0.08] rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#151424]">
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Chiffre d&apos;Affaires Année 1
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                {formatAriary(model.year1.totalTurnoverAr, { inMillions: inM })}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                vs {formatAriary(refModel.year1.totalTurnoverAr, { inMillions: inM })}
              </span>
            </div>
          </div>
          <div
            className={`text-right font-mono tabular-nums text-xs font-bold inline-flex items-center gap-1 shrink-0 ${
              Math.abs(y1TurnoverDeltaAr) < 1
                ? 'text-zinc-500 dark:text-zinc-400'
                : y1TurnoverDeltaAr > 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {y1TurnoverDeltaAr > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : y1TurnoverDeltaAr < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : null}
            <span>
              {y1TurnoverDeltaAr > 0 ? '+' : ''}
              {formatAriary(y1TurnoverDeltaAr, { inMillions: true })} ({y1TurnoverDeltaPct > 0 ? '+' : ''}
              {y1TurnoverDeltaPct.toFixed(1)} %)
            </span>
          </div>
        </div>

        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Marge Nette après IR (Année 1)
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                {formatPercent(model.year1.netMarginAfterTaxRate, 1)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                vs {formatPercent(refModel.year1.netMarginAfterTaxRate, 1)}
              </span>
            </div>
          </div>
          <div
            className={`text-right font-mono tabular-nums text-xs font-bold inline-flex items-center gap-1 shrink-0 ${
              Math.abs(y1MarginDeltaPts) < 0.05
                ? 'text-zinc-500 dark:text-zinc-400'
                : y1MarginDeltaPts > 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {y1MarginDeltaPts > 0.05 ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : y1MarginDeltaPts < -0.05 ? (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : null}
            <span>
              {y1MarginDeltaPts > 0 ? '+' : ''}
              {y1MarginDeltaPts.toFixed(1)} pts
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Dual-Axis ComposedChart */}
      <div ref={chartContainerRef} className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="ca"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => `${Number(v)} M`}
              width={54}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="margin"
              orientation="right"
              tick={{ fontSize: 11, fill: '#10b981' }}
              tickFormatter={(v) => `${Number(v)} %`}
              width={48}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                if (name === 'currentTurnoverM') {
                  return [`${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M Ar`, `CA · ${activeScenarioName}`];
                }
                if (name === 'refTurnoverM') {
                  return [`${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M Ar`, `CA · ${selectedRef.label}`];
                }
                if (name === 'currentNetMarginPct') {
                  return [`${v.toFixed(1)} %`, `Marge nette · ${activeScenarioName}`];
                }
                return [`${v.toFixed(1)} %`, `Marge nette · ${selectedRef.label}`];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(value) => {
                if (value === 'currentTurnoverM') return `CA Actuel (M Ar)`;
                if (value === 'refTurnoverM') return `CA Référence (M Ar)`;
                if (value === 'currentNetMarginPct') return `Marge nette Actuel (%)`;
                return `Marge nette Référence (%)`;
              }}
            />
            <Bar
              yAxisId="ca"
              dataKey="currentTurnoverM"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              yAxisId="ca"
              dataKey="refTurnoverM"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Line
              yAxisId="margin"
              type="monotone"
              dataKey="currentNetMarginPct"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="margin"
              type="monotone"
              dataKey="refNetMarginPct"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3.5, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
