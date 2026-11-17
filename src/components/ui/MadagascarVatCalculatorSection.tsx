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
} from 'recharts';
import { AlertTriangle, Receipt, RotateCcw, ShieldCheck } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  computeMadagascarVatSimulation,
  DEFAULT_VAT_ASSUMPTIONS,
  getResolvedVatAssumptions,
  MADAGASCAR_VAT_PRESETS,
  VAT_OUTPUT_MODE_LABELS,
  VAT_REGIME_LABELS,
} from '../../utils/vatMadagascar';
import { VatRegime, VatRiceOutputMode } from '../../types/finance';
import { Tooltip } from './Tooltip';

export const MadagascarVatCalculatorSection: React.FC = () => {
  const { assumptions, model, unitDisplay, updateVatSettings, theme } = useFinancial();
  const inM = unitDisplay === 'millions';

  const vatSettings = getResolvedVatAssumptions(assumptions);

  const vatResult = useMemo(
    () => computeMadagascarVatSimulation(assumptions, model, vatSettings),
    [assumptions, model, vatSettings]
  );

  const chartData = useMemo(
    () =>
      vatResult.monthlySchedule.map((row) => ({
        label: row.label,
        tvaCollecteeM: Number((row.tvaCollecteeAr / 1e6).toFixed(2)),
        tvaDeductibleM: Number((row.tvaDeductibleAr / 1e6).toFixed(2)),
        tvaNetteM: Number((row.tvaNetteAPayerAr / 1e6).toFixed(2)),
        cfAvantM: Number((row.cashFlowBeforeVatAr / 1e6).toFixed(2)),
        cfApresM: Number((row.cashFlowAfterVatAr / 1e6).toFixed(2)),
      })),
    [vatResult.monthlySchedule]
  );

  const axisTickColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const impactPositive = vatResult.year1VatCashImpactAr >= 0;

  return (
    <section
      aria-label="Calculatrice de TVA agricole Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4 no-print"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              4h. Calculatrice de TVA Agricole Madagascar (Intrants &amp; Extrants · CGI)
            </h2>
            <Tooltip
              align="left"
              label="TVA Agricole Madagascar"
              content="Calcule la TVA collectée sur les ventes (riz usiné/conditionné vs paddy & PPN exonérés), la TVA déductible sur les intrants (carburant, décorticage, sacs, CAPEX), le crédit de TVA reportable et l’impact net sur le flux de trésorerie."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Affinez la précision du flux de trésorerie net en modélisant les exonérations agricoles, le prorata de déduction et la TVA rémanente (taux normal 20 %).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(
              vatSettings.enabled &&
                (vatSettings.applyToFinancialStatements || vatSettings.applyToCashFlow)
            )}
            onClick={() => {
              const nextActive = !(
                vatSettings.applyToFinancialStatements || vatSettings.applyToCashFlow
              );
              updateVatSettings({
                enabled: true,
                applyToCashFlow: nextActive,
                applyToFinancialStatements: nextActive,
              });
            }}
            className={`min-h-8 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              vatSettings.enabled &&
              (vatSettings.applyToFinancialStatements || vatSettings.applyToCashFlow)
                ? 'border-teal-500/50 bg-teal-500/15 text-teal-800 dark:text-teal-300'
                : 'border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {vatSettings.enabled &&
            (vatSettings.applyToFinancialStatements || vatSettings.applyToCashFlow)
              ? 'TVA intégrée aux états financiers & trésorerie'
              : 'Mode simulation seule'}
          </button>

          <button
            type="button"
            onClick={() => updateVatSettings(DEFAULT_VAT_ASSUMPTIONS)}
            className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* CGI Regime Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {MADAGASCAR_VAT_PRESETS.map((preset) => {
          const active =
            vatSettings.regime === preset.patch.regime &&
            vatSettings.riceOutputMode === preset.patch.riceOutputMode;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => updateVatSettings({ enabled: true, ...preset.patch })}
              aria-pressed={active}
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? 'border-teal-500/60 bg-teal-500/10 text-zinc-950 dark:text-white'
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

      {/* DGI 400 M Ar threshold alert */}
      {vatResult.dgiThresholdWarning && (
        <div
          role="status"
          className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{vatResult.dgiThresholdWarning}</span>
        </div>
      )}

      {/* Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-3.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0C18] text-xs">
        <div className="space-y-1">
          <label htmlFor="vat-regime" className="block font-semibold text-zinc-800 dark:text-zinc-200">
            Régime fiscal (CGI)
          </label>
          <select
            id="vat-regime"
            value={vatSettings.regime}
            onChange={(e) =>
              updateVatSettings({ enabled: true, regime: e.target.value as VatRegime })
            }
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#171627] text-xs text-zinc-900 dark:text-zinc-100"
          >
            {(Object.keys(VAT_REGIME_LABELS) as VatRegime[]).map((r) => (
              <option key={r} value={r}>
                {VAT_REGIME_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="vat-output-mode" className="block font-semibold text-zinc-800 dark:text-zinc-200">
            Traitement ventes (Extrants)
          </label>
          <select
            id="vat-output-mode"
            disabled={vatSettings.regime !== 'assujetti_reel'}
            value={vatSettings.riceOutputMode}
            onChange={(e) =>
              updateVatSettings({
                enabled: true,
                riceOutputMode: e.target.value as VatRiceOutputMode,
              })
            }
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#171627] text-xs text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          >
            {(Object.keys(VAT_OUTPUT_MODE_LABELS) as VatRiceOutputMode[]).map((m) => (
              <option key={m} value={m}>
                {VAT_OUTPUT_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="vat-input-rate" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Taux TVA Intrants &amp; CAPEX
            </label>
            <span className="font-mono font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              {((vatSettings.inputVatRate ?? vatSettings.vatRate) * 100).toFixed(0)} %
            </span>
          </div>
          <input
            id="vat-input-rate"
            type="range"
            min={0}
            max={25}
            step={1}
            value={Math.round((vatSettings.inputVatRate ?? vatSettings.vatRate) * 100)}
            onChange={(e) => {
              const rate = Number(e.target.value) / 100;
              updateVatSettings({ enabled: true, inputVatRate: rate, vatRate: rate });
            }}
            className="w-full accent-teal-600 cursor-pointer"
          />
          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
            Carburant, sacs, usinage &amp; matériel (Standard : 20 %, paddy brut 0 %)
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="vat-output-rate" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Taux TVA Produits Finis (Riz)
            </label>
            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
              {((vatSettings.outputVatRate ?? vatSettings.vatRate) * 100).toFixed(0)} %
            </span>
          </div>
          <input
            id="vat-output-rate"
            type="range"
            min={0}
            max={25}
            step={1}
            value={Math.round((vatSettings.outputVatRate ?? vatSettings.vatRate) * 100)}
            onChange={(e) =>
              updateVatSettings({
                enabled: true,
                outputVatRate: Number(e.target.value) / 100,
              })
            }
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
            Riz conditionné / B2B : 20 % · Export / PPN exonéré : 0 %
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="vat-fuel-quota" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Quote-part TVA Gasoil déductible
            </label>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {vatSettings.fuelVatDeductibleQuotaPct} %
            </span>
          </div>
          <input
            id="vat-fuel-quota"
            type="range"
            min={0}
            max={100}
            step={10}
            value={vatSettings.fuelVatDeductibleQuotaPct}
            onChange={(e) =>
              updateVatSettings({
                enabled: true,
                fuelVatDeductibleQuotaPct: Number(e.target.value),
              })
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400">
            Quote-part admise en déduction fiscale sur carburant
          </span>
        </div>

        {vatSettings.regime === 'assujetti_reel' && vatSettings.riceOutputMode === 'mixte_b2b' && (
          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="vat-taxable-share" className="font-semibold text-zinc-800 dark:text-zinc-200">
                Part des ventes assujettie (B2B)
              </label>
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                {vatSettings.taxableRiceSharePct} %
              </span>
            </div>
            <input
              id="vat-taxable-share"
              type="range"
              min={5}
              max={95}
              step={5}
              value={vatSettings.taxableRiceSharePct}
              onChange={(e) =>
                updateVatSettings({
                  enabled: true,
                  taxableRiceSharePct: Number(e.target.value),
                })
              }
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="vat-fixed-share" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Charges fixes soumises à TVA
            </label>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {vatSettings.fixedChargesTaxableSharePct} %
            </span>
          </div>
          <input
            id="vat-fixed-share"
            type="range"
            min={0}
            max={100}
            step={5}
            value={vatSettings.fixedChargesTaxableSharePct}
            onChange={(e) =>
              updateVatSettings({
                enabled: true,
                fixedChargesTaxableSharePct: Number(e.target.value),
              })
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
        </div>

        <div className="flex flex-col justify-center gap-1.5 sm:col-span-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={vatSettings.millingAndBagsVatApplicable}
              onChange={(e) =>
                updateVatSettings({
                  enabled: true,
                  millingAndBagsVatApplicable: e.target.checked,
                })
              }
              className="rounded border-zinc-300 dark:border-zinc-700 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs text-zinc-700 dark:text-zinc-300">
              Prestations usinage &amp; sacs d&apos;emballage facturés avec TVA formelle (20 %)
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={vatSettings.capexVatRecoverable}
              onChange={(e) =>
                updateVatSettings({
                  enabled: true,
                  capexVatRecoverable: e.target.checked,
                })
              }
              className="rounded border-zinc-300 dark:border-zinc-700 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs text-zinc-700 dark:text-zinc-300">
              TVA récupérable sur matériel CAPEX ({formatAriary(assumptions.investment.materielAr, { inMillions: true })})
            </span>
          </label>
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            TVA Collectée (A1)
          </div>
          <div className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
            {formatAriary(vatResult.annualTvaCollecteeAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Prorata déduction : {formatPercent(vatResult.prorataDeduction, 0)}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            TVA Déductible (Intrants + CAPEX)
          </div>
          <div className="mt-1 text-base font-bold text-teal-700 dark:text-teal-400">
            {formatAriary(
              vatResult.annualTvaDeductibleOpexAr + vatResult.capexTvaDeductibleAr,
              { inMillions: inM }
            )}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Dont CAPEX : {formatAriary(vatResult.capexTvaDeductibleAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            TVA Nette à décaisser (DGI)
          </div>
          <div className="mt-1 text-base font-bold text-amber-700 dark:text-amber-400">
            {formatAriary(vatResult.annualTvaNetteVerseeDgiAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {vatResult.yearEndCreditTvaAr > 0
              ? `Crédit reporté : ${formatAriary(vatResult.yearEndCreditTvaAr, { inMillions: true })}`
              : `TVA rémanente : ${formatAriary(vatResult.annualTvaRemanenteNonDeductibleAr, { inMillions: true })}`}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Flux Net Ajusté TVA (A1)
          </div>
          <div
            className={`mt-1 text-base font-bold ${
              vatResult.year1CashFlowAfterVatAr >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatAriary(vatResult.year1CashFlowAfterVatAr, { inMillions: inM })}
          </div>
          <div
            className={`font-sans text-[11px] mt-0.5 flex items-center gap-1 ${
              impactPositive
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            <ShieldCheck className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>
              Écart vs HT : {vatResult.year1VatCashImpactAr >= 0 ? '+' : ''}
              {formatAriary(vatResult.year1VatCashImpactAr, { inMillions: true })}
            </span>
          </div>
        </div>
      </div>

      {/* 12-Month VAT & Net Cash Flow Impact Chart */}
      <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-[#0D0C18] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Dynamique mensuelle TVA &amp; Flux net ajusté (M1–M12, en M Ar)
          </div>
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Barres : TVA Collectée / Déductible · Ligne : Flux net après TVA
          </div>
        </div>

        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: axisTickColor }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisTickColor }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}M`}
              />
              <ReferenceLine y={0} stroke={axisTickColor} strokeOpacity={0.35} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#131222' : '#ffffff',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => [
                  `${Number(value ?? 0).toFixed(2)} M Ar`,
                  String(name ?? ''),
                ]}
              />
              <Bar
                dataKey="tvaCollecteeM"
                name="TVA Collectée"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="tvaDeductibleM"
                name="TVA Déductible"
                fill="#14b8a6"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Line
                type="monotone"
                dataKey="cfApresM"
                name="Flux net après TVA"
                stroke="#f59e0b"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
