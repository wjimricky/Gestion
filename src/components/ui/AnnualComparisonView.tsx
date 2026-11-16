import React, { useMemo, useRef, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { buildAnnualComparison5Y } from '../../utils/annualComparison';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';
import { ChartExportButtons } from './ChartExportButtons';

export const AnnualComparisonView: React.FC = () => {
  const { model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [scenarioMode, setScenarioMode] = useState<'realistic' | 'ambitious'>('realistic');
  const chartRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(
    () => buildAnnualComparison5Y(model, scenarioMode),
    [model, scenarioMode]
  );

  const chartData = useMemo(
    () =>
      summary.rows.map((r) => ({
        year: r.shortLabel,
        turnoverM: Number((r.turnoverAr / 1e6).toFixed(2)),
        operatingIncomeM: Number((r.operatingIncomeAr / 1e6).toFixed(2)),
        netResultM: Number((r.netResultAfterTaxAr / 1e6).toFixed(2)),
        operatingMarginPct: Number((r.operatingMarginRate * 100).toFixed(1)),
        netMarginPct: Number((r.netMarginRate * 100).toFixed(1)),
      })),
    [summary.rows]
  );

  const firstRow = summary.rows[0];
  const lastRow = summary.rows[summary.rows.length - 1];

  return (
    <section
      aria-label="Comparaison Annuelle du Compte de Résultat sur 5 ans"
      className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-5"
    >
      {/* Header + Scenario Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-200 dark:border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
              Comparaison Annuelle — Compte de Résultat sur 5 ans (A1–A5)
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Analyse côte à côte des 5 exercices avec taux de croissance annuel composé (CAGR) sur le chiffre d’affaires et les marges opérationnelles.
          </p>
        </div>

        <div
          role="group"
          aria-label="Scénario de projection 5 ans"
          className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] self-start no-print"
        >
          <button
            type="button"
            onClick={() => setScenarioMode('realistic')}
            className={`min-h-8 px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              scenarioMode === 'realistic'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Scénario Réaliste
          </button>
          <button
            type="button"
            onClick={() => setScenarioMode('ambitious')}
            className={`min-h-8 px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              scenarioMode === 'ambitious'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Scénario Ambitieux
          </button>
        </div>
      </div>

      {/* 4 CAGR & Margin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            CAGR Chiffre d’Affaires (A1 → A5)
          </div>
          <div className="font-mono text-lg font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            +{formatPercent(summary.cagrTurnover, 1)}
            <span className="text-xs font-normal text-zinc-500 ml-1">/ an</span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            CA A5 : {formatAriary(lastRow.turnoverAr, { inMillions: true })} · Cumul 5 ans{' '}
            {formatAriary(summary.cumulativeTurnover5YAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            CAGR Résultat Opérationnel (EBIT)
          </div>
          <div className="font-mono text-lg font-bold tabular-nums text-teal-700 dark:text-teal-300">
            {summary.cagrOperatingIncome >= 0 ? '+' : ''}
            {formatPercent(summary.cagrOperatingIncome, 1)}
            <span className="text-xs font-normal text-zinc-500 ml-1">/ an</span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            {formatAriary(firstRow.operatingIncomeAr, { inMillions: true })} →{' '}
            {formatAriary(lastRow.operatingIncomeAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Marge Opérationnelle (A1 → A5)
          </div>
          <div className="font-mono text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
            {formatPercent(firstRow.operatingMarginRate, 1)} →{' '}
            {formatPercent(lastRow.operatingMarginRate, 1)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
            {summary.operatingMarginDeltaPts >= 0 ? '+' : ''}
            {summary.operatingMarginDeltaPts.toFixed(1)} pts · CAGR ratio{' '}
            {summary.cagrOperatingMarginRatio >= 0 ? '+' : ''}
            {formatPercent(summary.cagrOperatingMarginRatio, 1)}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            CAGR Résultat Net après IR
          </div>
          <div className="font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {summary.cagrNetResult >= 0 ? '+' : ''}
            {formatPercent(summary.cagrNetResult, 1)}
            <span className="text-xs font-normal text-zinc-500 ml-1">/ an</span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Cumul Net 5 ans : {formatAriary(summary.cumulativeNet5YAr, { inMillions: true })}
          </div>
        </div>
      </div>

      {/* Dual-Axis Visual Chart */}
      <div
        ref={chartRef}
        className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#151424] space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Évolution CA, Résultat Opérationnel (M Ar) et Taux de Marge (%)</span>
          </div>
          <ChartExportButtons
            targetRef={chartRef}
            filenameBase="comparaison_annuelle_5ans"
            chartTitle="Comparaison Annuelle 5 ans"
          />
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v) => `${Number(v)} M`}
                width={48}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#14b8a6' }}
                tickFormatter={(v) => `${Number(v)} %`}
                width={42}
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
                  const v = Number(value ?? 0);
                  if (name === 'operatingMarginPct') return [`${v.toFixed(1)} %`, 'Marge opérationnelle'];
                  if (name === 'netMarginPct') return [`${v.toFixed(1)} %`, 'Marge nette'];
                  if (name === 'turnoverM') return [`${v.toLocaleString('fr-FR')} M Ar`, "Chiffre d'affaires"];
                  if (name === 'operatingIncomeM')
                    return [`${v.toLocaleString('fr-FR')} M Ar`, 'Résultat opérationnel (EBIT)'];
                  return [`${v.toLocaleString('fr-FR')} M Ar`, 'Résultat net après IR'];
                }}
              />
              <Bar yAxisId="left" dataKey="turnoverM" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="left" dataKey="operatingIncomeM" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="operatingMarginPct"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3.5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netMarginPct"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side 5-Year P&L Table with CAGR column */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
          <thead>
            <tr className="bg-zinc-100/90 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
              <th className="py-3 px-3.5 font-semibold min-w-[200px]">Rubrique du Compte de Résultat</th>
              {summary.rows.map((r) => (
                <th key={r.year} className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                  {r.label}
                  {r.growthAppliedPct !== null && (
                    <span className="block text-[10px] font-mono font-normal text-zinc-500">
                      (+{formatPercent(r.growthAppliedPct, 0)})
                    </span>
                  )}
                </th>
              ))}
              <th className="py-3 px-3.5 text-right font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                CAGR / Écart
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            <tr>
              <td className="py-2.5 px-3.5 font-sans font-medium text-zinc-700 dark:text-zinc-300">
                Volume de riz vendu (kg)
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                  {formatKg(r.riceVolumeKg)}
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right text-zinc-600 dark:text-zinc-400">
                {((lastRow.riceVolumeKg / Math.max(1, firstRow.riceVolumeKg) - 1) * 100).toFixed(0)} % total
              </td>
            </tr>

            <tr className="bg-indigo-500/[0.04] font-semibold">
              <td className="py-2.5 px-3.5 font-sans text-zinc-950 dark:text-white">
                Chiffre d’Affaires (Ventes)
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-zinc-950 dark:text-white">
                  {formatAriary(r.turnoverAr, { inMillions: inM })}
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                +{formatPercent(summary.cagrTurnover, 1)} / an
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-3.5 font-sans text-zinc-600 dark:text-zinc-400">
                − Coûts variables &amp; achats paddy
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">
                  −{formatAriary(r.variableCostsAr, { inMillions: inM })}
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right text-zinc-500">—</td>
            </tr>

            <tr className="font-semibold">
              <td className="py-2.5 px-3.5 font-sans text-zinc-900 dark:text-zinc-100">
                Marge Brute (taux %)
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-zinc-900 dark:text-zinc-100">
                  {formatAriary(r.grossProfitAr, { inMillions: inM })}
                  <span className="block text-[10px] font-normal text-zinc-500">
                    {formatPercent(r.grossMarginRate, 1)}
                  </span>
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right font-bold text-teal-700 dark:text-teal-300">
                +{formatPercent(summary.cagrGrossProfit, 1)} / an
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-3.5 font-sans text-zinc-600 dark:text-zinc-400">
                − Charges fixes d’exploitation
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400">
                  −{formatAriary(r.fixedChargesAr, { inMillions: inM })}
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right text-zinc-500">—</td>
            </tr>

            <tr className="bg-teal-500/[0.06] font-semibold">
              <td className="py-2.5 px-3.5 font-sans text-teal-950 dark:text-teal-200">
                Résultat Opérationnel (EBIT &amp; Marge %)
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-teal-900 dark:text-teal-200">
                  {formatAriary(r.operatingIncomeAr, { inMillions: inM })}
                  <span className="block text-[10px] font-normal text-teal-700 dark:text-teal-400">
                    {formatPercent(r.operatingMarginRate, 1)}
                  </span>
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right font-bold text-teal-700 dark:text-teal-300">
                +{formatPercent(summary.cagrOperatingIncome, 1)} / an
                <span className="block text-[10px] font-normal">
                  {summary.operatingMarginDeltaPts >= 0 ? '+' : ''}
                  {summary.operatingMarginDeltaPts.toFixed(1)} pts marge
                </span>
              </td>
            </tr>

            <tr>
              <td className="py-2.5 px-3.5 font-sans text-zinc-600 dark:text-zinc-400">
                − Impôt sur les Revenus (IR {formatPercent(model.assumptions.corporateTaxRate, 0)})
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                  −{formatAriary(r.corporateTaxAr, { inMillions: inM })}
                </td>
              ))}
              <td className="py-2.5 px-3.5 text-right text-zinc-500">—</td>
            </tr>

            <tr className="bg-emerald-500/[0.09] font-bold">
              <td className="py-3 px-3.5 font-sans text-emerald-950 dark:text-emerald-200">
                Résultat Net après IR (Marge nette %)
              </td>
              {summary.rows.map((r) => (
                <td key={r.year} className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-300">
                  {formatAriary(r.netResultAfterTaxAr, { inMillions: inM })}
                  <span className="block text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
                    {formatPercent(r.netMarginRate, 1)}
                  </span>
                </td>
              ))}
              <td className="py-3 px-3.5 text-right text-emerald-800 dark:text-emerald-300">
                +{formatPercent(summary.cagrNetResult, 1)} / an
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
