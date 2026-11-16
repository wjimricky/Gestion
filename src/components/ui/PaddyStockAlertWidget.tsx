import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  SlidersHorizontal,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  PlusCircle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { getResolvedPaddyStock } from '../../utils/stockSecurity';
import { formatKg, formatPercent } from '../../utils/formatters';

interface PaddyStockAlertWidgetProps {
  onNavigate?: (tabId: string) => void;
}

export const PaddyStockAlertWidget: React.FC<PaddyStockAlertWidgetProps> = ({
  onNavigate,
}) => {
  const { assumptions, paddyStockStatus, updatePaddyStock, notify } = useFinancial();
  const stockConfig = getResolvedPaddyStock(assumptions);
  const [expandedControls, setExpandedControls] = useState(false);

  const isCritique = paddyStockStatus.status === 'critique';
  const isVigilance = paddyStockStatus.status === 'vigilance';
  const isAlert = isCritique || isVigilance;

  const progressPct = Math.min(100, Math.round(paddyStockStatus.thresholdCoverageRatio * 100));

  const handleSimulateLowStock = () => {
    const lowVal = Math.max(2000, Math.round(paddyStockStatus.safetyThresholdKg * 0.6));
    updatePaddyStock({ currentStockKg: lowVal });
  };

  const handleReorderRotation = () => {
    const addKg = paddyStockStatus.recommendedReorderKg || 17200;
    updatePaddyStock({ currentStockKg: stockConfig.currentStockKg + addKg });
    notify(
      'success',
      `Réapprovisionnement enregistré (+${addKg.toLocaleString('fr-FR')} kg de paddy).`
    );
  };

  const containerStyle = isCritique
    ? 'border-rose-500/60 bg-rose-500/[0.08] dark:bg-rose-950/30'
    : isVigilance
    ? 'border-amber-500/55 bg-amber-500/[0.08] dark:bg-amber-950/25'
    : 'border-teal-500/35 bg-white dark:bg-[#11101C]';

  const badgeStyle = isCritique
    ? 'bg-rose-600/15 text-rose-800 dark:text-rose-300 border-rose-500/35'
    : isVigilance
    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35'
    : 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/35';

  const barFillStyle = isCritique
    ? 'bg-rose-500'
    : isVigilance
    ? 'bg-amber-500'
    : 'bg-teal-500';

  return (
    <section
      role={isAlert ? 'alert' : 'region'}
      aria-label="Surveillance du stock de paddy et seuil de sécurité"
      className={`animate-dashboard-card rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-colors duration-200 ${containerStyle}`}
    >
      {/* Top Header & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
              isCritique
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : isVigilance
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400'
            }`}
          >
            {isAlert ? (
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            ) : (
              <PackageCheck className="w-5 h-5" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                {isCritique
                  ? 'Alerte Rupture Stock Paddy : Seuil de sécurité franchi'
                  : isVigilance
                  ? 'Vigilance Stock Paddy : Marge de sécurité serrée'
                  : 'Stock de Paddy : Couverture des commandes sécurisée'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}
              >
                {isCritique ? 'Critique' : isVigilance ? 'Vigilance' : 'Sécurisé'}
              </span>
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
              {isAlert ? (
                <>
                  Stock utilisable net (
                  <span className="font-mono font-bold">{formatKg(paddyStockStatus.usableStockKg)}</span>) inférieur au seuil de sécurité requis (
                  <span className="font-mono font-bold">{formatKg(paddyStockStatus.safetyThresholdKg)}</span>) pour couvrir{' '}
                  <span className="font-mono font-semibold">{formatKg(paddyStockStatus.upcomingOrdersRiceKg)}</span> de commandes riz et {stockConfig.replenishmentLeadDays + stockConfig.safetyMarginDays} jours de cycle.{' '}
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                    Déficit : −{formatKg(paddyStockStatus.shortfallKg)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono font-semibold">{formatKg(paddyStockStatus.usableStockKg)}</span> de paddy utilisable (net de {formatPercent(paddyStockStatus.storageLossRate, 1)} de perte stockage) couvrent {formatKg(paddyStockStatus.upcomingOrdersRiceKg)} de commandes fermes de riz + {paddyStockStatus.daysOfAutonomy.toFixed(1)} jours d’autonomie.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          {isAlert ? (
            <button
              type="button"
              onClick={handleReorderRotation}
              className="min-h-9 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Réapprovisionner (+{formatKg(paddyStockStatus.recommendedReorderKg)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSimulateLowStock}
              className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Tester alerte stock bas
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('hypotheses')}
              className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Stockage &amp; Pertes
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpandedControls((prev) => !prev)}
            aria-expanded={expandedControls}
            className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Paramètres stock</span>
            {expandedControls ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Coverage Progress Bar + Key Mini-Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-1">
        <div className="lg:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
            <span className="font-sans font-medium text-zinc-600 dark:text-zinc-400">
              Niveau de couverture vs seuil de sécurité
            </span>
            <span className="font-bold text-zinc-900 dark:text-white">
              {Math.round(paddyStockStatus.thresholdCoverageRatio * 100)} %
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-white/[0.1] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${barFillStyle}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono tabular-nums">
          <div className="p-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#161526]/70">
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Stock utilisable</div>
            <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
              {formatKg(paddyStockStatus.usableStockKg)}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#161526]/70">
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Seuil de sécurité</div>
            <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
              {formatKg(paddyStockStatus.safetyThresholdKg)}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#161526]/70">
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Besoin commandes</div>
            <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
              {formatKg(paddyStockStatus.paddyNeededForOrdersKg)}
            </div>
          </div>
          <div className="p-2 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#161526]/70">
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Autonomie estimée</div>
            <div
              className={`font-bold mt-0.5 flex items-center gap-1 ${
                isCritique
                  ? 'text-rose-700 dark:text-rose-400'
                  : isVigilance
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-teal-700 dark:text-teal-400'
              }`}
            >
              {!isAlert && <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />}
              <span>{paddyStockStatus.daysOfAutonomy.toFixed(1)} j</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Inline Stock & Order Inputs */}
      {expandedControls && (
        <div className="pt-3 border-t border-zinc-200/80 dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <div>
            <label
              htmlFor="paddy-current-stock-input"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Stock physique paddy actuel (kg)
            </label>
            <input
              id="paddy-current-stock-input"
              type="number"
              min={0}
              step={500}
              value={stockConfig.currentStockKg}
              onChange={(e) =>
                updatePaddyStock({ currentStockKg: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
            />
          </div>

          <div>
            <label
              htmlFor="paddy-upcoming-orders-input"
              className="flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              <ShoppingBag className="w-3 h-3 text-indigo-500" aria-hidden="true" />
              <span>Commandes riz à honorer (kg)</span>
            </label>
            <input
              id="paddy-upcoming-orders-input"
              type="number"
              min={0}
              step={500}
              value={stockConfig.upcomingOrdersRiceKg}
              onChange={(e) =>
                updatePaddyStock({
                  upcomingOrdersRiceKg: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
            />
          </div>

          <div>
            <label
              htmlFor="paddy-lead-days-input"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Délai réapprovisionnement (jours)
            </label>
            <input
              id="paddy-lead-days-input"
              type="number"
              min={1}
              max={60}
              value={stockConfig.replenishmentLeadDays}
              onChange={(e) =>
                updatePaddyStock({
                  replenishmentLeadDays: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
            />
          </div>

          <div>
            <label
              htmlFor="paddy-safety-days-input"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Tampon de sécurité (jours)
            </label>
            <input
              id="paddy-safety-days-input"
              type="number"
              min={1}
              max={45}
              value={stockConfig.safetyMarginDays}
              onChange={(e) =>
                updatePaddyStock({
                  safetyMarginDays: Math.max(1, Number(e.target.value) || 1),
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
            />
          </div>
        </div>
      )}
    </section>
  );
};
