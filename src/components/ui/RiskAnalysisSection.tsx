import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, RotateCcw, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  computeRiskAnalysisSummary,
  DEFAULT_RISK_ANALYSIS_ASSUMPTIONS,
  getResolvedRiskAnalysis,
  RISK_CATEGORY_LABELS,
} from '../../utils/riskAnalysis';
import { OperationalRiskCategory, OperationalRiskItem } from '../../types/finance';
import { formatAriary } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

const CATEGORY_COLORS: Record<OperationalRiskCategory, string> = {
  equipement: '#6366F1',
  rendement: '#F59E0B',
  approvisionnement: '#EF4444',
  stockage: '#14B8A6',
  logistique: '#38BDF8',
  marche: '#A855F7',
};

export const RiskAnalysisSection: React.FC = () => {
  const { assumptions, model, unitDisplay, updateRiskAnalysis, theme, notify } = useFinancial();
  const inM = unitDisplay === 'millions';

  const riskSettings = getResolvedRiskAnalysis(assumptions);

  const summary = useMemo(
    () => computeRiskAnalysisSummary(assumptions, model.investment.cashBufferAr),
    [assumptions, model.investment.cashBufferAr]
  );

  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<OperationalRiskCategory>('equipement');
  const [newProbPct, setNewProbPct] = useState<string>('15');
  const [newImpactMAr, setNewImpactMAr] = useState<string>('5');

  const chartData = useMemo(
    () =>
      [...summary.items]
        .filter((r) => r.active && r.expectedLossAr > 0)
        .sort((a, b) => b.expectedLossAr - a.expectedLossAr)
        .map((r) => ({
          id: r.id,
          name: r.label.length > 34 ? `${r.label.slice(0, 32)}…` : r.label,
          fullName: r.label,
          category: RISK_CATEGORY_LABELS[r.category],
          expectedLossM: Number((r.expectedLossAr / 1e6).toFixed(2)),
          probabilityPct: r.probabilityPct,
          impactM: Number((r.financialImpactAr / 1e6).toFixed(2)),
          color: CATEGORY_COLORS[r.category],
        })),
    [summary.items]
  );

  const updateRiskItem = (id: string, patch: Partial<OperationalRiskItem>) => {
    const nextRisks = riskSettings.risks.map((r) => (r.id === id ? { ...r, ...patch } : r));
    updateRiskAnalysis({ enabled: true, risks: nextRisks });
  };

  const removeRiskItem = (id: string) => {
    const nextRisks = riskSettings.risks.filter((r) => r.id !== id);
    updateRiskAnalysis({ enabled: true, risks: nextRisks });
  };

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    const prob = Math.max(0, Math.min(100, parseFloat(newProbPct) || 0));
    const impactAr = Math.max(0, (parseFloat(newImpactMAr) || 0) * 1_000_000);
    if (!label || impactAr <= 0) {
      notify('error', 'Veuillez saisir un libellé de risque et un impact financier positif.');
      return;
    }

    const created: OperationalRiskItem = {
      id: `risk-custom-${Date.now()}`,
      label,
      category: newCategory,
      probabilityPct: prob,
      financialImpactAr: impactAr,
      mitigationCostAr: Math.round(impactAr * 0.08),
      active: true,
    };

    updateRiskAnalysis({
      enabled: true,
      risks: [...riskSettings.risks, created],
    });
    setNewLabel('');
    setNewProbPct('15');
    setNewImpactMAr('5');
    notify('success', `Risque « ${label} » ajouté à la matrice.`);
  };

  const axisTickColor = theme === 'dark' ? '#a1a1aa' : '#52525b';
  const gridStroke = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const exposureBadge =
    summary.riskExposureIndex === 'eleve'
      ? 'border-rose-500/45 bg-rose-500/12 text-rose-800 dark:text-rose-300'
      : summary.riskExposureIndex === 'modere'
      ? 'border-amber-500/45 bg-amber-500/12 text-amber-800 dark:text-amber-300'
      : 'border-teal-500/45 bg-teal-500/12 text-teal-800 dark:text-teal-300';

  return (
    <section
      aria-label="Module d'analyse des risques opérationnels et perte espérée"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4 no-print"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              17. Analyse des Risques Opérationnels &amp; Perte Espérée (Scénarios Financiers)
            </h2>
            <Tooltip
              align="left"
              label="Perte espérée E(L) = Σ (pᵢ × Impactᵢ)"
              content="Quantifie la perte financière annuelle attendue à partir de la probabilité d'occurrence et de l'impact de chaque aléa opérationnel (panne machine, baisse de rendement, stockage, collecte). Une fois activée, elle ajuste automatiquement les résultats Pessimiste, Réaliste et Optimiste."
            />
            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${exposureBadge}`}>
              Exposition :{' '}
              {summary.riskExposureIndex === 'eleve'
                ? 'Élevée'
                : summary.riskExposureIndex === 'modere'
                ? 'Modérée'
                : 'Maîtrisée'}
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Assignez des probabilités d’occurrence aux risques opérationnels pour calculer la perte espérée pondérée et l’intégrer aux scénarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={riskSettings.integrateIntoScenarios}
            onClick={() =>
              updateRiskAnalysis({
                enabled: true,
                integrateIntoScenarios: !riskSettings.integrateIntoScenarios,
              })
            }
            className={`min-h-8 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              riskSettings.integrateIntoScenarios
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-800 dark:text-indigo-200'
                : 'border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {riskSettings.integrateIntoScenarios
              ? 'Perte espérée intégrée aux scénarios'
              : 'Simulation seule (non déduite)'}
          </button>

          <button
            type="button"
            onClick={() => updateRiskAnalysis(DEFAULT_RISK_ANALYSIS_ASSUMPTIONS)}
            className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* KPI Strip: Expected Loss by Scenario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
        <div className="p-3 rounded-lg border border-rose-500/35 bg-rose-500/[0.07]">
          <div className="font-sans text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            Perte espérée annuelle (Réaliste)
          </div>
          <div className="mt-1 text-base font-bold text-rose-700 dark:text-rose-300">
            −{formatAriary(summary.realisticExpectedLossAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {summary.activeCount} risques actifs · Σ (p × Impact)
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Scénario Pessimiste ({riskSettings.pessimisticMultiplier.toFixed(2)}x)
          </div>
          <div className="mt-1 text-base font-bold text-amber-700 dark:text-amber-400">
            −{formatAriary(summary.pessimisticExpectedLossAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Effet cumulatif / corrélation aléas
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Scénario Optimiste ({Math.round(riskSettings.optimisticResidualRatio * 100)} %)
          </div>
          <div className="mt-1 text-base font-bold text-teal-700 dark:text-teal-400">
            −{formatAriary(summary.optimisticExpectedLossAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Risque résiduel après maîtrise
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
          <div className="font-sans text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Impact unitaire max / Buffer
          </div>
          <div className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
            {formatAriary(summary.maxSingleImpactAr, { inMillions: inM })}
          </div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" aria-hidden="true" />
            <span>
              Cash buffer : {formatAriary(model.investment.cashBufferAr, { inMillions: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Calibration Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#0D0C18] text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="risk-pess-mult" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Multiplicateur Scénario Pessimiste
            </label>
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {riskSettings.pessimisticMultiplier.toFixed(2)}x
            </span>
          </div>
          <input
            id="risk-pess-mult"
            type="range"
            min={1.0}
            max={2.5}
            step={0.1}
            value={riskSettings.pessimisticMultiplier}
            onChange={(e) =>
              updateRiskAnalysis({
                enabled: true,
                pessimisticMultiplier: Number(e.target.value),
              })
            }
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label htmlFor="risk-opt-ratio" className="font-semibold text-zinc-800 dark:text-zinc-200">
              Part résiduelle Scénario Optimiste
            </label>
            <span className="font-mono font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              {Math.round(riskSettings.optimisticResidualRatio * 100)} %
            </span>
          </div>
          <input
            id="risk-opt-ratio"
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(riskSettings.optimisticResidualRatio * 100)}
            onChange={(e) =>
              updateRiskAnalysis({
                enabled: true,
                optimisticResidualRatio: Number(e.target.value) / 100,
              })
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Layout: Risk Table + Ranking Bar Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Editable Risk Register Table */}
        <div className="xl:col-span-7 overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-2.5 px-3 font-semibold">Actif</th>
                <th className="py-2.5 px-3 font-semibold">Risque opérationnel</th>
                <th className="py-2.5 px-3 text-right font-semibold">Prob. (%)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Impact brut (M Ar)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Perte espérée</th>
                <th className="py-2.5 px-2 text-center font-semibold sr-only">Supprimer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {summary.items.map((item) => (
                <tr
                  key={item.id}
                  className={item.active ? '' : 'opacity-50 bg-zinc-50/50 dark:bg-white/[0.01]'}
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={item.active}
                      aria-label={`Activer le risque ${item.label}`}
                      onChange={(e) => updateRiskItem(item.id, { active: e.target.checked })}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3 min-w-[200px]">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {RISK_CATEGORY_LABELS[item.category]}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      aria-label={`Probabilité en pourcentage pour ${item.label}`}
                      value={item.probabilityPct}
                      onChange={(e) =>
                        updateRiskItem(item.id, {
                          probabilityPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-16 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] text-zinc-900 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      aria-label={`Impact financier en millions d'Ariary pour ${item.label}`}
                      value={Number((item.financialImpactAr / 1e6).toFixed(2))}
                      onChange={(e) =>
                        updateRiskItem(item.id, {
                          financialImpactAr: Math.max(0, (Number(e.target.value) || 0) * 1_000_000),
                        })
                      }
                      className="w-20 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] text-zinc-900 dark:text-white"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-rose-700 dark:text-rose-400 whitespace-nowrap">
                    {formatAriary(item.expectedLossAr, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRiskItem(item.id)}
                      aria-label={`Supprimer ${item.label}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Severity / Expected Loss Chart */}
        <div className="xl:col-span-5 p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/40 dark:bg-[#0D0C18] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Hiérarchie des pertes espérées (M Ar / an)
            </div>
            <span className="text-[11px] font-mono text-zinc-500">p × Impact</span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-zinc-500">
              Aucun risque actif sélectionné.
            </div>
          ) : (
            <div className="h-[240px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    tickFormatter={(v) => `${v}M`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={135}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#131222' : '#ffffff',
                      borderColor: theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(value, _name, item) => [
                      `${Number(value ?? 0).toFixed(2)} M Ar (Prob. ${item?.payload?.probabilityPct ?? 0}% × ${item?.payload?.impactM ?? 0} M Ar)`,
                      'Perte espérée',
                    ]}
                  />
                  <Bar dataKey="expectedLossM" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Operational Risk Form */}
      <form
        onSubmit={handleAddRisk}
        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.14] bg-zinc-50/50 dark:bg-[#141322] text-xs items-end"
      >
        <div className="sm:col-span-4 space-y-1">
          <label htmlFor="new-risk-label" className="block font-medium text-zinc-700 dark:text-zinc-300">
            Ajouter un risque opérationnel
          </label>
          <input
            id="new-risk-label"
            type="text"
            placeholder="Ex : Défaillance transformateur Jirama…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-zinc-900 dark:text-white"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label htmlFor="new-risk-cat" className="block font-medium text-zinc-700 dark:text-zinc-300">
            Catégorie
          </label>
          <select
            id="new-risk-cat"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as OperationalRiskCategory)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-zinc-900 dark:text-white"
          >
            {(Object.keys(RISK_CATEGORY_LABELS) as OperationalRiskCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {RISK_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="new-risk-prob" className="block font-medium text-zinc-700 dark:text-zinc-300">
            Probabilité (%)
          </label>
          <input
            id="new-risk-prob"
            type="number"
            min={1}
            max={100}
            value={newProbPct}
            onChange={(e) => setNewProbPct(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] font-mono text-zinc-900 dark:text-white"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="new-risk-impact" className="block font-medium text-zinc-700 dark:text-zinc-300">
            Impact (M Ar)
          </label>
          <input
            id="new-risk-impact"
            type="number"
            min={0.5}
            step={0.5}
            value={newImpactMAr}
            onChange={(e) => setNewImpactMAr(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] font-mono text-zinc-900 dark:text-white"
          />
        </div>

        <div className="sm:col-span-1">
          <button
            type="submit"
            className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center justify-center gap-1 transition-colors"
            title="Ajouter ce risque"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </form>
    </section>
  );
};
