import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  ComplianceAdjustmentAction,
  ComplianceStatus,
  runComplianceAudit,
} from '../../utils/complianceAudit';
import { Tooltip } from './Tooltip';

export const ComplianceAuditSection: React.FC = () => {
  const {
    assumptions,
    model,
    setAutoBalanceSeasons,
    updateSeasonField,
    updateVariableCostPerKg,
    updateGeneralField,
    updateInvestmentField,
    notify,
  } = useFinancial();

  const [filter, setFilter] = useState<'all' | 'attention' | 'conforme'>('all');

  const audit = useMemo(
    () => runComplianceAudit(assumptions, model),
    [assumptions, model]
  );

  const visibleRules = useMemo(() => {
    if (filter === 'attention') {
      return audit.rules.filter((r) => r.status !== 'conforme');
    }
    if (filter === 'conforme') {
      return audit.rules.filter((r) => r.status === 'conforme');
    }
    return audit.rules;
  }, [audit.rules, filter]);

  const handleApplyAdjustment = (
    action: ComplianceAdjustmentAction,
    ruleTitle: string
  ) => {
    if (action.type === 'season') {
      updateSeasonField(action.season, action.field, action.value, 'Formulaire');
    } else if (action.type === 'costKg') {
      updateVariableCostPerKg(action.id, action.field, action.value);
    } else if (action.type === 'general') {
      updateGeneralField(action.field, action.value);
    } else if (action.type === 'investment') {
      updateInvestmentField(action.field, action.value);
    } else if (action.type === 'balanceSeasons') {
      setAutoBalanceSeasons(true);
      updateSeasonField('hauteSaison', 'months', action.hsMonths, 'Formulaire');
    }
    notify('success', `Ajustement appliqué pour « ${ruleTitle} ».`);
  };

  const renderStatusIndicator = (status: ComplianceStatus) => {
    if (status === 'conforme') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Conforme</span>
        </span>
      );
    }
    if (status === 'vigilance') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Vigilance</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Non conforme</span>
      </span>
    );
  };

  return (
    <section
      aria-label="Audit de conformité aux standards de la filière rizicole à Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header + Global Compliance Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <ClipboardCheck
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Audit de Conformité — Standards Filière Riz Madagascar
              </h2>
              <Tooltip
                label="Audit de Conformité Filière"
                content="Vérifie automatiquement vos coûts de paddy, tarifs de décorticage, rendements techniques, marges brutes/nettes, fiscalité IR (20 % DGI) et coussin de BFR face aux benchmarks de la filière rizicole malgache."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Contrôle de cohérence sectorielle ({audit.conformeCount} conformes ·{' '}
              {audit.vigilanceCount} à surveiller · {audit.nonConformeCount} non conformes).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Score conformité
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums ${
                  audit.score >= 85
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : audit.score >= 65
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {audit.score} / 100
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div>{renderStatusIndicator(audit.overallStatus)}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="inline-flex items-center p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          {[
            { id: 'all' as const, label: `Tous (${audit.rules.length})` },
            {
              id: 'attention' as const,
              label: `À ajuster (${audit.vigilanceCount + audit.nonConformeCount})`,
            },
            { id: 'conforme' as const, label: `Conformes (${audit.conformeCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-zinc-900 dark:bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      {visibleRules.length === 0 ? (
        <div className="p-5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-600 dark:text-zinc-400">
          Aucun point d’écart ou de vigilance détecté sur ce filtre : vos hypothèses sont alignées sur les standards de la filière.
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {visibleRules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                rule.status === 'non_conforme'
                  ? 'bg-rose-500/[0.04] dark:bg-rose-950/15'
                  : rule.status === 'vigilance'
                  ? 'bg-amber-500/[0.04] dark:bg-amber-950/10'
                  : 'bg-white dark:bg-zinc-950/20'
              }`}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {renderStatusIndicator(rule.status)}
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    · {rule.domainLabel}
                  </span>
                  <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {rule.title}
                  </h3>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {rule.explanation}
                </p>

                {rule.suggestion && (
                  <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                    Piste d’ajustement : {rule.suggestion}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="text-left sm:text-right font-mono tabular-nums text-xs">
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {rule.actualLabel}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Standard : {rule.standardRangeLabel}
                  </div>
                </div>

                {rule.adjustmentAction && rule.adjustmentLabel && (
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyAdjustment(rule.adjustmentAction!, rule.title)
                    }
                    className="min-h-9 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-800 dark:text-indigo-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap no-print"
                  >
                    <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{rule.adjustmentLabel}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
