import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Factory,
  Clock,
  ArrowRight,
  Gauge,
  PackageCheck,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { computeProductLifecycle, LifecycleScope } from '../../utils/productLifecycle';
import { formatAriary, formatKg } from '../../utils/formatters';

export const ProductLifecycleCard: React.FC = () => {
  const { assumptions, model, theme } = useFinancial();
  const isDarkMode = theme === 'dark';

  const [scope, setScope] = useState<LifecycleScope>('annual');
  const [throughputKgPerHour, setThroughputKgPerHour] = useState<number>(1200);

  const lifecycle = useMemo(
    () => computeProductLifecycle(assumptions, model, scope, throughputKgPerHour),
    [assumptions, model, scope, throughputKgPerHour]
  );

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const axisTickColor = isDarkMode ? '#a1a1aa' : '#52525b';

  return (
    <section
      aria-label="Analyse du cycle de vie produit (Paddy vers Riz Usiné)"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
    >
      {/* En-tête */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Factory className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Cycle de Vie Produit — Paddy → Riz Usiné (Temps de Cycle &amp; Transformation)
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
              {lifecycle.scopeLabel} · Cycle complet moyen : {lifecycle.totalCycleDays} jours · Rendement industriel :{' '}
              {lifecycle.millingYieldPct.toFixed(1)} %
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] p-0.5">
            {(
              [
                { id: 'annual', label: 'Moy. annuelle' },
                { id: 'hauteSaison', label: 'Haute Saison' },
                { id: 'basseSaison', label: 'Basse Saison' },
              ] as Array<{ id: LifecycleScope; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  scope === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] text-xs">
            <Gauge className="w-3.5 h-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
            <span className="text-zinc-600 dark:text-zinc-400">Débit usine :</span>
            <input
              type="number"
              min="300"
              max="5000"
              step="100"
              aria-label="Débit horaire de décorticage en kg/h"
              value={throughputKgPerHour}
              onChange={(e) => setThroughputKgPerHour(Math.max(300, Number(e.target.value) || 1200))}
              className="w-16 px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-right font-mono font-semibold"
            />
            <span className="font-mono text-zinc-500">kg/h</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 4 Indicateurs clés du cycle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
              <span>Temps de cycle total moyen</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
              {lifecycle.totalCycleDays} jours
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              De la collecte rizières à l’encaissement client
            </div>
          </div>

          <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] dark:bg-teal-500/[0.08]">
            <div className="text-[11px] font-medium text-teal-800 dark:text-teal-300">
              Taux de transformation industrielle
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-teal-700 dark:text-teal-300 mt-0.5">
              {lifecycle.millingYieldPct.toFixed(1)} % riz blanc
            </div>
            <div className="text-[11px] font-mono tabular-nums text-teal-700/80 dark:text-teal-300/80">
              {formatKg(lifecycle.paddyPerRotationKg)} paddy → {formatKg(lifecycle.milledRicePerRotationKg)} riz
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <PackageCheck className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Conditionnement / rotation</span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
              {Math.round(lifecycle.bagsPerRotation)} sacs × {lifecycle.bagCapacityKg} kg
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              Entier {lifecycle.wholeRiceRatioPct}% · Brisures {lifecycle.brokenRiceRatioPct}%
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Valeur ajoutée par kg de paddy
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
              {formatAriary(lifecycle.revenuePerKgPaddyAr)} / kg paddy
            </div>
            <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              Marge brute : +{formatAriary(lifecycle.grossMarginPerKgPaddyAr)} / kg paddy
            </div>
          </div>
        </div>

        {/* Pipeline séquentiel en 5 étapes */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 items-stretch">
          {lifecycle.stages.map((st, idx) => (
            <div
              key={st.id}
              className="relative p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151426] flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Étape {st.stepNumber}
                  </span>
                  <span className="text-[11px] font-mono font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {st.avgCycleDays} j
                  </span>
                </div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
                  {st.title}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  {st.subtitle}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] space-y-1 text-[11px] font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="font-sans text-zinc-500 dark:text-zinc-400">Masse sortie</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {(st.outputMassPerRotKg / 1000).toFixed(1)} t ({st.massRetentionPct}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-zinc-500 dark:text-zinc-400">{st.keyMetricLabel}</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400">{st.keyMetricValue}</span>
                </div>
              </div>

              {idx < lifecycle.stages.length - 1 && (
                <ArrowRight
                  className="hidden md:block w-3.5 h-3.5 text-zinc-400 absolute -right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-[#11101C] rounded-full"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Graphiques : Temps de cycle par étape & Bilan matière 1 000 kg paddy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/30 space-y-2 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Répartition du Temps de Cycle Moyen par Étape (jours)
            </h3>
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lifecycle.cycleChartData} margin={{ top: 8, right: 12, left: -12, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="stage"
                    tick={{ fill: axisTickColor, fontSize: 10 }}
                    axisLine={{ stroke: gridStroke }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={{ stroke: gridStroke }}
                    tickFormatter={(v) => `${v} j`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown) => [`${Number(val ?? 0)} jours`, 'Durée moyenne']}
                  />
                  <Bar dataKey="days" radius={[5, 5, 0, 0]} maxBarSize={42}>
                    {lifecycle.cycleChartData.map((_, i) => (
                      <Cell
                        key={`cyc-${i}`}
                        fill={['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#10b981'][i % 5]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Bilan Matière Industriel (pour 1 000 kg de paddy)
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                Décomposition massique issue du taux de transformation actif ({lifecycle.millingYieldPct}%).
              </p>
            </div>

            {/* Barre segmentée bilan matière */}
            <div className="h-5 w-full rounded-lg overflow-hidden flex border border-zinc-200 dark:border-white/[0.1]">
              {lifecycle.massBalance.map((slice) => (
                <div
                  key={slice.name}
                  style={{ width: `${slice.pct}%`, backgroundColor: slice.color }}
                  title={`${slice.name}: ${slice.kgPerTonPaddy} kg (${slice.pct}%)`}
                />
              ))}
            </div>

            <div className="space-y-2 text-xs">
              {lifecycle.massBalance.map((slice) => (
                <div
                  key={slice.name}
                  className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-200/60 dark:border-white/[0.05] last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">{slice.name}</span>
                  </div>
                  <div className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {slice.kgPerTonPaddy} kg · {slice.pct.toFixed(1)} %
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
