import React, { useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  computeOperationalCostBreakdown,
  OperationalCostCategoryId,
} from '../../utils/operationalCosts';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Tooltip } from '../ui/Tooltip';
import { ChartExportButtons } from '../ui/ChartExportButtons';

export const OperationalCostDonutCard: React.FC<{
  onNavigate?: (tabId: string) => void;
}> = ({ onNavigate }) => {
  const { assumptions, model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [includeFixed, setIncludeFixed] = useState(false);
  const [activeSliceId, setActiveSliceId] = useState<OperationalCostCategoryId | null>(null);

  const breakdown = useMemo(
    () => computeOperationalCostBreakdown(assumptions, model, includeFixed),
    [assumptions, model, includeFixed]
  );

  const selectedSlice =
    breakdown.slices.find((s) => s.id === activeSliceId) ?? breakdown.topCategory;

  return (
    <section
      data-pdf-chart="operational-costs-donut"
      aria-label="Répartition des coûts opérationnels"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header + Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <PieChartIcon
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Répartition des Coûts Opérationnels (Année 1)
            </h2>
            <Tooltip
              align="left"
              label="Coûts Opérationnels"
              content="Ventilation exacte des charges d’exploitation entre Collecte (achat paddy), Transformation (décorticage, docker), Logistique (carburant, flotte) et Commercialisation (sacs, administration)."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Poste dominant :{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {breakdown.topCategory.shortLabel}
            </strong>{' '}
            (<span className="font-mono tabular-nums">{breakdown.topCategory.sharePct.toFixed(1)} %</span>)
          </p>
        </div>

        <div
          role="group"
          aria-label="Périmètre des coûts"
          className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] self-start no-print"
        >
          <button
            type="button"
            onClick={() => setIncludeFixed(false)}
            className={`min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
              !includeFixed
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Directs
          </button>
          <button
            type="button"
            onClick={() => setIncludeFixed(true)}
            className={`min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
              includeFixed
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Avec fixes
          </button>
        </div>

        <ChartExportButtons
          selector='section[data-pdf-chart="operational-costs-donut"]'
          filenameBase="repartition_couts_operationnels"
          chartTitle="Répartition des Coûts Opérationnels"
        />
      </div>

      {/* Donut + Category Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Donut Chart with Centered Total */}
        <div className="md:col-span-5 relative h-[220px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown.slices}
                dataKey="amountAr"
                nameKey="shortLabel"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={2.5}
                stroke="none"
                onMouseEnter={(_, idx) => {
                  const s = breakdown.slices[idx];
                  if (s) setActiveSliceId(s.id);
                }}
                onMouseLeave={() => setActiveSliceId(null)}
                onClick={(entry) => {
                  const id = (entry as { id?: OperationalCostCategoryId })?.id;
                  if (id) setActiveSliceId((prev) => (prev === id ? null : id));
                }}
              >
                {breakdown.slices.map((slice) => {
                  const isMuted = activeSliceId !== null && activeSliceId !== slice.id;
                  return (
                    <Cell
                      key={slice.id}
                      fill={slice.color}
                      fillOpacity={isMuted ? 0.35 : 0.96}
                      style={{ cursor: 'pointer', transition: 'fill-opacity 150ms ease' }}
                    />
                  );
                })}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as (typeof breakdown.slices)[number];
                  return (
                    <div className="px-3 py-2 rounded-xl bg-zinc-950/95 border border-white/15 text-xs text-white shadow-lg space-y-0.5">
                      <div className="font-semibold">{item.label}</div>
                      <div className="font-mono tabular-nums font-bold">
                        {formatAriary(item.amountAr, { inMillions: inM })} ({item.sharePct.toFixed(1)} %)
                      </div>
                      <div className="text-[11px] text-zinc-300 font-mono tabular-nums">
                        HS {formatAriary(item.hsAmountAr, { inMillions: true })} · BS{' '}
                        {formatAriary(item.bsAmountAr, { inMillions: true })}
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Summary Overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {activeSliceId ? selectedSlice.shortLabel : includeFixed ? 'Total complet' : 'Coûts directs'}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
              <AnimatedNumber
                value={activeSliceId ? selectedSlice.amountAr : breakdown.totalCostsAr}
                format={(v) => formatAriary(v, { inMillions: true })}
              />
            </span>
            <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
              {activeSliceId ? `${selectedSlice.sharePct.toFixed(1)} %` : '100 %'}
            </span>
          </div>
        </div>

        {/* 4 Category Rows */}
        <div className="md:col-span-7 space-y-2">
          {breakdown.slices.map((slice) => {
            const isActive = activeSliceId === slice.id;
            return (
              <button
                key={slice.id}
                type="button"
                onMouseEnter={() => setActiveSliceId(slice.id)}
                onMouseLeave={() => setActiveSliceId(null)}
                onClick={() =>
                  setActiveSliceId((prev) => (prev === slice.id ? null : slice.id))
                }
                className={`w-full text-left p-2.5 rounded-xl border transition-colors ${
                  isActive
                    ? 'border-indigo-500/50 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.1]'
                    : 'border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627]/70 hover:bg-zinc-100/80 dark:hover:bg-[#1D1B31]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: slice.color }}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {slice.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {formatAriary(slice.amountAr, { inMillions: inM })}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 w-12 text-right">
                      {formatPercent(slice.sharePct / 100, 1)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span className="truncate">{slice.itemsSummary}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    HS {formatAriary(slice.hsAmountAr, { inMillions: true })} · BS{' '}
                    {formatAriary(slice.bsAmountAr, { inMillions: true })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer note & deep link */}
      <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
        <span>
          Total réconcilié avec le Compte de Résultat :{' '}
          <strong className="font-mono tabular-nums text-zinc-900 dark:text-zinc-200">
            {formatAriary(breakdown.totalCostsAr, { inMillions: inM })}
          </strong>
        </span>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('hypotheses')}
            className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline no-print"
          >
            Ajuster les coûts →
          </button>
        )}
      </div>
    </section>
  );
};
