import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { computeCashBurnAnalysis } from '../../utils/cashBurn';
import { formatAriary } from '../../utils/formatters';
import { ChartExportButtons } from '../ui/ChartExportButtons';
import { Tooltip } from '../ui/Tooltip';

export const CashBurnChart: React.FC = () => {
  const { assumptions, model, unitDisplay, theme } = useFinancial();
  const inM = unitDisplay === 'millions';
  const containerRef = useRef<HTMLDivElement>(null);

  const [horizonMonths, setHorizonMonths] = useState<12 | 24 | 36>(24);
  const [rampUpMonths, setRampUpMonths] = useState<number>(3);
  const [dsoDelayMonths, setDsoDelayMonths] = useState<number>(1);

  const summary = useMemo(
    () =>
      computeCashBurnAnalysis(assumptions, model, {
        horizonMonths,
        rampUpMonths,
        dsoDelayMonths,
      }),
    [assumptions, model, horizonMonths, rampUpMonths, dsoDelayMonths]
  );

  const chartData = useMemo(
    () =>
      summary.points.map((p) => {
        const grossM = Number((p.grossBurnOutflowAr / 1e6).toFixed(2));
        const inflowM = Number((p.cashInflowAr / 1e6).toFixed(2));
        const cumM = Number((p.cumulativeCashAr / 1e6).toFixed(2));
        const netBurnM = Number((p.netBurnAr / 1e6).toFixed(2));
        return {
          ...p,
          grossBurnM: Number.isFinite(grossM) ? grossM : 0,
          inflowM: Number.isFinite(inflowM) ? inflowM : 0,
          cumulativeM: Number.isFinite(cumM) ? cumM : 0,
          netBurnM: Number.isFinite(netBurnM) ? netBurnM : 0,
        };
      }),
    [summary.points]
  );

  const axisTickColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const breakEvenLabel =
    summary.breakEvenMonth !== null ? `M${summary.breakEvenMonth}` : null;

  return (
    <section
      ref={containerRef}
      data-pdf-chart="cash-burn"
      aria-label="Graphique Cash Burn et vitesse de consommation de trésorerie"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Cash Burn &amp; Runway — Vitesse de Consommation avant Seuil de Rentabilité
            </h2>
            <Tooltip
              align="left"
              label="Cash Burn & Runway"
              content="Visualise les décaissements mensuels (Gross Burn), la consommation nette avant montée en charge (Net Burn) et l'évolution de la trésorerie cumulée depuis l'investissement initial I₀ jusqu'au point mort."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Simulez la montée en charge commerciale et les délais d’encaissement (DSO) pour anticiper le creux de trésorerie avant équilibre.
            {summary.vatApplied && (
              <span className="ml-1.5 font-semibold text-teal-700 dark:text-teal-400">
                · TVA agricole intégrée
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div
            role="group"
            aria-label="Horizon Cash Burn"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/60"
          >
            {([12, 24, 36] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonMonths(h)}
                className={`min-h-7 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                  horizonMonths === h
                    ? 'bg-zinc-900 text-white dark:bg-indigo-600'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {h}M
              </button>
            ))}
          </div>

          <ChartExportButtons
            targetRef={containerRef}
            filenameBase="cash-burn-runway"
            chartTitle="Cash Burn & Runway"
          />
        </div>
      </div>

      {/* Simulation Controls: Ramp-up & DSO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-xs no-print">
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="cb-rampup" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Montée en charge commerciale initiale
            </label>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {rampUpMonths === 0 ? 'Régime nominal (0 mois)' : `${rampUpMonths} mois progressifs`}
            </span>
          </div>
          <input
            id="cb-rampup"
            type="range"
            min={0}
            max={6}
            step={1}
            value={rampUpMonths}
            onChange={(e) => setRampUpMonths(Number(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="cb-dso" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Délai d’encaissement clients (DSO)
            </label>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {dsoDelayMonths === 0 ? 'Comptant (0 mois)' : `+${dsoDelayMonths} mois (${dsoDelayMonths * 30} j)`}
            </span>
          </div>
          <input
            id="cb-dso"
            type="range"
            min={0}
            max={2}
            step={1}
            value={dsoDelayMonths}
            onChange={(e) => setDsoDelayMonths(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
        </div>
      </div>

      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Gross Burn Mensuel Moyen
          </div>
          <div className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">
            {formatAriary(summary.avgGrossBurnMonthlyAr, { inMillions: inM })}
            <span className="text-[11px] font-normal text-zinc-500"> / mois</span>
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Décaissements bruts d’exploitation
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Net Burn Pic (Consommation nette)
          </div>
          <div className="mt-1 text-base font-bold text-rose-700 dark:text-rose-400">
            {summary.peakMonthlyNetBurnAr > 0
              ? formatAriary(summary.peakMonthlyNetBurnAr, { inMillions: inM })
              : '0 Ar'}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {summary.netBurnMonthsCount} mois en déficit net de flux
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Creux Maximal de Trésorerie
          </div>
          <div className="mt-1 text-base font-bold text-amber-700 dark:text-amber-400">
            {formatAriary(summary.peakCashDeficitAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Fonds initial I₀ : {formatAriary(-summary.initialCapitalOutlayAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Seuil de Rentabilité &amp; Runway
          </div>
          <div
            className={`mt-1 text-base font-bold flex items-center gap-1.5 ${
              summary.breakEvenMonth !== null
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {summary.breakEvenMonth !== null ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Mois {summary.breakEvenMonth}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>&gt; {horizonMonths} mois</span>
              </>
            )}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            {summary.runwayLabel}
          </div>
        </div>
      </div>

      {/* Recharts ComposedChart */}
      <div className="h-[310px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="cashBurnCumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisTickColor }}
              axisLine={false}
              tickLine={false}
              interval={horizonMonths === 36 ? 2 : horizonMonths === 24 ? 1 : 0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisTickColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}M`}
            />
            <ReferenceLine y={0} stroke={axisTickColor} strokeDasharray="4 4" strokeOpacity={0.6} />
            {breakEvenLabel && (
              <ReferenceLine
                x={breakEvenLabel}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{
                  value: `Équilibre ${breakEvenLabel}`,
                  position: 'top',
                  fill: '#10b981',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
            <RechartsTooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#131222' : '#ffffff',
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                borderRadius: '10px',
                fontSize: '12px',
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toFixed(2)} M Ar`,
                String(name ?? ''),
              ]}
            />
            <Area
              type="monotone"
              dataKey="cumulativeM"
              name="Trésorerie cumulée"
              stroke="#10b981"
              strokeWidth={2.4}
              fill="url(#cashBurnCumGrad)"
            />
            <Bar
              dataKey="grossBurnM"
              name="Gross Burn (Décaissements)"
              fill="#f43f5e"
              fillOpacity={0.75}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            <Bar
              dataKey="inflowM"
              name="Encaissements"
              fill="#6366f1"
              fillOpacity={0.75}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            <Line
              type="monotone"
              dataKey="netBurnM"
              name="Net Burn mensuel"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
