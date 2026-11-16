import React, { useMemo } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { AnimatedNumber } from './AnimatedNumber';
import { Tooltip } from './Tooltip';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

type HealthStatus = 'green' | 'orange' | 'red';

interface HealthCheckItem {
  id: string;
  label: string;
  status: HealthStatus;
  badgeText: string;
  metricDisplay: React.ReactNode;
  thresholdRule: string;
  explanation: string;
  targetTab: string;
}

export const ProjectHealthDiagnosticCard: React.FC<{
  onNavigate: (tabId: string) => void;
}> = ({ onNavigate }) => {
  const { model, assumptions } = useFinancial();

  const { checks, overallStatus, counts, viabilityScore } = useMemo(() => {
    const y1 = model.year1;
    const pb = model.payback;
    const be = model.breakEven;
    const npv = model.npv;

    // 1. Marge nette après IR (< 5% -> Rouge, < 12% -> Orange, >= 12% -> Vert)
    const netMargin = y1.netMarginAfterTaxRate;
    const marginStatus: HealthStatus =
      netMargin < 0.05 ? 'red' : netMargin < 0.12 ? 'orange' : 'green';
    const marginBadge =
      marginStatus === 'red'
        ? netMargin <= 0
          ? 'Critique · Négative'
          : 'Critique (< 5 %)'
        : marginStatus === 'orange'
        ? 'Vigilance (5–12 %)'
        : 'Saine (≥ 12 %)';
    const marginScore =
      netMargin <= 0 ? 0 : Math.min(25, Math.round((netMargin / 0.16) * 25));

    // 2. Délai de récupération (> 24 mois ou non récupéré -> Rouge, 12-24m -> Orange, <= 12m -> Vert)
    const paybackMonths = pb.paybackMonths;
    const isRecovered = pb.isRecoveredWithin36Months && paybackMonths > 0;
    const paybackStatus: HealthStatus =
      !isRecovered || paybackMonths > 24
        ? 'red'
        : paybackMonths > 12
        ? 'orange'
        : 'green';
    const paybackBadge =
      paybackStatus === 'red'
        ? !isRecovered
          ? 'Critique (> 36 mois)'
          : 'Critique (> 24 mois)'
        : paybackStatus === 'orange'
        ? 'Vigilance (12–24 m)'
        : 'Rapide (≤ 12 mois)';
    const paybackScore = !isRecovered
      ? 0
      : paybackMonths <= 6
      ? 25
      : Math.max(2, Math.round(((36 - Math.min(36, paybackMonths)) / 30) * 25));

    // 3. Ratio de liquidité & couverture BFR / charges fixes
    const year1MonthlyFlows = pb.monthlyCashFlows.slice(0, 12);
    const negativeMonthsCount = year1MonthlyFlows.filter((m) => m.netCashFlowAfterTaxAr < 0).length;
    const worstMonthlyCF = year1MonthlyFlows.reduce(
      (min, m) => Math.min(min, m.netCashFlowAfterTaxAr),
      year1MonthlyFlows[0]?.netCashFlowAfterTaxAr ?? 0
    );
    const totalNegativeDrain = year1MonthlyFlows.reduce(
      (sum, m) => (m.netCashFlowAfterTaxAr < 0 ? sum + Math.abs(m.netCashFlowAfterTaxAr) : sum),
      0
    );
    const cashBuffer = assumptions.investment.cashBufferAr;
    const monthlyFixed = Math.max(y1.annualFixedChargesAr / 12, 1);
    const bfrRot = Math.max(model.investment.rotationWorkingCapitalHSAr, 1);
    // Ratio de liquidité disponible = (Cash buffer + pire cash-flow mensuel positif ou absorbé) / Charges fixes mensuelles
    const liquidityCoverageRatio = Math.max(0, (cashBuffer + Math.max(0, worstMonthlyCF)) / monthlyFixed);
    const bufferRatio = cashBuffer / bfrRot;

    let liquidityStatus: HealthStatus = 'green';
    let liquidityBadge = 'Ratio sain';
    let liquidityDesc = `Couverture charges fixes de ${liquidityCoverageRatio.toFixed(2)}x et flux mensuels excédentaires.`;

    if (
      totalNegativeDrain > cashBuffer ||
      liquidityCoverageRatio < 1.0 ||
      be.safetyMarginRate < 0.15 ||
      (negativeMonthsCount > 0 && cashBuffer <= 0)
    ) {
      liquidityStatus = 'red';
      liquidityBadge = 'Ratio risqué';
      liquidityDesc =
        totalNegativeDrain > cashBuffer
          ? `Déficits cumulés (${formatAriary(totalNegativeDrain, { inMillions: true })}) supérieurs au cash buffer.`
          : `Ratio de liquidité faible (${liquidityCoverageRatio.toFixed(2)}x) et marge de sécurité ${formatPercent(be.safetyMarginRate)}.`;
    } else if (
      negativeMonthsCount > 0 ||
      liquidityCoverageRatio < 1.5 ||
      bufferRatio < 0.1 ||
      be.safetyMarginRate < 0.3
    ) {
      liquidityStatus = 'orange';
      liquidityBadge = 'Tension modérée';
      liquidityDesc =
        negativeMonthsCount > 0
          ? `${negativeMonthsCount} mois déficitaire(s) en A1 absorbé(s) par le buffer (${(bufferRatio * 100).toFixed(0)} % du BFR).`
          : `Couverture liquidité ${liquidityCoverageRatio.toFixed(2)}x · marge de sécurité ${formatPercent(be.safetyMarginRate)}.`;
    }
    const liquidityScore =
      liquidityStatus === 'red'
        ? Math.min(10, Math.round(liquidityCoverageRatio * 6))
        : liquidityStatus === 'orange'
        ? 17
        : 25;

    // 4. Viabilité VAN & Point Mort (VAN <= 0 ou Break-even > 100% -> Rouge, BE > 70% -> Orange, sinon Vert)
    const bePct = be.breakEvenPercentOfTarget;
    const npvStatus: HealthStatus =
      npv.npvAr <= 0 || bePct > 1 ? 'red' : bePct > 0.7 ? 'orange' : 'green';
    const npvBadge =
      npvStatus === 'red'
        ? 'Non viable'
        : npvStatus === 'orange'
        ? 'Seuil tendu'
        : 'Créatrice de valeur';
    const npvScore =
      npv.npvAr <= 0 ? 0 : npvStatus === 'orange' ? 16 : 25;

    const totalScore = Math.max(0, Math.min(100, marginScore + paybackScore + liquidityScore + npvScore));

    const items: HealthCheckItem[] = [
      {
        id: 'margin',
        label: 'Marge nette après IR',
        status: marginStatus,
        badgeText: marginBadge,
        metricDisplay: (
          <AnimatedNumber value={netMargin} format={(v) => formatPercent(v, 1)} />
        ),
        thresholdRule: 'Critique < 5 % · Sain ≥ 12 %',
        explanation:
          marginStatus === 'red'
            ? 'Marge trop faible : le moindre choc sur le paddy annule le bénéfice.'
            : marginStatus === 'orange'
            ? 'Marge intermédiaire, sensible aux variations du rendement ou du prix paddy.'
            : 'Coussin bénéficiaire confortable après impôt sur le revenu.',
        targetTab: 'hypotheses',
      },
      {
        id: 'payback',
        label: 'Délai de récupération',
        status: paybackStatus,
        badgeText: paybackBadge,
        metricDisplay: isRecovered ? (
          <AnimatedNumber value={paybackMonths} format={(v) => formatMonths(v)} />
        ) : (
          '> 36 mois'
        ),
        thresholdRule: 'Critique > 24 m · Sain ≤ 12 m',
        explanation:
          paybackStatus === 'red'
            ? 'Immobilisation du capital I₀ supérieure à 24 mois.'
            : paybackStatus === 'orange'
            ? 'Capital récupéré entre 1 et 2 ans avec saisonnalité.'
            : 'Retour sur capital investi rapide dès la première année.',
        targetTab: 'payback',
      },
      {
        id: 'liquidity',
        label: 'Ratio de liquidité',
        status: liquidityStatus,
        badgeText: liquidityBadge,
        metricDisplay: (
          <AnimatedNumber
            value={liquidityCoverageRatio}
            format={(v) => `${v.toFixed(2)} x`}
          />
        ),
        thresholdRule: 'Risqué < 1.0x · Sain ≥ 1.5x',
        explanation: liquidityDesc,
        targetTab: 'breakeven',
      },
      {
        id: 'viability',
        label: 'VAN & Point mort',
        status: npvStatus,
        badgeText: npvBadge,
        metricDisplay: (
          <AnimatedNumber value={npv.npvAr} format={(v) => formatAriary(v, { inMillions: true })} />
        ),
        thresholdRule: `Seuil à ${formatPercent(bePct, 0)} du CA`,
        explanation:
          npvStatus === 'red'
            ? 'VAN négative ou seuil de rentabilité supérieur au CA prévu.'
            : npvStatus === 'orange'
            ? 'Le point mort absorbe plus de 70 % de l’activité prévue.'
            : 'VAN largement positive et point mort rapidement dépassé.',
        targetTab: 'vantri',
      },
    ];

    const redCount = items.filter((i) => i.status === 'red').length;
    const orangeCount = items.filter((i) => i.status === 'orange').length;
    const greenCount = items.filter((i) => i.status === 'green').length;
    const overall: HealthStatus = redCount > 0 ? 'red' : orangeCount > 0 ? 'orange' : 'green';

    return {
      checks: items,
      overallStatus: overall,
      counts: { redCount, orangeCount, greenCount },
      viabilityScore: totalScore,
    };
  }, [model, assumptions]);

  const badgeStyleMap: Record<HealthStatus, string> = {
    green:
      'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    orange:
      'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/35',
    red: 'bg-rose-500/15 text-rose-900 dark:text-rose-300 border-rose-500/35',
  };

  const statusIcon = (status: HealthStatus) => {
    if (status === 'green') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />;
    }
    if (status === 'orange') {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />;
    }
    return <ShieldAlert className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />;
  };

  const overallHeader =
    overallStatus === 'red'
      ? {
          title: 'Diagnostic Sanitaire · Alerte Critique',
          subtitle: `${counts.redCount} indicateur(s) en zone rouge — ajustement des hypothèses recommandé.`,
          badge: 'Risque critique',
        }
      : overallStatus === 'orange'
      ? {
          title: 'Diagnostic Sanitaire · Vigilance Requise',
          subtitle: `${counts.orangeCount} point(s) de vigilance détecté(s) sur les seuils financiers.`,
          badge: 'Sous surveillance',
        }
      : {
          title: 'Diagnostic Sanitaire · Projet Financièrement Sain',
          subtitle: 'Tous les seuils critiques (marge nette, payback, liquidité, VAN) sont au vert.',
          badge: '4 / 4 au vert',
        };

  return (
    <section
      aria-label="Diagnostic sanitaire financier du projet"
      style={{ animationDelay: '190ms' }}
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden transition-colors duration-200"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <Activity
            className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
              overallStatus === 'red'
                ? 'text-rose-600 dark:text-rose-400'
                : overallStatus === 'orange'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {overallHeader.title}
              </h2>
              <Tooltip
                align="left"
                label="Score & Seuils du Diagnostic Sanitaire"
                content="Score de viabilité sur 100 points (25 pts par pilier) : Marge nette (< 5 % rouge), Payback (> 24 mois rouge), Ratio de liquidité (< 1.0x rouge) et VAN / Seuil de rentabilité."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{overallHeader.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-white/[0.04] text-xs font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
            <span>Score :</span>
            <AnimatedNumber value={viabilityScore} format={(v) => `${Math.round(v)}/100`} />
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${badgeStyleMap[overallStatus]}`}
          >
            {statusIcon(overallStatus)}
            <span>{overallHeader.badge}</span>
          </span>
        </div>
      </div>

      {/* 4 Health Check Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-white/[0.07]">
        {checks.map((item) => (
          <div
            key={item.id}
            className="p-4 flex flex-col justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {item.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${badgeStyleMap[item.status]}`}
                >
                  {statusIcon(item.status)}
                  <span>{item.badgeText}</span>
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                  {item.metricDisplay}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {item.thresholdRule}
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {item.explanation}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(item.targetTab)}
              className="no-print self-start text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Analyser le détail</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
