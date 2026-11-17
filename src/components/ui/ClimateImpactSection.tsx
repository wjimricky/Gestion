import React, { useMemo } from 'react';
import {
  CloudRain,
  Sun,
  Waves,
  Wind,
  CheckCircle2,
  SlidersHorizontal,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { ClimateHazardType } from '../../types/finance';
import {
  CLIMATE_HAZARD_META,
  computeClimateSimulationPreview,
  computeFiveYearClimateVulnerability,
  getResolvedClimateImpact,
} from '../../utils/climate';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';
import { ClimateLossCoefficientsPanel } from './ClimateLossCoefficientsPanel';

const HAZARD_ICONS: Record<ClimateHazardType, React.ComponentType<{ className?: string }>> = {
  normal: CheckCircle2,
  secheresse_moderee: Sun,
  secheresse_severe: Sun,
  inondation_moderee: CloudRain,
  cyclone_inondation: Wind,
};

export const ClimateImpactSection: React.FC = () => {
  const { assumptions, model, validation, updateClimateImpact, updateInvestmentField, notify } =
    useFinancial();
  const climate = getResolvedClimateImpact(assumptions);
  const preview = useMemo(
    () => computeClimateSimulationPreview(assumptions, climate),
    [assumptions, climate]
  );

  const vulnSummary = useMemo(
    () =>
      computeFiveYearClimateVulnerability(
        assumptions,
        climate,
        model.year1.totalTurnoverAr,
        model.year1.monthlyFixedChargesAr,
        model.investment.rotationWorkingCapitalHSAr
      ),
    [assumptions, climate, model]
  );

  const vuln = climate.fiveYearVulnerability ?? {
    cycloneAnnualProbPct: 28,
    droughtAnnualProbPct: 35,
    floodAnnualProbPct: 20,
    safetyReserveTargetMonths: 2.5,
  };

  const resilienceChartData = useMemo(
    () =>
      vulnSummary.points.map((pt) => ({
        label: pt.label,
        nominalMAr: Number((pt.nominalAnnualCashBufferAr / 1e6).toFixed(2)),
        recommendedMAr: Number((pt.recommendedSafetyTreasuryAr / 1e6).toFixed(2)),
        cumProbPct: pt.cumulativeHazardProbPct,
      })),
    [vulnSummary]
  );

  const hazardMeta = CLIMATE_HAZARD_META[climate.hazardType];
  const isShocked =
    Boolean(climate.useCustomCoefficients && (climate.customCoefficients ?? []).some((c) => c.active)) ||
    climate.hazardType !== 'normal' ||
    Math.abs(climate.fieldYieldShockPercent) > 1e-6 ||
    Math.abs(climate.millingYieldDeltaPoints) > 1e-6;

  const seasonScopeOptions = [
    {
      value: 'both',
      label: 'Année complète (HS + BS)',
      badge: '12 mois',
      description: 'Impact appliqué sur les deux saisons agricoles',
    },
    {
      value: 'hauteSaison',
      label: 'Haute Saison uniquement (HS)',
      badge: `${assumptions.hauteSaison.months}m`,
      description: 'Récolte principale affectée',
    },
    {
      value: 'basseSaison',
      label: 'Basse Saison uniquement (BS)',
      badge: `${assumptions.basseSaison.months}m`,
      description: 'Contre-saison ou approvisionnement tardif affecté',
    },
  ];

  const chartData = [
    {
      name: 'CA Nominal',
      caMillions: Number((preview.baselineAnnualTurnoverAr / 1e6).toFixed(2)),
      netMillions: Number((preview.baselineNetBeforeTaxAr / 1e6).toFixed(2)),
      fill: '#2DD4BF',
    },
    {
      name: isShocked ? 'CA Climat simulé' : 'CA Actuel',
      caMillions: Number((preview.shockedAnnualTurnoverAr / 1e6).toFixed(2)),
      netMillions: Number((preview.shockedNetBeforeTaxAr / 1e6).toFixed(2)),
      fill:
        preview.turnoverDeltaAr < -1
          ? hazardMeta.severity === 'danger'
            ? '#F43F5E'
            : '#F59E0B'
          : '#6366F1',
    },
  ];

  return (
    <section
      aria-label="Analyse d'impact climatique et aléas météorologiques"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <CloudRain className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                4c. Analyse d’Impact Climatique &amp; Aléas Météorologiques
              </h2>
              <Tooltip
                label="Analyse d'impact climatique"
                content="Simule les chocs météorologiques (sécheresse, inondations, cyclone) sur le rendement du paddy à l'hectare et sur le rendement d'usinage, avec répercussion dynamique sur les volumes collectés et le chiffre d'affaires prévisionnel."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Évaluez la résilience du chiffre d’affaires face aux chocs pluviométriques et extrêmes climatiques à Madagascar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isShocked && (
            <button
              type="button"
              onClick={() =>
                updateClimateImpact({
                  hazardType: 'normal',
                  fieldYieldShockPercent: 0,
                  millingYieldDeltaPoints: 0,
                  useCustomCoefficients: false,
                })
              }
              className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Conditions normales</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => updateClimateImpact({ enabled: !climate.enabled })}
            aria-pressed={climate.enabled}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              climate.enabled
                ? 'border-sky-500/45 bg-sky-500/10 text-sky-900 dark:text-sky-200 hover:bg-sky-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {climate.enabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {climate.enabled
                ? 'Répercussion sur le CA : Active'
                : 'Simulation isolée (sans impact CA)'}
            </span>
          </button>
        </div>
      </div>

      {/* Hazard Presets Selector */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Scénario météorologique simulé
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {(Object.keys(CLIMATE_HAZARD_META) as ClimateHazardType[]).map((key) => {
            const meta = CLIMATE_HAZARD_META[key];
            const Icon = HAZARD_ICONS[key];
            const active = climate.hazardType === key;
            const activeStyle =
              meta.severity === 'danger'
                ? 'border-rose-500/65 bg-rose-500/10 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/30'
                : meta.severity === 'warning'
                ? 'border-amber-500/65 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30'
                : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/25';

            return (
              <button
                key={key}
                type="button"
                onClick={() => updateClimateImpact({ hazardType: key })}
                aria-pressed={active}
                className={`text-left p-2.5 rounded-xl border transition-colors ${
                  active
                    ? activeStyle
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      meta.severity === 'danger'
                        ? 'text-rose-600 dark:text-rose-400'
                        : meta.severity === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-mono font-bold tabular-nums">
                    {meta.defaultFieldShockPercent === 0
                      ? '0 %'
                      : `${(meta.defaultFieldShockPercent * 100).toFixed(0)} %`}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold leading-snug">{meta.shortLabel}</div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{hazardMeta.description}</p>
      </div>

      {/* Agronomic Inputs & Shock Slider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FormField
          label="Rendement nominal (kg / ha)"
          unit="kg paddy / ha"
          tooltip="Rendement moyen de référence par hectare avant aléa climatique (typiquement 3 000 à 4 500 kg/ha en riziculture irriguée malgache)."
          error={validation.errors['climate.nominalYieldKgPerHa']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="100"
              min="500"
              value={climate.nominalYieldKgPerHa}
              onChange={(e) =>
                updateClimateImpact({ nominalYieldKgPerHa: Number(e.target.value) })
              }
            />
          )}
        </FormField>

        <FormField
          label="Bassin de collecte (ha)"
          unit="hectares suivis"
          tooltip="Surface totale cultivée approvisionnant la rizerie sur la campagne."
          error={validation.errors['climate.cultivatedAreaHa']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="5"
              min="1"
              value={climate.cultivatedAreaHa}
              onChange={(e) =>
                updateClimateImpact({ cultivatedAreaHa: Number(e.target.value) })
              }
            />
          )}
        </FormField>

        <FormField
          label="Impact qualité usinage (pts)"
          unit="points de rendement"
          tooltip="Variation du rendement paddy → riz due à la sécheresse ou à l'humidité des grains (ex : −0,03 = −3 points sur 70 % → 67 %)."
          error={validation.errors['climate.millingYieldDeltaPoints']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="0.005"
              min="-0.5"
              max="0.3"
              value={climate.millingYieldDeltaPoints}
              onChange={(e) =>
                updateClimateImpact({ millingYieldDeltaPoints: Number(e.target.value) })
              }
            />
          )}
        </FormField>

        <div className="space-y-1">
          <label
            htmlFor="climate-season-scope"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Saison(s) exposée(s)
          </label>
          <SelectMenu
            id="climate-season-scope"
            ariaLabel="Saison exposée à l'aléa climatique"
            value={climate.affectedSeason}
            onChange={(val) =>
              updateClimateImpact({
                affectedSeason: val as 'both' | 'hauteSaison' | 'basseSaison',
              })
            }
            options={seasonScopeOptions}
            className="w-full"
          />
        </div>
      </div>

      {/* Interactive Slider for Field Yield Shock */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label
            htmlFor="climate-shock-slider"
            className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
          >
            <Waves className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <span>Variation du rendement moyen à l’hectare</span>
          </label>
          <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
            {climate.fieldYieldShockPercent > 0 ? '+' : ''}
            {(climate.fieldYieldShockPercent * 100).toFixed(0)} % ·{' '}
            {Math.round(preview.effectiveYieldKgPerHa).toLocaleString('fr-FR')} kg/ha (vs{' '}
            {Math.round(preview.nominalYieldKgPerHa).toLocaleString('fr-FR')} kg/ha)
          </span>
        </div>
        <input
          id="climate-shock-slider"
          type="range"
          min={-60}
          max={15}
          step={1}
          value={Math.round(climate.fieldYieldShockPercent * 100)}
          onChange={(e) =>
            updateClimateImpact({ fieldYieldShockPercent: Number(e.target.value) / 100 })
          }
          className="w-full accent-sky-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          <span>−60 % (Crise sévère)</span>
          <span>−25 %</span>
          <span>0 % (Normal)</span>
          <span>+15 % (Excellente pluvio.)</span>
        </div>
        {validation.errors['climate.fieldYieldShockPercent'] && (
          <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
            {validation.errors['climate.fieldYieldShockPercent']}
          </p>
        )}
      </div>

      {/* Custom Climate Hazard Yield-Loss Coefficients (Cyclones, Drought, Floods) */}
      <ClimateLossCoefficientsPanel />

      {/* Impact Summary + Mini Comparative Recharts BarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Rendement effectif / ha
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {Math.round(preview.effectiveYieldKgPerHa).toLocaleString('fr-FR')} kg/ha
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              Bassin : {formatKg(preview.effectiveBasinProductionKg)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              CA prévisionnel (Année 1)
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {formatAriary(preview.shockedAnnualTurnoverAr, { inMillions: true })}
            </div>
            <div
              className={`text-[11px] font-mono font-semibold tabular-nums mt-0.5 inline-flex items-center gap-1 ${
                preview.turnoverDeltaAr < -1
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.turnoverDeltaAr > 1
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {preview.turnoverDeltaAr < -1 && (
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
              )}
              <span>
                {preview.turnoverDeltaAr >= 0 ? '+' : ''}
                {formatAriary(preview.turnoverDeltaAr, { inMillions: true })} (
                {formatPercent(preview.turnoverDeltaPercent, 1)})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Résultat net avant IR (A1)
            </div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                preview.shockedNetBeforeTaxAr >= 0
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {formatAriary(preview.shockedNetBeforeTaxAr, { inMillions: true })}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              Écart : {preview.netDeltaAr >= 0 ? '+' : ''}
              {formatAriary(preview.netDeltaAr, { inMillions: true })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 h-[145px] min-w-0 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v}M`}
              />
              <RechartsTooltip
                formatter={(value) => [`${Number(value ?? 0).toFixed(1)} M Ar`, 'CA Annuel A1']}
                contentStyle={{
                  backgroundColor: 'rgba(15, 14, 28, 0.94)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#F4F4F5',
                }}
              />
              <Bar dataKey="caMillions" radius={[6, 6, 0, 0]} barSize={42}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5-Year Climate Vulnerability & Financial Resilience Chart */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Analyse de vulnérabilité climatique (5 ans) &amp; Graphique « Résilience Financière »
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Modélisez la probabilité annuelle d’événements extrêmes et dimensionnez la trésorerie de sécurité recommandée sur 5 ans.
            </p>
          </div>
          {vulnSummary.additionalBufferNeededAr > 0 && (
            <button
              type="button"
              onClick={() => {
                updateInvestmentField('cashBufferAr', vulnSummary.recommendedPeakSafetyReserveAr);
                notify(
                  'success',
                  `Cash Buffer porté à ${formatAriary(vulnSummary.recommendedPeakSafetyReserveAr, { inMillions: true })} pour couvrir le pic de risque climatique à 5 ans.`
                );
              }}
              className="min-h-9 px-3 py-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-xs font-semibold text-sky-900 dark:text-sky-200 transition-colors shrink-0"
            >
              Appliquer réserve pic ({formatAriary(vulnSummary.recommendedPeakSafetyReserveAr, { inMillions: true })})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FormField
            label="Prob. Cyclone / an"
            unit="% / an"
            tooltip="Probabilité annuelle d'un épisode cyclonique affectant le bassin ou les routes."
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                max="100"
                step="1"
                value={vuln.cycloneAnnualProbPct}
                onChange={(e) =>
                  updateClimateImpact({
                    fiveYearVulnerability: {
                      ...vuln,
                      cycloneAnnualProbPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    },
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Prob. Sécheresse / an"
            unit="% / an"
            tooltip="Probabilité annuelle d'un déficit pluviométrique prolongé."
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                max="100"
                step="1"
                value={vuln.droughtAnnualProbPct}
                onChange={(e) =>
                  updateClimateImpact({
                    fiveYearVulnerability: {
                      ...vuln,
                      droughtAnnualProbPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    },
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Prob. Inondation / an"
            unit="% / an"
            tooltip="Probabilité annuelle de crue sur les périmètres bas ou pistes de collecte."
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                max="100"
                step="1"
                value={vuln.floodAnnualProbPct}
                onChange={(e) =>
                  updateClimateImpact({
                    fiveYearVulnerability: {
                      ...vuln,
                      floodAnnualProbPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    },
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Cible réserve fixe"
            unit="mois charges"
            tooltip="Couverture minimale de charges fixes intégrée à la trésorerie de sécurité."
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={vuln.safetyReserveTargetMonths}
                onChange={(e) =>
                  updateClimateImpact({
                    fiveYearVulnerability: {
                      ...vuln,
                      safetyReserveTargetMonths: Math.max(0.5, Math.min(12, Number(e.target.value) || 1)),
                    },
                  })
                }
              />
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Probabilité aléa (Année / 5 ans)
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {vulnSummary.annualCombinedEventProbPct.toFixed(1)} %{' '}
              <span className="text-xs font-normal text-zinc-500">
                / {vulnSummary.fiveYearAnyEventProbPct.toFixed(1)} % sur 5 ans
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Trésorerie de sécurité recommandée (pic)
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-sky-700 dark:text-sky-300">
              {formatAriary(vulnSummary.recommendedPeakSafetyReserveAr, { inMillions: true })}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Complément vs Cash Buffer actuel
            </div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                vulnSummary.additionalBufferNeededAr > 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {vulnSummary.additionalBufferNeededAr > 0
                ? `+${formatAriary(vulnSummary.additionalBufferNeededAr, { inMillions: true })}`
                : 'Couvert'}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Résilience Financière — Besoin de trésorerie de sécurité vs Probabilité cumulée (5 ans)
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              M Ar (gauche) · % risque cumulé (droite)
            </span>
          </div>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={resilienceChartData} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickFormatter={(v) => `${v} M`}
                  width={48}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                  width={42}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 14, 28, 0.94)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#F4F4F5',
                  }}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={Number((vulnSummary.baselineSafetyReserveAr / 1e6).toFixed(2))}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="recommendedMAr"
                  name="Trésorerie sécurité recommandée (M Ar)"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.18}
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="nominalMAr"
                  name="Cash Buffer actuel (M Ar)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumProbPct"
                  name="Probabilité cumulée d’aléa (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
