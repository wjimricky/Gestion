import React, { useMemo } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  computeStockBfrAnalysis,
  getResolvedStockManagement,
  STOCK_OPTIMIZATION_PRESETS,
} from '../../utils/stockManagement';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { Tooltip } from './Tooltip';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Boxes,
  CheckCircle2,
  SlidersHorizontal,
  AlertTriangle,
  Wallet,
  Clock,
  Sparkles,
} from 'lucide-react';

export const StockManagementBfrSection: React.FC = () => {
  const { assumptions, model, validation, updateStockManagement, theme } = useFinancial();
  const isDarkMode = theme === 'dark';
  const stock = getResolvedStockManagement(assumptions);

  const analysis = useMemo(
    () => computeStockBfrAnalysis(assumptions, model, stock),
    [assumptions, model, stock]
  );

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const axisTickColor = isDarkMode ? '#a1a1aa' : '#52525b';

  return (
    <section
      aria-label="Gestion avancée des stocks de paddy et de riz usiné pour optimisation du BFR"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Boxes className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                4f. Gestion des Stocks (Paddy &amp; Riz Usiné) &amp; Optimisation du BFR
              </h2>
              <Tooltip
                label="Stocks & Besoin en Fonds de Roulement"
                content="Modélise la trésorerie immobilisée en stocks de paddy (matière première) et de riz usiné (produit fini), les coûts d'entreposage (Ar/tonne/mois), les alertes de conservation maximale et les gains de BFR libérés."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Pilotez les durées de rétention, stocks de sécurité et coûts de magasinage pour optimiser le besoin en fonds de roulement.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateStockManagement({ enabled: !stock.enabled })}
          aria-pressed={stock.enabled}
          className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 shrink-0 whitespace-nowrap transition-colors ${
            stock.enabled
              ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {stock.enabled ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
          )}
          <span>
            {stock.enabled
              ? 'Coûts stockage → Charges fixes : Actifs'
              : 'Mode simulation seule (activer impact)'}
          </span>
        </button>
      </div>

      {/* Presets d'exploitation des stocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STOCK_OPTIMIZATION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => updateStockManagement(preset.patch)}
            className="text-left p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {preset.label}
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              {preset.description}
            </div>
          </button>
        ))}
      </div>

      {/* Alertes de durée de conservation maximale */}
      {(analysis.paddyShelfLifeAlert || analysis.riceShelfLifeAlert) && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            {analysis.paddyShelfLifeAlert && (
              <div>
                Alerte conservation Paddy : la durée de stockage dépasse le plafond recommandé de {stock.paddyMaxShelfLifeDays} jours (risque d’échauffement/brisure).
              </div>
            )}
            {analysis.riceShelfLifeAlert && (
              <div>
                Alerte conservation Riz Usiné : la durée de conservation dépasse {stock.milledRiceMaxShelfLifeDays} jours (risque d’altération qualité marchande).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paramètres Paddy vs Riz usiné */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloc Paddy */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Stock Paddy (Matière première)
            </span>
            <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
              Stock moyen : {(analysis.weightedAvgPaddyKg / 1000).toFixed(1)} t
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <FormField
              label="Durée HS (jours)"
              unit="j"
              error={validation.errors['stockManagement.paddyHoldingDaysHS']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.paddyHoldingDaysHS}
                  onChange={(e) =>
                    updateStockManagement({ paddyHoldingDaysHS: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField
              label="Durée BS (jours)"
              unit="j"
              error={validation.errors['stockManagement.paddyHoldingDaysBS']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.paddyHoldingDaysBS}
                  onChange={(e) =>
                    updateStockManagement({ paddyHoldingDaysBS: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField label="Stock sécurité (j)" unit="j">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.paddySafetyStockDays}
                  onChange={(e) =>
                    updateStockManagement({ paddySafetyStockDays: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField
              label="Coût stockage (Ar/t·mois)"
              unit="Ar/t/m"
              error={validation.errors['stockManagement.paddyStorageCostArPerTonMonth']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1000"
                  min="0"
                  value={stock.paddyStorageCostArPerTonMonth}
                  onChange={(e) =>
                    updateStockManagement({ paddyStorageCostArPerTonMonth: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField label="Durée max conservation" unit="j max">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="5"
                  min="1"
                  value={stock.paddyMaxShelfLifeDays}
                  onChange={(e) =>
                    updateStockManagement({ paddyMaxShelfLifeDays: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <div className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">BFR Paddy</span>
              <span className="text-xs font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatAriary(analysis.bfrPaddyAr, { inMillions: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Bloc Riz Usiné */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Stock Riz Usiné (Produit fini)
            </span>
            <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
              Stock moyen : {(analysis.weightedAvgRiceKg / 1000).toFixed(1)} t
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <FormField
              label="Durée HS (jours)"
              unit="j"
              error={validation.errors['stockManagement.milledRiceHoldingDaysHS']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.milledRiceHoldingDaysHS}
                  onChange={(e) =>
                    updateStockManagement({ milledRiceHoldingDaysHS: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField
              label="Durée BS (jours)"
              unit="j"
              error={validation.errors['stockManagement.milledRiceHoldingDaysBS']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.milledRiceHoldingDaysBS}
                  onChange={(e) =>
                    updateStockManagement({ milledRiceHoldingDaysBS: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField label="Stock sécurité (j)" unit="j">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1"
                  min="0"
                  value={stock.milledRiceSafetyStockDays}
                  onChange={(e) =>
                    updateStockManagement({ milledRiceSafetyStockDays: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <FormField
              label="Coût stockage (Ar/t·mois)"
              unit="Ar/t/m"
              error={validation.errors['stockManagement.milledRiceStorageCostArPerTonMonth']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="1000"
                  min="0"
                  value={stock.milledRiceStorageCostArPerTonMonth}
                  onChange={(e) =>
                    updateStockManagement({
                      milledRiceStorageCostArPerTonMonth: Number(e.target.value),
                    })
                  }
                />
              )}
            </FormField>
            <FormField label="Durée max conservation" unit="j max">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="5"
                  min="1"
                  value={stock.milledRiceMaxShelfLifeDays}
                  onChange={(e) =>
                    updateStockManagement({ milledRiceMaxShelfLifeDays: Number(e.target.value) })
                  }
                />
              )}
            </FormField>
            <div className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">BFR Riz usiné</span>
              <span className="text-xs font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatAriary(analysis.bfrMilledRiceAr, { inMillions: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Leviers d'optimisation BFR & taux de financement */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <FormField label="Coût financement BFR (% / an)" unit="% / an">
          {(props) => (
            <input
              {...props}
              type="number"
              step="1"
              min="0"
              max="60"
              value={Number((stock.workingCapitalFinancingRateAnnual * 100).toFixed(1))}
              onChange={(e) =>
                updateStockManagement({
                  workingCapitalFinancingRateAnnual: Math.max(0, Number(e.target.value) / 100),
                })
              }
            />
          )}
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Cible réduction durée rotation stocks
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
              −{stock.targetHoldingReductionPct} %
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={stock.targetHoldingReductionPct}
            onChange={(e) =>
              updateStockManagement({ targetHoldingReductionPct: Number(e.target.value) })
            }
            aria-label="Objectif de réduction des délais de rotation de stock en pourcentage"
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={stock.syncCostsToModel}
            onChange={(e) => updateStockManagement({ syncCostsToModel: e.target.checked })}
            className="rounded border-zinc-300 dark:border-zinc-700 accent-indigo-600"
          />
          <span>Injecter les coûts d’entreposage dans les Charges Fixes</span>
        </label>
      </div>

      {/* 4 Tuiles de synthèse BFR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#141322]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <Wallet className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
            <span>BFR Stocks Immobilisé</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
            {formatAriary(analysis.totalStockBfrAr, { inMillions: true })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 mt-0.5">
            Paddy {formatAriary(analysis.bfrPaddyAr, { inMillions: true })} · Riz {formatAriary(analysis.bfrMilledRiceAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Trésorerie BFR libérable (−{stock.targetHoldingReductionPct}%)</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-1">
            +{formatAriary(analysis.bfrCashReleasedAr, { inMillions: true })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            Économie annuelle : {formatAriary(analysis.optimizedCarryingSavingsAr)}/an
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#141322]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <Boxes className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Coût annuel détention (Entrepôt + BFR)</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
            {formatAriary(analysis.totalCarryingCostAr, { inMillions: true })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 mt-0.5">
            Magasinage {formatAriary(analysis.totalAnnualStorageCostAr)} · BFR {formatAriary(analysis.annualWorkingCapitalFinancingCostAr)}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#141322]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Cycle de rétention &amp; Impact RN</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
            {analysis.cashConversionDays} jours en stock
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 mt-0.5">
            {analysis.isSyncedToModel
              ? `Impact RN A1 : ${formatAriary(analysis.withStockCostsNetResultAr - analysis.baselineNetResultAr)}`
              : `Impact simulé : ${formatAriary(analysis.withStockCostsNetResultAr - analysis.baselineNetResultAr)} (${formatPercent(stock.workingCapitalFinancingRateAnnual, 0)} taux BFR)`}
          </div>
        </div>
      </div>

      {/* Graphique BFR & Coût de détention selon la durée de conservation */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/30 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            Sensibilité du BFR et du coût de détention à la durée totale de conservation
          </h3>
        </div>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analysis.curveData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="daysLabel"
                tick={{ fill: axisTickColor, fontSize: 11 }}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: axisTickColor, fontSize: 11 }}
                axisLine={{ stroke: gridStroke }}
                tickFormatter={(v) => `${v} M`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: axisTickColor, fontSize: 11 }}
                axisLine={{ stroke: gridStroke }}
                tickFormatter={(v) => `${v} M`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
                formatter={(val: unknown, name: unknown) => [
                  `${Number(val ?? 0).toFixed(2)} M Ar`,
                  String(name ?? ''),
                ]}
              />
              <Bar
                yAxisId="left"
                dataKey="bfrStockMAr"
                name="BFR immobilisé en stock (M Ar)"
                fill="#0d9488"
                fillOpacity={0.45}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="annualHoldingCostMAr"
                name="Coût annuel stockage + BFR (M Ar)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
