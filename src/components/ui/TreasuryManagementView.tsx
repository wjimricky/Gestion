import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
  Download,
  Calendar,
  Landmark,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { KpiCard } from './KpiCard';
import { Tooltip } from './Tooltip';
import { KpiContextTarget } from './KpiContextMenu';
import {
  buildMonthlyTreasuryPlan,
  CALENDAR_MONTHS_FR,
  DEFAULT_TREASURY_SETTINGS,
  exportTreasuryCsv,
  TreasuryRiskLevel,
  TreasurySimulationSettings,
} from '../../utils/treasury';

interface TreasuryManagementViewProps {
  onKpiContextMenu: (
    e: React.MouseEvent<HTMLElement>,
    target: KpiContextTarget
  ) => void;
  getNoteCount: (kpiId: string) => number;
  onOpenKpiNotes: (target: KpiContextTarget) => void;
}

export const TreasuryManagementView: React.FC<TreasuryManagementViewProps> = ({
  onKpiContextMenu,
  getNoteCount,
  onOpenKpiNotes,
}) => {
  const { model, unitDisplay, notify, treasurySettings: settings, setTreasurySettings: setSettings } = useFinancial();
  const inM = unitDisplay === 'millions';

  const summary = useMemo(
    () => buildMonthlyTreasuryPlan(model, settings),
    [model, settings]
  );

  const chartData = useMemo(
    () =>
      summary.rows.map((row) => ({
        label: row.calendarMonthShort,
        fullName: row.calendarMonthName,
        phaseLabel: row.phaseLabel,
        isSoudure: row.isSoudure,
        inflows: row.inflowsAr,
        outflows: -row.totalOutflowsAr,
        endingCash: row.endingCashAr,
        intraMonthMin: row.intraMonthMinCashAr,
        bfrRotation: row.bfrPerRotationAr,
      })),
    [summary.rows]
  );

  const firstSoudureMonth = summary.rows.find((r) => r.phase === 'SOUDURE')?.calendarMonthShort;
  const lastSoudureMonth = [...summary.rows]
    .reverse()
    .find((r) => r.phase === 'SOUDURE')?.calendarMonthShort;

  const getRiskBadge = (level: TreasuryRiskLevel) => {
    if (level === 'critique') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-[11px] font-semibold text-rose-800 dark:text-rose-300 whitespace-nowrap">
          <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>Critique</span>
        </span>
      );
    }
    if (level === 'vigilance') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-[11px] font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>Vigilance</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-teal-500/35 bg-teal-500/10 text-[11px] font-semibold text-teal-800 dark:text-teal-300 whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>Optimal</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Soudure Diagnostic Alert Strip */}
      <section
        role="status"
        className={`animate-dashboard-card p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          summary.overallRisk === 'critique'
            ? 'border-rose-500/55 bg-rose-500/[0.08] dark:bg-rose-950/25'
            : summary.overallRisk === 'vigilance'
            ? 'border-amber-500/45 bg-amber-500/[0.08]'
            : 'border-teal-500/35 bg-teal-500/[0.06]'
        }`}
      >
        <div className="flex items-start gap-2.5 text-xs sm:text-sm">
          {summary.overallRisk === 'optimal' ? (
            <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertTriangle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                summary.overallRisk === 'critique'
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
              aria-hidden="true"
            />
          )}
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              {summary.overallRisk === 'critique'
                ? `Tension critique en période de soudure (${summary.criticalMonthsCount} mois en déficit de trésorerie)`
                : summary.overallRisk === 'vigilance'
                ? `Vigilance BFR en période de soudure (${summary.vigilanceMonthsCount} mois sous surveillance)`
                : 'Plan de trésorerie résilient sur les 12 mois (y compris en période de soudure)'}
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
              En Basse Saison / Soudure, le BFR requis par rotation passe de{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAriary(summary.hsBfrPerRotationAr, { inMillions: true })}
              </span>{' '}
              à{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAriary(summary.peakSoudureBfrAr, { inMillions: true })}
              </span>{' '}
              ({summary.bfrSoudureIncreasePct >= 0 ? '+' : ''}
              {formatPercent(summary.bfrSoudureIncreasePct, 1)}). Point bas observé en{' '}
              <span className="font-semibold">{summary.minCashTroughMonthLabel}</span> :{' '}
              <span className="font-mono font-bold tabular-nums">
                {formatAriary(summary.minCashTroughAr, { inMillions: true })}
              </span>
              {summary.recommendedShortTermFacilityAr > 0
                ? ` — Ligne de crédit court terme recommandée : ${formatAriary(summary.recommendedShortTermFacilityAr, { inMillions: true })}.`
                : '.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            exportTreasuryCsv(summary);
            notify('success', 'Plan mensuel de trésorerie & soudure exporté en CSV.');
          }}
          className="min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5 shrink-0 transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <span>Exporter Trésorerie CSV</span>
        </button>
      </section>

      {/* 4 Treasury KPI Cards (with right-click analyst notes support) */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Trésorerie fin d’exercice (M12)"
          value={formatAriary(summary.endingYearCashAr, { inMillions: inM })}
          animatedValue={summary.endingYearCashAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Dotation initiale : ${formatAriary(summary.initialOperationalLiquidityAr, { inMillions: true })}`}
          icon={Wallet}
          tone={summary.endingYearCashAr >= 0 ? 'positive' : 'danger'}
          tooltipAlign="left"
          tooltip="Solde de trésorerie disponible en fin d’Année 1 après encaissements, achats paddy, charges fixes et IR."
          noteCount={getNoteCount('treasury_ending')}
          onOpenNotes={() =>
            onOpenKpiNotes({
              kpiId: 'treasury_ending',
              kpiLabel: 'Trésorerie fin d’exercice (M12)',
              kpiValueText: formatAriary(summary.endingYearCashAr, { inMillions: inM }),
            })
          }
          onContextMenu={(e) =>
            onKpiContextMenu(e, {
              kpiId: 'treasury_ending',
              kpiLabel: 'Trésorerie fin d’exercice (M12)',
              kpiValueText: formatAriary(summary.endingYearCashAr, { inMillions: inM }),
            })
          }
        />

        <KpiCard
          label="Point bas (Creux Soudure)"
          value={formatAriary(summary.minCashTroughAr, { inMillions: inM })}
          animatedValue={summary.minCashTroughAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Mois critique : ${summary.minCashTroughMonthLabel}`}
          icon={TrendingDown}
          tone={
            summary.minCashTroughAr < 0
              ? 'danger'
              : summary.minCashTroughAr < summary.cashBufferAr * 0.4
              ? 'warning'
              : 'positive'
          }
          alertLabel={summary.minCashTroughAr < 0 ? 'Tension BFR' : undefined}
          tooltip="Trésorerie minimale intra-mensuelle observée au moment d’avancer le BFR d’une rotation avant encaissement des ventes."
          noteCount={getNoteCount('treasury_trough')}
          onOpenNotes={() =>
            onOpenKpiNotes({
              kpiId: 'treasury_trough',
              kpiLabel: 'Point bas (Creux Soudure)',
              kpiValueText: formatAriary(summary.minCashTroughAr, { inMillions: inM }),
            })
          }
          onContextMenu={(e) =>
            onKpiContextMenu(e, {
              kpiId: 'treasury_trough',
              kpiLabel: 'Point bas (Creux Soudure)',
              kpiValueText: formatAriary(summary.minCashTroughAr, { inMillions: inM }),
            })
          }
        />

        <KpiCard
          label="Pic BFR par rotation (Soudure)"
          value={formatAriary(summary.peakSoudureBfrAr, { inMillions: inM })}
          animatedValue={summary.peakSoudureBfrAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`+${formatPercent(Math.max(0, summary.bfrSoudureIncreasePct), 1)} vs Haute Saison`}
          icon={Landmark}
          tone="info"
          tooltip="Besoin en Fonds de Roulement nécessaire pour financer une rotation complète en Basse Saison (prix du paddy plus élevé)."
          noteCount={getNoteCount('treasury_bfr_soudure')}
          onOpenNotes={() =>
            onOpenKpiNotes({
              kpiId: 'treasury_bfr_soudure',
              kpiLabel: 'Pic BFR par rotation (Soudure)',
              kpiValueText: formatAriary(summary.peakSoudureBfrAr, { inMillions: inM }),
            })
          }
          onContextMenu={(e) =>
            onKpiContextMenu(e, {
              kpiId: 'treasury_bfr_soudure',
              kpiLabel: 'Pic BFR par rotation (Soudure)',
              kpiValueText: formatAriary(summary.peakSoudureBfrAr, { inMillions: inM }),
            })
          }
        />

        <KpiCard
          label="Couverture Cash Buffer"
          value={`${summary.bufferCoverageOfPeakBfr.toFixed(2)} x`}
          sub={`Buffer : ${formatAriary(summary.cashBufferAr, { inMillions: true })} · ${summary.soudureMonthsCount}m BS`}
          icon={ShieldAlert}
          tone={
            summary.bufferCoverageOfPeakBfr >= 1
              ? 'positive'
              : summary.bufferCoverageOfPeakBfr >= 0.6
              ? 'warning'
              : 'danger'
          }
          tooltipAlign="right"
          tooltip="Ratio Cash Buffer disponible ÷ Pic de BFR d'une rotation en période de soudure. Un ratio ≥ 1,0x assure la couverture intégrale d'un cycle."
          noteCount={getNoteCount('treasury_buffer_ratio')}
          onOpenNotes={() =>
            onOpenKpiNotes({
              kpiId: 'treasury_buffer_ratio',
              kpiLabel: 'Couverture Cash Buffer',
              kpiValueText: `${summary.bufferCoverageOfPeakBfr.toFixed(2)} x`,
            })
          }
          onContextMenu={(e) =>
            onKpiContextMenu(e, {
              kpiId: 'treasury_buffer_ratio',
              kpiLabel: 'Couverture Cash Buffer',
              kpiValueText: `${summary.bufferCoverageOfPeakBfr.toFixed(2)} x`,
            })
          }
        />
      </div>

      {/* Stress-Test & Calendar Controls */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Paramètres de simulation de trésorerie &amp; soudure
            </h2>
            <Tooltip
              align="left"
              label="Simulation de trésorerie"
              content="Testez l’impact des délais de règlement clients (DSO), d’un pré-stockage de paddy avant la soudure ou d’une facilité de caisse sans modifier vos hypothèses comptables de base."
            />
          </div>
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_TREASURY_SETTINGS)}
            className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline self-start sm:self-auto"
          >
            Réinitialiser stress-test
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Month */}
          <div className="space-y-1.5">
            <label
              htmlFor="treasury-start-month"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Début de campagne (M1 = HS)
            </label>
            <select
              id="treasury-start-month"
              value={settings.startMonthIndex}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, startMonthIndex: Number(e.target.value) }))
              }
              className="w-full min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] text-xs font-medium text-zinc-900 dark:text-zinc-100"
            >
              {CALENDAR_MONTHS_FR.map((mName, idx) => (
                <option key={mName} value={idx}>
                  {mName}
                </option>
              ))}
            </select>
          </div>

          {/* Client DSO */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Délai encaissement clients (DSO)
            </span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#171627]">
              {([0, 15, 30, 45] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, clientDsoDays: days }))}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold tabular-nums transition-colors ${
                    settings.clientDsoDays === days
                      ? 'bg-white dark:bg-[#262440] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {days}j
                </button>
              ))}
            </div>
          </div>

          {/* Prestock ratio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="treasury-prestock" className="font-medium text-zinc-700 dark:text-zinc-300">
                Pré-achat paddy pré-soudure
              </label>
              <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {(settings.soudurePrestockRatio * 100).toFixed(0)} %
              </span>
            </div>
            <input
              id="treasury-prestock"
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={settings.soudurePrestockRatio}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, soudurePrestockRatio: Number(e.target.value) }))
              }
              className="w-full accent-teal-600 cursor-pointer mt-2"
            />
          </div>

          {/* Short-term credit line */}
          <div className="space-y-1.5">
            <label
              htmlFor="treasury-credit-line"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Ligne de crédit / découvert (Ar)
            </label>
            <input
              id="treasury-credit-line"
              type="number"
              min="0"
              step="1000000"
              value={settings.creditLineAr}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  creditLineAr: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="w-full min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] text-xs font-mono tabular-nums text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      </section>

      {/* Recharts Monthly Treasury & Soudure Cash Flow Chart */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Flux mensuels &amp; courbe de trésorerie disponible (12 mois)
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              La zone ombrée signale la période de soudure critique où le BFR d’achat paddy augmente fortement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500" /> Encaissements
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Décaissements
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-indigo-500" /> Solde fin de mois
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-500" /> Creux intra-mensuel BFR
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
              {firstSoudureMonth && lastSoudureMonth && (
                <ReferenceArea
                  x1={firstSoudureMonth}
                  x2={lastSoudureMonth}
                  fill="#f59e0b"
                  fillOpacity={0.11}
                  label={{
                    value: 'Période de Soudure',
                    position: 'insideTop',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)} M`}
                width={52}
              />
              <ReferenceLine y={0} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" />
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
                  const map: Record<string, string> = {
                    inflows: 'Encaissements',
                    outflows: 'Décaissements totaux',
                    endingCash: 'Trésorerie fin de mois',
                    intraMonthMin: 'Point bas intra-mensuel (BFR)',
                  };
                  return [formatAriary(num, { inMillions: inM }), map[String(name)] || String(name)];
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload;
                  if (!p) return '';
                  return `${p.fullName} — ${p.phaseLabel}`;
                }}
              />
              <Bar dataKey="inflows" fill="#14b8a6" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="outflows" fill="#f43f5e" fillOpacity={0.78} radius={[0, 0, 4, 4]} maxBarSize={26} />
              <Line
                type="monotone"
                dataKey="endingCash"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1' }}
              />
              <Line
                type="monotone"
                dataKey="intraMonthMin"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Treasury Schedule Table */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Plan de trésorerie mensuel &amp; suivi BFR soudure
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Montants en {inM ? 'Millions d’Ariary (M Ar)' : 'Ariary (Ar)'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-3 px-3.5 font-semibold">Mois</th>
                <th className="py-3 px-3.5 font-semibold">Phase</th>
                <th className="py-3 px-3.5 text-right font-semibold">Encaissements</th>
                <th className="py-3 px-3.5 text-right font-semibold">Décaissements</th>
                <th className="py-3 px-3.5 text-right font-semibold">Flux net</th>
                <th className="py-3 px-3.5 text-right font-semibold">BFR / rotation</th>
                <th className="py-3 px-3.5 text-right font-semibold">Creux intra-mois</th>
                <th className="py-3 px-3.5 text-right font-semibold">Solde fin mois</th>
                <th className="py-3 px-3.5 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {summary.rows.map((row) => (
                <tr
                  key={row.monthIndex}
                  className={
                    row.phase === 'SOUDURE'
                      ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                      : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]'
                  }
                >
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    M{row.monthIndex} · {row.calendarMonthShort}
                  </td>
                  <td className="py-2.5 px-3.5 font-sans text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    {row.phaseLabel}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-teal-700 dark:text-teal-400">
                    {formatAriary(row.inflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-rose-700 dark:text-rose-400">
                    −{formatAriary(row.totalOutflowsAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2.5 px-3.5 text-right font-semibold ${
                      row.netMonthlyCashFlowAr >= 0
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {row.netMonthlyCashFlowAr >= 0 ? '+' : ''}
                    {formatAriary(row.netMonthlyCashFlowAr, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-zinc-700 dark:text-zinc-300">
                    {formatAriary(row.bfrPerRotationAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2.5 px-3.5 text-right font-semibold ${
                      row.intraMonthMinCashAr < 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {formatAriary(row.intraMonthMinCashAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-2.5 px-3.5 text-right font-bold ${
                      row.endingCashAr >= 0
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatAriary(row.endingCashAr, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3.5 font-sans">{getRiskBadge(row.riskLevel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
