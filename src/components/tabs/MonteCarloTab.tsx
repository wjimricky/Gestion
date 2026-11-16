import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  Dices,
  Play,
  RefreshCw,
  Download,
  TrendingUp,
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { KpiCard } from '../ui/KpiCard';
import { Tooltip } from '../ui/Tooltip';
import {
  DEFAULT_MONTE_CARLO_CONFIG,
  exportMonteCarloCsv,
  MonteCarloConfig,
  MonteCarloDistributionType,
  runMonteCarloSimulation,
} from '../../utils/monteCarlo';

export const MonteCarloTab: React.FC = () => {
  const { assumptions, unitDisplay, notify } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [config, setConfig] = useState<MonteCarloConfig>(DEFAULT_MONTE_CARLO_CONFIG);
  const [chartTab, setChartTab] = useState<'distributions' | 'scatter'>('distributions');

  const simulation = useMemo(
    () => runMonteCarloSimulation(assumptions, config),
    [assumptions, config]
  );

  const handleReseedAndRun = () => {
    const nextSeed = Math.floor(100000 + Math.random() * 899999);
    setConfig((prev) => ({ ...prev, seed: nextSeed }));
    notify('success', `${config.iterations.toLocaleString('fr-FR')} nouvelles itérations générées.`);
  };

  const handleExportCsv = () => {
    exportMonteCarloCsv(simulation);
    notify(
      'success',
      `Export CSV des ${simulation.config.iterations.toLocaleString('fr-FR')} tirages Monte Carlo téléchargé.`
    );
  };

  const npvSummaryRows = [
    { label: 'P5 (Risque extrême 5 %)', val: simulation.npvStats.p5, tone: 'risk' },
    { label: 'P10 (Scénario prudent)', val: simulation.npvStats.p10, tone: 'caution' },
    { label: 'P25 (Quartile inférieur)', val: simulation.npvStats.p25, tone: 'neutral' },
    { label: 'P50 (Médiane simulée)', val: simulation.npvStats.p50, tone: 'median' },
    { label: 'Moyenne espérée E[VAN]', val: simulation.npvStats.mean, tone: 'neutral' },
    { label: 'P75 (Quartile supérieur)', val: simulation.npvStats.p75, tone: 'neutral' },
    { label: 'P90 (Scénario favorable)', val: simulation.npvStats.p90, tone: 'positive' },
    { label: 'P95 (Queue haute 95 %)', val: simulation.npvStats.p95, tone: 'positive' },
  ];

  const irrSummaryRows = [
    { label: 'P5 (Risque extrême 5 %)', val: simulation.irrStats.p5 },
    { label: 'P10 (Scénario prudent)', val: simulation.irrStats.p10 },
    { label: 'P25 (Quartile inférieur)', val: simulation.irrStats.p25 },
    { label: 'P50 (Médiane simulée)', val: simulation.irrStats.p50 },
    { label: 'Moyenne espérée E[TRI]', val: simulation.irrStats.mean },
    { label: 'P75 (Quartile supérieur)', val: simulation.irrStats.p75 },
    { label: 'P90 (Scénario favorable)', val: simulation.irrStats.p90 },
    { label: 'P95 (Queue haute 95 %)', val: simulation.irrStats.p95 },
  ];

  const isRobustViability = simulation.probNpvPositive >= 0.8 && simulation.probIrrAboveDiscount >= 0.8;
  const isModerateRisk = simulation.probNpvPositive >= 0.55 && !isRobustViability;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Dices className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Simulation Monte Carlo — Variabilité Prix Paddy &amp; Rendements</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Modélisation stochastique sur{' '}
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-200 tabular-nums">
              {simulation.config.iterations.toLocaleString('fr-FR')}
            </span>{' '}
            itérations (exécutées en{' '}
            <span className="font-mono tabular-nums">{simulation.durationMs} ms</span>) pour estimer
            la distribution de probabilité de la VAN et du TRI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={handleReseedAndRun}
            className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Générer {config.iterations.toLocaleString('fr-FR')} itérations</span>
          </button>

          <button
            type="button"
            onClick={() => setConfig(DEFAULT_MONTE_CARLO_CONFIG)}
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Paramètres standard</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Exporter CSV ({config.iterations})</span>
          </button>
        </div>
      </div>

      {/* Summary Verdict Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isRobustViability
            ? 'border-teal-500/35 bg-teal-500/[0.06]'
            : isModerateRisk
            ? 'border-amber-500/40 bg-amber-500/[0.07]'
            : 'border-rose-500/45 bg-rose-500/[0.08]'
        }`}
      >
        <div className="flex items-start gap-2.5 text-xs sm:text-sm">
          {isRobustViability ? (
            <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                isModerateRisk
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
              aria-hidden="true"
            />
          )}
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              {isRobustViability
                ? `Profil de rentabilité robuste (${formatPercent(simulation.probNpvPositive, 1)} de scénarios à VAN > 0)`
                : isModerateRisk
                ? `Sensibilité modérée aux aléas paddy/récolte (${formatPercent(simulation.probNpvPositive, 1)} à VAN > 0)`
                : `Exposition élevée aux chocs prix paddy & rendement (${formatPercent(1 - simulation.probNpvPositive, 1)} de perte)`}
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono tabular-nums">
              VAN déterministe : {formatAriary(simulation.baseNpvAr, { inMillions: true })} · Intervalle de confiance 80 % (P10–P90) :{' '}
              {formatAriary(simulation.npvStats.p10, { inMillions: true })} à{' '}
              {formatAriary(simulation.npvStats.p90, { inMillions: true })}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono tabular-nums text-zinc-700 dark:text-zinc-300 shrink-0">
          Graine aléatoire #{simulation.config.seed}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="VAN Médiane (P50)"
          value={formatAriary(simulation.npvStats.p50, { inMillions: inM })}
          animatedValue={simulation.npvStats.p50}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Moyenne : ${formatAriary(simulation.npvStats.mean, { inMillions: true })} · σ ${formatAriary(simulation.npvStats.stdDev, { inMillions: true })}`}
          icon={TrendingUp}
          tone={simulation.npvStats.p50 > 0 ? 'positive' : 'danger'}
          tooltipAlign="left"
          tooltip="Médiane (50e centile) de la Valeur Actuelle Nette à 3 ans sur les 1 000 tirages simulés."
        />
        <KpiCard
          label="Probabilité VAN > 0"
          value={formatPercent(simulation.probNpvPositive, 1)}
          animatedValue={simulation.probNpvPositive}
          formatAnimated={(v) => formatPercent(v, 1)}
          sub={`P(VAN ≥ seuil cible) : ${formatPercent(simulation.probNpvAboveThreshold, 1)}`}
          icon={CheckCircle2}
          tone={
            simulation.probNpvPositive >= 0.8
              ? 'positive'
              : simulation.probNpvPositive >= 0.55
              ? 'warning'
              : 'danger'
          }
          tooltip="Part des simulations générant une VAN strictement positive après actualisation au taux r."
        />
        <KpiCard
          label="TRI Médian (P50)"
          value={formatPercent(simulation.irrStats.p50, 1)}
          animatedValue={simulation.irrStats.p50}
          formatAnimated={(v) => formatPercent(v, 1)}
          sub={`P(TRI > r = ${formatPercent(simulation.discountRate, 0)}) : ${formatPercent(simulation.probIrrAboveDiscount, 1)}`}
          icon={Percent}
          tone={simulation.irrStats.p50 > simulation.discountRate ? 'info' : 'danger'}
          tooltip="Médiane du Taux de Rentabilité Interne sur les itérations convergentes."
        />
        <KpiCard
          label="VaR 95 % (P5 VAN)"
          value={formatAriary(simulation.npvStats.p5, { inMillions: inM })}
          animatedValue={simulation.npvStats.p5}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Seuil critique 5 % pires tirages · TRI P5 : ${formatPercent(simulation.irrStats.p5, 1)}`}
          icon={ShieldAlert}
          tone={simulation.npvStats.p5 >= 0 ? 'positive' : 'warning'}
          tooltipAlign="right"
          tooltip="Value-at-Risk à 95 % : dans 95 % des scénarios simulés, la VAN reste supérieure à ce plancher."
        />
      </div>

      {/* Simulation Controls Panel */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Paramètres de volatilité &amp; corrélation stochastique
            </h2>
            <Tooltip
              align="left"
              label="Hypothèses stochastiques"
              content="Ajustez l'écart-type des prix d'achat du paddy, la variabilité des volumes récoltés, la précision du rendement d'usinage et la corrélation inverse récolte/prix observée à Madagascar."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Distribution toggle */}
            <div className="inline-flex items-center p-1 rounded-lg bg-zinc-100 dark:bg-[#181728]">
              {(['normal', 'triangular'] as MonteCarloDistributionType[]).map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, distribution: dist }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    config.distribution === dist
                      ? 'bg-white dark:bg-[#262440] text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {dist === 'normal' ? 'Loi Normale' : 'Loi Triangulaire'}
                </button>
              ))}
            </div>

            {/* Iterations selector */}
            <div className="inline-flex items-center p-1 rounded-lg bg-zinc-100 dark:bg-[#181728]">
              {[1000, 2500, 5000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, iterations: n }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold tabular-nums transition-colors whitespace-nowrap ${
                    config.iterations === n
                      ? 'bg-white dark:bg-[#262440] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {n.toLocaleString('fr-FR')} it.
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {/* 1. Paddy price volatility */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="mc-price-vol" className="font-semibold text-zinc-800 dark:text-zinc-200">
                Volatilité prix paddy (σ)
              </label>
              <span className="font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                ±{(config.paddyPriceVolatilityPct * 100).toFixed(0)} %
              </span>
            </div>
            <input
              id="mc-price-vol"
              type="range"
              min="0.02"
              max="0.35"
              step="0.01"
              value={config.paddyPriceVolatilityPct}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, paddyPriceVolatilityPct: Number(e.target.value) }))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>2 % (stable)</span>
              <span>35 % (spéculatif)</span>
            </div>
          </div>

          {/* 2. Harvest volume volatility */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="mc-harvest-vol" className="font-semibold text-zinc-800 dark:text-zinc-200">
                Aléa récolte / volume (σ)
              </label>
              <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-300">
                ±{(config.harvestYieldVolatilityPct * 100).toFixed(0)} %
              </span>
            </div>
            <input
              id="mc-harvest-vol"
              type="range"
              min="0.02"
              max="0.30"
              step="0.01"
              value={config.harvestYieldVolatilityPct}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, harvestYieldVolatilityPct: Number(e.target.value) }))
              }
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>2 %</span>
              <span>30 % (aléa climatique)</span>
            </div>
          </div>

          {/* 3. Milling yield variability */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="mc-milling-vol" className="font-semibold text-zinc-800 dark:text-zinc-200">
                Rendement usinage (σ)
              </label>
              <span className="font-mono font-bold tabular-nums text-sky-700 dark:text-sky-300">
                ±{(config.millingYieldStdPts * 100).toFixed(1)} pts
              </span>
            </div>
            <input
              id="mc-milling-vol"
              type="range"
              min="0.005"
              max="0.08"
              step="0.005"
              value={config.millingYieldStdPts}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, millingYieldStdPts: Number(e.target.value) }))
              }
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>0,5 pt</span>
              <span>8,0 pts (qualité paddy)</span>
            </div>
          </div>

          {/* 4. Correlation & Soudure stress */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="mc-corr" className="font-semibold text-zinc-800 dark:text-zinc-200">
                Corrélation récolte ↔ prix (ρ)
              </label>
              <span className="font-mono font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {config.priceHarvestCorrelation.toFixed(2)}
              </span>
            </div>
            <input
              id="mc-corr"
              type="range"
              min="-0.75"
              max="0.50"
              step="0.05"
              value={config.priceHarvestCorrelation}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, priceHarvestCorrelation: Number(e.target.value) }))
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <label className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={config.applySoudurePriceStress}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, applySoudurePriceStress: e.target.checked }))
                }
                className="rounded accent-indigo-600"
              />
              <span>Sur-volatilité soudure (+25 % en BS)</span>
            </label>
          </div>
        </div>
      </section>

      {/* Chart Mode Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-[#171627]">
          <button
            type="button"
            onClick={() => setChartTab('distributions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              chartTab === 'distributions'
                ? 'bg-white dark:bg-[#25233E] text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Distributions VAN &amp; TRI (Densité + Cumul)
          </button>
          <button
            type="button"
            onClick={() => setChartTab('scatter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              chartTab === 'scatter'
                ? 'bg-white dark:bg-[#25233E] text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Nuage Prix Paddy vs VAN
          </button>
        </div>

        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
          {simulation.validIrrCount.toLocaleString('fr-FR')} / {simulation.config.iterations.toLocaleString('fr-FR')} TRI convergents
        </span>
      </div>

      {/* Main Charts */}
      {chartTab === 'distributions' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* VAN Probability Distribution */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Distribution de probabilité — VAN (3 ans)
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Fréquence par tranche (barres) et probabilité cumulée CDF (courbe)
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums shrink-0">
                P(VAN &gt; 0) = {formatPercent(simulation.probNpvPositive, 1)}
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={simulation.npvBins}
                  margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={2}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    width={38}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#818cf8' }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    width={38}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => {
                      const num = Number(value ?? 0);
                      if (name === 'frequencyPct') return [`${num.toFixed(1)} %`, 'Densité'];
                      if (name === 'cumulativePct') return [`${num.toFixed(1)} %`, 'Probabilité cumulée'];
                      return [String(num), String(name ?? '')];
                    }}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return '';
                      return `VAN : ${formatAriary(item.minEdge, { inMillions: true })} → ${formatAriary(item.maxEdge, { inMillions: true })} (${item.count} it.)`;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="frequencyPct" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {simulation.npvBins.map((bin) => (
                      <Cell
                        key={bin.index}
                        fill={bin.aboveThreshold ? '#14b8a6' : '#f43f5e'}
                        fillOpacity={0.82}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePct"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* TRI Probability Distribution */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Distribution de probabilité — TRI (IRR)
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Comparé au taux d’actualisation r = {formatPercent(simulation.discountRate, 0)}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums shrink-0">
                P(TRI &gt; r) = {formatPercent(simulation.probIrrAboveDiscount, 1)}
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={simulation.irrBins}
                  margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={2}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    width={38}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#38bdf8' }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    width={38}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => {
                      const num = Number(value ?? 0);
                      if (name === 'frequencyPct') return [`${num.toFixed(1)} %`, 'Densité'];
                      if (name === 'cumulativePct') return [`${num.toFixed(1)} %`, 'Probabilité cumulée'];
                      return [String(num), String(name ?? '')];
                    }}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return '';
                      return `TRI : ${formatPercent(item.minEdge, 1)} → ${formatPercent(item.maxEdge, 1)} (${item.count} it.)`;
                    }}
                  />
                  <Bar yAxisId="left" dataKey="frequencyPct" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {simulation.irrBins.map((bin) => (
                      <Cell
                        key={bin.index}
                        fill={bin.aboveThreshold ? '#6366f1' : '#f59e0b'}
                        fillOpacity={0.82}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePct"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Nuage de sensibilité — Prix d’achat du paddy (HS) vs VAN à 3 ans
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Échantillon représentatif de {simulation.scatterSample.length} tirages (la taille des points reflète le volume de récolte simulé)
              </p>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 16, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  type="number"
                  dataKey="paddyPriceHS"
                  name="Prix paddy HS"
                  unit=" Ar"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  type="number"
                  dataKey="npvAr"
                  name="VAN"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)} M`}
                  width={56}
                />
                <ZAxis type="number" dataKey="harvestVolumeMultiplier" range={[35, 160]} name="Récolte" />
                <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value, name) => {
                    const num = Number(value ?? 0);
                    if (name === 'VAN') return [formatAriary(num, { inMillions: true }), 'VAN (3 ans)'];
                    if (name === 'Prix paddy HS') return [`${Math.round(num).toLocaleString('fr-FR')} Ar/kg`, 'Prix paddy HS'];
                    if (name === 'Récolte') return [`${(num * 100).toFixed(1)} %`, 'Volume récolte'];
                    return [String(num), String(name ?? '')];
                  }}
                />
                <Scatter
                  name="Tirages positifs"
                  data={simulation.scatterSample.filter((p) => p.npvAr >= 0)}
                  fill="#14b8a6"
                  fillOpacity={0.72}
                />
                <Scatter
                  name="Tirages négatifs"
                  data={simulation.scatterSample.filter((p) => p.npvAr < 0)}
                  fill="#f43f5e"
                  fillOpacity={0.82}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Quantile Breakdown Table */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Tableau des centiles &amp; intervalles de confiance ({simulation.config.iterations.toLocaleString('fr-FR')} itérations)
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Synthèse probabiliste de la VAN à 3 ans et du TRI face aux aléas paddy et récolte
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-3 px-4 font-semibold">Indicateur statistique / Quantile</th>
                <th className="py-3 px-4 text-right font-semibold">VAN à 3 ans ({inM ? 'M Ar' : 'Ar'})</th>
                <th className="py-3 px-4 text-right font-semibold">Écart vs VAN de base</th>
                <th className="py-3 px-4 text-right font-semibold">TRI simulé (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {npvSummaryRows.map((row, idx) => {
                const irrRow = irrSummaryRows[idx];
                const delta = row.val - simulation.baseNpvAr;
                return (
                  <tr
                    key={row.label}
                    className={
                      row.tone === 'median'
                        ? 'bg-indigo-500/[0.06] font-semibold'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]'
                    }
                  >
                    <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                      {row.label}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold ${
                        row.val >= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatAriary(row.val, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right ${
                        delta >= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {delta >= 0 ? '+' : ''}
                      {formatAriary(delta, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-semibold ${
                        irrRow.val >= simulation.discountRate
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatPercent(irrRow.val, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
