import React, { useMemo, useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { buildYear1WaterfallData } from '../../utils/liquidityAndCampaign';
import { formatAriary } from '../../utils/formatters';
import { Tooltip } from '../ui/Tooltip';
import { ChartExportButtons } from '../ui/ChartExportButtons';

export const ProfitLossWaterfallChart: React.FC = () => {
  const { model, theme, unitDisplay } = useFinancial();
  const isDarkMode = theme === 'dark';
  const inM = unitDisplay === 'millions';
  const cardRef = useRef<HTMLElement>(null);

  const steps = useMemo(() => buildYear1WaterfallData(model), [model]);

  const chartData = useMemo(
    () =>
      steps.map((s) => ({
        ...s,
        baseOffsetMAr: Number((s.baseOffsetAr / 1e6).toFixed(2)),
        barValueMAr: Number((s.barValueAr / 1e6).toFixed(2)),
      })),
    [steps]
  );

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const tickColor = isDarkMode ? '#a1a1aa' : '#52525b';

  return (
    <section
      ref={cardRef}
      data-pdf-chart="pnl-waterfall"
      aria-label="Graphique Waterfall de formation du Résultat Net"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 min-w-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Waterfall P&amp;L Année 1 — Du Chiffre d’Affaires au Résultat Net
            </h2>
            <Tooltip
              label="Graphique Waterfall P&L"
              content="Décompose étape par étape les goulots d'étranglement financiers : achats paddy & usinage, logistique/transport, charges fixes & salaires, et impôt IR jusqu'au Résultat Net final."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Visualisez le poids de chaque poste de charges (opérationnelles, logistiques, fixes et fiscales) sur la marge finale.
          </p>
        </div>
        <ChartExportButtons
          targetRef={cardRef}
          filenameBase="waterfall_resultat_net_a1"
          chartTitle="Waterfall P&L Année 1"
        />
      </div>

      {/* Step Summaries Strip */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-3 ${
          steps.length > 6 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'
        } gap-2 text-xs font-mono tabular-nums`}
      >
        {steps.map((step) => (
          <div
            key={step.id}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-sans text-zinc-600 dark:text-zinc-400 truncate">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: step.color }}
              />
              <span className="truncate">{step.shortLabel}</span>
            </div>
            <div className="mt-1 font-bold text-zinc-900 dark:text-white truncate">
              {step.deltaAr > 0 && step.kind !== 'start' ? '+' : ''}
              {formatAriary(step.deltaAr, { inMillions: true })}
            </div>
          </div>
        ))}
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 10 }}
              tickFormatter={(v) => `${v} M`}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
              width={50}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <RechartsTooltip
              cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const row = payload[0]?.payload as (typeof chartData)[number] | undefined;
                if (!row) return null;
                return (
                  <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141322] shadow-lg text-xs space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white">{row.label}</div>
                    <div className="font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                      Variation :{' '}
                      <strong
                        className={
                          row.deltaAr < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-teal-600 dark:text-teal-400'
                        }
                      >
                        {row.deltaAr >= 0 && row.kind !== 'start' ? '+' : ''}
                        {formatAriary(row.deltaAr, { inMillions: inM })}
                      </strong>
                    </div>
                    <div className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      Solde cumulé : {formatAriary(row.runningTotalAr, { inMillions: inM })}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="baseOffsetMAr"
              stackId="wf"
              fill="transparent"
              isAnimationActive={false}
            />
            <Bar dataKey="barValueMAr" stackId="wf" radius={[5, 5, 5, 5]} maxBarSize={48}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
