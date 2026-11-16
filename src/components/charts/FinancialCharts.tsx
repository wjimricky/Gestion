import React, { useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Brush,
  Cell,
} from 'recharts';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { MonthlyCashFlow, ScenarioResult, ProjectionYear } from '../../types/finance';
import { AlertTriangle, TrendingUp, TrendingDown, RotateCcw, Eye, EyeOff, ZoomIn } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Tooltip } from '../ui/Tooltip';
import { ChartExportButtons } from '../ui/ChartExportButtons';

const PERIOD_LABELS: Record<MonthlyCashFlow['period'], string> = {
  HS: 'Haute Saison',
  BS: 'Basse Saison',
  A2: 'Année 2',
  A3: 'Année 3',
};

type CashFlowSeriesKey = 'cumulative' | 'monthly' | 'beforeTax';

/**
 * Hero Interactive Recharts Cash Flow & Treasury Chart.
 * Features: custom rich tooltip, interactive legend series toggling,
 * timeframe switching (12M / 24M / 36M), and interactive Brush zoom.
 */
export const DynamicCashFlowHeroChart: React.FC<{
  cashFlows: MonthlyCashFlow[];
  fundsInvested: number;
  paybackMonth: number;
  roiRatio: number;
  inMillions: boolean;
  exportSelector?: string;
}> = ({
  cashFlows,
  fundsInvested,
  paybackMonth,
  roiRatio,
  inMillions,
  exportSelector = 'section[data-pdf-chart="cashflow"]',
}) => {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `heroRechartsArea-${rawId}`;

  const [horizon, setHorizon] = useState<'12M' | '24M' | '36M'>('36M');
  const [visibleSeries, setVisibleSeries] = useState<Record<CashFlowSeriesKey, boolean>>({
    cumulative: true,
    monthly: true,
    beforeTax: false,
  });
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [brushResetKey, setBrushResetKey] = useState<number>(0);

  const sliceCount = horizon === '12M' ? 12 : horizon === '24M' ? 24 : 36;

  const chartData = useMemo(() => {
    return (cashFlows || []).slice(0, sliceCount).map((cf) => ({
      month: cf.month,
      label: `M${cf.month}`,
      period: cf.period,
      periodLabel: PERIOD_LABELS[cf.period] || cf.period,
      cumulative: Number.isFinite(cf.cumulativeCashFlowAr) ? cf.cumulativeCashFlowAr : 0,
      monthly: Number.isFinite(cf.netCashFlowAfterTaxAr) ? cf.netCashFlowAfterTaxAr : 0,
      beforeTax: Number.isFinite(cf.resultBeforeTaxAr) ? cf.resultBeforeTaxAr : 0,
    }));
  }, [cashFlows, sliceCount]);

  if (!chartData.length) {
    return (
      <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Aucune donnée de flux mensuels disponible.
      </div>
    );
  }

  const lastPoint = chartData[chartData.length - 1];
  const heroValue = visibleSeries.cumulative
    ? lastPoint.cumulative
    : chartData.reduce((sum, p) => sum + p.monthly, 0);
  const growthPctVsI0 = fundsInvested > 0 ? heroValue / fundsInvested : 0;

  const activeSeriesCount = Object.values(visibleSeries).filter(Boolean).length;
  const toggleSeries = (key: CashFlowSeriesKey) => {
    setVisibleSeries((prev) => {
      if (prev[key] && activeSeriesCount <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleHorizonChange = (next: '12M' | '24M' | '36M') => {
    setHorizon(next);
    setZoomRange(null);
    setBrushResetKey((k) => k + 1);
  };

  const handleResetZoom = () => {
    setZoomRange(null);
    setBrushResetKey((k) => k + 1);
  };

  const isZoomed =
    zoomRange !== null &&
    (zoomRange.startIndex > 0 || zoomRange.endIndex < chartData.length - 1);

  const paybackIntMonth =
    paybackMonth > 0 && paybackMonth <= sliceCount
      ? Math.max(1, Math.min(sliceCount, Math.round(paybackMonth)))
      : null;

  const seriesLegendItems: Array<{
    key: CashFlowSeriesKey;
    label: string;
    color: string;
    kind: 'area' | 'bar' | 'line';
  }> = [
    { key: 'cumulative', label: 'Trésorerie cumulée', color: '#818cf8', kind: 'area' },
    { key: 'monthly', label: 'Flux net après IR', color: '#2dd4bf', kind: 'bar' },
    { key: 'beforeTax', label: 'Résultat avant IR', color: '#f59e0b', kind: 'line' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Header Row: Giant Value + Trend + Timeframe Controls */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>
              {visibleSeries.cumulative
                ? `Trésorerie nette cumulée (${horizon})`
                : `Flux nets générés cumulés (${horizon})`}
            </span>
            <Tooltip
              align="left"
              label="Graphique Recharts interactif"
              content="Cliquez sur les séries de la légende pour afficher/masquer des courbes, survolez pour le détail mensuel et utilisez le curseur inférieur pour zoomer sur une plage."
            />
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
            <AnimatedNumber
              value={heroValue}
              format={(v) => formatAriary(v, { inMillions })}
              className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white"
            />
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums ${
                growthPctVsI0 >= 0
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {growthPctVsI0 >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                <AnimatedNumber
                  value={growthPctVsI0 * 100}
                  format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)} %`}
                />{' '}
                vs I₀ · ROI{' '}
                <AnimatedNumber value={roiRatio} format={(v) => `${v.toFixed(2)}x`} />
              </span>
            </span>
          </div>
          <div className="mt-2 h-0.5 w-36 rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-transparent" />
        </div>

        {/* Horizon & Zoom Reset Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          {isZoomed && zoomRange && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="min-h-8 px-2.5 py-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-indigo-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                M{chartData[zoomRange.startIndex]?.month}–M{chartData[zoomRange.endIndex]?.month}
              </span>
            </button>
          )}

          <div
            role="group"
            aria-label="Horizon de la courbe"
            className="inline-flex items-center p-1 rounded-lg bg-zinc-100 dark:bg-[#191828] border border-zinc-200 dark:border-white/[0.08]"
          >
            {(['12M', '24M', '36M'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleHorizonChange(h)}
                className={`min-h-8 px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap ${
                  horizon === h
                    ? 'bg-indigo-600 text-white dark:bg-[#2D2B48] dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          <ChartExportButtons
            selector={exportSelector}
            filenameBase="tresorerie_cumulee"
            chartTitle="Trésorerie Cumulée"
          />
        </div>
      </div>

      {/* Interactive Recharts Legend (Click to toggle series) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Basculer les séries du graphique">
          {seriesLegendItems.map((item) => {
            const active = visibleSeries[item.key];
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSeries(item.key)}
                className={`min-h-8 px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#1A182D] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'border-zinc-200/70 dark:border-white/[0.06] bg-zinc-100/60 dark:bg-white/[0.02] text-zinc-500 dark:text-zinc-500 line-through opacity-75 hover:opacity-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{
                    backgroundColor: active ? item.color : 'transparent',
                    border: `2px solid ${item.color}`,
                  }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {active ? (
                  <Eye className="w-3 h-3 text-zinc-400" aria-hidden="true" />
                ) : (
                  <EyeOff className="w-3 h-3 text-zinc-400" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 no-print">
          <ZoomIn className="w-3 h-3" aria-hidden="true" />
          <span>Glissez le curseur ci-dessous pour zoomer</span>
        </span>
      </div>

      {/* Recharts Container */}
      <div
        className="rounded-xl bg-gradient-to-b from-zinc-50/80 to-indigo-50/35 dark:from-[#121120] dark:to-[#191736]/60 border border-zinc-200/80 dark:border-white/[0.06] p-2 sm:p-3"
        role="img"
        aria-label={`Graphique Recharts de trésorerie interactive sur ${horizon}`}
      >
        <div className="w-full h-[270px] sm:h-[295px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              key={`cf-${horizon}-${chartData.length}-${brushResetKey}`}
              data={chartData}
              margin={{ top: 16, right: 12, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C6BF2" stopOpacity={0.38} />
                  <stop offset="65%" stopColor="#5B4CE0" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#4338CA" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                tickLine={false}
                minTickGap={18}
              />

              <YAxis
                tickFormatter={(v: number) =>
                  formatAriary(v, { inMillions: true, showUnit: false, decimals: 0 }) + ' M'
                }
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={58}
              />

              <RechartsTooltip
                cursor={{ stroke: '#818cf8', strokeWidth: 1.25, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const pt = payload[0].payload as (typeof chartData)[number];
                  const recovered = pt.cumulative >= 0;
                  return (
                    <div className="rounded-xl border border-zinc-700/80 dark:border-white/15 bg-zinc-900/95 dark:bg-[#18172B]/95 px-3.5 py-2.5 text-xs text-white shadow-xl backdrop-blur-md space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                        <span className="font-bold text-white">Mois {pt.month}</span>
                        <span className="text-[11px] font-medium text-indigo-300">
                          {pt.periodLabel}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono tabular-nums">
                        {visibleSeries.cumulative && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-xs bg-indigo-400" />
                              Cumul net
                            </span>
                            <span
                              className={`font-bold ${
                                recovered ? 'text-teal-300' : 'text-rose-300'
                              }`}
                            >
                              {formatAriary(pt.cumulative, { inMillions })}
                            </span>
                          </div>
                        )}
                        {visibleSeries.monthly && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-xs bg-teal-400" />
                              Flux après IR
                            </span>
                            <span className="font-semibold text-white">
                              {formatAriary(pt.monthly, { inMillions })}
                            </span>
                          </div>
                        )}
                        {visibleSeries.beforeTax && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-xs bg-amber-400" />
                              Avant IR
                            </span>
                            <span className="font-semibold text-amber-300">
                              {formatAriary(pt.beforeTax, { inMillions })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-1 border-t border-white/10 text-[11px] flex items-center justify-between gap-2 text-zinc-300">
                        <span>Statut capital I₀ :</span>
                        <span className={recovered ? 'text-teal-300 font-semibold' : 'text-amber-300'}>
                          {recovered ? 'Récupéré ✓' : 'En amortissement'}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <ReferenceLine
                y={0}
                stroke="#2DD4BF"
                strokeDasharray="5 4"
                strokeOpacity={0.75}
              />

              {paybackIntMonth && (
                <ReferenceLine
                  x={`M${paybackIntMonth}`}
                  stroke="#14B8A6"
                  strokeDasharray="3 3"
                  label={{
                    value: `Payback ${paybackMonth.toFixed(1)}m`,
                    position: 'top',
                    fill: '#14B8A6',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {visibleSeries.monthly && (
                <Bar
                  dataKey="monthly"
                  name="Flux net après IR"
                  fill="#2DD4BF"
                  fillOpacity={0.55}
                  radius={[3, 3, 0, 0]}
                  barSize={sliceCount <= 12 ? 18 : sliceCount <= 24 ? 11 : 7}
                  animationDuration={300}
                />
              )}

              {visibleSeries.cumulative && (
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Trésorerie cumulée"
                  stroke="#818CF8"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  activeDot={{ r: 5, fill: '#818CF8', stroke: '#ffffff', strokeWidth: 2 }}
                  animationDuration={350}
                />
              )}

              {visibleSeries.beforeTax && (
                <Line
                  type="monotone"
                  dataKey="beforeTax"
                  name="Résultat avant IR"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 4, fill: '#F59E0B', stroke: '#ffffff', strokeWidth: 1.5 }}
                  animationDuration={300}
                />
              )}

              {chartData.length > 1 && (
                <Brush
                  dataKey="label"
                  height={22}
                  stroke="#818CF8"
                  fill="rgba(129, 140, 248, 0.08)"
                  travellerWidth={8}
                  onChange={(range) => {
                    if (
                      range &&
                      typeof range.startIndex === 'number' &&
                      typeof range.endIndex === 'number' &&
                      Number.isFinite(range.startIndex) &&
                      Number.isFinite(range.endIndex)
                    ) {
                      setZoomRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                    }
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span>
          Capital investi I₀ :{' '}
          <strong className="font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatAriary(fundsInvested, { inMillions })}
          </strong>
        </span>
        <span className="font-mono tabular-nums">
          Payback :{' '}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {paybackMonth > 0 && paybackMonth <= 36 ? (
              <AnimatedNumber value={paybackMonth} format={(v) => `${v.toFixed(2)} mois`} />
            ) : (
              '> 36 mois'
            )}
          </strong>
        </span>
      </div>
    </div>
  );
};

type ProfitLossSeriesKey = 'primary' | 'secondary' | 'trend';

/**
 * Interactive Recharts Profit & Loss Matrix Chart.
 * Features: period mode switch (A1 / A2 / 36M / A1–A3), clickable legend series toggle,
 * custom comparative tooltip, and Brush zoom.
 */
export const DynamicProfitLossMatrixChart: React.FC<{
  cashFlows: MonthlyCashFlow[];
  projections: ProjectionYear[];
  ambitiousProjections?: ProjectionYear[];
  inMillions: boolean;
  exportSelector?: string;
}> = ({
  cashFlows,
  projections,
  ambitiousProjections,
  inMillions,
  exportSelector = 'section[data-pdf-chart="profitloss"]',
}) => {
  const [mode, setMode] = useState<'A1' | 'A2' | '36M' | 'Y1-Y3'>('A1');
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [brushResetKey, setBrushResetKey] = useState<number>(0);
  const [visibleSeries, setVisibleSeries] = useState<Record<ProfitLossSeriesKey, boolean>>({
    primary: true,
    secondary: false,
    trend: true,
  });

  const data = useMemo(() => {
    if (mode === 'Y1-Y3') {
      return projections.map((p, idx) => {
        const amb = ambitiousProjections?.[idx];
        const primary = Number.isFinite(p.netResultAfterTaxAr) ? p.netResultAfterTaxAr : 0;
        const secRaw = amb ? amb.netResultAfterTaxAr : p.netResultBeforeTaxAr;
        return {
          label: `Année ${p.year}`,
          sub: p.method,
          primary,
          secondary: Number.isFinite(secRaw) ? secRaw : 0,
          trend: primary,
        };
      });
    }

    const slice =
      mode === 'A1'
        ? cashFlows.slice(0, 12)
        : mode === 'A2'
        ? cashFlows.slice(12, 24)
        : cashFlows.slice(0, 36);

    return slice.map((cf, idx, arr) => {
      const start = Math.max(0, idx - 2);
      const windowSlice = arr.slice(start, idx + 1);
      const movingAvg =
        windowSlice.reduce(
          (s, item) => s + (Number.isFinite(item.netCashFlowAfterTaxAr) ? item.netCashFlowAfterTaxAr : 0),
          0
        ) / windowSlice.length;

      return {
        label: `M${cf.month}`,
        sub: PERIOD_LABELS[cf.period] || cf.period,
        primary: Number.isFinite(cf.netCashFlowAfterTaxAr) ? cf.netCashFlowAfterTaxAr : 0,
        secondary: Number.isFinite(cf.resultBeforeTaxAr) ? cf.resultBeforeTaxAr : 0,
        trend: Number.isFinite(movingAvg) ? movingAvg : 0,
      };
    });
  }, [cashFlows, projections, ambitiousProjections, mode]);

  if (!data.length) return null;

  const isTriennial = mode === 'Y1-Y3';
  const activeCount = Object.values(visibleSeries).filter(Boolean).length;
  const toggleSeries = (key: ProfitLossSeriesKey) => {
    setVisibleSeries((prev) => {
      if (prev[key] && activeCount <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleModeChange = (nextMode: 'A1' | 'A2' | '36M' | 'Y1-Y3') => {
    setMode(nextMode);
    setZoomRange(null);
    setBrushResetKey((k) => k + 1);
    if (nextMode === 'Y1-Y3') {
      setVisibleSeries({ primary: true, secondary: true, trend: false });
    }
  };

  const handleResetZoom = () => {
    setZoomRange(null);
    setBrushResetKey((k) => k + 1);
  };

  const isZoomed =
    !isTriennial &&
    zoomRange !== null &&
    (zoomRange.startIndex > 0 || zoomRange.endIndex < data.length - 1);

  const totalDisplayed = data.reduce((s, d) => s + d.primary, 0);

  const legendItems: Array<{ key: ProfitLossSeriesKey; label: string; color: string }> = isTriennial
    ? [
        { key: 'primary', label: 'Réaliste (Après IR)', color: '#7c6bf2' },
        {
          key: 'secondary',
          label: ambitiousProjections?.length ? 'Ambitieux (Après IR)' : 'Réaliste (Avant IR)',
          color: '#2dd4bf',
        },
      ]
    : [
        { key: 'primary', label: 'Flux net après IR', color: '#7c6bf2' },
        { key: 'secondary', label: 'Résultat avant IR', color: '#38bdf8' },
        { key: 'trend', label: 'Moyenne mobile (3m)', color: '#2dd4bf' },
      ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Flux Nets &amp; Profit Périodique (Profit &amp; Loss)
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Cumul sur la vue ({mode === 'Y1-Y3' ? 'A1–A3' : mode}) :{' '}
            <strong className="font-mono text-indigo-700 dark:text-indigo-300 tabular-nums">
              <AnimatedNumber
                value={totalDisplayed}
                format={(v) => formatAriary(v, { inMillions })}
              />
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {isZoomed && zoomRange && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="min-h-8 px-2 py-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium inline-flex items-center gap-1 hover:bg-indigo-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span className="font-mono">
                {data[zoomRange.startIndex]?.label}–{data[zoomRange.endIndex]?.label}
              </span>
            </button>
          )}

          <div
            role="group"
            aria-label="Période du graphique Profit & Loss"
            className="inline-flex items-center p-1 rounded-lg bg-zinc-100 dark:bg-[#191828] border border-zinc-200 dark:border-white/[0.08]"
          >
            {(['A1', 'A2', '36M', 'Y1-Y3'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`min-h-8 px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-indigo-600 text-white dark:bg-[#2D2B48] dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {m === 'Y1-Y3' ? 'A1–A3' : m}
              </button>
            ))}
          </div>

          <ChartExportButtons
            selector={exportSelector}
            filenameBase="flux_nets_profit_loss"
            chartTitle="Flux Nets & Profit Périodique"
          />
        </div>
      </div>

      {/* Interactive Legend Toggles */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Séries Profit & Loss">
        {legendItems.map((item) => {
          const active = visibleSeries[item.key];
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleSeries(item.key)}
              className={`min-h-8 px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                active
                  ? 'border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#1A182D] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'border-zinc-200/70 dark:border-white/[0.06] bg-zinc-100/60 dark:bg-white/[0.02] text-zinc-500 dark:text-zinc-500 line-through opacity-75 hover:opacity-100'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{
                  backgroundColor: active ? item.color : 'transparent',
                  border: `2px solid ${item.color}`,
                }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {active ? (
                <Eye className="w-3 h-3 text-zinc-400" aria-hidden="true" />
              ) : (
                <EyeOff className="w-3 h-3 text-zinc-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <div
        className="rounded-xl bg-zinc-50/70 dark:bg-[#121120] border border-zinc-200/80 dark:border-white/[0.06] p-2 sm:p-3"
        role="img"
        aria-label="Histogramme Recharts interactif des flux nets mensuels et annuels"
      >
        <div className="w-full h-[230px] sm:h-[250px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              key={`pl-${mode}-${data.length}-${brushResetKey}`}
              data={data}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={{ stroke: 'rgba(148,163,184,0.25)' }}
                tickLine={false}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  formatAriary(v, { inMillions: true, showUnit: false, decimals: 0 }) + ' M'
                }
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />

              <RechartsTooltip
                cursor={{ fill: 'rgba(129, 140, 248, 0.08)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const pt = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-xl border border-zinc-700/80 dark:border-white/15 bg-zinc-900/95 dark:bg-[#18172B]/95 px-3.5 py-2.5 text-xs text-white shadow-xl backdrop-blur-md space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
                        <span className="font-bold">{pt.label}</span>
                        <span className="text-[11px] text-indigo-300">{pt.sub}</span>
                      </div>
                      <div className="space-y-1 font-mono tabular-nums">
                        {visibleSeries.primary && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300">
                              {isTriennial ? 'Réaliste :' : 'Flux après IR :'}
                            </span>
                            <span
                              className={`font-bold ${
                                pt.primary >= 0 ? 'text-indigo-300' : 'text-rose-300'
                              }`}
                            >
                              {formatAriary(pt.primary, { inMillions })}
                            </span>
                          </div>
                        )}
                        {visibleSeries.secondary && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300">
                              {isTriennial ? 'Ambitieux :' : 'Avant IR :'}
                            </span>
                            <span className="font-semibold text-teal-300">
                              {formatAriary(pt.secondary, { inMillions })}
                            </span>
                          </div>
                        )}
                        {!isTriennial && visibleSeries.trend && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-sans text-zinc-300">Moy. mobile :</span>
                            <span className="font-semibold text-teal-300">
                              {formatAriary(pt.trend, { inMillions })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.6} />

              {visibleSeries.primary && (
                <Bar
                  dataKey="primary"
                  name={isTriennial ? 'Réaliste' : 'Flux net après IR'}
                  radius={[4, 4, 0, 0]}
                  barSize={isTriennial ? 36 : mode === '36M' ? 8 : 20}
                  animationDuration={300}
                >
                  {data.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.primary < 0 ? '#F43F5E' : '#7C6BF2'}
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>
              )}

              {visibleSeries.secondary && (
                <Bar
                  dataKey="secondary"
                  name={isTriennial ? 'Ambitieux' : 'Résultat avant IR'}
                  fill={isTriennial ? '#2DD4BF' : '#38BDF8'}
                  fillOpacity={0.75}
                  radius={[4, 4, 0, 0]}
                  barSize={isTriennial ? 36 : mode === '36M' ? 8 : 16}
                  animationDuration={300}
                />
              )}

              {!isTriennial && visibleSeries.trend && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="Moyenne mobile (3m)"
                  stroke="#2DD4BF"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#2DD4BF', stroke: '#ffffff', strokeWidth: 1.5 }}
                  animationDuration={320}
                />
              )}

              {!isTriennial && data.length > 1 && (
                <Brush
                  dataKey="label"
                  height={20}
                  stroke="#7C6BF2"
                  fill="rgba(124, 107, 242, 0.08)"
                  travellerWidth={8}
                  onChange={(range) => {
                    if (
                      range &&
                      typeof range.startIndex === 'number' &&
                      typeof range.endIndex === 'number' &&
                      Number.isFinite(range.startIndex) &&
                      Number.isFinite(range.endIndex)
                    ) {
                      setZoomRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                    }
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/**
 * Responsive interactive SVG chart for 36-Month Cumulative Cash Flow vs Investment.
 */
export const CumulativeCashFlowChart: React.FC<{
  cashFlows: MonthlyCashFlow[];
  fundsInvested: number;
  paybackMonth: number;
}> = ({ cashFlows, fundsInvested, paybackMonth }) => {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  if (!cashFlows || cashFlows.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Aucune donnée de flux mensuels disponible.
      </div>
    );
  }

  const width = 760;
  const height = 290;
  const padding = { top: 34, right: 24, bottom: 42, left: 78 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const safeFlows = cashFlows.map((c) => ({
    ...c,
    cumulativeCashFlowAr: Number.isFinite(c.cumulativeCashFlowAr) ? c.cumulativeCashFlowAr : 0,
    netCashFlowAfterTaxAr: Number.isFinite(c.netCashFlowAfterTaxAr) ? c.netCashFlowAfterTaxAr : 0,
  }));
  const safeFunds = Number.isFinite(fundsInvested) ? fundsInvested : 0;

  const rawMin = Math.min(-safeFunds * 1.05, ...safeFlows.map((c) => c.cumulativeCashFlowAr));
  const rawMax = Math.max(safeFunds * 0.2, ...safeFlows.map((c) => c.cumulativeCashFlowAr)) * 1.08;
  const minVal = Number.isFinite(rawMin) ? rawMin : -1;
  const maxVal = Number.isFinite(rawMax) && rawMax > minVal ? rawMax : minVal + 1;
  const range = maxVal - minVal || 1;

  const getX = (month: number) => padding.left + ((month - 1) / 35) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

  const zeroY = Math.max(padding.top, Math.min(padding.top + chartH, getY(0)));
  const points = safeFlows.map((c) => `${getX(c.month)},${getY(c.cumulativeCashFlowAr)}`).join(' ');
  const areaPoints = [
    `${getX(1)},${zeroY}`,
    ...safeFlows.map((c) => `${getX(c.month)},${getY(c.cumulativeCashFlowAr)}`),
    `${getX(36)},${zeroY}`,
  ].join(' ');

  const hasValidPayback = Number.isFinite(paybackMonth) && paybackMonth > 0 && paybackMonth <= 36;
  const paybackBadgeX = hasValidPayback
    ? Math.max(padding.left + 58, Math.min(width - padding.right - 58, getX(paybackMonth)))
    : 0;

  const activePoint =
    selectedMonth !== null ? cashFlows.find((c) => c.month === selectedMonth) || null : null;

  const yTicks = [minVal, 0, maxVal * 0.35, maxVal * 0.7, maxVal].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) < range * 0.06) === i
  );

  return (
    <div className="w-full space-y-2.5">
      <div className="min-h-8 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-[#191828] border border-zinc-200 dark:border-white/[0.08] text-xs flex flex-wrap items-center justify-between gap-2">
        {activePoint ? (
          <>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Mois {activePoint.month} ({activePoint.period})
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
              Flux net :{' '}
              <strong className="text-teal-700 dark:text-teal-400">
                {formatAriary(activePoint.netCashFlowAfterTaxAr, { inMillions: true })}
              </strong>{' '}
              · Cumul :{' '}
              <strong
                className={
                  activePoint.cumulativeCashFlowAr >= 0
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-rose-700 dark:text-rose-400'
                }
              >
                {formatAriary(activePoint.cumulativeCashFlowAr, { inMillions: true })}
              </strong>
            </span>
          </>
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">
            Touchez ou survolez un mois sur la courbe pour inspecter le détail du cumul.
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Graphique de l'évolution cumulée des flux nets sur 36 mois par rapport au capital investi"
        className="w-full h-auto select-none font-mono"
      >
        <defs>
          <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C6BF2" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7C6BF2" stopOpacity="0.02" />
          </linearGradient>
          <pattern id="cfDotGrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="currentColor" fillOpacity="0.14" className="text-zinc-400 dark:text-indigo-200" />
          </pattern>
        </defs>

        <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill="url(#cfDotGrid)" />

        {/* Grid lines */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={val === 0 ? '0.35' : '0.1'}
                strokeDasharray={val === 0 ? '' : '4,4'}
                className="text-zinc-500 dark:text-indigo-200"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                {formatAriary(val, { inMillions: true, showUnit: true, decimals: 0 })}
              </text>
            </g>
          );
        })}

        {/* Month ticks */}
        {[1, 6, 12, 18, 24, 30, 36].map((m) => {
          const x = getX(m);
          return (
            <g key={m}>
              <line
                x1={x}
                y1={height - padding.bottom}
                x2={x}
                y2={height - padding.bottom + 5}
                stroke="currentColor"
                className="text-zinc-500"
              />
              <text
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                M{m}
              </text>
            </g>
          );
        })}

        {/* Shaded Area */}
        <polygon points={areaPoints} fill="url(#cfGradient)" />

        {/* Zero baseline */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#2DD4BF"
          strokeWidth="1.5"
          strokeDasharray="6,4"
          strokeOpacity="0.8"
        />

        {/* Cumulative line */}
        <polyline
          fill="none"
          stroke="#818CF8"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Interactive monthly points */}
        {safeFlows.map((cf) => {
          const cx = getX(cf.month);
          const cy = getY(cf.cumulativeCashFlowAr);
          const isSelected = selectedMonth === cf.month;
          return (
            <g key={cf.month}>
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 6 : 3.2}
                fill={isSelected ? '#2DD4BF' : '#818CF8'}
                className="transition-all"
              />
              <circle
                cx={cx}
                cy={cy}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setSelectedMonth(cf.month)}
                onClick={() => setSelectedMonth(cf.month)}
              />
            </g>
          );
        })}

        {/* Milestone marker for recovery */}
        {hasValidPayback && (
          <g>
            <line
              x1={getX(paybackMonth)}
              y1={padding.top}
              x2={getX(paybackMonth)}
              y2={height - padding.bottom}
              stroke="#2DD4BF"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <circle
              cx={getX(paybackMonth)}
              cy={zeroY}
              r="6"
              fill="#2DD4BF"
              stroke="#0F1020"
              strokeWidth="2"
            />
            <rect
              x={paybackBadgeX - 58}
              y={padding.top - 24}
              width="116"
              height="22"
              rx="6"
              fill="#14B8A6"
            />
            <text
              x={paybackBadgeX}
              y={padding.top - 9}
              textAnchor="middle"
              fontSize="11"
              className="fill-zinc-950 font-bold"
            >
              Payback : {paybackMonth.toFixed(2)} m
            </text>
          </g>
        )}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
          Cumul des flux nets après IR
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-teal-500 inline-block" />
          Seuil de récupération ({formatAriary(fundsInvested, { inMillions: true })})
        </span>
      </div>
    </div>
  );
};

/**
 * Break-Even Visualization: Monthly Turnover vs Fixed & Variable Costs.
 */
export const BreakEvenChart: React.FC<{
  monthlyFixedCharges: number;
  monthlyBreakEvenVolume: number;
  monthlyBreakEvenTurnover: number;
  nominalVolume: number;
  nominalTurnover: number;
  avgSellingPrice: number;
  grossMarginRate: number;
}> = ({
  monthlyFixedCharges,
  monthlyBreakEvenVolume,
  monthlyBreakEvenTurnover,
  nominalVolume,
  avgSellingPrice,
  grossMarginRate,
}) => {
  if (
    grossMarginRate <= 0 ||
    avgSellingPrice <= 0 ||
    !Number.isFinite(monthlyBreakEvenVolume) ||
    !Number.isFinite(monthlyBreakEvenTurnover)
  ) {
    return (
      <div className="p-5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <div>
          <div className="font-semibold">Seuil de rentabilité non atteignable</div>
          <p className="text-xs mt-1">
            Avec un taux de marge brute négatif ou nul ({formatPercent(grossMarginRate, 1)}), le point mort ne peut pas être tracé. Ajustez le prix de vente ou les coûts variables.
          </p>
        </div>
      </div>
    );
  }

  const width = 760;
  const height = 285;
  const padding = { top: 34, right: 24, bottom: 42, left: 78 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVol = Math.max(nominalVolume * 1.35, monthlyBreakEvenVolume * 1.45, 1000);
  const maxCA = Math.max(maxVol * avgSellingPrice, monthlyFixedCharges * 1.2, 1);

  const getX = (vol: number) => padding.left + (vol / maxVol) * chartW;
  const getY = (amount: number) => padding.top + chartH - (amount / maxCA) * chartH;

  const x0 = getX(0);
  const y0 = getY(0);
  const xEnd = getX(maxVol);
  const yEndTurnover = getY(maxVol * avgSellingPrice);

  const yStartCost = getY(monthlyFixedCharges);
  const costAtMaxVol = monthlyFixedCharges + maxVol * avgSellingPrice * (1 - grossMarginRate);
  const yEndCost = getY(costAtMaxVol);
  const yFixed = getY(monthlyFixedCharges);

  const beX = Math.max(padding.left, Math.min(width - padding.right, getX(monthlyBreakEvenVolume)));
  const beY = Math.max(padding.top, Math.min(padding.top + chartH, getY(monthlyBreakEvenTurnover)));
  const badgeX = Math.max(padding.left + 68, Math.min(width - padding.right - 68, beX));
  const badgeY = Math.max(padding.top - 22, beY - 28);

  const yTicks = [0, monthlyFixedCharges, monthlyBreakEvenTurnover, maxCA * 0.75, maxCA].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) < maxCA * 0.08) === i
  );

  const xTicks = [0, monthlyBreakEvenVolume, nominalVolume, maxVol].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) < maxVol * 0.1) === i
  );

  return (
    <div className="w-full space-y-2.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Graphique du seuil de rentabilité mensuel : chiffre d'affaires contre coûts fixes et variables"
        className="w-full h-auto select-none font-mono"
      >
        <defs>
          <pattern id="beDotGrid" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="currentColor" fillOpacity="0.14" className="text-zinc-400 dark:text-indigo-200" />
          </pattern>
        </defs>
        <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill="url(#beDotGrid)" />

        {/* Horizontal grid */}
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4,4"
                className="text-zinc-500 dark:text-indigo-200"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                {formatAriary(val, { inMillions: true, showUnit: true, decimals: 0 })}
              </text>
            </g>
          );
        })}

        {/* Volume axis ticks */}
        {xTicks.map((vol, idx) => {
          const x = getX(vol);
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={height - padding.bottom}
                x2={x}
                y2={height - padding.bottom + 5}
                stroke="currentColor"
                className="text-zinc-500"
              />
              <text
                x={x}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                {(vol / 1000).toFixed(1)} t
              </text>
            </g>
          );
        })}

        {/* Fixed charges line */}
        <line
          x1={x0}
          y1={yFixed}
          x2={xEnd}
          y2={yFixed}
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />

        {/* Total Cost Line */}
        <line x1={x0} y1={yStartCost} x2={xEnd} y2={yEndCost} stroke="#f43f5e" strokeWidth="2.5" />

        {/* Turnover Line */}
        <line x1={x0} y1={y0} x2={xEnd} y2={yEndTurnover} stroke="#2dd4bf" strokeWidth="2.5" />

        {/* Intersection marker */}
        <line
          x1={beX}
          y1={beY}
          x2={beX}
          y2={height - padding.bottom}
          stroke="#818cf8"
          strokeWidth="1.5"
          strokeDasharray="3,3"
        />
        <circle cx={beX} cy={beY} r="6" fill="#7c6bf2" stroke="#ffffff" strokeWidth="2" />

        <rect x={badgeX - 68} y={badgeY} width="136" height="22" rx="6" fill="#7c6bf2" />
        <text x={badgeX} y={badgeY + 15} textAnchor="middle" fontSize="11" className="fill-white font-bold">
          Point Mort : {(monthlyBreakEvenVolume / 1000).toFixed(1)} t/m
        </text>
      </svg>

      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 px-1 gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-teal-400 inline-block" />
          Chiffre d’affaires mensuel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-rose-500 inline-block" />
          Coûts totaux (Fixes + Variables)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-500 inline-block" />
          Charges fixes ({formatAriary(monthlyFixedCharges, { inMillions: true })}/mois)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
          Point mort
        </span>
      </div>
    </div>
  );
};

/**
 * Scenarios Comparison Bar Chart (handles negative net profits cleanly).
 */
export const ScenariosComparisonChart: React.FC<{
  scenarios: {
    pessimiste: ScenarioResult;
    realiste: ScenarioResult;
    optimiste: ScenarioResult;
  };
}> = ({ scenarios }) => {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const width = 760;
  const height = 270;
  const padding = { top: 28, right: 20, bottom: 42, left: 78 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const items = [
    { label: 'Pessimiste', res: scenarios.pessimiste, color: '#f59e0b' },
    { label: 'Réaliste', res: scenarios.realiste, color: '#7c6bf2' },
    { label: 'Optimiste', res: scenarios.optimiste, color: '#2dd4bf' },
  ];

  const allVals = items
    .flatMap((i) => [i.res.annualTurnoverAr, i.res.annualNetAfterTaxAr, 0])
    .filter((v) => Number.isFinite(v));
  const minVal = Math.min(0, ...allVals) * 1.15;
  const maxVal = Math.max(1, ...allVals) * 1.12;
  const range = maxVal - minVal || 1;

  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;
  const zeroY = getY(0);

  const groupWidth = chartW / items.length;
  const barWidth = 38;

  const yTicks = [minVal, 0, maxVal * 0.35, maxVal * 0.7, maxVal].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) < range * 0.08) === i
  );

  const activeItem = items.find((i) => i.label === selectedLabel) || null;

  return (
    <div className="w-full space-y-2.5">
      <div className="min-h-8 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-[#191828] border border-zinc-200 dark:border-white/[0.08] text-xs flex flex-wrap items-center justify-between gap-2">
        {activeItem ? (
          <>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Scénario {activeItem.label}
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
              CA : <strong>{formatAriary(activeItem.res.annualTurnoverAr, { inMillions: true })}</strong> · Résultat net :{' '}
              <strong
                className={
                  activeItem.res.annualNetAfterTaxAr >= 0
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-rose-700 dark:text-rose-400'
                }
              >
                {formatAriary(activeItem.res.annualNetAfterTaxAr, { inMillions: true })}
              </strong>
            </span>
          </>
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">
            Touchez ou survolez un groupe de barres pour comparer les montants exacts.
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Graphique comparatif du chiffre d'affaires et du résultat net après IR entre les scénarios Pessimiste, Réaliste et Optimiste"
        className="w-full h-auto select-none font-mono"
      >
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={val === 0 ? '0.35' : '0.1'}
                className="text-zinc-500 dark:text-indigo-200"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                {formatAriary(val, { inMillions: true, showUnit: true, decimals: 0 })}
              </text>
            </g>
          );
        })}

        {items.map((item, idx) => {
          const groupX = padding.left + idx * groupWidth;
          const centerX = groupX + groupWidth / 2;

          const safeCa = Number.isFinite(item.res.annualTurnoverAr) ? item.res.annualTurnoverAr : 0;
          const caY = getY(safeCa);
          const caH = Math.max(0, zeroY - caY);

          const netVal = Number.isFinite(item.res.annualNetAfterTaxAr) ? item.res.annualNetAfterTaxAr : 0;
          const netYPos = netVal >= 0 ? getY(netVal) : zeroY;
          const netH = Math.abs(getY(netVal) - zeroY);

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setSelectedLabel(item.label)}
              onClick={() => setSelectedLabel(item.label)}
            >
              <text
                x={centerX}
                y={height - padding.bottom + 22}
                textAnchor="middle"
                fontSize="12"
                className="fill-zinc-800 dark:fill-zinc-200 font-semibold font-sans"
              >
                {item.label}
              </text>

              {/* Bar 1: CA */}
              <rect
                x={centerX - barWidth - 3}
                y={caY}
                width={barWidth}
                height={caH}
                fill={item.color}
                opacity="0.38"
                rx="4"
              />
              <text
                x={centerX - barWidth / 2 - 3}
                y={caY - 6}
                textAnchor="middle"
                fontSize="10"
                className="fill-zinc-700 dark:fill-zinc-300 font-semibold"
              >
                {(item.res.annualTurnoverAr / 1e6).toFixed(0)}M
              </text>

              {/* Bar 2: Résultat net après IR */}
              <rect
                x={centerX + 3}
                y={netYPos}
                width={barWidth}
                height={Math.max(2, netH)}
                fill={netVal >= 0 ? item.color : '#f43f5e'}
                opacity="1"
                rx="4"
              />
              <text
                x={centerX + barWidth / 2 + 3}
                y={netVal >= 0 ? netYPos - 6 : netYPos + netH + 12}
                textAnchor="middle"
                fontSize="10"
                className={
                  netVal >= 0
                    ? 'fill-zinc-900 dark:fill-zinc-100 font-bold'
                    : 'fill-rose-700 dark:fill-rose-400 font-bold'
                }
              >
                {(netVal / 1e6).toFixed(1)}M
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-indigo-500/40 rounded-sm inline-block" />
          Chiffre d’affaires
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-indigo-500 rounded-sm inline-block" />
          Bénéfice net après IR
        </span>
      </div>
    </div>
  );
};

/**
 * 3-Year Projection Chart (A1 to A3) with band-centered positioning (no left-axis overlap).
 */
export const ProjectionsChart: React.FC<{
  realistic: ProjectionYear[];
  ambitious: ProjectionYear[];
  realisticGrowthY2?: number;
  realisticGrowthY3?: number;
  ambitiousGrowthY2?: number;
  ambitiousGrowthY3?: number;
}> = ({
  realistic,
  ambitious,
  realisticGrowthY2,
  realisticGrowthY3,
  ambitiousGrowthY2,
  ambitiousGrowthY3,
}) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const width = 760;
  const height = 270;
  const padding = { top: 30, right: 24, bottom: 42, left: 78 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allVals = [
    0,
    ...realistic.map((r) => r.netResultAfterTaxAr),
    ...ambitious.map((a) => a.netResultAfterTaxAr),
  ].filter((v) => Number.isFinite(v));
  const minVal = Math.min(0, ...allVals) * 1.15;
  const maxVal = Math.max(1, ...allVals) * 1.15;
  const range = maxVal - minVal || 1;

  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;
  const zeroY = getY(0);

  const groupW = chartW / 3;
  const getCenterX = (idx: number) => padding.left + (idx + 0.5) * groupW;

  const yTicks = [minVal, 0, maxVal * 0.35, maxVal * 0.7, maxVal].filter(
    (v, i, arr) => arr.findIndex((x) => Math.abs(x - v) < range * 0.08) === i
  );

  const activeReal = selectedYear ? realistic.find((r) => r.year === selectedYear) : null;
  const activeAmb = selectedYear ? ambitious.find((a) => a.year === selectedYear) : null;

  const rY2 = realisticGrowthY2 ?? realistic[1]?.growthRate ?? 0.48;
  const rY3 = realisticGrowthY3 ?? realistic[2]?.growthRate ?? 0.6;
  const aY2 = ambitiousGrowthY2 ?? ambitious[1]?.growthRate ?? 0.98;
  const aY3 = ambitiousGrowthY3 ?? ambitious[2]?.growthRate ?? 0.6;

  return (
    <div className="w-full space-y-2.5">
      <div className="min-h-8 px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-[#191828] border border-zinc-200 dark:border-white/[0.08] text-xs flex flex-wrap items-center justify-between gap-2">
        {activeReal && activeAmb ? (
          <>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Exercice Année {activeReal.year}
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
              Réaliste :{' '}
              <strong className="text-indigo-700 dark:text-indigo-400">
                {formatAriary(activeReal.netResultAfterTaxAr, { inMillions: true })}
              </strong>{' '}
              · Ambitieux :{' '}
              <strong className="text-teal-700 dark:text-teal-400">
                {formatAriary(activeAmb.netResultAfterTaxAr, { inMillions: true })}
              </strong>
            </span>
          </>
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">
            Touchez ou survolez une année pour comparer les flux nets réalistes et ambitieux.
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Projections des flux nets après IR sur 3 ans : Réaliste contre Ambitieux"
        className="w-full h-auto select-none font-mono"
      >
        {yTicks.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={val === 0 ? '0.35' : '0.1'}
                className="text-zinc-500 dark:text-indigo-200"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                className="fill-zinc-600 dark:fill-zinc-400"
              >
                {formatAriary(val, { inMillions: true, showUnit: true, decimals: 0 })}
              </text>
            </g>
          );
        })}

        {realistic.map((item, idx) => {
          const centerX = getCenterX(idx);
          const barW = 40;
          const ambItem = ambitious[idx];

          const rVal = Number.isFinite(item.netResultAfterTaxAr) ? item.netResultAfterTaxAr : 0;
          const rY = rVal >= 0 ? getY(rVal) : zeroY;
          const rH = Math.max(2, Math.abs(getY(rVal) - zeroY));

          const aVal = Number.isFinite(ambItem?.netResultAfterTaxAr) ? ambItem.netResultAfterTaxAr : 0;
          const aY = aVal >= 0 ? getY(aVal) : zeroY;
          const aH = Math.max(2, Math.abs(getY(aVal) - zeroY));

          return (
            <g
              key={item.year}
              className="cursor-pointer"
              onMouseEnter={() => setSelectedYear(item.year)}
              onClick={() => setSelectedYear(item.year)}
            >
              <text
                x={centerX}
                y={height - padding.bottom + 22}
                textAnchor="middle"
                fontSize="12"
                className="fill-zinc-800 dark:fill-zinc-200 font-semibold font-sans"
              >
                Année {item.year}
              </text>

              {/* Realistic Bar */}
              <rect
                x={centerX - barW - 4}
                y={rY}
                width={barW}
                height={rH}
                fill={rVal >= 0 ? '#7c6bf2' : '#f43f5e'}
                rx="4"
              />
              <text
                x={centerX - barW / 2 - 4}
                y={rVal >= 0 ? rY - 6 : rY + rH + 12}
                textAnchor="middle"
                fontSize="10"
                className="fill-indigo-700 dark:fill-indigo-300 font-bold"
              >
                {(rVal / 1e6).toFixed(1)}M
              </text>

              {/* Ambitious Bar */}
              <rect
                x={centerX + 4}
                y={aY}
                width={barW}
                height={aH}
                fill={aVal >= 0 ? '#2dd4bf' : '#f43f5e'}
                opacity="0.92"
                rx="4"
              />
              <text
                x={centerX + barW / 2 + 4}
                y={aVal >= 0 ? aY - 6 : aY + aH + 12}
                textAnchor="middle"
                fontSize="10"
                className="fill-teal-700 dark:fill-teal-300 font-bold"
              >
                {(aVal / 1e6).toFixed(1)}M
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-indigo-500 rounded-sm inline-block" />
          Réaliste (A2 : +{(rY2 * 100).toFixed(0)} %, A3 : +{(rY3 * 100).toFixed(0)} %)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-teal-400 rounded-sm inline-block" />
          Ambitieux (A2 : +{(aY2 * 100).toFixed(0)} %, A3 : +{(aY3 * 100).toFixed(0)} %)
        </span>
      </div>
    </div>
  );
};
