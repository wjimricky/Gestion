import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  TrendingUp,
  X,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  generateStrategicRecommendations,
  StrategicRecommendation,
} from '../../utils/strategicAdvisor';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';

interface StrategicAdviceModalProps {
  open: boolean;
  onClose: () => void;
}

export const StrategicAdviceModal: React.FC<StrategicAdviceModalProps> = ({
  open,
  onClose,
}) => {
  const { assumptions, model, setAssumptions, notify } = useFinancial();

  const report = useMemo(
    () => generateStrategicRecommendations(assumptions, model),
    [assumptions, model]
  );

  if (!open) return null;

  const handleApplyRecommendation = (rec: StrategicRecommendation) => {
    setAssumptions((prev) => rec.buildOptimizedAssumptions(prev));
    notify(
      'success',
      `Simulation « ${rec.title} » appliquée (+${formatAriary(rec.deltas.npvAr, { inMillions: true })} de VAN estimée).`
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="strategic-advice-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#11101C] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex items-start justify-between gap-3 bg-zinc-50/70 dark:bg-[#161527]">
          <div className="flex items-start gap-2.5 min-w-0">
            <Compass
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h2
                id="strategic-advice-title"
                className="text-base font-bold text-zinc-900 dark:text-white"
              >
                Conseils Stratégiques &amp; Simulations d’Optimisation
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
                {report.summaryNote}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les conseils stratégiques"
            className="min-h-9 min-w-9 rounded-lg border border-zinc-200 dark:border-white/[0.1] flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Current Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              report.healthVerdict === 'critique'
                ? 'border-rose-500/45 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                : report.healthVerdict === 'optimisable'
                ? 'border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                : 'border-teal-500/45 bg-teal-500/10 text-teal-900 dark:text-teal-200'
            }`}
          >
            {report.healthVerdict === 'critique' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <div className="font-bold">{report.headline}</div>
              <p className="mt-0.5 opacity-90">
                Chaque recommandation exécute une simulation contrefactuelle complète sur votre modèle (scénario de réduction des pertes, transport et achats paddy).
              </p>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-3.5">
            {report.recommendations.map((rec) => {
              const positiveGain = rec.deltas.npvAr > 0;
              return (
                <article
                  key={rec.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    rec.isLossReductionScenario
                      ? 'border-teal-500/50 bg-teal-500/[0.04] dark:bg-teal-500/[0.06]'
                      : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627]/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span
                          className={
                            rec.isLossReductionScenario
                              ? 'text-teal-700 dark:text-teal-300'
                              : 'text-indigo-700 dark:text-indigo-300'
                          }
                        >
                          {rec.badge}
                        </span>
                        <span aria-hidden="true" className="text-zinc-400">
                          ·
                        </span>
                        <span
                          className={
                            rec.priority === 'critique'
                              ? 'text-rose-700 dark:text-rose-400'
                              : rec.priority === 'haute'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-zinc-600 dark:text-zinc-400'
                          }
                        >
                          Priorité {rec.priority}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        {rec.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyRecommendation(rec)}
                      className="min-h-10 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 transition-colors whitespace-nowrap"
                    >
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Appliquer cette simulation</span>
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    <p>
                      <strong className="text-zinc-900 dark:text-zinc-100">Constat :</strong>{' '}
                      {rec.diagnosis}
                    </p>
                    <p>
                      <strong className="text-zinc-900 dark:text-zinc-100">Levier simulé :</strong>{' '}
                      {rec.actionSummary}
                    </p>
                  </div>

                  {/* Before vs After Quantified Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-200/70 dark:border-white/[0.07] font-mono tabular-nums text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#11101C] border border-zinc-200/80 dark:border-white/[0.06]">
                      <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                        Impact VAN (3 ans)
                      </div>
                      <div
                        className={`font-bold mt-0.5 ${
                          positiveGain
                            ? 'text-teal-700 dark:text-teal-400'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {rec.deltas.npvAr >= 0 ? '+' : ''}
                        {formatAriary(rec.deltas.npvAr, { inMillions: true })}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>{formatAriary(rec.before.npvAr, { inMillions: true })}</span>
                        <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>{formatAriary(rec.after.npvAr, { inMillions: true })}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#11101C] border border-zinc-200/80 dark:border-white/[0.06]">
                      <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                        Impact TRI
                      </div>
                      <div className="font-bold mt-0.5 text-teal-700 dark:text-teal-400">
                        {rec.deltas.irrPts >= 0 ? '+' : ''}
                        {rec.deltas.irrPts.toFixed(1)} pts
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>{formatPercent(rec.before.irrValue, 1)}</span>
                        <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>{formatPercent(rec.after.irrValue, 1)}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#11101C] border border-zinc-200/80 dark:border-white/[0.06]">
                      <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                        Marge nette après IR
                      </div>
                      <div className="font-bold mt-0.5 text-indigo-700 dark:text-indigo-300">
                        {rec.deltas.netMarginPts >= 0 ? '+' : ''}
                        {rec.deltas.netMarginPts.toFixed(1)} pts
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <span>{formatPercent(rec.before.netMarginRate, 1)}</span>
                        <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>{formatPercent(rec.after.netMarginRate, 1)}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#11101C] border border-zinc-200/80 dark:border-white/[0.06]">
                      <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                        Gain net A1 / Payback
                      </div>
                      <div className="font-bold mt-0.5 text-zinc-900 dark:text-white">
                        {rec.deltas.annualNetAr >= 0 ? '+' : ''}
                        {formatAriary(rec.deltas.annualNetAr, { inMillions: true })}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Payback {formatMonths(rec.after.paybackMonths)}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-[#161527] text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            Astuce : vous pouvez annuler ou ajuster chaque paramètre dans l’onglet Hypothèses.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-3.5 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#222038]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
