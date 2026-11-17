import React, { useMemo } from 'react';
import { Scale, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { buildMonthlyTreasuryPlan } from '../../utils/treasury';
import { computeGeneralLiquidityRatio } from '../../utils/liquidityAndCampaign';
import { formatAriary } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

export const GeneralLiquidityRatioCard: React.FC = () => {
  const { assumptions, model, treasurySettings, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const treasuryPlan = useMemo(
    () => buildMonthlyTreasuryPlan(model, treasurySettings),
    [model, treasurySettings]
  );

  const liquidity = useMemo(
    () =>
      computeGeneralLiquidityRatio(assumptions, model, treasuryPlan, treasurySettings),
    [assumptions, model, treasuryPlan, treasurySettings]
  );

  const badgeStyles =
    liquidity.status === 'solide'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
      : liquidity.status === 'equilibre'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
      : 'border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-300';

  const StatusIcon =
    liquidity.status === 'solide'
      ? CheckCircle2
      : liquidity.status === 'equilibre'
      ? AlertTriangle
      : ShieldAlert;

  return (
    <section
      aria-label="Indicateur de Ratio de Liquidité Générale"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Scale
                className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Ratio de Liquidité Générale
              </h2>
              <Tooltip
                label="Ratio de Liquidité Générale"
                content="Compare les Actifs Courants (trésorerie disponible, valeur du stock de paddy et créances clients) aux Passifs Courants (dettes fournisseurs, salaires saisonniers dus et charges/IR court terme)."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Capacité immédiate du projet à couvrir ses engagements à court terme.
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 ${badgeStyles}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{liquidity.statusLabel}</span>
          </span>
        </div>

        {/* Hero Ratio Readout + Net Working Capital */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526]">
          <div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Ratio Actifs / Passifs CT
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {liquidity.ratio.toFixed(2)}x
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Fonds de Roulement Net
            </div>
            <div
              className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                liquidity.netWorkingCapitalAr >= 0
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {liquidity.netWorkingCapitalAr >= 0 ? '+' : ''}
              {formatAriary(liquidity.netWorkingCapitalAr, { inMillions: inM })}
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Current Assets vs Current Liabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141322] space-y-2">
          <div className="font-semibold text-teal-800 dark:text-teal-300 flex items-center justify-between">
            <span>Actifs Courants</span>
            <span className="font-mono tabular-nums">
              {formatAriary(liquidity.totalCurrentAssetsAr, { inMillions: inM })}
            </span>
          </div>
          <dl className="space-y-1 font-mono tabular-nums text-[11px] text-zinc-700 dark:text-zinc-300">
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">Trésorerie moyenne :</dt>
              <dd>{formatAriary(liquidity.cashBalanceAr, { inMillions: inM })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">Stock paddy valorisé :</dt>
              <dd>{formatAriary(liquidity.paddyStockValueAr, { inMillions: inM })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">Créances clients (DSO) :</dt>
              <dd>{formatAriary(liquidity.tradeReceivablesAr, { inMillions: inM })}</dd>
            </div>
            {liquidity.vatApplied && (
              <div className="flex justify-between gap-2 text-teal-700 dark:text-teal-300">
                <dt className="font-sans">Crédit TVA à reporter :</dt>
                <dd>{formatAriary(liquidity.vatCreditReceivableAr, { inMillions: inM })}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141322] space-y-2">
          <div className="font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between">
            <span>Passifs Courants</span>
            <span className="font-mono tabular-nums">
              {formatAriary(liquidity.totalCurrentLiabilitiesAr, { inMillions: inM })}
            </span>
          </div>
          <dl className="space-y-1 font-mono tabular-nums text-[11px] text-zinc-700 dark:text-zinc-300">
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">Dettes fournisseurs CT :</dt>
              <dd>{formatAriary(liquidity.shortTermSupplierDebtAr, { inMillions: inM })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">Salaires saisonniers dus :</dt>
              <dd>{formatAriary(liquidity.seasonalSalariesDueAr, { inMillions: inM })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-sans text-zinc-500">IR &amp; charges courantes :</dt>
              <dd>{formatAriary(liquidity.currentTaxAndFixedLiabilitiesAr, { inMillions: inM })}</dd>
            </div>
            {liquidity.vatApplied && (
              <div className="flex justify-between gap-2 text-amber-700 dark:text-amber-300">
                <dt className="font-sans">TVA nette à payer (DGI) :</dt>
                <dd>{formatAriary(liquidity.vatPayableDueAr, { inMillions: inM })}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
};
