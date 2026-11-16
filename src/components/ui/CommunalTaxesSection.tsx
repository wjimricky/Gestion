import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Landmark, RotateCcw, SlidersHorizontal, TrendingDown } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  COMMUNAL_TAX_PRESETS,
  computeCommunalTaxesBreakdown,
  DEFAULT_COMMUNAL_TAXES,
  getResolvedCommunalTaxes,
  isCommunalTaxIntegrated,
} from '../../utils/communalTaxes';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { Tooltip } from './Tooltip';

export const CommunalTaxesSection: React.FC = () => {
  const { assumptions, model, validation, unitDisplay, updateCommunalTaxes, theme } = useFinancial();
  const inM = unitDisplay === 'millions';

  const taxes = getResolvedCommunalTaxes(assumptions);
  const integrated = isCommunalTaxIntegrated(taxes);

  const breakdown = useMemo(
    () => computeCommunalTaxesBreakdown(assumptions, model, taxes),
    [assumptions, model, taxes]
  );

  const chartData = useMemo(
    () => [
      {
        name: 'Ristourne paddy',
        montantM: Number((breakdown.ristourneAnnualAr / 1e6).toFixed(2)),
        fill: '#f59e0b',
      },
      {
        name: 'Droits marché',
        montantM: Number((breakdown.marketFeesAnnualAr / 1e6).toFixed(2)),
        fill: '#6366f1',
      },
      {
        name: 'Redevance ha',
        montantM: Number((breakdown.landRoyaltyAnnualAr / 1e6).toFixed(2)),
        fill: '#14b8a6',
      },
      {
        name: 'IFPB / Patente',
        montantM: Number((breakdown.ifpbAnnualAr / 1e6).toFixed(2)),
        fill: '#0ea5e9',
      },
    ],
    [breakdown]
  );

  const axisTickColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <section
      aria-label="Taxes communales et redevances foncières rizicoles"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4 no-print"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              14. Taxes Communales &amp; Redevances Foncières (Filière Riz Madagascar)
            </h2>
            <Tooltip
              align="left"
              label="Fiscalité locale rizicole"
              content="Intègre la ristourne communale sur le paddy collecté (Ar/kg), les droits de marché / laissez-passer par rotation, les redevances foncières / AUE à l'hectare et la patente/IFPB dans le compte de résultat pour affiner le résultat net après IR."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Calculez l&apos;impact réel des ristournes de collecte, droits de marché et redevances foncières communales sur la rentabilité nette après IR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={integrated}
            onClick={() =>
              updateCommunalTaxes({
                enabled: !taxes.enabled,
                applyToModel: true,
              })
            }
            className={`min-h-9 px-3 py-1.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              integrated
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                : 'border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {integrated ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {integrated ? 'Intégrées au Résultat Net' : 'Mode simulation seule'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => updateCommunalTaxes({ ...DEFAULT_COMMUNAL_TAXES })}
            className="min-h-9 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {COMMUNAL_TAX_PRESETS.map((preset) => {
          const active = taxes.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                updateCommunalTaxes({
                  ...preset.patch,
                  enabled: true,
                  applyToModel: true,
                })
              }
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? 'border-amber-500/60 bg-amber-500/10 text-zinc-950 dark:text-white'
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] hover:border-zinc-300 dark:hover:border-white/20 text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <div className="text-xs font-semibold">{preset.shortLabel}</div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                {preset.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0C18]">
        <FormField
          label="Ristourne communale (Ar/kg)"
          unit="Ar / kg paddy"
          tooltip="Prélèvement communal perçu à la sortie de la commune sur chaque kilo de paddy collecté (typiquement 10 à 25 Ar/kg)."
          error={validation.errors['communalTaxes.ristourneArPerKgPaddy']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="1"
              value={taxes.ristourneArPerKgPaddy}
              onChange={(e) =>
                updateCommunalTaxes({
                  presetId: 'custom',
                  ristourneArPerKgPaddy: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Droits de marché / rotation"
          unit="Ar / rotation"
          tooltip="Frais de pesage, laissez-passer communal et tickets de marché par rotation de collecte."
          error={validation.errors['communalTaxes.marketFeePerRotationAr']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="5000"
              value={taxes.marketFeePerRotationAr}
              onChange={(e) =>
                updateCommunalTaxes({
                  presetId: 'custom',
                  marketFeePerRotationAr: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Surface foncière (ha)"
          unit="hectares"
          tooltip="Superficie totale des rizières ou périmètres cultivés soumis aux redevances foncières ou d'Association d'Usagers de l'Eau (AUE)."
          error={validation.errors['communalTaxes.cultivatedLandHa']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="1"
              value={taxes.cultivatedLandHa}
              onChange={(e) =>
                updateCommunalTaxes({
                  presetId: 'custom',
                  cultivatedLandHa: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Redevance foncière / ha"
          unit="Ar / ha / an"
          tooltip="Redevance foncière annuelle par hectare (IFT rural + cotisation périmètre irrigué AUE)."
          error={validation.errors['communalTaxes.landRoyaltyArPerHaYear']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="5000"
              value={taxes.landRoyaltyArPerHaYear}
              onChange={(e) =>
                updateCommunalTaxes({
                  presetId: 'custom',
                  landRoyaltyArPerHaYear: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="IFPB & Patente (mensuel)"
          unit="Ar / mois"
          tooltip="Quote-part mensuelle d'Impôt Foncier sur la Propriété Bâtie (rizerie/entrepôt) et patente communale."
          error={validation.errors['communalTaxes.ifpbAndPatentMonthlyAr']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="10000"
              value={taxes.ifpbAndPatentMonthlyAr}
              onChange={(e) =>
                updateCommunalTaxes({
                  presetId: 'custom',
                  ifpbAndPatentMonthlyAr: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>
      </div>

      {/* KPI Strip + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono tabular-nums">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
            <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Total Fiscalité Communale &amp; Foncière (A1)
            </div>
            <div className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
              {formatAriary(breakdown.totalAnnualTaxesAr, { inMillions: inM })}
            </div>
            <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Soit {formatPercent(breakdown.shareOfTurnoverRate, 2)} du CA ·{' '}
              {Math.round(breakdown.taxPerKgRiceAr).toLocaleString('fr-FR')} Ar/kg riz
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
            <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Ventilation Variable vs Foncier fixe
            </div>
            <div className="mt-1 text-base font-bold text-amber-700 dark:text-amber-300">
              {formatAriary(breakdown.ristourneAnnualAr + breakdown.marketFeesAnnualAr, { inMillions: inM })}
            </div>
            <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Foncier &amp; IFPB : {formatAriary(breakdown.monthlyFixedTaxAr, { inMillions: false })}/mois
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
            <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Résultat Net Après IR (avec taxes)
            </div>
            <div
              className={`mt-1 text-base font-bold ${
                breakdown.netResultAfterTaxWithTaxesAr >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {formatAriary(breakdown.netResultAfterTaxWithTaxesAr, { inMillions: inM })}
            </div>
            <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Marge nette : {formatPercent(breakdown.netMarginWithTaxes, 1)} (vs{' '}
              {formatPercent(breakdown.netMarginWithoutTaxes, 1)})
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
            <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Impact Net Après Bouclier Fiscal IR
            </div>
            <div className="mt-1 text-base font-bold text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
              <TrendingDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{formatAriary(breakdown.netResultDeltaAr, { inMillions: inM })}</span>
            </div>
            <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Économie d&apos;IR déductible :{' '}
              {formatAriary(breakdown.taxShieldIrAr, { inMillions: true })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-[#0D0C18] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Répartition annuelle des prélèvements (M Ar)
            </span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {integrated ? 'Actif dans P&L' : 'Simulation'}
            </span>
          </div>
          <div className="h-[155px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: axisTickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisTickColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}M`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#131222' : '#ffffff',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${Number(value ?? 0).toFixed(2)} M Ar`, 'Charge fiscale / an']}
                />
                <Bar dataKey="montantM" radius={[5, 5, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
