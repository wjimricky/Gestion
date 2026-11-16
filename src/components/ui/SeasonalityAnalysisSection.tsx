import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import {
  CalendarRange,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  computeSeasonalityAnalysis,
  DEFAULT_SEASONALITY_CONFIG,
  SEASONALITY_PRESETS,
  SeasonalityPresetId,
  SeasonalitySimulationConfig,
} from '../../utils/seasonality';
import { CALENDAR_MONTHS_FR } from '../../utils/treasury';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

export const SeasonalityAnalysisSection: React.FC = () => {
  const { assumptions, model, unitDisplay, updateVariableCostPerKg, notify } =
    useFinancial();
  const inM = unitDisplay === 'millions';

  const [config, setConfig] = useState<SeasonalitySimulationConfig>(
    DEFAULT_SEASONALITY_CONFIG
  );

  const analysis = useMemo(
    () => computeSeasonalityAnalysis(assumptions, model, config),
    [assumptions, model, config]
  );

  const bfrChartData = useMemo(
    () =>
      analysis.points.map((p) => ({
        label: `${p.monthShort} (${p.seasonTag})`,
        monthName: p.monthName,
        seasonTag: p.seasonTag,
        paddyPrice: p.paddyPriceArPerKg,
        baselinePaddyPrice: p.baselinePaddyPriceArPerKg,
        bfrRotM: Number((p.bfrPerRotationAr / 1e6).toFixed(2)),
        baseBfrRotM: Number((p.baselineBfrPerRotationAr / 1e6).toFixed(2)),
      })),
    [analysis.points]
  );

  const cashFlowChartData = useMemo(
    () =>
      analysis.points.map((p) => ({
        label: p.monthShort,
        monthName: p.monthName,
        seasonTag: p.seasonTag,
        cumCashM: Number((p.cumulativeCashFlowAr / 1e6).toFixed(2)),
        baseCumCashM: Number((p.baselineCumulativeCashFlowAr / 1e6).toFixed(2)),
        netMonthlyM: Number((p.monthlyNetCashFlowAr / 1e6).toFixed(2)),
      })),
    [analysis.points]
  );

  const activePresetId: SeasonalityPresetId | null = useMemo(() => {
    const hasOverrides = Object.keys(config.monthlyPriceOverrides).length > 0;
    if (hasOverrides) return null;
    const match = SEASONALITY_PRESETS.find(
      (pr) =>
        Math.abs(pr.peakSoudureInflationPct - config.peakSoudureInflationPct) < 1e-4 &&
        Math.abs(pr.harvestDiscountPct - config.harvestDiscountPct) < 1e-4
    );
    return match?.id ?? null;
  }, [config]);

  const handleApplyPreset = (presetId: SeasonalityPresetId) => {
    const preset = SEASONALITY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      peakSoudureInflationPct: preset.peakSoudureInflationPct,
      harvestDiscountPct: preset.harvestDiscountPct,
      monthlyPriceOverrides: {},
    }));
  };

  const handleOverrideMonthPrice = (calendarIndex: number, rawVal: string) => {
    const parsed = Number(rawVal);
    if (!rawVal.trim() || !Number.isFinite(parsed) || parsed < 0) {
      setConfig((prev) => {
        const next = { ...prev.monthlyPriceOverrides };
        delete next[calendarIndex];
        return { ...prev, monthlyPriceOverrides: next };
      });
      return;
    }
    setConfig((prev) => ({
      ...prev,
      monthlyPriceOverrides: {
        ...prev.monthlyPriceOverrides,
        [calendarIndex]: Math.round(parsed),
      },
    }));
  };

  const handleSyncToModel = () => {
    updateVariableCostPerKg('cost-paddy', 'costHS', analysis.avgSimulatedPaddyHS);
    updateVariableCostPerKg('cost-paddy', 'costBS', analysis.avgSimulatedPaddyBS);
    notify(
      'success',
      `Prix moyens du paddy appliqués : ${analysis.avgSimulatedPaddyHS.toLocaleString('fr-FR')} Ar/kg (HS) et ${analysis.avgSimulatedPaddyBS.toLocaleString('fr-FR')} Ar/kg (BS).`
    );
  };

  const startMonthOptions = CALENDAR_MONTHS_FR.map((label, idx) => ({
    value: String(idx),
    label: `${label} (M1)`,
    description:
      idx === 4
        ? 'Début standard de la grande récolte à Madagascar'
        : `Campagne démarrant en ${label}`,
  }));

  return (
    <div className="space-y-5">
      {/* Header & Presets */}
      <section className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
          <div className="flex items-start gap-2.5">
            <CalendarRange
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  Analyse de Saisonnalité — Prix Mensuels du Paddy, BFR &amp; Trésorerie
                </h2>
                <Tooltip
                  align="left"
                  label="Analyse de Saisonnalité"
                  content="Simule la courbe intra-annuelle des prix d’achat du paddy (creux de récolte en Haute Saison vs pic de soudure en Basse Saison), son impact sur le Besoin en Fonds de Roulement (BFR) par rotation et sur les flux de trésorerie cumulés sur 12 mois."
                />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Anticipez les pointes de BFR liées aux variations mensuelles du prix du paddy et testez votre capacité d’autofinancement sur 12 mois.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_SEASONALITY_CONFIG)}
              className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Réinitialiser</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToModel}
              title="Met à jour le prix d'achat du paddy HS/BS du modèle avec les moyennes saisonnières simulées"
              className="min-h-9 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Appliquer moyennes HS/BS au modèle</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Presets + Parameters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mr-1">
            Profils saisonniers :
          </span>
          {SEASONALITY_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-500/12 text-indigo-800 dark:text-indigo-200'
                    : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
            <label
              htmlFor="seasonality-start-month"
              className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Mois de démarrage campagne
            </label>
            <SelectMenu
              id="seasonality-start-month"
              ariaLabel="Mois de démarrage de la campagne"
              value={String(config.startMonthIndex)}
              onChange={(v) =>
                setConfig((prev) => ({ ...prev, startMonthIndex: Number(v) }))
              }
              options={startMonthOptions}
              className="w-full"
            />
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="seasonality-harvest-discount"
                className="font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Creux prix récolte (HS)
              </label>
              <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-400">
                {config.harvestDiscountPct > 0 ? '+' : ''}
                {Math.round(config.harvestDiscountPct * 100)} %
              </span>
            </div>
            <input
              id="seasonality-harvest-discount"
              type="range"
              min={-25}
              max={15}
              step={1}
              value={Math.round(config.harvestDiscountPct * 100)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  harvestDiscountPct: Number(e.target.value) / 100,
                }))
              }
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>−25 %</span>
              <span>0 %</span>
              <span>+15 %</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="seasonality-soudure-peak"
                className="font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Tension pic soudure (BS)
              </label>
              <span className="font-mono font-bold tabular-nums text-rose-700 dark:text-rose-400">
                +{Math.round(config.peakSoudureInflationPct * 100)} %
              </span>
            </div>
            <input
              id="seasonality-soudure-peak"
              type="range"
              min={0}
              max={50}
              step={1}
              value={Math.round(config.peakSoudureInflationPct * 100)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  peakSoudureInflationPct: Number(e.target.value) / 100,
                }))
              }
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>0 %</span>
              <span>+25 %</span>
              <span>+50 %</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="seasonality-passthrough"
                className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3 text-indigo-500" aria-hidden="true" />
                <span>Répercussion prix vente riz</span>
              </label>
              <span className="font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                {Math.round(config.ricePricePassThrough * 100)} %
              </span>
            </div>
            <input
              id="seasonality-passthrough"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(config.ricePricePassThrough * 100)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  ricePricePassThrough: Number(e.target.value) / 100,
                }))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>0 % (Prix fixe)</span>
              <span>50 %</span>
              <span>100 %</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 KPI Strip */}
      <section className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Pic BFR / rotation ({analysis.peakBfrMonthName})
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(analysis.peakBfrPerRotationAr, { inMillions: inM })}
          </div>
          <div
            className={`text-xs font-mono tabular-nums mt-1 ${
              analysis.maxBfrDeltaAr > 50000
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            {analysis.maxBfrDeltaAr >= 0 ? '+' : ''}
            {formatAriary(analysis.maxBfrDeltaAr, { inMillions: true })} vs base (
            {formatPercent(analysis.maxBfrDeltaPct, 1)})
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Amplitude prix du paddy (M1–M12)
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {analysis.minPaddyPriceAr.toLocaleString('fr-FR')} →{' '}
            {analysis.maxPaddyPriceAr.toLocaleString('fr-FR')} Ar/kg
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-1">
            Moy. HS {analysis.avgSimulatedPaddyHS} Ar · BS {analysis.avgSimulatedPaddyBS} Ar
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Point bas trésorerie ({analysis.minCumulativeCashMonthName})
          </div>
          <div
            className={`mt-1 text-xl font-bold font-mono tabular-nums ${
              analysis.minCumulativeCashAr < 0
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-zinc-900 dark:text-white'
            }`}
          >
            {formatAriary(analysis.minCumulativeCashAr, { inMillions: true })}
          </div>
          <div className="mt-1 text-xs inline-flex items-center gap-1 font-medium">
            {analysis.minCumulativeCashAr < 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-rose-700 dark:text-rose-400">
                  Découvert / tension critique
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="text-teal-700 dark:text-teal-400">
                  Trésorerie toujours positive
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Trésorerie cumulée fin d’année (M12)
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-300">
            {formatAriary(analysis.endingCumulativeCashAr, { inMillions: true })}
          </div>
          <div
            className={`text-xs font-mono tabular-nums mt-1 inline-flex items-center gap-1 ${
              analysis.annualCashFlowDeltaAr >= 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              Écart vs statique : {analysis.annualCashFlowDeltaAr >= 0 ? '+' : ''}
              {formatAriary(analysis.annualCashFlowDeltaAr, { inMillions: true })}
            </span>
          </div>
        </div>
      </section>

      {/* Dual Forecast Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Chart 1: Paddy Price vs BFR per rotation */}
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Prix Mensuel du Paddy (Ar/kg) vs BFR par Rotation (M Ar)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Visualisez l’élasticité directe du besoin en fonds de roulement à chaque oscillation du marché du paddy.
            </p>
          </div>
          <div className="h-[290px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={bfrChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                  yAxisId="left"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(v) => `${v}M`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#F59E0B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => `${v}`}
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    const num = Number(value ?? 0);
                    const label = String(name ?? '');
                    if (label.includes('Prix')) {
                      return [`${Math.round(num).toLocaleString('fr-FR')} Ar/kg`, label];
                    }
                    return [`${num.toFixed(2)} M Ar`, label];
                  }}
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
                  yAxisId="left"
                  dataKey="bfrRotM"
                  name="BFR simulé / rot. (M Ar)"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="baseBfrRotM"
                  name="BFR statique (M Ar)"
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="paddyPrice"
                  name="Prix paddy (Ar/kg)"
                  stroke="#F59E0B"
                  strokeWidth={2.4}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Forecast Cash Flow (Simulated vs Static Baseline) */}
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Flux de Trésorerie Prévisionnels Cumulés (12 Mois)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Trajectoire de trésorerie avec saisonnalité mensuelle comparée au modèle linéaire HS/BS.
            </p>
          </div>
          <div className="h-[290px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cashFlowChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="seasonCashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.02} />
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
                  dataKey="cumCashM"
                  name="Trésorerie cumulée simulée (M Ar)"
                  stroke="#14B8A6"
                  strokeWidth={2.4}
                  fill="url(#seasonCashGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="baseCumCashM"
                  name="Trésorerie référence statique (M Ar)"
                  stroke="#6366F1"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Editable 12-Month Breakdown Table */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Calendrier Mensuel des Prix du Paddy &amp; Besoins en Fonds de Roulement
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Vous pouvez ajuster manuellement le prix du paddy d’un mois précis directement dans la colonne dédiée.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-2.5 px-3 font-semibold">Mois</th>
                <th className="py-2.5 px-3 font-semibold">Saison</th>
                <th className="py-2.5 px-3 text-right font-semibold">Prix paddy (Ar/kg)</th>
                <th className="py-2.5 px-3 text-right font-semibold">BFR / rotation</th>
                <th className="py-2.5 px-3 text-right font-semibold">Écart BFR</th>
                <th className="py-2.5 px-3 text-right font-semibold">Flux net mensuel</th>
                <th className="py-2.5 px-3 text-right font-semibold">Trésorerie cumulée</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {analysis.points.map((pt) => (
                <tr
                  key={pt.monthNumber}
                  className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]"
                >
                  <td className="py-2 px-3 font-sans font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    M{pt.monthNumber} · {pt.monthName}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        pt.seasonTag === 'HS'
                          ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
                          : 'bg-cyan-500/12 text-cyan-800 dark:text-cyan-300'
                      }`}
                    >
                      {pt.seasonTag}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      step="25"
                      min="100"
                      aria-label={`Prix du paddy pour ${pt.monthName}`}
                      value={pt.paddyPriceArPerKg}
                      onChange={(e) =>
                        handleOverrideMonthPrice(pt.calendarIndex, e.target.value)
                      }
                      className={`w-24 px-2 py-1 text-right rounded-md border text-xs font-mono tabular-nums bg-white dark:bg-[#0D0C18] ${
                        pt.isOverridden
                          ? 'border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'border-zinc-300 dark:border-white/[0.12] text-zinc-900 dark:text-zinc-100'
                      }`}
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatAriary(pt.bfrPerRotationAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2 px-3 text-right whitespace-nowrap ${
                      pt.bfrDeltaAr > 1000
                        ? 'text-rose-700 dark:text-rose-400'
                        : pt.bfrDeltaAr < -1000
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {pt.bfrDeltaAr >= 0 ? '+' : ''}
                    {formatAriary(pt.bfrDeltaAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2 px-3 text-right whitespace-nowrap ${
                      pt.monthlyNetCashFlowAr >= 0
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatAriary(pt.monthlyNetCashFlowAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                      pt.cumulativeCashFlowAr >= 0
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatAriary(pt.cumulativeCashFlowAr, { inMillions: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
