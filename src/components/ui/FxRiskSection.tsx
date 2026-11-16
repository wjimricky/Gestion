import React, { useMemo } from 'react';
import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { FxCurrencyReference } from '../../types/finance';
import {
  computeFxRiskPreview,
  FX_CURRENCY_META,
  getResolvedFxRisk,
} from '../../utils/fxRisk';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

const FX_PRESETS = [
  { label: 'Appréciation (−10 %)', value: -0.1 },
  { label: 'Stable (0 %)', value: 0 },
  { label: 'Glissement (+10 %)', value: 0.1 },
  { label: 'Choc devises (+20 %)', value: 0.2 },
  { label: 'Crise change (+35 %)', value: 0.35 },
];

export const FxRiskSection: React.FC = () => {
  const { assumptions, validation, updateFxRisk } = useFinancial();
  const fx = getResolvedFxRisk(assumptions);

  const preview = useMemo(
    () => computeFxRiskPreview(assumptions, fx),
    [assumptions, fx]
  );

  const isShocked = Math.abs(fx.ariaryFluctuationPercent) > 1e-6;
  const currencyMeta = FX_CURRENCY_META[fx.referenceCurrency];

  const currencyOptions = (Object.keys(FX_CURRENCY_META) as FxCurrencyReference[]).map(
    (key) => ({
      value: key,
      label: FX_CURRENCY_META[key].label,
      badge: FX_CURRENCY_META[key].shortLabel,
      description: FX_CURRENCY_META[key].description,
    })
  );

  return (
    <section
      aria-label="Gestion du risque de change Ariary contre devises étrangères"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <ArrowLeftRight
            className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                4d. Gestion du Risque de Change (MGA / EUR · USD)
              </h2>
              <Tooltip
                label="Risque de Change Ariary"
                content="Simule la dépréciation ou l’appréciation de l’Ariary face aux devises étrangères (EUR, USD) sur les intrants agricoles importés (engrais, sachets) et le matériel agricole initial (I₀), avec répercussion dynamique sur la marge globale."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Mesurez la sensibilité de vos marges brutes et nettes aux variations de taux de change sur les intrants et équipements importés.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isShocked && (
            <button
              type="button"
              onClick={() => updateFxRisk({ ariaryFluctuationPercent: 0 })}
              className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Change stable (0 %)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => updateFxRisk({ enabled: !fx.enabled })}
            aria-pressed={fx.enabled}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              fx.enabled
                ? 'border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {fx.enabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {fx.enabled
                ? 'Impact sur marge & I₀ : Actif'
                : 'Simulation isolée (sans impact modèle)'}
            </span>
          </button>
        </div>
      </div>

      {/* Presets + Reference Currency Rate Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FX_PRESETS.map((preset) => {
            const active = Math.abs(fx.ariaryFluctuationPercent - preset.value) < 0.005;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateFxRisk({ ariaryFluctuationPercent: preset.value })}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? preset.value > 0.15
                      ? 'border-rose-500/60 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                      : preset.value > 0
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-xs font-mono tabular-nums flex items-center gap-2 shrink-0">
          <span className="font-sans text-zinc-600 dark:text-zinc-400">Cours simulé :</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {preview.baseRateAr.toLocaleString('fr-FR')}
          </span>
          <span aria-hidden="true" className="text-zinc-400">
            →
          </span>
          <span
            className={`font-bold ${
              fx.ariaryFluctuationPercent > 0.01
                ? 'text-rose-700 dark:text-rose-400'
                : fx.ariaryFluctuationPercent < -0.01
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-zinc-900 dark:text-white'
            }`}
          >
            {preview.shockedRateAr.toLocaleString('fr-FR')} {preview.unitLabel}
          </span>
        </div>
      </div>

      {/* Currency & Exposure Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="fx-currency-select"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Devise de référence
          </label>
          <SelectMenu
            id="fx-currency-select"
            ariaLabel="Devise de référence pour le risque de change"
            value={fx.referenceCurrency}
            onChange={(val) =>
              updateFxRisk({ referenceCurrency: val as FxCurrencyReference })
            }
            options={currencyOptions}
            className="w-full"
          />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            {currencyMeta.description}
          </p>
        </div>

        <FormField
          label="Taux de base EUR (Ar)"
          unit="Ar / 1 EUR"
          tooltip="Cours de référence Ariary / Euro utilisé comme base 0 %."
          error={validation.errors['fxRisk.eurArRateBaseline']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="50"
              min="100"
              value={fx.eurArRateBaseline}
              onChange={(e) =>
                updateFxRisk({ eurArRateBaseline: Number(e.target.value) })
              }
            />
          )}
        </FormField>

        <FormField
          label="Taux de base USD (Ar)"
          unit="Ar / 1 USD"
          tooltip="Cours de référence Ariary / Dollar US pour les intrants agricoles (engrais, sachets)."
          error={validation.errors['fxRisk.usdArRateBaseline']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="50"
              min="100"
              value={fx.usdArRateBaseline}
              onChange={(e) =>
                updateFxRisk({ usdArRateBaseline: Number(e.target.value) })
              }
            />
          )}
        </FormField>

        <FormField
          label="Base engrais / intrants"
          unit={`Ar / kg paddy (${Math.round(fx.importedFertilizerShare * 100)} % importés)`}
          tooltip="Part du coût unitaire exposée aux engrais, produits phytosanitaires et consommables importés par kg de paddy."
          error={validation.errors['fxRisk.fertilizerBaseCostArPerKgPaddy']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="5"
              min="0"
              value={fx.fertilizerBaseCostArPerKgPaddy}
              onChange={(e) =>
                updateFxRisk({
                  fertilizerBaseCostArPerKgPaddy: Number(e.target.value),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Part matériel importée"
          unit={`% de ${formatAriary(fx.baselineMaterielAr, { inMillions: true })}`}
          tooltip="Fraction des équipements initiaux (décortiqueuse, balances, pièces) indexée sur les devises étrangères."
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="5"
              min="0"
              max="100"
              value={Math.round(fx.importedMachineryShare * 100)}
              onChange={(e) =>
                updateFxRisk({
                  importedMachineryShare: Math.max(
                    0,
                    Math.min(1, Number(e.target.value) / 100)
                  ),
                })
              }
            />
          )}
        </FormField>
      </div>

      {/* Ariary Fluctuation Slider */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label
            htmlFor="fx-shock-slider"
            className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Fluctuation de l’Ariary face aux devises ({currencyMeta.shortLabel})</span>
          </label>
          <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
            {fx.ariaryFluctuationPercent > 0 ? '+' : ''}
            {(fx.ariaryFluctuationPercent * 100).toFixed(0)} %{' '}
            {fx.ariaryFluctuationPercent > 0.005
              ? '(Dépréciation MGA · hausse des coûts)'
              : fx.ariaryFluctuationPercent < -0.005
              ? '(Appréciation MGA · détente des coûts)'
              : '(Parité stable)'}
          </span>
        </div>
        <input
          id="fx-shock-slider"
          type="range"
          min={-15}
          max={40}
          step={1}
          value={Math.round(fx.ariaryFluctuationPercent * 100)}
          onChange={(e) =>
            updateFxRisk({ ariaryFluctuationPercent: Number(e.target.value) / 100 })
          }
          className="w-full accent-amber-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          <span>−15 % (MGA fort)</span>
          <span>0 % (Base)</span>
          <span>+15 %</span>
          <span>+30 %</span>
          <span>+40 % (Choc sévère)</span>
        </div>
        {validation.errors['fxRisk.ariaryFluctuationPercent'] && (
          <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
            {validation.errors['fxRisk.ariaryFluctuationPercent']}
          </p>
        )}
      </div>

      {/* Impact KPIs + Sensitivity BarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Impact intrants importés
            </div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                preview.annualImportedInputDeltaAr > 1
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.annualImportedInputDeltaAr < -1
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              {preview.annualImportedInputDeltaAr >= 0 ? '+' : ''}
              {formatAriary(preview.annualImportedInputDeltaAr, { inMillions: true })} / an
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              {preview.fertilizerDeltaArPerKg >= 0 ? '+' : ''}
              {Math.round(preview.fertilizerDeltaArPerKg)} Ar/kg paddy
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Matériel agricole (I₀)
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {formatAriary(preview.shockedMaterielAr, { inMillions: true })}
            </div>
            <div
              className={`text-[11px] font-mono font-semibold tabular-nums mt-0.5 ${
                preview.materielDeltaAr > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.materielDeltaAr < 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Écart : {preview.materielDeltaAr >= 0 ? '+' : ''}
              {formatAriary(preview.materielDeltaAr)}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Marge nette globale (A1)
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {formatPercent(preview.shockedNetMarginRate, 1)}
            </div>
            <div
              className={`text-[11px] font-mono font-semibold tabular-nums mt-0.5 inline-flex items-center gap-1 ${
                preview.netMarginDeltaPts < -0.1
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.netMarginDeltaPts > 0.1
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {preview.netMarginDeltaPts < -0.5 && (
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
              )}
              <span>
                {preview.netMarginDeltaPts >= 0 ? '+' : ''}
                {preview.netMarginDeltaPts.toFixed(2)} pts vs base (brute{' '}
                {preview.grossMarginDeltaPts >= 0 ? '+' : ''}
                {preview.grossMarginDeltaPts.toFixed(2)} pts)
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 h-[165px] min-w-0 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={preview.sensitivitySeries}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.16)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  `${Number(value ?? 0).toFixed(2)} %`,
                  String(name ?? ''),
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(15, 14, 28, 0.94)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#F4F4F5',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar
                dataKey="grossMarginPct"
                name="Marge brute (%)"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              <Bar
                dataKey="netMarginPct"
                name="Marge nette (%)"
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
