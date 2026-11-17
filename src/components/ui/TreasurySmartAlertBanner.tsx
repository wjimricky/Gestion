import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Landmark,
  PackageMinus,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary } from '../../utils/formatters';
import { getResolvedPaddyStock } from '../../utils/stockSecurity';

interface TreasurySmartAlertBannerProps {
  onOpenTreasury: () => void;
}

export const TreasurySmartAlertBanner: React.FC<TreasurySmartAlertBannerProps> = ({
  onOpenTreasury,
}) => {
  const {
    assumptions,
    treasurySmartAlert,
    treasurySettings,
    setTreasurySettings,
    updateInvestmentField,
    updateSeasonField,
    updatePaddyStock,
    notify,
  } = useFinancial();

  if (!treasurySmartAlert.hasNegativeMonth) {
    return null;
  }

  const {
    negativeMonthsCount,
    negativeMonthsLabels,
    hasConsecutiveNegativeStreak,
    maxConsecutiveMonths,
    streakStartLabel,
    streakEndLabel,
    worstEndingBalanceAr,
    recommendedCashBufferIncreaseAr,
    recommendedCreditLineAr,
    recommendedSellingPriceIncreasePct,
    recommendedSupplierDpoDays,
    recommendedSafetyStockReductionDays,
    hasDsoDelayActive,
    hasSupplierDpoActive,
  } = treasurySmartAlert;

  const resolvedPaddyStock = getResolvedPaddyStock(assumptions);

  const handleBoostCashBuffer = () => {
    const nextBuffer = Math.round(
      assumptions.investment.cashBufferAr + recommendedCashBufferIncreaseAr
    );
    updateInvestmentField('cashBufferAr', nextBuffer);
    notify(
      'success',
      `Plan d’investissement ajusté : Cash buffer porté à ${formatAriary(nextBuffer, { inMillions: true })}.`
    );
  };

  const handleActivateCreditLine = () => {
    setTreasurySettings((prev) => ({
      ...prev,
      creditLineAr: prev.creditLineAr + recommendedCreditLineAr,
    }));
    notify(
      'success',
      `Facilité de caisse activée (+${formatAriary(recommendedCreditLineAr, { inMillions: true })}) dans le plan de trésorerie.`
    );
  };

  const handleApplySupplierDpo = () => {
    setTreasurySettings((prev) => ({
      ...prev,
      supplierDpoDays: recommendedSupplierDpoDays,
    }));
    notify(
      'success',
      `Délai de paiement fournisseurs activé (+${recommendedSupplierDpoDays} jours DPO) pour lisser la trésorerie.`
    );
  };

  const handleReduceSafetyStock = () => {
    const nextMarginDays = Math.max(
      2,
      resolvedPaddyStock.safetyMarginDays - recommendedSafetyStockReductionDays
    );
    updatePaddyStock({ safetyMarginDays: nextMarginDays });
    notify(
      'success',
      `Marge de sécurité stock paddy ajustée à ${nextMarginDays} jours (−${recommendedSafetyStockReductionDays} j) pour libérer du BFR.`
    );
  };

  const handleSwitchToCashSales = () => {
    setTreasurySettings((prev) => ({
      ...prev,
      clientDsoDays: 0,
    }));
    notify(
      'success',
      'Conditions de vente ajustées : règlement clients comptant (DSO 0 j).'
    );
  };

  const handleUpliftSellingPrice = () => {
    const factor = 1 + recommendedSellingPriceIncreasePct / 100;
    const nextHS = Math.round((assumptions.hauteSaison.riceSellingPriceArPerKg * factor) / 50) * 50;
    const nextBS = Math.round((assumptions.basseSaison.riceSellingPriceArPerKg * factor) / 50) * 50;
    updateSeasonField('hauteSaison', 'riceSellingPriceArPerKg', nextHS, 'Simulateur');
    updateSeasonField('basseSaison', 'riceSellingPriceArPerKg', nextBS, 'Simulateur');
    notify(
      'success',
      `Prix de vente riz revalorisé de +${recommendedSellingPriceIncreasePct} % (HS ${nextHS} Ar/kg · BS ${nextBS} Ar/kg).`
    );
  };

  return (
    <section
      role="alert"
      aria-label="Test de résistance et alerte intelligente de trésorerie prévisionnelle"
      className="animate-dashboard-card p-4 rounded-2xl border border-rose-500/60 bg-rose-500/[0.08] dark:bg-rose-950/30 space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-rose-950 dark:text-rose-100">
          <ShieldAlert
            className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold">
                {hasConsecutiveNegativeStreak
                  ? `Test de résistance Trésorerie : ${negativeMonthsCount} mois négatif(s) dont ${maxConsecutiveMonths} consécutifs (${streakStartLabel} → ${streakEndLabel})`
                  : `Test de résistance Trésorerie : solde négatif détecté sur ${negativeMonthsCount} mois (${negativeMonthsLabels.join(', ')})`}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-500/35 text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200">
                Action requise
              </span>
            </div>
            <p className="text-xs text-rose-900/90 dark:text-rose-200/90 mt-1">
              Point bas prévisionnel de{' '}
              <span className="font-mono font-bold tabular-nums">
                {formatAriary(worstEndingBalanceAr, { inMillions: true })}
              </span>
              {treasurySettings.clientDsoDays > 0
                ? ` (avec DSO clients de ${treasurySettings.clientDsoDays} jours)`
                : ''}
              . Activez un délai de paiement fournisseurs, révisez le stock de sécurité ou renforcez la réserve de trésorerie.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTreasury}
          className="min-h-10 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 transition-colors self-start lg:self-auto no-print"
        >
          <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ouvrir Trésorerie</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Actionable Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 no-print">
        {/* Suppliers DPO & Safety Stock Levers */}
        <div className="p-3 rounded-xl border border-rose-500/35 bg-white/80 dark:bg-[#17111A]/80 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Suggestion 1 — Délai fournisseurs, Stock sécurité &amp; Buffer</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">
            Négociez un délai fournisseurs (+{recommendedSupplierDpoDays} j DPO), réduisez le stock de sécurité de {recommendedSafetyStockReductionDays} j ou augmentez le Cash Buffer de{' '}
            <span className="font-mono font-bold tabular-nums">
              +{formatAriary(recommendedCashBufferIncreaseAr, { inMillions: true })}
            </span>.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {(!hasSupplierDpoActive || (treasurySettings.supplierDpoDays ?? 0) < recommendedSupplierDpoDays) && (
              <button
                type="button"
                onClick={handleApplySupplierDpo}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Délai fournisseurs +{recommendedSupplierDpoDays} j</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleReduceSafetyStock}
              className="min-h-9 px-3 py-1.5 rounded-lg border border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <PackageMinus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Stock sécurité −{recommendedSafetyStockReductionDays} j</span>
            </button>
            <button
              type="button"
              onClick={handleBoostCashBuffer}
              className="min-h-9 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 text-xs font-semibold transition-opacity"
            >
              + Cash Buffer ({formatAriary(recommendedCashBufferIncreaseAr, { inMillions: true })})
            </button>
            <button
              type="button"
              onClick={handleActivateCreditLine}
              className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
            >
              Activer crédit BFR
            </button>
          </div>
        </div>

        {/* Sales Conditions Adjustments */}
        <div className="p-3 rounded-xl border border-rose-500/35 bg-white/80 dark:bg-[#17111A]/80 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Suggestion 2 — Encaissements &amp; Tarification</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300">
            {hasDsoDelayActive
              ? `Réduisez le délai client (${treasurySettings.clientDsoDays} j → comptant 0 j) ou revalorisez le prix de vente d’environ +${recommendedSellingPriceIncreasePct} %.`
              : `Revalorisez le tarif de vente (+${recommendedSellingPriceIncreasePct} %) ou exigez des acomptes clients à la commande.`}
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {hasDsoDelayActive && (
              <button
                type="button"
                onClick={handleSwitchToCashSales}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                <span>Paiement comptant (DSO 0 j)</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleUpliftSellingPrice}
              className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors"
            >
              Prix de vente +{recommendedSellingPriceIncreasePct} %
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

