import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import {
  Flame,
  Fuel,
  PackageX,
  CloudLightning,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  DEFAULT_STRESS_TEST_PARAMS,
  OperationalStressTestParams,
  runOperationalStressTest,
  STRESS_TEST_PRESETS,
  StressSeasonScope,
  StressTestPresetId,
} from '../../utils/stressTest';
import { Tooltip } from './Tooltip';
import { ChartExportButtons } from './ChartExportButtons';

export const OperationalStressTestSection: React.FC = () => {
  const { assumptions, model, treasurySettings, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [params, setParams] = useState<OperationalStressTestParams>(DEFAULT_STRESS_TEST_PARAMS);
  const [showTable, setShowTable] = useState(false);

  const result = useMemo(
    () => runOperationalStressTest(assumptions, model, treasurySettings, params),
    [assumptions, model, treasurySettings, params]
  );

  const applyPreset = (presetId: Exclude<StressTestPresetId, 'custom'>) => {
    const found = STRESS_TEST_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setParams((prev) => ({
      ...prev,
      presetId: found.id,
      ...found.params,
    }));
  };

  const updateSlider = (
    field: 'paddySupplyDropPercent' | 'dieselPriceSurgePercent' | 'extraPostHarvestLossPoints',
    value: number
  ) => {
    setParams((prev) => ({
      ...prev,
      presetId: 'custom',
      [field]: value,
    }));
  };

  const presetIcon = (id: Exclude<StressTestPresetId, 'custom'>) => {
    if (id === 'rupture_paddy') return <PackageX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (id === 'choc_gasoil') return <Fuel className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    if (id === 'pertes_post_recolte') return <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    return <CloudLightning className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  };

  const chartData = useMemo(
    () =>
      result.monthlyComparison.map((pt) => ({
        label: pt.label,
        phase: pt.phase,
        nominalM: Number((pt.nominalEndingCashAr / 1e6).toFixed(2)),
        stressedM: Number((pt.stressedEndingCashAr / 1e6).toFixed(2)),
        gapM: Number((pt.cashGapAr / 1e6).toFixed(2)),
        nominalRaw: pt.nominalEndingCashAr,
        stressedRaw: pt.stressedEndingCashAr,
        gapRaw: pt.cashGapAr,
      })),
    [result.monthlyComparison]
  );

  const hasAnyStress =
    params.paddySupplyDropPercent > 0 ||
    params.dieselPriceSurgePercent > 0 ||
    params.extraPostHarvestLossPoints > 0;

  return (
    <section
      aria-label="Stress-Test Opérationnel et chocs exogènes Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-rose-500/25 dark:border-rose-500/30 bg-white dark:bg-[#11101C] space-y-4 no-print"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              4e. Stress-Test Opérationnel (Chocs Exogènes Madagascar — Impact Trésorerie)
            </h2>
            <Tooltip
              align="left"
              label="Stress-Test sans altérer la base"
              content="Simule des chocs opérationnels réalistes à Madagascar (rupture d'approvisionnement paddy, hausse brutale du gasoil, pertes post-récolte accrues) et mesure l'impact direct sur votre trésorerie mensuelle M1–M12 sans modifier vos hypothèses de base."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Testez la résilience de votre trésorerie face aux aléas logistiques et d&apos;approvisionnement locaux (impact immédiat M1–M12).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Saison exposée au stress"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627]"
          >
            {(
              [
                { id: 'both', label: 'HS + BS' },
                { id: 'hauteSaison', label: 'HS seule' },
                { id: 'basseSaison', label: 'BS seule' },
              ] as Array<{ id: StressSeasonScope; label: string }>
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setParams((prev) => ({ ...prev, affectedSeason: sc.id }))}
                className={`min-h-8 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  params.affectedSeason === sc.id
                    ? 'bg-rose-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setParams(DEFAULT_STRESS_TEST_PARAMS)}
            className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser choc</span>
          </button>
        </div>
      </div>

      {/* Presets Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {STRESS_TEST_PRESETS.map((preset) => {
          const active = params.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              aria-pressed={active}
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? preset.severity === 'danger'
                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-950 dark:text-rose-100'
                    : 'border-amber-500/60 bg-amber-500/10 text-amber-950 dark:text-amber-100'
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] hover:border-zinc-300 dark:hover:border-white/20 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className={
                    preset.severity === 'danger'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {presetIcon(preset.id)}
                </span>
                <span className="truncate">{preset.shortLabel}</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Sliders Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0C18]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="stress-paddy-drop" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Rupture d&apos;approvisionnement paddy
            </label>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              −{params.paddySupplyDropPercent} %
            </span>
          </div>
          <input
            id="stress-paddy-drop"
            type="range"
            min={0}
            max={60}
            step={5}
            value={params.paddySupplyDropPercent}
            onChange={(e) => updateSlider('paddySupplyDropPercent', Number(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0 % (normal)</span>
            <span>−{Math.round(result.lostPaddyKgAnnual).toLocaleString('fr-FR')} kg perdus</span>
            <span>−60 %</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="stress-diesel-surge" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Hausse soudaine du gasoil
            </label>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              +{params.dieselPriceSurgePercent} %
            </span>
          </div>
          <input
            id="stress-diesel-surge"
            type="range"
            min={0}
            max={120}
            step={5}
            value={params.dieselPriceSurgePercent}
            onChange={(e) => updateSlider('dieselPriceSurgePercent', Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0 %</span>
            <span>Surcoût : +{formatAriary(result.dieselExtraCostAnnualAr, { inMillions: inM })}</span>
            <span>+120 %</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="stress-postharvest-loss" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Pertes post-récolte accrues
            </label>
            <span className="font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums">
              −{params.extraPostHarvestLossPoints} pts rdt
            </span>
          </div>
          <input
            id="stress-postharvest-loss"
            type="range"
            min={0}
            max={25}
            step={1}
            value={params.extraPostHarvestLossPoints}
            onChange={(e) => updateSlider('extraPostHarvestLossPoints', Number(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>0 pt</span>
            <span>Impact usinage / humidité</span>
            <span>−25 pts</span>
          </div>
        </div>
      </div>

      {/* 4 Direct Treasury & Profitability Impact KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Trésorerie fin Année 1 (M12)
          </div>
          <div className="mt-1 font-mono font-bold text-base text-zinc-900 dark:text-white tabular-nums">
            {formatAriary(result.stressedTreasury.endingYearCashAr, { inMillions: inM })}
          </div>
          <div
            className={`text-[11px] font-mono mt-0.5 tabular-nums ${
              result.cashDeltaEndYearAr < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            Écart vs nominal : {result.cashDeltaEndYearAr >= 0 ? '+' : ''}
            {formatAriary(result.cashDeltaEndYearAr, { inMillions: inM })}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Point bas trésorerie (M1–M12)
          </div>
          <div
            className={`mt-1 font-mono font-bold text-base tabular-nums ${
              result.stressedTreasury.minCashTroughAr < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-zinc-900 dark:text-white'
            }`}
          >
            {formatAriary(result.stressedTreasury.minCashTroughAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            Atteint en {result.stressedTreasury.minCashTroughMonthLabel} (Nominal :{' '}
            {formatAriary(result.nominalTreasury.minCashTroughAr, { inMillions: inM })})
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Mois déficitaires &amp; BFR choc</span>
          </div>
          <div className="mt-1 font-mono font-bold text-base text-zinc-900 dark:text-white tabular-nums">
            {result.stressedNegativeMonthsCount} mois &lt; 0{' '}
            <span className="text-xs font-normal text-zinc-500">
              (vs {result.nominalNegativeMonthsCount} nom.)
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
            {result.additionalCashNeededAr > 0
              ? `Ligne CT suppl. : +${formatAriary(result.additionalCashNeededAr, { inMillions: inM })}`
              : 'Aucune ligne CT supplémentaire requise'}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
            Impact VAN 3 ans &amp; TRI
          </div>
          <div className="mt-1 font-mono font-bold text-base text-zinc-900 dark:text-white tabular-nums">
            {formatAriary(result.stressedModel.npv.npvAr, { inMillions: true })}
          </div>
          <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
            Δ VAN : {result.npvDeltaAr >= 0 ? '+' : ''}
            {formatAriary(result.npvDeltaAr, { inMillions: true })} · Δ TRI :{' '}
            {result.irrDeltaPts >= 0 ? '+' : ''}
            {result.irrDeltaPts.toFixed(1)} pts
          </div>
        </div>
      </div>

      {/* Monthly Cash Trajectory Chart (Nominal vs Stress) */}
      <div
        ref={chartContainerRef}
        className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] p-3.5 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Trajectoire de trésorerie mensuelle M1–M12 : Base Nominale vs Scénario Stressé (M Ar)
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {hasAnyStress
                ? 'La ligne rose indique le niveau de caisse sous stress opérationnel ; les barres montrent la perte mensuelle de trésorerie.'
                : 'Ajustez un curseur ou sélectionnez un choc pour visualiser la déviation de trésorerie.'}
            </p>
          </div>
          <ChartExportButtons
            targetRef={chartContainerRef}
            filenameBase="stress_test_tresorerie"
            chartTitle="Stress-Test Trésorerie"
          />
        </div>

        <div className="w-full h-[250px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
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
                width={52}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.75} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700 text-xs text-zinc-100 shadow-xl space-y-1">
                      <div className="font-bold text-white flex items-center justify-between gap-3">
                        <span>{row.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10">
                          {row.phase}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono">
                        <span className="text-indigo-300">Nominal :</span>
                        <span>{formatAriary(row.nominalRaw, { inMillions: true })}</span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono">
                        <span className="text-rose-300">Stressé :</span>
                        <span>{formatAriary(row.stressedRaw, { inMillions: true })}</span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono pt-1 border-t border-white/10">
                        <span className="text-amber-300">Impact caisse :</span>
                        <span>
                          {row.gapRaw >= 0 ? '+' : ''}
                          {formatAriary(row.gapRaw, { inMillions: true })}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="gapM"
                name="Écart caisse (M Ar)"
                fill="#f59e0b"
                fillOpacity={0.35}
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
              <Line
                type="monotone"
                dataKey="nominalM"
                name="Trésorerie nominale (M Ar)"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
              />
              <Line
                type="monotone"
                dataKey="stressedM"
                name="Trésorerie stressée (M Ar)"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collapsible Monthly Impact Table */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
        >
          {showTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>
            {showTable
              ? 'Masquer le détail mensuel M1–M12 du stress-test'
              : 'Afficher le tableau comparatif mensuel M1–M12'}
          </span>
        </button>

        {showTable && (
          <div className="mt-2.5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.08]">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-100 dark:bg-[#191828] text-zinc-700 dark:text-zinc-300 font-semibold">
                <tr>
                  <th className="px-3 py-2">Mois</th>
                  <th className="px-3 py-2">Phase</th>
                  <th className="px-3 py-2 text-right">Caisse Nominale</th>
                  <th className="px-3 py-2 text-right">Caisse Stressée</th>
                  <th className="px-3 py-2 text-right">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.06] font-mono tabular-nums">
                {result.monthlyComparison.map((row) => (
                  <tr key={row.monthIndex} className="hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                      M{row.monthIndex} · {row.label}
                    </td>
                    <td className="px-3 py-1.5 font-sans text-zinc-600 dark:text-zinc-400">
                      {row.phase}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-800 dark:text-zinc-200">
                      {formatAriary(row.nominalEndingCashAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-semibold ${
                        row.stressedEndingCashAr < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {formatAriary(row.stressedEndingCashAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right ${
                        row.cashGapAr < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      {row.cashGapAr >= 0 ? '+' : ''}
                      {formatAriary(row.cashGapAr, { inMillions: inM })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stress Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
        <span>
          Résultat net Année 1 sous stress :{' '}
          <strong className="font-mono text-zinc-900 dark:text-zinc-100">
            {formatAriary(result.stressedModel.year1.netResultAfterTaxAr, { inMillions: inM })}
          </strong>{' '}
          (Marge nette {formatPercent(result.stressedModel.year1.netMarginAfterTaxRate, 1)})
        </span>
        <span className="font-mono">
          Nominal A1 : {formatAriary(result.nominalModel.year1.netResultAfterTaxAr, { inMillions: inM })}
        </span>
      </div>
    </section>
  );
};
