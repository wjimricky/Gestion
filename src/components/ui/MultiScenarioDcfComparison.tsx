import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { GitCompare, Check } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  buildMultiScenarioCandidates,
  buildMultiScenarioDcfDataset,
} from '../../utils/multiScenarioDcf';
import { Tooltip } from './Tooltip';
import { ChartExportButtons } from './ChartExportButtons';

export const MultiScenarioDcfComparison: React.FC = () => {
  const { assumptions, model, savedScenarios, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';
  const chartCardRef = useRef<HTMLDivElement>(null);

  const candidates = useMemo(
    () => buildMultiScenarioCandidates(assumptions, model, savedScenarios),
    [assumptions, model, savedScenarios]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const base = ['model:realiste', 'model:optimiste', 'model:pessimiste'];
    const extraSaved = savedScenarios
      .slice(0, 1)
      .map((s) => `saved:${s.id}`);
    return [...base, ...extraSaved];
  });
  const [curveMode, setCurveMode] = useState<'cumul' | 'annual'>('cumul');
  const [horizonYears, setHorizonYears] = useState<3 | 5>(5);

  // Clean up any deleted saved scenario IDs if savedScenarios changes
  useEffect(() => {
    const validIds = new Set(candidates.map((c) => c.id));
    setSelectedIds((prev) => {
      const kept = prev.filter((id) => validIds.has(id));
      if (kept.length >= 2) return kept;
      return candidates.slice(0, Math.min(3, candidates.length)).map((c) => c.id);
    });
  }, [candidates]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // Keep at least 2 curves to compare
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 6) {
        return [...prev.slice(0, 5), id];
      }
      return [...prev, id];
    });
  };

  const { chartData, summaries } = useMemo(
    () => buildMultiScenarioDcfDataset(candidates, selectedIds, horizonYears),
    [candidates, selectedIds, horizonYears]
  );

  return (
    <section
      ref={chartCardRef}
      aria-label="Comparaison multi-scénarios des flux de trésorerie actualisés (DCF)"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4"
    >
      {/* Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <GitCompare
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Comparaison Multi-Scénarios — Courbes DCF Superposées
            </h2>
            <Tooltip
              align="left"
              label="Flux de trésorerie actualisés (DCF)"
              content="Superpose la trajectoire des flux actualisés cumulés (-I₀ + Σ CF_t / (1+r)^t, soit la courbe VAN jusqu'au point mort actualisé) ou annuels pour 2 à 6 scénarios simultanément."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Sélectionnez 2 à 6 scénarios (modèles standards et scénarios sauvegardés) pour comparer leur trajectoire de création de valeur dans le temps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <div
            role="group"
            aria-label="Mode de courbe DCF"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627]"
          >
            <button
              type="button"
              onClick={() => setCurveMode('cumul')}
              className={`min-h-8 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                curveMode === 'cumul'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              DCF Cumulés (VAN)
            </button>
            <button
              type="button"
              onClick={() => setCurveMode('annual')}
              className={`min-h-8 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                curveMode === 'annual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              DCF Annuels
            </button>
          </div>

          <div
            role="group"
            aria-label="Horizon DCF"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627]"
          >
            {([3, 5] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonYears(h)}
                className={`min-h-8 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
                  horizonYears === h
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {h} ans
              </button>
            ))}
          </div>

          <ChartExportButtons
            targetRef={chartCardRef}
            filenameBase="comparaison_multi_scenarios_dcf"
            chartTitle="Courbes DCF Multi-Scénarios"
          />
        </div>
      </div>

      {/* Scenario Multi-Select Strip */}
      <div className="flex flex-wrap gap-1.5 no-print" role="group" aria-label="Scénarios superposés">
        {candidates.map((cand) => {
          const active = selectedIds.includes(cand.id);
          const summaryItem = summaries.find((s) => s.id === cand.id);
          const dotColor = summaryItem?.color || cand.color;

          return (
            <button
              key={cand.id}
              type="button"
              onClick={() => toggleCandidate(cand.id)}
              aria-pressed={active}
              className={`min-h-8 px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                active
                  ? 'border-zinc-400 dark:border-white/25 bg-zinc-100 dark:bg-[#1D1B31] text-zinc-950 dark:text-white'
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0 inline-flex items-center justify-center"
                style={{ backgroundColor: active ? dotColor : 'transparent', border: `2px solid ${dotColor}` }}
              >
                {active && <Check className="w-2 h-2 text-zinc-950 stroke-[3]" aria-hidden="true" />}
              </span>
              <span>{cand.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Overlay Line Chart */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-[#0D0C18] p-3">
        <div className="w-full h-[290px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 16, left: 4, bottom: 4 }}>
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
                width={56}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.75} />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700 text-xs text-zinc-100 shadow-xl space-y-1.5 min-w-[235px]">
                      <div className="font-bold text-white border-b border-white/10 pb-1">
                        {label} · {curveMode === 'cumul' ? 'DCF Cumulé (VAN)' : 'Flux Actualisé Annuel'}
                      </div>
                      {payload.map((entry) => (
                        <div key={String(entry.dataKey)} className="flex justify-between gap-4 font-mono">
                          <span className="flex items-center gap-1.5 font-sans">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="truncate max-w-[130px]">{entry.name}</span>
                          </span>
                          <span className="font-semibold">
                            {Number(entry.value).toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            M Ar
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {summaries.map((sum) => (
                <Line
                  key={sum.id}
                  type="monotone"
                  dataKey={`${sum.id}_${curveMode}`}
                  name={sum.shortLabel}
                  stroke={sum.color}
                  strokeWidth={sum.id === 'model:realiste' ? 3 : 2.25}
                  dot={{ r: 3.5, strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparative KPI Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
        <table className="w-full text-xs text-left">
          <thead className="bg-zinc-100 dark:bg-[#191828] text-zinc-700 dark:text-zinc-300 font-semibold">
            <tr>
              <th className="px-3 py-2.5">Scénario</th>
              <th className="px-3 py-2.5 text-right">Invest. I₀</th>
              <th className="px-3 py-2.5 text-right">VAN 3 ans</th>
              <th className="px-3 py-2.5 text-right">VAN 5 ans</th>
              <th className="px-3 py-2.5 text-right">TRI (3 ans)</th>
              <th className="px-3 py-2.5 text-right">Payback actualisé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.06] font-mono tabular-nums">
            {summaries.map((sum) => (
              <tr key={sum.id} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: sum.color }}
                    />
                    <span>{sum.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                  {formatAriary(sum.initialInvestmentAr, { inMillions: inM })}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    sum.npv3YearsAr >= 0
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatAriary(sum.npv3YearsAr, { inMillions: true })}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    sum.npv5YearsAr >= 0
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatAriary(sum.npv5YearsAr, { inMillions: true })}
                </td>
                <td className="px-3 py-2 text-right text-indigo-600 dark:text-indigo-300 font-semibold">
                  {formatPercent(sum.irrRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                  {sum.discountedPaybackYears !== null
                    ? `${sum.discountedPaybackYears.toFixed(2)} ans`
                    : '> 5 ans'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
