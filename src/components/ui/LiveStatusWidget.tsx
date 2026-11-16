import React, { useMemo } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { calculateFullModel } from '../../engine/calculator';
import { formatAriary, formatKg, formatMonths, formatPercent } from '../../utils/formatters';
import { AnimatedNumber } from './AnimatedNumber';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  History,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from 'lucide-react';

interface LiveStatusWidgetProps {
  onNavigate: (tabId: string) => void;
  onSaveScenario?: () => void;
}

export const LiveStatusWidget: React.FC<LiveStatusWidgetProps> = ({
  onNavigate,
  onSaveScenario,
}) => {
  const {
    assumptions,
    model,
    kpiAlerts,
    savedScenarios,
    activeScenarioId,
    loadScenario,
    auditLog,
    lastRecalculatedAt,
    unitDisplay,
  } = useFinancial();

  const inM = unitDisplay === 'millions';

  const activeSavedScenario = useMemo(
    () => savedScenarios.find((s) => s.id === activeScenarioId) || savedScenarios[0],
    [savedScenarios, activeScenarioId]
  );

  const savedBaselineModel = useMemo(() => {
    if (!activeSavedScenario) return null;
    return calculateFullModel(activeSavedScenario.assumptions);
  }, [activeSavedScenario]);

  const hasUnsavedChanges = useMemo(() => {
    if (!activeSavedScenario) return false;
    return JSON.stringify(assumptions) !== JSON.stringify(activeSavedScenario.assumptions);
  }, [assumptions, activeSavedScenario]);

  const paddyBreakEvenStatus = useMemo(() => {
    const totalPaddyCollectedKg =
      model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg;
    const isUnprofitableMargin = model.year1.grossMarginRate <= 0;
    const annualBreakEvenPaddyKg = isUnprofitableMargin
      ? Infinity
      : totalPaddyCollectedKg * model.breakEven.breakEvenPercentOfTarget;
    const isBelowBreakEven =
      isUnprofitableMargin || totalPaddyCollectedKg < annualBreakEvenPaddyKg - 0.5;
    const shortfallKg = Number.isFinite(annualBreakEvenPaddyKg)
      ? Math.max(0, annualBreakEvenPaddyKg - totalPaddyCollectedKg)
      : totalPaddyCollectedKg;
    const coverageRatio =
      Number.isFinite(annualBreakEvenPaddyKg) && annualBreakEvenPaddyKg > 0
        ? totalPaddyCollectedKg / annualBreakEvenPaddyKg
        : 0;

    return {
      totalPaddyCollectedKg,
      annualBreakEvenPaddyKg,
      isUnprofitableMargin,
      isBelowBreakEven,
      shortfallKg,
      coverageRatio,
    };
  }, [
    model.basseSaison.totalPaddyKg,
    model.breakEven.breakEvenPercentOfTarget,
    model.hauteSaison.totalPaddyKg,
    model.year1.grossMarginRate,
  ]);

  const lastModifiedEntry = auditLog[0] || null;

  const formattedTime = useMemo(() => {
    try {
      return new Date(lastRecalculatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'À l’instant';
    }
  }, [lastRecalculatedAt]);

  const liveMetrics = useMemo(() => {
    const base = savedBaselineModel;
    const caDelta = base ? model.year1.totalTurnoverAr - base.year1.totalTurnoverAr : 0;
    const netDelta = base
      ? model.year1.netResultAfterTaxAr - base.year1.netResultAfterTaxAr
      : 0;
    const npvDelta = base ? model.npv.npvAr - base.npv.npvAr : 0;
    const irrFinite = Number.isFinite(model.irr.irrValue);
    const baseIrrFinite = base ? Number.isFinite(base.irr.irrValue) : false;
    const irrDeltaPts =
      base && irrFinite && baseIrrFinite ? model.irr.irrValue - base.irr.irrValue : 0;
    const paybackDelta = base
      ? model.payback.paybackMonths - base.payback.paybackMonths
      : 0;
    const beDelta = base
      ? model.breakEven.annualBreakEvenTurnoverAr - base.breakEven.annualBreakEvenTurnoverAr
      : 0;

    return [
      {
        id: 'live-ca',
        label: "Chiffre d'affaires A1",
        value: model.year1.totalTurnoverAr,
        format: (v: number) => formatAriary(v, { inMillions: inM }),
        sub: `${formatPercent(model.year1.grossMarginRate, 1)} marge brute`,
        deltaText:
          Math.abs(caDelta) >= 1
            ? `${caDelta > 0 ? '+' : ''}${formatAriary(caDelta, { inMillions: inM })}`
            : 'Inchangé',
        deltaTone: caDelta > 0 ? 'positive' : caDelta < 0 ? 'negative' : 'neutral',
        alert: false,
        targetTab: 'hypotheses',
      },
      {
        id: 'live-net',
        label: 'Bénéfice net après IR',
        value: model.year1.netResultAfterTaxAr,
        format: (v: number) => formatAriary(v, { inMillions: inM }),
        sub: `Marge nette ${formatPercent(model.year1.netMarginAfterTaxRate, 1)}`,
        deltaText:
          Math.abs(netDelta) >= 1
            ? `${netDelta > 0 ? '+' : ''}${formatAriary(netDelta, { inMillions: inM })}`
            : 'Inchangé',
        deltaTone: netDelta > 0 ? 'positive' : netDelta < 0 ? 'negative' : 'neutral',
        alert: model.year1.netResultAfterTaxAr < 0,
        targetTab: 'projections',
      },
      {
        id: 'live-van',
        label: `VAN (r = ${formatPercent(assumptions.discountRate, 0)})`,
        value: model.npv.npvAr,
        format: (v: number) => formatAriary(v, { inMillions: true }),
        sub: kpiAlerts.items.van.breached
          ? `Sous seuil (${kpiAlerts.items.van.thresholdFormatted})`
          : model.npv.decision,
        deltaText:
          Math.abs(npvDelta) >= 1
            ? `${npvDelta > 0 ? '+' : ''}${formatAriary(npvDelta, { inMillions: true })}`
            : 'Inchangé',
        deltaTone: npvDelta > 0 ? 'positive' : npvDelta < 0 ? 'negative' : 'neutral',
        alert: kpiAlerts.items.van.breached,
        targetTab: 'vantri',
      },
      {
        id: 'live-tri',
        label: 'TRI exact',
        value: irrFinite ? model.irr.irrValue : 0,
        format: (v: number) => (irrFinite ? formatPercent(v, 1) : 'Non calculable'),
        sub: kpiAlerts.items.tri.breached
          ? `Sous cible (${kpiAlerts.items.tri.thresholdFormatted})`
          : `Seuil ${kpiAlerts.items.tri.thresholdFormatted}`,
        deltaText:
          Math.abs(irrDeltaPts) >= 0.0005
            ? `${irrDeltaPts > 0 ? '+' : ''}${(irrDeltaPts * 100).toFixed(1)} pts`
            : 'Inchangé',
        deltaTone: irrDeltaPts > 0 ? 'positive' : irrDeltaPts < 0 ? 'negative' : 'neutral',
        alert: kpiAlerts.items.tri.breached,
        targetTab: 'vantri',
      },
      {
        id: 'live-payback',
        label: 'Payback saisonnier',
        value: model.payback.paybackMonths,
        format: (v: number) =>
          model.payback.isRecoveredWithin36Months ? formatMonths(v) : '> 36 mois',
        sub: kpiAlerts.items.payback.breached
          ? `Hors plafond (${kpiAlerts.items.payback.thresholdFormatted})`
          : `I₀ : ${formatAriary(model.investment.fundsToRaiseAr, { inMillions: true })}`,
        deltaText:
          Math.abs(paybackDelta) >= 0.05
            ? `${paybackDelta > 0 ? '+' : ''}${paybackDelta.toFixed(1)} mois`
            : 'Inchangé',
        deltaTone: paybackDelta < 0 ? 'positive' : paybackDelta > 0 ? 'negative' : 'neutral',
        alert: kpiAlerts.items.payback.breached,
        targetTab: 'payback',
      },
      {
        id: 'live-be',
        label: 'Point mort annuel',
        value: model.breakEven.annualBreakEvenTurnoverAr,
        format: (v: number) => formatAriary(v, { inMillions: inM }),
        sub: `Sécurité ${formatPercent(model.breakEven.safetyMarginRate, 1)}`,
        deltaText:
          Math.abs(beDelta) >= 1
            ? `${beDelta > 0 ? '+' : ''}${formatAriary(beDelta, { inMillions: inM })}`
            : 'Inchangé',
        deltaTone: beDelta < 0 ? 'positive' : beDelta > 0 ? 'negative' : 'neutral',
        alert: model.breakEven.safetyMarginRate < 0,
        targetTab: 'breakeven',
      },
    ];
  }, [assumptions.discountRate, inM, kpiAlerts.items, model, savedBaselineModel]);

  return (
    <section
      aria-label="Live Status — Rentabilité instantanée"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
    >
      {/* Header strip */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
              <span>Live Status — Rentabilité en temps réel</span>
            </span>
            <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">·</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                hasUnsavedChanges
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {hasUnsavedChanges ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Écarts en direct vs scénario sauvegardé</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Synchronisé avec « {activeSavedScenario?.name || 'Réaliste'} »</span>
                </>
              )}
            </span>
            <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">·</span>
            <span className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              Recalcul {formattedTime}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {lastModifiedEntry ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Dernière hypothèse modifiée :{' '}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {lastModifiedEntry.fieldLabel}
                  </strong>{' '}
                  <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    ({lastModifiedEntry.oldValue}
                  </span>{' '}
                  <ArrowRight className="w-3 h-3 inline text-zinc-400" aria-hidden="true" />{' '}
                  <span className="font-mono tabular-nums font-semibold text-teal-700 dark:text-teal-300">
                    {lastModifiedEntry.newValue})
                  </span>
                </span>
              </span>
            ) : (
              <span>
                Toute modification dans Hypothèses ou Simulateur Express met à jour ces 6 indicateurs instantanément, sans sauvegarde préalable.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          {hasUnsavedChanges && activeSavedScenario && (
            <button
              type="button"
              onClick={() => loadScenario(activeSavedScenario.id)}
              title="Annuler les modifications non sauvegardées et revenir au scénario enregistré"
              className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              <span>Rétablir base</span>
            </button>
          )}
          {onSaveScenario && (
            <button
              type="button"
              onClick={onSaveScenario}
              className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                hasUnsavedChanges
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40'
                  : 'border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-800 dark:text-zinc-200'
              }`}
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{hasUnsavedChanges ? 'Sauvegarder l’état' : 'Nouveau snapshot'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('hypotheses')}
            className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Ajuster</span>
          </button>
        </div>
      </div>

      {/* Automatic Paddy Volume vs Break-Even Alert inside Live Status */}
      {paddyBreakEvenStatus.isBelowBreakEven && (
        <div
          role="alert"
          aria-label="Alerte automatique volume paddy sous seuil de rentabilité"
          className="px-4 sm:px-5 py-3 border-b border-rose-500/35 bg-rose-500/[0.08] dark:bg-rose-950/35 flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-rose-950 dark:text-rose-100 min-w-0">
            <AlertTriangle
              className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs leading-relaxed">
              <div className="font-bold">
                Volume de paddy collecté sous le seuil de rentabilité calculé
              </div>
              <p className="text-rose-900/90 dark:text-rose-200/90 mt-0.5 font-mono tabular-nums">
                Collecte annuelle actuelle :{' '}
                <strong>{formatKg(paddyBreakEvenStatus.totalPaddyCollectedKg)}</strong>{' '}
                {paddyBreakEvenStatus.isUnprofitableMargin ? (
                  <span>
                    · Marge brute négative ou nulle (seuil de rentabilité inatteignable aux prix/coûts actuels)
                  </span>
                ) : (
                  <span>
                    · Seuil d’équilibre :{' '}
                    <strong>{formatKg(paddyBreakEvenStatus.annualBreakEvenPaddyKg)}</strong> (manque{' '}
                    <strong>{formatKg(paddyBreakEvenStatus.shortfallKg)}</strong>, couverture{' '}
                    {formatPercent(paddyBreakEvenStatus.coverageRatio, 1)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={() => onNavigate('breakeven')}
              className="min-h-8 px-2.5 py-1 rounded-lg border border-rose-500/40 bg-white/80 dark:bg-[#19121D] hover:bg-white text-[11px] font-semibold text-rose-900 dark:text-rose-200 transition-colors"
            >
              Voir Point Mort
            </button>
            <button
              type="button"
              onClick={() => onNavigate('hypotheses')}
              className="min-h-8 px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-[11px] font-semibold text-white transition-colors"
            >
              Ajuster collecte / prix
            </button>
          </div>
        </div>
      )}

      {/* 6-cell real-time metrics grid with clean 1px dividers */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-y xs:divide-y-0 xs:divide-x divide-zinc-200 dark:divide-white/[0.07]">
        {liveMetrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            onClick={() => onNavigate(metric.targetTab)}
            className={`text-left p-3.5 sm:p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03] focus-visible:outline-none ${
              metric.alert ? 'bg-rose-500/[0.06] dark:bg-rose-950/25' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 truncate">
                {metric.label}
              </span>
              {metric.alert && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 shrink-0">
                  Alerte
                </span>
              )}
            </div>

            <div
              className={`mt-1 text-base sm:text-lg font-bold font-mono tabular-nums truncate ${
                metric.alert
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-zinc-950 dark:text-white'
              }`}
            >
              <AnimatedNumber value={metric.value} format={metric.format} />
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-zinc-600 dark:text-zinc-400 truncate">{metric.sub}</span>
              <span
                className={`font-mono tabular-nums font-semibold shrink-0 ${
                  metric.deltaTone === 'positive'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : metric.deltaTone === 'negative'
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-zinc-500 dark:text-zinc-500'
                }`}
              >
                {metric.deltaText}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
