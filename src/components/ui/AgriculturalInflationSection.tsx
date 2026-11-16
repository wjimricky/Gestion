import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { TrendingUp, RotateCcw } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  AGRICULTURAL_INFLATION_PRESETS,
  AgriculturalInflationParams,
  computeAgriculturalInflation5Y,
  DEFAULT_AGRICULTURAL_INFLATION_PARAMS,
  InflationMacroPreset,
} from '../../utils/agriculturalInflation';
import { Tooltip } from './Tooltip';
import { ChartExportButtons } from './ChartExportButtons';

export const AgriculturalInflationSection: React.FC = () => {
  const { assumptions, model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [params, setParams] = useState<AgriculturalInflationParams>(
    DEFAULT_AGRICULTURAL_INFLATION_PARAMS
  );

  const summary = useMemo(
    () => computeAgriculturalInflation5Y(assumptions, model, params),
    [assumptions, model, params]
  );

  const applyPreset = (presetId: Exclude<InflationMacroPreset, 'custom'>) => {
    const found = AGRICULTURAL_INFLATION_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setParams({
      preset: found.id,
      ...found.params,
    });
  };

  const updateField = (
    field: Exclude<keyof AgriculturalInflationParams, 'preset'>,
    value: number
  ) => {
    setParams((prev) => ({
      ...prev,
      preset: 'custom',
      [field]: value,
    }));
  };

  const chartData = useMemo(
    () =>
      summary.years.map((row) => ({
        label: row.label,
        nominalNetM: Number((row.nominalNetAfterTaxAr / 1e6).toFixed(2)),
        realNetM: Number((row.realNetAfterTaxAr / 1e6).toFixed(2)),
        baselineM: Number((row.constantBaselineNetAfterTaxAr / 1e6).toFixed(2)),
        nominalRaw: row.nominalNetAfterTaxAr,
        realRaw: row.realNetAfterTaxAr,
        baselineRaw: row.constantBaselineNetAfterTaxAr,
        paddyHs: row.paddyPriceHsArPerKg,
      })),
    [summary.years]
  );

  return (
    <section
      aria-label="Calculateur d'inflation agricole Madagascar sur 5 ans"
      className="p-4 sm:p-5 rounded-xl border border-amber-500/25 dark:border-amber-500/30 bg-white dark:bg-[#11101C] space-y-4 no-print"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              4f. Calculateur d&apos;Inflation Agricole Madagascar (Indexation sur 5 ans · A1–A5)
            </h2>
            <Tooltip
              align="left"
              label="Indexation inflation Madagascar"
              content="Applique des taux d'inflation annuels différenciés aux prix du paddy producteur, aux intrants (gasoil, sacs, décorticage) et aux charges fixes sur 5 ans, tout en déflatant les résultats en Ariary constants (Année 1) via l'IPC."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Modélisez l&apos;érosion des marges face à l&apos;inflation du paddy et des intrants à Madagascar, avec calcul en Ariary courants vs Ariary constants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setParams(DEFAULT_AGRICULTURAL_INFLATION_PARAMS)}
          className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 self-start transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* Macro Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {AGRICULTURAL_INFLATION_PRESETS.map((preset) => {
          const active = params.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              aria-pressed={active}
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? 'border-amber-500/60 bg-amber-500/10 text-zinc-950 dark:text-white'
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] hover:border-zinc-300 dark:hover:border-white/20 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <div className="text-xs font-semibold">{preset.shortLabel}</div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Sliders / Numeric Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-3.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0C18]">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-paddy" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Inflation prix du paddy
            </label>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              +{params.paddyInflationRatePct.toFixed(1)} %/an
            </span>
          </div>
          <input
            id="inf-paddy"
            type="range"
            min={0}
            max={25}
            step={0.5}
            value={params.paddyInflationRatePct}
            onChange={(e) => updateField('paddyInflationRatePct', Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-inputs" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Inflation intrants &amp; gasoil
            </label>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              +{params.inputsAndFuelInflationRatePct.toFixed(1)} %/an
            </span>
          </div>
          <input
            id="inf-inputs"
            type="range"
            min={0}
            max={25}
            step={0.5}
            value={params.inputsAndFuelInflationRatePct}
            onChange={(e) => updateField('inputsAndFuelInflationRatePct', Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-fixed" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Inflation charges fixes
            </label>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              +{params.fixedChargesInflationRatePct.toFixed(1)} %/an
            </span>
          </div>
          <input
            id="inf-fixed"
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={params.fixedChargesInflationRatePct}
            onChange={(e) => updateField('fixedChargesInflationRatePct', Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-passthrough" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Répercussion sur prix de vente riz
            </label>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
              {params.sellingPricePassThroughPct} %
            </span>
          </div>
          <input
            id="inf-passthrough"
            type="range"
            min={0}
            max={120}
            step={5}
            value={params.sellingPricePassThroughPct}
            onChange={(e) => updateField('sellingPricePassThroughPct', Number(e.target.value))}
            className="w-full accent-teal-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-cpi" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Déflateur IPC général (Ar constants)
            </label>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
              {params.generalCpiDeflatorPct.toFixed(1)} %/an
            </span>
          </div>
          <input
            id="inf-cpi"
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={params.generalCpiDeflatorPct}
            onChange={(e) => updateField('generalCpiDeflatorPct', Number(e.target.value))}
            className="w-full accent-zinc-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <label htmlFor="inf-vol" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Croissance physique volumes
            </label>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
              +{params.volumeGrowthPctPerYear.toFixed(1)} %/an
            </span>
          </div>
          <input
            id="inf-vol"
            type="range"
            min={0}
            max={20}
            step={1}
            value={params.volumeGrowthPctPerYear}
            onChange={(e) => updateField('volumeGrowthPctPerYear', Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Prix paddy HS en Année 5
          </div>
          <div className="mt-1 font-mono font-bold text-base text-zinc-900 dark:text-white tabular-nums">
            {summary.year5PaddyPriceHsArPerKg.toLocaleString('fr-FR')} Ar/kg
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            Base A1 : {summary.years[0]?.paddyPriceHsArPerKg.toLocaleString('fr-FR')} Ar/kg
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Résultat net cumulé 5 ans
          </div>
          <div className="mt-1 font-mono font-bold text-base text-zinc-900 dark:text-white tabular-nums">
            {formatAriary(summary.cumulativeRealNet5YAr, { inMillions: inM })}{' '}
            <span className="text-[11px] font-normal text-teal-600 dark:text-teal-400">(réel)</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            Nominal : {formatAriary(summary.cumulativeNominalNet5YAr, { inMillions: inM })}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Érosion pouvoir d&apos;achat (vs 0 % infl.)
          </div>
          <div
            className={`mt-1 font-mono font-bold text-base tabular-nums ${
              summary.realPurchasingPowerErosionAr < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            {summary.realPurchasingPowerErosionAr >= 0 ? '+' : ''}
            {formatAriary(summary.realPurchasingPowerErosionAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            Variation réelle : {summary.realPurchasingPowerErosionPct >= 0 ? '+' : ''}
            {formatPercent(summary.realPurchasingPowerErosionPct, 1)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            VAN 5 ans Réelle (Ar constants)
          </div>
          <div
            className={`mt-1 font-mono font-bold text-base tabular-nums ${
              summary.npv5YRealAr >= 0
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatAriary(summary.npv5YRealAr, { inMillions: true })}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            Marge A1 {formatPercent(summary.year1MarginRate, 1)} → A5{' '}
            {formatPercent(summary.year5MarginRate, 1)}
          </div>
        </div>
      </div>

      {/* Chart + 5Y Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div
          ref={chartContainerRef}
          className="xl:col-span-6 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Résultat Net 5 ans : Nominal vs Ar Constants A1 (M Ar)
            </h3>
            <ChartExportButtons
              targetRef={chartContainerRef}
              filenameBase="inflation_agricole_5_ans"
              chartTitle="Inflation Agricole 5 ans"
            />
          </div>

          <div className="w-full h-[230px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v} M`}
                  width={48}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as (typeof chartData)[number];
                    return (
                      <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700 text-xs text-zinc-100 shadow-xl space-y-1">
                        <div className="font-bold text-white">
                          {row.label} · Paddy HS : {row.paddyHs.toLocaleString('fr-FR')} Ar/kg
                        </div>
                        <div className="flex justify-between gap-4 font-mono">
                          <span className="text-amber-300">Nominal :</span>
                          <span>{formatAriary(row.nominalRaw, { inMillions: true })}</span>
                        </div>
                        <div className="flex justify-between gap-4 font-mono">
                          <span className="text-teal-300">Réel (Ar A1) :</span>
                          <span>{formatAriary(row.realRaw, { inMillions: true })}</span>
                        </div>
                        <div className="flex justify-between gap-4 font-mono">
                          <span className="text-indigo-300">Repère 0 % infl. :</span>
                          <span>{formatAriary(row.baselineRaw, { inMillions: true })}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="nominalNetM"
                  name="Net Nominal (M Ar)"
                  fill="#f59e0b"
                  fillOpacity={0.75}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="realNetM"
                  name="Net Réel constant (M Ar)"
                  fill="#2dd4bf"
                  fillOpacity={0.85}
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line
                  type="monotone"
                  dataKey="baselineM"
                  name="Repère 0 % inflation"
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5-Year Indexed Table */}
        <div className="xl:col-span-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-100 dark:bg-[#191828] text-zinc-700 dark:text-zinc-300 font-semibold">
              <tr>
                <th className="px-3 py-2">Année</th>
                <th className="px-3 py-2 text-right">Paddy HS</th>
                <th className="px-3 py-2 text-right">CA Nominal</th>
                <th className="px-3 py-2 text-right">Net Nominal</th>
                <th className="px-3 py-2 text-right">Net Réel (A1)</th>
                <th className="px-3 py-2 text-right">Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.06] font-mono tabular-nums">
              {summary.years.map((row) => (
                <tr key={row.year} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.label}
                  </td>
                  <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-300">
                    {row.paddyPriceHsArPerKg.toLocaleString('fr-FR')} Ar
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                    {formatAriary(row.nominalTurnoverAr, { inMillions: true })}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-900 dark:text-white font-semibold">
                    {formatAriary(row.nominalNetAfterTaxAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      row.realNetAfterTaxAr >= row.constantBaselineNetAfterTaxAr
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatAriary(row.realNetAfterTaxAr, { inMillions: inM })}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                    {formatPercent(row.nominalMarginRate, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
