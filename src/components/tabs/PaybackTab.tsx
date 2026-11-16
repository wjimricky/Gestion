import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { CumulativeCashFlowChart } from '../charts/FinancialCharts';
import { KpiCard } from '../ui/KpiCard';
import { ViewToggle } from '../ui/ViewToggle';
import { Clock, CheckCircle2, TrendingUp, Layers, AlertTriangle, Download } from 'lucide-react';

export const PaybackTab: React.FC = () => {
  const { model, assumptions, unitDisplay, exportProjectionsToCsv } = useFinancial();
  const inM = unitDisplay === 'millions';
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'y1' | 'y2' | 'y3'>('all');

  const pb = model.payback;
  const taxPct = formatPercent(assumptions.corporateTaxRate, 0);

  const filteredFlows = pb.monthlyCashFlows.filter((cf) => {
    if (periodFilter === 'y1') return cf.month <= 12;
    if (periodFilter === 'y2') return cf.month > 12 && cf.month <= 24;
    if (periodFilter === 'y3') return cf.month > 24;
    return true;
  });

  const getPeriodTagClass = (period: string) => {
    if (period === 'HS') return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 font-semibold';
    if (period === 'BS') return 'bg-cyan-500/12 text-cyan-800 dark:text-cyan-300 font-semibold';
    if (period === 'A2') return 'bg-blue-500/12 text-blue-800 dark:text-blue-300 font-semibold';
    return 'bg-purple-500/12 text-purple-800 dark:text-purple-300 font-semibold';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Délai de Récupération du Capital (Payback Period)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Nombre de mois nécessaires pour que le cumul des flux nets après IR amortisse intégralement le fonds investi.
          </p>
        </div>

        <button
          type="button"
          onClick={exportProjectionsToCsv}
          title="Exporter les flux mensuels (M0–M36) et projections annuelles CF A1–A3 au format CSV"
          className="no-print self-start sm:self-auto min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-indigo-600/25 dark:border-indigo-400/25 bg-indigo-600 hover:bg-indigo-500 dark:bg-[#23213D] dark:hover:bg-[#2E2B50] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors shrink-0 shadow-xs"
        >
          <Download className="w-4 h-4 text-teal-300" aria-hidden="true" />
          <span>Exporter CSV (M0–M36)</span>
        </button>
      </div>

      {!pb.isRecoveredWithin36Months && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <span>
            Avec les hypothèses actuelles, le capital initial ({formatAriary(pb.fundsInvestedAr, { inMillions: inM })}) n’est pas récupéré dans un horizon de 36 mois.
          </span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Fonds investi (I₀)"
          value={formatAriary(pb.fundsInvestedAr, { inMillions: inM })}
          animatedValue={pb.fundsInvestedAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub="Capital initial à amortir"
          icon={Layers}
          tone="warning"
          tooltipAlign="left"
          tooltip="Somme du BFR de 1ère rotation HS, du matériel, des frais d’enregistrement et du cash buffer."
        />
        <KpiCard
          label="Payback avec saisonnalité"
          value={formatMonths(pb.paybackMonths)}
          sub={
            pb.paybackYears > 0
              ? `Soit ${pb.paybackYears.toFixed(2)} an (HS d’abord)`
              : 'Non amorti sur 36 mois'
          }
          icon={Clock}
          tone={pb.isRecoveredWithin36Months ? 'positive' : 'danger'}
          tooltip="Temps exact pour que le cumul des flux nets mensuels après IR devienne positif, en respectant l’ordre HS puis BS."
        />
        <KpiCard
          label="Payback simple (flux lissé)"
          value={formatMonths(pb.simplePaybackMonths)}
          sub="Fonds / Flux annuel × 12"
          icon={Clock}
          tone="neutral"
          tooltip="Méthode linéaire approximative sans saisonnalité : (I₀ ÷ Cash-flow net annuel A1) × 12 mois."
        />
        <KpiCard
          label="Flux net annuel Année 1"
          value={formatAriary(pb.annualNetCashFlowYear1Ar, { inMillions: inM })}
          animatedValue={pb.annualNetCashFlowYear1Ar}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Après impôt IR (${taxPct})`}
          icon={TrendingUp}
          tone={pb.annualNetCashFlowYear1Ar >= 0 ? 'positive' : 'danger'}
          tooltipAlign="right"
          tooltip="Total des flux nets de trésorerie après impôt (IR) générés au cours des 12 premiers mois d’exploitation."
        />
      </div>

      {/* Visual Chart */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Évolution Cumulée des Flux Nets vs Capital Initial
        </h2>
        <CumulativeCashFlowChart
          cashFlows={pb.monthlyCashFlows}
          fundsInvested={pb.fundsInvestedAr}
          paybackMonth={pb.paybackMonths}
        />
      </section>

      {/* 36-Month Schedule */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Échéancier Mensuel Détaillé sur 36 Mois
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              {filteredFlows.length} mois affichés
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filtrer par année"
              className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 p-1"
            >
              {[
                { id: 'all', label: '36m' },
                { id: 'y1', label: 'A1' },
                { id: 'y2', label: 'A2' },
                { id: 'y3', label: 'A3' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriodFilter(opt.id as typeof periodFilter)}
                  aria-pressed={periodFilter === opt.id}
                  className={`min-h-10 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    periodFilter === opt.id
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <ViewToggle mode={mobileView} onChange={setMobileView} />
          </div>
        </div>

        {/* Mobile Cards View */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[520px] overflow-y-auto">
            {filteredFlows.map((cf) => {
              const isRecoveredRow = cf.recoveryMonth !== null;
              return (
                <div
                  key={cf.month}
                  className={`p-4 space-y-2 ${
                    isRecoveredRow
                      ? 'bg-amber-500/12'
                      : cf.cumulativeCashFlowAr >= 0
                      ? 'bg-emerald-500/5'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        M{cf.month}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${getPeriodTagClass(cf.period)}`}>
                        {cf.period}
                      </span>
                    </div>
                    {cf.recoveryMonth !== null && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        Récupéré : {cf.recoveryMonth.toFixed(2)} m
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                        Flux net après IR
                      </div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatAriary(cf.netCashFlowAfterTaxAr, { inMillions: inM })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                        Cumul après I₀
                      </div>
                      <div
                        className={`font-bold mt-0.5 ${
                          cf.cumulativeCashFlowAr >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {formatAriary(cf.cumulativeCashFlowAr, { inMillions: inM })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        <div
          className={`${
            mobileView === 'cards' ? 'hidden sm:block' : 'block'
          } overflow-x-auto max-h-[480px]`}
        >
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="py-3 px-3 font-semibold">Mois</th>
                <th className="py-3 px-3 font-semibold">Période</th>
                <th className="py-3 px-3 text-right font-semibold">Résultat avant IR</th>
                <th className="py-3 px-3 text-right font-semibold">Flux net après IR</th>
                <th className="py-3 px-3 text-right font-semibold">Cumul après fonds investi</th>
                <th className="py-3 px-3 text-right font-semibold">Mois de récupération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredFlows.map((cf) => {
                const isRecoveredRow = cf.recoveryMonth !== null;
                const isPositiveCumul = cf.cumulativeCashFlowAr >= 0;

                return (
                  <tr
                    key={cf.month}
                    className={
                      isRecoveredRow
                        ? 'bg-amber-500/15 font-bold'
                        : isPositiveCumul
                        ? 'bg-emerald-500/5'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-medium">M{cf.month}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${getPeriodTagClass(cf.period)}`}>
                        {cf.period}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatAriary(cf.resultBeforeTaxAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                      {formatAriary(cf.netCashFlowAfterTaxAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        cf.cumulativeCashFlowAr >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {formatAriary(cf.cumulativeCashFlowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {cf.recoveryMonth !== null ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {cf.recoveryMonth.toFixed(2)} mois
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
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
