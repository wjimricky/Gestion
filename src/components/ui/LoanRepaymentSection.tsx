import React, { useMemo, useRef, useState } from 'react';
import {
  Landmark,
  Calculator,
  ChevronDown,
  ChevronUp,
  Coins,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import {
  AgriculturalLoanParams,
  computeLoanRepaymentPlan,
  DEFAULT_LOAN_PARAMS,
  LoanAmortizationMethod,
  LoanPaymentFrequency,
  MALAGASY_AG_LOAN_PRESETS,
} from '../../utils/loanRepayment';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { Tooltip } from './Tooltip';
import { ChartExportButtons } from './ChartExportButtons';

export const LoanRepaymentSection: React.FC = () => {
  const { model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [params, setParams] = useState<AgriculturalLoanParams>(DEFAULT_LOAN_PARAMS);
  const [scheduleExpanded, setScheduleExpanded] = useState<boolean>(false);
  const chartCardRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => computeLoanRepaymentPlan(params, model), [params, model]);

  const applyPreset = (presetId: (typeof MALAGASY_AG_LOAN_PRESETS)[number]['id']) => {
    const preset = MALAGASY_AG_LOAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setParams({
      presetId: preset.id,
      ...preset.params,
    });
  };

  const updateParam = <K extends keyof AgriculturalLoanParams>(
    key: K,
    value: AgriculturalLoanParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      presetId: 'custom',
      [key]: value,
    }));
  };

  const chartData = useMemo(
    () =>
      summary.schedule.map((row) => ({
        label: row.label,
        principal: Math.round(row.principalAr / 1e3), // k Ar
        interest: Math.round(row.interestAr / 1e3), // k Ar
        closing: Math.round(row.closingBalanceAr / 1e6), // M Ar
      })),
    [summary.schedule]
  );

  const dscrValue = summary.dscrYear1;
  const dscrHealthy = dscrValue !== null && dscrValue >= 1.25;
  const dscrTight = dscrValue !== null && dscrValue >= 1 && dscrValue < 1.25;

  const periodUnitLabel =
    params.frequency === 'mensuelle'
      ? '/ mois'
      : params.frequency === 'trimestrielle'
      ? '/ trim.'
      : '/ an';

  return (
    <section
      aria-label="Plan de remboursement bancaire agricole à Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900/70 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/[0.07]">
        <div className="flex items-start gap-2.5">
          <Landmark
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                12. Plan de Remboursement — Prêts Bancaires &amp; IMF Agricoles (Madagascar)
              </h2>
              <Tooltip
                label="Plan de Remboursement Agricole"
                content="Simulez les annuités, le différé de campagne (soudure/stockage), les frais de dossier, le coût total des intérêts et la capacité de couverture de la dette (DSCR) pour des crédits bancaires ou IMF malgaches."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Calculez vos échéances et le coût financier des prêts de campagne (warrantage GCV), crédits matériel ou lignes BFR.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
          <Calculator className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <span>{summary.totalPeriods} échéance(s)</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {params.institutionLabel}
          </span>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Produits de financement agricoles types (Madagascar)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {MALAGASY_AG_LOAN_PRESETS.map((preset) => {
            const isSelected = params.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-indigo-500/60 bg-indigo-500/[0.08] dark:bg-indigo-500/[0.14]'
                    : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {preset.shortLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                    {preset.params.annualInterestRatePct.toFixed(1)} % · {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <FormField
          label="Montant emprunté (Capital)"
          unit="Ariary (Ar)"
          tooltip="Principal accordé par la banque ou l’IMF (en Ariary)."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="500000"
              step="500000"
              value={params.principalAr}
              onChange={(e) =>
                updateParam('principalAr', Math.max(0, Number(e.target.value) || 0))
              }
            />
          )}
        </FormField>

        <FormField
          label="Taux d’intérêt annuel nominal"
          unit="% / an (ex : 18)"
          tooltip="Taux débiteur annuel appliqué au capital restant dû (barèmes bancaires/IMF Madagascar : 14 % à 24 %)."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={params.annualInterestRatePct}
              onChange={(e) =>
                updateParam(
                  'annualInterestRatePct',
                  Math.max(0, Math.min(60, Number(e.target.value) || 0))
                )
              }
            />
          )}
        </FormField>

        <FormField
          label="Durée totale du crédit"
          unit="mois (6 à 84)"
          tooltip="Durée contractuelle du prêt, différé inclus."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="3"
              max="84"
              step="3"
              value={params.durationMonths}
              onChange={(e) =>
                updateParam(
                  'durationMonths',
                  Math.max(3, Math.min(84, Math.round(Number(e.target.value) || 12)))
                )
              }
            />
          )}
        </FormField>

        <FormField
          label="Différé d’amortissement (soudure)"
          unit="mois (intérêts seuls)"
          tooltip="Période de grâce en début de prêt pendant laquelle seuls les intérêts sont réglés (idéal jusqu’à la revente en période de soudure)."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              max={Math.max(0, params.durationMonths - 1)}
              step="1"
              value={params.gracePeriodMonths}
              onChange={(e) =>
                updateParam(
                  'gracePeriodMonths',
                  Math.max(
                    0,
                    Math.min(params.durationMonths - 1, Math.round(Number(e.target.value) || 0))
                  )
                )
              }
            />
          )}
        </FormField>

        <FormField
          label="Frais de dossier &amp; garantie"
          unit="% du capital"
          tooltip="Commission de mise en place et frais de garantie prélevés au déblocage."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              max="10"
              step="0.25"
              value={params.processingFeePct}
              onChange={(e) =>
                updateParam(
                  'processingFeePct',
                  Math.max(0, Math.min(10, Number(e.target.value) || 0))
                )
              }
            />
          )}
        </FormField>

        {/* Frequency & Method Segmented Controls */}
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2.5">
          <div>
            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Périodicité des échéances
            </div>
            <div
              role="group"
              aria-label="Périodicité des échéances"
              className="grid grid-cols-3 gap-1 p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900"
            >
              {(
                [
                  { id: 'mensuelle', label: 'Mens.' },
                  { id: 'trimestrielle', label: 'Trim.' },
                  { id: 'annuelle', label: 'Ann.' },
                ] as Array<{ id: LoanPaymentFrequency; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateParam('frequency', opt.id)}
                  className={`py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    params.frequency === opt.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Mode d’amortissement
            </div>
            <div
              role="group"
              aria-label="Mode d’amortissement"
              className="grid grid-cols-2 gap-1 p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900"
            >
              {(
                [
                  { id: 'annuite_constante', label: 'Annuité constante' },
                  { id: 'amortissement_constant', label: 'Capital constant' },
                ] as Array<{ id: LoanAmortizationMethod; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateParam('amortizationMethod', opt.id)}
                  className={`py-1 px-1.5 rounded-md text-[11px] font-semibold transition-colors truncate ${
                    params.amortizationMethod === opt.id
                      ? 'bg-teal-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span>Échéance courante</span>
            <CalendarClock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(summary.firstRegularInstallmentAr, { inMillions: inM })}
            <span className="text-xs font-normal text-zinc-500 ml-1">{periodUnitLabel}</span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Moyenne : {formatAriary(summary.averageInstallmentAr, { inMillions: inM })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span>Coût total du crédit</span>
            <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {formatAriary(summary.totalCreditCostAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Intérêts {formatAriary(summary.totalInterestAr, { inMillions: true })} · Frais{' '}
            {formatAriary(summary.processingFeeAr, { inMillions: true })} ({formatPercent(summary.effectiveCostRatioPct, 1)})
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Service de la dette (Année 1)
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(summary.annualizedDebtServiceYear1Ar, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Total remboursé : {formatAriary(summary.totalRepaidAr, { inMillions: true })}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border space-y-1 ${
            dscrHealthy
              ? 'border-emerald-500/35 bg-emerald-500/[0.06]'
              : dscrTight
              ? 'border-amber-500/40 bg-amber-500/[0.07]'
              : 'border-rose-500/45 bg-rose-500/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <span>Couverture dette (DSCR A1)</span>
            {dscrHealthy ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
          </div>
          <div
            className={`font-mono text-base font-bold tabular-nums ${
              dscrHealthy
                ? 'text-emerald-700 dark:text-emerald-300'
                : dscrTight
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-rose-700 dark:text-rose-300'
            }`}
          >
            {dscrValue !== null ? `${dscrValue.toFixed(2)}x` : 'N/A'}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            Résultat net A1 après dette :{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {formatAriary(summary.netResultAfterDebtServiceYear1Ar, { inMillions: true })}
            </strong>
          </div>
        </div>
      </div>

      {/* Stacked Principal vs Interest Chart */}
      <div
        ref={chartCardRef}
        className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/35 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Ventilation Capital vs Intérêts par échéance (en milliers Ar)
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {params.gracePeriodMonths > 0
                ? `Inclut un différé initial de ${params.gracePeriodMonths} mois (intérêts seuls).`
                : 'Amortissement immédiat dès la première échéance.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> Capital amorti
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Intérêts
              </span>
            </div>
            <ChartExportButtons
              targetRef={chartCardRef}
              filenameBase="plan_remboursement_pret_agricole"
              chartTitle="Plan de remboursement agricole"
            />
          </div>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v) => `${Number(v).toLocaleString('fr-FR')} k`}
                width={52}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value, name) => [
                  `${Number(value ?? 0).toLocaleString('fr-FR')} k Ar`,
                  name === 'principal' ? 'Capital amorti' : 'Intérêts',
                ]}
              />
              <Bar dataKey="principal" stackId="loan" fill="#6366f1" maxBarSize={26} />
              <Bar
                dataKey="interest"
                stackId="loan"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collapsible Full Amortization Schedule Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <button
          type="button"
          onClick={() => setScheduleExpanded((prev) => !prev)}
          aria-expanded={scheduleExpanded}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors no-print"
        >
          <span>
            Tableau d’amortissement détaillé ({summary.schedule.length} échéance
            {summary.schedule.length > 1 ? 's' : ''})
          </span>
          {scheduleExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" aria-hidden="true" />
          )}
        </button>

        {scheduleExpanded && (
          <div className="overflow-x-auto max-h-80 overflow-y-auto border-t border-zinc-200 dark:border-white/[0.08]">
            <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Échéance</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Capital début</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-amber-700 dark:text-amber-400">
                    Intérêts
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-indigo-700 dark:text-indigo-400">
                    Principal
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">Annuité totale</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Capital restant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {summary.schedule.map((row) => (
                  <tr
                    key={row.periodNumber}
                    className={
                      row.isGracePeriod
                        ? 'bg-amber-500/[0.05] text-zinc-700 dark:text-zinc-300'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }
                  >
                    <td className="py-2 px-3 font-sans font-medium">
                      {row.label}
                      {row.isGracePeriod && (
                        <span className="ml-1.5 text-[10px] font-mono text-amber-700 dark:text-amber-400">
                          (Différé)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatAriary(row.openingBalanceAr, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400">
                      {formatAriary(row.interestAr, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-700 dark:text-indigo-400">
                      {formatAriary(row.principalAr, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {formatAriary(row.installmentAr, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {formatAriary(row.closingBalanceAr, { inMillions: inM })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
