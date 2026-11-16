import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Cell,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ArrowLeftRight, GitBranch, LineChart as LineChartIcon, ScatterChart as ScatterIcon } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  CORRELATION_VARIABLES,
  CORRELATION_VARIABLE_LIST,
  CorrelationVariableId,
  NpvCorrelationPoint,
  computeNpvCorrelationGrid,
} from '../../utils/npvCorrelation';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { ChartExportButtons } from '../ui/ChartExportButtons';
import { SelectMenu } from '../ui/SelectMenu';
import { Tooltip } from '../ui/Tooltip';

type CorrelationChartMode = 'curves' | 'scatter';

function getTierColor(tier: NpvCorrelationPoint['tier']): string {
  switch (tier) {
    case 'negative':
      return '#e11d48';
    case 'low':
      return '#d97706';
    case 'solid':
      return '#0d9488';
    case 'high':
      return '#059669';
  }
}

export const NpvCorrelationChart: React.FC = () => {
  const { assumptions, theme, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';
  const isDark = theme === 'dark';

  const [varX, setVarX] = useState<CorrelationVariableId>('sellingPrice');
  const [varY, setVarY] = useState<CorrelationVariableId>('paddyCost');
  const [chartMode, setChartMode] = useState<CorrelationChartMode>('curves');

  const handleSelectVarX = (nextX: CorrelationVariableId) => {
    if (nextX === varY) {
      setVarY(varX);
    }
    setVarX(nextX);
  };

  const handleSelectVarY = (nextY: CorrelationVariableId) => {
    if (nextY === varX) {
      setVarX(varY);
    }
    setVarY(nextY);
  };

  const handleSwapVariables = () => {
    setVarX(varY);
    setVarY(varX);
  };

  const result = useMemo(
    () => computeNpvCorrelationGrid(assumptions, varX, varY),
    [assumptions, varX, varY]
  );

  const axisTickColor = isDark ? '#a1a1aa' : '#52525b';
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const zeroLineColor = isDark ? '#f43f5e' : '#e11d48';

  const varOptions = CORRELATION_VARIABLE_LIST.map((v) => ({
    value: v.id,
    label: v.label,
  }));

  const formatMArTick = (val: number) => `${val.toFixed(0)} M`;

  const scatterZRange: [number, number] = [65, 280];
  const scatterData = useMemo(
    () =>
      result.points.map((pt) => ({
        ...pt,
        absNpvMagnitude: Math.max(10, Math.abs(pt.npvMAr)),
      })),
    [result.points]
  );

  return (
    <section
      data-pdf-chart="npv-correlation-chart"
      aria-label="Graphique de corrélation croisée sur la VAN"
      className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GitBranch
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Corrélation Croisée sur la VAN (2 Variables)
            </h2>
            <Tooltip
              align="left"
              label="Corrélation sur la VAN"
              content="Évalue 35 combinaisons simultanées de deux paramètres clés à travers le moteur complet (HS/BS, IR et flux actualisés sur 3 ans) pour visualiser l'effet joint sur la Valeur Actuelle Nette (VAN) et le seuil VAN = 0."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Croisement simultané de{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{result.varX.label}</strong> (axe X) et{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{result.varY.label}</strong> (courbes / axe Y)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Variable Selectors */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Var. X
              </span>
              <SelectMenu
                id="npv-corr-var-x"
                size="sm"
                ariaLabel="Variable axe X"
                value={varX}
                onChange={(val) => handleSelectVarX(val as CorrelationVariableId)}
                options={varOptions}
                className="w-[185px]"
              />
            </div>

            <button
              type="button"
              onClick={handleSwapVariables}
              title="Inverser les axes X et Y"
              aria-label="Inverser les variables X et Y"
              className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-600 dark:text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Var. Y
              </span>
              <SelectMenu
                id="npv-corr-var-y"
                size="sm"
                ariaLabel="Variable croisée Y"
                value={varY}
                onChange={(val) => handleSelectVarY(val as CorrelationVariableId)}
                options={varOptions}
                className="w-[185px]"
              />
            </div>
          </div>

          {/* Chart Mode Switcher */}
          <div
            role="group"
            aria-label="Mode d’affichage corrélation"
            className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627]"
          >
            <button
              type="button"
              onClick={() => setChartMode('curves')}
              aria-pressed={chartMode === 'curves'}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                chartMode === 'curves'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Courbes iso-VAN</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('scatter')}
              aria-pressed={chartMode === 'scatter'}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                chartMode === 'scatter'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <ScatterIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Nuage 2D</span>
            </button>
          </div>

          <ChartExportButtons
            selector='section[data-pdf-chart="npv-correlation-chart"]'
            filenameBase={`correlation_van_${varX}_${varY}`}
            chartTitle={`Corrélation VAN (${result.varX.shortLabel} × ${result.varY.shortLabel})`}
          />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] px-3.5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            VAN de référence (0 ; 0)
          </div>
          <div
            className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
              result.baseNpvAr >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatAriary(result.baseNpvAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            r({result.varX.shortLabel}) ={' '}
            <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
              {result.pearsonX >= 0 ? '+' : ''}
              {result.pearsonX.toFixed(2)}
            </span>{' '}
            · r({result.varY.shortLabel}) ={' '}
            <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
              {result.pearsonY >= 0 ? '+' : ''}
              {result.pearsonY.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] px-3.5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Plage VAN croisée (Min → Max)
          </div>
          <div className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100 mt-0.5">
            {formatAriary(result.minNpvAr, { inMillions: true })} →{' '}
            {formatAriary(result.maxNpvAr, { inMillions: true })}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Δ {result.varX.shortLabel} :{' '}
            <span className="font-mono tabular-nums">
              {formatAriary(result.xAmplitudeAr, { inMillions: true })}
            </span>{' '}
            · Δ {result.varY.shortLabel} :{' '}
            <span className="font-mono tabular-nums">
              {formatAriary(result.yAmplitudeAr, { inMillions: true })}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] px-3.5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Combinaisons à VAN &gt; 0
          </div>
          <div
            className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
              result.positiveSharePct >= 75
                ? 'text-emerald-700 dark:text-emerald-400'
                : result.positiveSharePct >= 50
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {result.positiveCount} / {result.totalPoints} ({result.positiveSharePct.toFixed(0)} %)
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Zone de création de valeur nette (r = {formatPercent(assumptions.discountRate, 0)})
          </div>
        </div>
      </div>

      {/* Main Chart Surface */}
      <div className="h-[340px] w-full min-w-0">
        {chartMode === 'curves' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={result.lineChartRows}
              margin={{ top: 14, right: 20, left: 8, bottom: 16 }}
            >
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis
                dataKey="xLabel"
                tick={{ fill: axisTickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                stroke={gridStroke}
                label={{
                  value: `${result.varX.label} (${result.varX.unitHint})`,
                  position: 'insideBottom',
                  offset: -10,
                  fill: axisTickColor,
                  fontSize: 11,
                }}
              />
              <YAxis
                tickFormatter={formatMArTick}
                tick={{ fill: axisTickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                stroke={gridStroke}
                width={66}
              />
              <ReferenceLine
                y={0}
                stroke={zeroLineColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: 'Seuil VAN = 0',
                  position: 'insideTopRight',
                  fill: zeroLineColor,
                  fontSize: 10,
                }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const row = payload[0].payload as Record<string, number | string>;
                  return (
                    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#161526] px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 max-w-[280px]">
                      <div className="font-semibold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-white/[0.08] pb-1">
                        {result.varX.shortLabel} : {String(row.xLabel)}{' '}
                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                          ({String(row.xActual)})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {result.ySeries.map((series) => {
                          const valMAr = Number(row[series.seriesKey] ?? 0);
                          return (
                            <div
                              key={series.seriesKey}
                              className="flex items-center justify-between gap-3 font-mono tabular-nums"
                            >
                              <span className="flex items-center gap-1.5 font-sans text-zinc-700 dark:text-zinc-300">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: series.color }}
                                />
                                {series.label}
                              </span>
                              <span
                                className={`font-bold ${
                                  valMAr >= 0
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {valMAr >= 0 ? '+' : ''}
                                {valMAr.toFixed(1)} M Ar
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              {result.ySeries.map((series) => (
                <Line
                  key={series.seriesKey}
                  type="monotone"
                  dataKey={series.seriesKey}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={series.isBaseLevel ? 3 : 2}
                  strokeDasharray={series.isBaseLevel ? undefined : '5 3'}
                  dot={{ r: series.isBaseLevel ? 4 : 3, strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 14, right: 24, left: 10, bottom: 16 }}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="xPct"
                name={result.varX.shortLabel}
                unit="%"
                tick={{ fill: axisTickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                stroke={gridStroke}
                label={{
                  value: `${result.varX.label} (Δ)`,
                  position: 'insideBottom',
                  offset: -10,
                  fill: axisTickColor,
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="yPct"
                name={result.varY.shortLabel}
                unit="%"
                tick={{ fill: axisTickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                stroke={gridStroke}
                width={58}
                label={{
                  value: `${result.varY.shortLabel} (Δ)`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: axisTickColor,
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" dataKey="absNpvMagnitude" range={scatterZRange} />
              <ReferenceLine x={0} stroke={gridStroke} strokeDasharray="3 3" />
              <ReferenceLine y={0} stroke={gridStroke} strokeDasharray="3 3" />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as NpvCorrelationPoint;
                  return (
                    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#161526] px-3.5 py-2.5 shadow-lg text-xs space-y-1">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {pt.isBase ? 'Point de Référence (0 ; 0)' : 'Combinaison croisée'}
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300">
                        {CORRELATION_VARIABLES[varX].shortLabel} :{' '}
                        <strong className="font-mono">{pt.xLabel}</strong> ({pt.xActual})
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300">
                        {CORRELATION_VARIABLES[varY].shortLabel} :{' '}
                        <strong className="font-mono">{pt.yLabel}</strong> ({pt.yActual})
                      </div>
                      <div className="pt-1 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="font-sans text-zinc-500 dark:text-zinc-400">VAN :</span>
                        <span
                          className={`font-bold ${
                            pt.npvAr >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {formatAriary(pt.npvAr, { inMillions: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono tabular-nums">
                        <span className="font-sans text-zinc-500 dark:text-zinc-400">TRI :</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {pt.irrFinite ? formatPercent(pt.irrValue, 1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatterData} name="VAN croisée">
                {scatterData.map((pt, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={getTierColor(pt.tier)}
                    fillOpacity={pt.isBase ? 1 : 0.8}
                    stroke={pt.isBase ? (isDark ? '#ffffff' : '#18181b') : 'none'}
                    strokeWidth={pt.isBase ? 2.5 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {chartMode === 'curves' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Niveaux {result.varY.shortLabel} :
          </span>
          {result.ySeries.map((s) => (
            <span key={s.seriesKey} className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
              <span
                className="w-4 h-0.5 inline-block rounded-full"
                style={{
                  backgroundColor: s.color,
                  height: s.isBaseLevel ? '3px' : '2px',
                }}
              />
              <span className={s.isBaseLevel ? 'font-bold text-zinc-900 dark:text-white' : ''}>
                {s.label}
                {s.isBaseLevel ? ' (Réf.)' : ''}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Légende VAN :</span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] inline-block" /> VAN &lt; 0
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706] inline-block" /> 0 – 200 M Ar
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488] inline-block" /> 200 – 500 M Ar
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block" /> &gt; 500 M Ar
          </span>
          <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-900 dark:border-white inline-block" /> Référence (0 ; 0)
          </span>
        </div>
      )}
    </section>
  );
};
