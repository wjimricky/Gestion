import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  Landmark,
  Layers,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  buildMonthlyTreasuryPlan,
  CALENDAR_MONTHS_FR,
  DEFAULT_TREASURY_SETTINGS,
  exportTreasuryCsv,
  TreasuryRiskLevel,
} from '../../utils/treasury';
import { KpiCard } from '../ui/KpiCard';
import { Tooltip } from '../ui/Tooltip';

export const TreasuryTab: React.FC = () => {
  const {
    model,
    unitDisplay,
    notify,
    treasurySettings: settings,
    setTreasurySettings: setSettings,
    theme,
  } = useFinancial();
  const isDarkMode = theme === 'dark';
  const inM = unitDisplay === 'millions';

  const [chartMode, setChartMode] = useState<'flux' | 'breakdown'>('flux');
  const [tableMode, setTableMode] = useState<'detailed' | 'bfr'>('detailed');

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
        inflows: Math.round(row.inflowsAr),
        outflowsNeg: -Math.round(row.totalOutflowsAr),
        paddyOut: Math.round(row.paddyPurchaseOutflowAr),
        millingBagsOut: Math.round(row.millingAndBagsOutflowAr),
        logisticsOut: Math.round(row.rotationLogisticsOutflowAr),
        fixedOut: Math.round(row.fixedOutflowsAr),
        taxOut: Math.round(row.taxOutflowsAr),
        endingCash: Math.round(row.endingCashAr),
        intraMonthMin: Math.round(row.intraMonthMinCashAr),
      })),
    [summary.rows]
  );

  const firstSoudureMonth = summary.rows.find((r) => r.phase === 'SOUDURE')?.calendarMonthShort;
  const lastSoudureMonth = [...summary.rows]
    .reverse()
    .find((r) => r.phase === 'SOUDURE')?.calendarMonthShort;

  const renderRiskStatus = (level: TreasuryRiskLevel) => {
    if (level === 'critique') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Critique</span>
        </span>
      );
    }
    if (level === 'vigilance') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Vigilance</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Nominal</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Plan de Trésorerie Année 1 &amp; BFR Saisonnier (M1–M12)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Suivi mensuel détaillé des encaissements, décaissements par poste et creux de BFR entre Haute Saison et période de soudure.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            exportTreasuryCsv(summary);
            notify('success', 'Plan mensuel détaillé (Entrées & Sorties M1–M12) exporté en CSV.');
          }}
          className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center justify-center gap-2 shrink-0 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <span>Exporter Plan M1–M12 (CSV)</span>
        </button>
      </div>

      {/* Seasonal WCR Diagnostic Strip */}
      <section
        role="status"
        className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          summary.overallRisk === 'critique'
            ? 'border-rose-500/45 bg-rose-500/[0.07] dark:bg-rose-950/25'
            : summary.overallRisk === 'vigilance'
            ? 'border-amber-500/45 bg-amber-500/[0.07]'
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
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {summary.overallRisk === 'critique'
                ? `Tension critique de BFR saisonnier (${summary.criticalMonthsCount} mois déficitaires)`
                : summary.overallRisk === 'vigilance'
                ? `Vigilance saisonnière sur ${summary.vigilanceMonthsCount} mois en transition / soudure`
                : 'Trésorerie équilibrée sur les 12 mois de l’exercice (Haute Saison & Soudure couvertes)'}
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
              BFR requis par rotation :{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAriary(summary.hsBfrPerRotationAr, { inMillions: true })}
              </span>{' '}
              en Haute Saison contre{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAriary(summary.peakSoudureBfrAr, { inMillions: true })}
              </span>{' '}
              en Basse Saison ({summary.bfrSoudureIncreasePct >= 0 ? '+' : ''}
              {formatPercent(summary.bfrSoudureIncreasePct, 1)}). Point bas intra-mensuel en{' '}
              <strong className="font-semibold">{summary.minCashTroughMonthLabel}</strong> :{' '}
              <span className="font-mono font-bold tabular-nums">
                {formatAriary(summary.minCashTroughAr, { inMillions: true })}
              </span>
              {summary.recommendedShortTermFacilityAr > 0
                ? ` — Ligne de trésorerie recommandée : ${formatAriary(summary.recommendedShortTermFacilityAr, { inMillions: true })}.`
                : '.'}
              {summary.vatApplied && (
                <span className="ml-1.5 text-teal-800 dark:text-teal-300 font-semibold">
                  (TVA intégrée · DGI : {formatAriary(summary.totalVatNetDgiAr, { inMillions: true })})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-zinc-200/70 dark:border-white/[0.08]">
          <div>
            <span className="text-[11px] font-sans text-zinc-500 dark:text-zinc-400 block">
              Entrées Année 1
            </span>
            <strong className="text-teal-700 dark:text-teal-400">
              {formatAriary(summary.totalInflowsAr, { inMillions: inM })}
            </strong>
          </div>
          <div>
            <span className="text-[11px] font-sans text-zinc-500 dark:text-zinc-400 block">
              Sorties Année 1
            </span>
            <strong className="text-rose-700 dark:text-rose-400">
              −{formatAriary(summary.totalOutflowsAr, { inMillions: inM })}
            </strong>
          </div>
        </div>
      </section>

      {/* 4 Treasury KPI Cards */}
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
          tooltip="Solde de trésorerie cumulé en fin d'Année 1 après encaissements clients, achats paddy, usinage, charges fixes et impôt IR."
        />

        <KpiCard
          label="Point bas intra-mensuel (BFR)"
          value={formatAriary(summary.minCashTroughAr, { inMillions: inM })}
          animatedValue={summary.minCashTroughAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`Mois le plus tendu : ${summary.minCashTroughMonthLabel}`}
          icon={TrendingDown}
          tone={
            summary.minCashTroughAr < 0
              ? 'danger'
              : summary.minCashTroughAr < summary.cashBufferAr * 0.4
              ? 'warning'
              : 'positive'
          }
          tooltip="Niveau minimal de caisse observé en cours de mois lorsque vous financez les achats de paddy d'une rotation avant l'encaissement des ventes."
        />

        <KpiCard
          label="Pic BFR par rotation (Soudure)"
          value={formatAriary(summary.peakSoudureBfrAr, { inMillions: inM })}
          animatedValue={summary.peakSoudureBfrAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={`+${formatPercent(Math.max(0, summary.bfrSoudureIncreasePct), 1)} vs Haute Saison`}
          icon={Landmark}
          tone="info"
          tooltip="Montant de fonds de roulement à engager pour lancer une rotation complète en Basse Saison / Soudure."
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
          tooltip="Ratio Cash Buffer ÷ Pic BFR d'une rotation en soudure. Un ratio ≥ 1,0x couvre une rotation complète sans découvert."
        />
      </div>

      {/* Stress-Test Controls */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] p-5 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Simulateur de tension BFR saisonnier &amp; délais clients
            </h2>
            <Tooltip
              align="left"
              label="Simulation BFR"
              content="Ajustez le mois de démarrage de la campagne, le délai de paiement accordé aux clients (DSO), le pré-achat stratégique de paddy en fin de Haute Saison et une éventuelle ligne de crédit court terme."
            />
          </div>
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_TREASURY_SETTINGS)}
            className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline self-start sm:self-auto"
          >
            Réinitialiser simulation
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="tab-treasury-start-month"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Début d’exercice (M1 = HS)
            </label>
            <select
              id="tab-treasury-start-month"
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

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Délai d’encaissement clients (DSO)
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="tab-treasury-prestock" className="font-medium text-zinc-700 dark:text-zinc-300">
                Pré-stockage paddy pré-soudure
              </label>
              <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {(settings.soudurePrestockRatio * 100).toFixed(0)} %
              </span>
            </div>
            <input
              id="tab-treasury-prestock"
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

          <div className="space-y-1.5">
            <label
              htmlFor="tab-treasury-credit-line"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Ligne de crédit / découvert (Ar)
            </label>
            <input
              id="tab-treasury-credit-line"
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

      {/* Recharts Dual Mode Visualization */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {chartMode === 'flux'
                ? 'Entrées vs Sorties & Évolution de la Trésorerie (M1–M12)'
                : 'Structure détaillée des Décaissements vs Encaissements (M1–M12)'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Zone ombrée : période de soudure critique nécessitant un suivi rapproché du BFR d’achat paddy.
            </p>
          </div>

          <div
            role="group"
            aria-label="Mode de graphique trésorerie"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#171627] shrink-0"
          >
            <button
              type="button"
              onClick={() => setChartMode('flux')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                chartMode === 'flux'
                  ? 'bg-white dark:bg-[#262440] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Flux &amp; Solde caisse
            </button>
            <button
              type="button"
              onClick={() => setChartMode('breakdown')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                chartMode === 'breakdown'
                  ? 'bg-white dark:bg-[#262440] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Détail postes de sorties
            </button>
          </div>
        </div>

        <div className="h-80 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'flux' ? (
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? 'rgba(148,163,184,0.16)' : 'rgba(0,0,0,0.06)'}
                />
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
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#52525b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#52525b' }}
                  tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)} M`}
                  width={54}
                />
                <ReferenceLine y={0} stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e4e4e7',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: isDarkMode ? '#f8fafc' : '#18181b',
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      inflows: 'Total Encaissements',
                      outflowsNeg: 'Total Décaissements',
                      endingCash: 'Trésorerie fin de mois',
                      intraMonthMin: 'Creux intra-mensuel (BFR)',
                    };
                    return [formatAriary(Number(value ?? 0), { inMillions: inM }), labels[String(name)] || String(name)];
                  }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${p.fullName} — ${p.phaseLabel}` : '';
                  }}
                />
                <Bar dataKey="inflows" fill="#14b8a6" fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="outflowsNeg" fill="#f43f5e" fillOpacity={0.78} radius={[0, 0, 4, 4]} maxBarSize={26} />
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
            ) : (
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? 'rgba(148,163,184,0.16)' : 'rgba(0,0,0,0.06)'}
                />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#52525b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#52525b' }}
                  tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)} M`}
                  width={54}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e4e4e7',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: isDarkMode ? '#f8fafc' : '#18181b',
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      paddyOut: 'Achats Paddy',
                      millingBagsOut: 'Usinage & Sacs PP',
                      logisticsOut: 'Transport & Rotations',
                      fixedOut: 'Charges Fixes',
                      taxOut: 'Impôt IR',
                      inflows: 'Total Encaissements',
                    };
                    return [formatAriary(Number(value ?? 0), { inMillions: inM }), labels[String(name)] || String(name)];
                  }}
                />
                <Bar dataKey="paddyOut" stackId="out" fill="#f43f5e" maxBarSize={28} />
                <Bar dataKey="millingBagsOut" stackId="out" fill="#f59e0b" maxBarSize={28} />
                <Bar dataKey="logisticsOut" stackId="out" fill="#0ea5e9" maxBarSize={28} />
                <Bar dataKey="fixedOut" stackId="out" fill="#8b5cf6" maxBarSize={28} />
                <Bar dataKey="taxOut" stackId="out" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="inflows"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10b981' }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Detailed Monthly Inflows & Outflows Table (M1-M12 + Total) */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Journal mensuel détaillé des entrées et sorties de fonds — Année 1</span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Montants en {inM ? 'Millions d’Ariary (M Ar)' : 'Ariary (Ar)'} · Dotation ouverture M1 :{' '}
              <span className="font-mono font-semibold tabular-nums">
                {formatAriary(summary.initialOperationalLiquidityAr, { inMillions: inM })}
              </span>
            </p>
          </div>

          <div
            role="group"
            aria-label="Colonnes du tableau de trésorerie"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-[#171627]"
          >
            <button
              type="button"
              onClick={() => setTableMode('detailed')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tableMode === 'detailed'
                  ? 'bg-white dark:bg-[#262440] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Entrées &amp; Sorties ventilées
            </button>
            <button
              type="button"
              onClick={() => setTableMode('bfr')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tableMode === 'bfr'
                  ? 'bg-white dark:bg-[#262440] text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Synthèse BFR &amp; Risque
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableMode === 'detailed' ? (
            <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                  <th className="py-3 px-3 font-semibold">Mois</th>
                  <th className="py-3 px-3 text-right font-semibold">Ventes Riz</th>
                  <th className="py-3 px-3 text-right font-semibold">Sons</th>
                  <th className="py-3 px-3 text-right font-semibold text-teal-700 dark:text-teal-400">
                    Total Entrées
                  </th>
                  <th className="py-3 px-3 text-right font-semibold">Achats Paddy</th>
                  <th className="py-3 px-3 text-right font-semibold">Usinage &amp; Sacs</th>
                  <th className="py-3 px-3 text-right font-semibold">Transport/Rot.</th>
                  <th className="py-3 px-3 text-right font-semibold">Fixes + IR</th>
                  <th className="py-3 px-3 text-right font-semibold text-rose-700 dark:text-rose-400">
                    Total Sorties
                  </th>
                  <th className="py-3 px-3 text-right font-semibold">Flux Net</th>
                  <th className="py-3 px-3 text-right font-semibold">Solde Fin</th>
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
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        M{row.monthIndex} · {row.calendarMonthShort}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {row.phase}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.riceSalesInflowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {formatAriary(row.byproductSalesInflowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-teal-700 dark:text-teal-400">
                      {formatAriary(row.inflowsAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.paddyPurchaseOutflowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.millingAndBagsOutflowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.rotationLogisticsOutflowAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.fixedOutflowsAr + row.taxOutflowsAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-700 dark:text-rose-400">
                      −{formatAriary(row.totalOutflowsAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        row.netMonthlyCashFlowAr >= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {row.netMonthlyCashFlowAr >= 0 ? '+' : ''}
                      {formatAriary(row.netMonthlyCashFlowAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.endingCashAr >= 0
                          ? 'text-zinc-900 dark:text-white'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatAriary(row.endingCashAr, { inMillions: inM })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 dark:bg-[#171627] border-t-2 border-zinc-300 dark:border-white/[0.12] font-bold">
                  <td className="py-3 px-3 font-sans text-zinc-900 dark:text-white">
                    Total Année 1
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(summary.totalRiceInflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-700 dark:text-zinc-300">
                    {formatAriary(summary.totalByproductInflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-400">
                    {formatAriary(summary.totalInflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(summary.totalPaddyOutflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(summary.totalMillingBagsOutflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(summary.totalLogisticsOutflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(summary.totalFixedOutflowsAr + summary.totalTaxOutflowsAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                    −{formatAriary(summary.totalOutflowsAr, { inMillions: inM })}
                  </td>
                  <td
                    className={`py-3 px-3 text-right ${
                      summary.netAnnualCashFlowAr >= 0
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {summary.netAnnualCashFlowAr >= 0 ? '+' : ''}
                    {formatAriary(summary.netAnnualCashFlowAr, { inMillions: inM })}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-900 dark:text-white">
                    {formatAriary(summary.endingYearCashAr, { inMillions: inM })}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                  <th className="py-3 px-3.5 font-semibold">Mois</th>
                  <th className="py-3 px-3.5 font-semibold">Phase</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Solde Début</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Entrées</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Sorties</th>
                  <th className="py-3 px-3.5 text-right font-semibold">BFR / rotation</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Creux intra-mois</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Couv. (jours)</th>
                  <th className="py-3 px-3.5 text-right font-semibold">Solde Clôture</th>
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
                    <td className="py-2.5 px-3.5 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.openingCashAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-teal-700 dark:text-teal-400">
                      {formatAriary(row.inflowsAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-rose-700 dark:text-rose-400">
                      −{formatAriary(row.totalOutflowsAr, { inMillions: inM })}
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
                    <td className="py-2.5 px-3.5 text-right text-zinc-600 dark:text-zinc-400">
                      {row.bfrCoverageDays.toFixed(0)} j
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
                    <td className="py-2.5 px-3.5 font-sans">{renderRiskStatus(row.riskLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
