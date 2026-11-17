import React, { useMemo, useRef } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import { PackageCheck, Sparkles } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { computePaddyStockOptimizationCurve } from '../../utils/liquidityAndCampaign';
import { formatAriary, formatKg } from '../../utils/formatters';
import { Tooltip } from '../ui/Tooltip';
import { ChartExportButtons } from '../ui/ChartExportButtons';

export const PaddyStockOptimizationChartCard: React.FC = () => {
  const { assumptions, model, theme, unitDisplay, updateStorageOptimization, notify } =
    useFinancial();
  const isDarkMode = theme === 'dark';
  const inM = unitDisplay === 'millions';
  const cardRef = useRef<HTMLElement>(null);

  const opt = useMemo(
    () => computePaddyStockOptimizationCurve(assumptions, model),
    [assumptions, model]
  );

  const chartData = useMemo(
    () =>
      opt.points.map((pt) => ({
        ...pt,
        spoilageMAr: Number((pt.spoilageLossValueAr / 1e6).toFixed(2)),
        holdingBfrMAr: Number((pt.holdingAndBfrCostAr / 1e6).toFixed(2)),
        totalFrictionMAr: Number((pt.totalStockFrictionAr / 1e6).toFixed(2)),
      })),
    [opt.points]
  );

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const tickColor = isDarkMode ? '#a1a1aa' : '#52525b';
  const isAlreadyOptimal = opt.currentHoldingDays === opt.optimalHoldingDays;

  return (
    <section
      ref={cardRef}
      data-pdf-chart="paddy-stock-opt"
      aria-label="Gestion optimale des stocks de paddy avant décorticage"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 min-w-0 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck
                className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Gestion des Stocks de Paddy — Durée Optimale Avant Décorticage
              </h2>
              <Tooltip
                label="Optimisation du stock paddy"
                content="Arbitre entre les pertes post-récolte (humidité, ravageurs si conservation longue) et le coût de rupture/BFR pour déterminer la durée de stockage optimale avant usinage."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Arbitrage pertes post-récolte vs coût BFR selon la durée de conservation (7 j à 120 j).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChartExportButtons
              targetRef={cardRef}
              filenameBase="optimisation_stocks_paddy"
              chartTitle="Optimisation Stocks Paddy"
            />
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
          <div className="p-2.5 rounded-xl border border-indigo-500/35 bg-indigo-500/[0.06]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">
              Durée optimale
            </div>
            <div className="mt-0.5 text-base font-bold text-indigo-700 dark:text-indigo-300">
              {opt.optimalHoldingDays} jours
            </div>
            <div className="text-[10px] text-zinc-500">
              Actuel : {opt.currentHoldingDays} j
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">
              Stock cible optimal
            </div>
            <div className="mt-0.5 text-base font-bold text-zinc-900 dark:text-white">
              {formatKg(opt.optimalStockKg)}
            </div>
            <div className="text-[10px] text-zinc-500">
              Besoin : {formatKg(opt.dailyPaddyNeedKg)}/j
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">
              Gain annuel potentiel
            </div>
            <div className="mt-0.5 text-base font-bold text-teal-700 dark:text-teal-400">
              {opt.estimatedAnnualSavingsAtOptimalAr > 0
                ? `+${formatAriary(opt.estimatedAnnualSavingsAtOptimalAr, { inMillions: inM })}`
                : 'Optimal'}
            </div>
            {!isAlreadyOptimal && (
              <button
                type="button"
                onClick={() => {
                  updateStorageOptimization({ storageDurationDays: opt.optimalHoldingDays });
                  notify(
                    'success',
                    `Durée de stockage paddy optimisée à ${opt.optimalHoldingDays} jours.`
                  );
                }}
                className="mt-1 font-sans text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                <span>Appliquer {opt.optimalHoldingDays} j</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-[235px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={{ stroke: gridStroke }}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 10 }}
              tickFormatter={(v) => `${v} M`}
              axisLine={{ stroke: gridStroke }}
              width={46}
            />
            <ReferenceLine
              x={`${opt.optimalHoldingDays} j`}
              stroke="#10b981"
              strokeDasharray="4 4"
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                borderRadius: '10px',
                fontSize: '12px',
              }}
              formatter={(value: unknown, name: unknown) => [
                `${Number(value ?? 0).toFixed(2)} M Ar`,
                String(name ?? ''),
              ]}
            />
            <Bar
              dataKey="spoilageMAr"
              name="Pertes post-récolte (M Ar)"
              stackId="stock"
              fill="#f43f5e"
              fillOpacity={0.7}
              maxBarSize={26}
            />
            <Bar
              dataKey="holdingBfrMAr"
              name="Coût stockage & BFR (M Ar)"
              stackId="stock"
              fill="#6366f1"
              fillOpacity={0.75}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
            />
            <Line
              type="monotone"
              dataKey="totalFrictionMAr"
              name="Coût total friction stock (M Ar)"
              stroke="#14b8a6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
