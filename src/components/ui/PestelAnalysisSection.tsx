import React, { useMemo, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  PestelCategoryKey,
  PestelHorizon,
  PestelImpact,
} from '../../types/project';
import {
  PESTEL_CATEGORIES_META,
  PESTEL_HORIZON_LABELS,
  PESTEL_IMPACT_LABELS,
} from '../../utils/pestelDefaults';
import { SelectMenu, SelectMenuOption } from './SelectMenu';
import { Tooltip } from './Tooltip';
import {
  Globe2,
  Plus,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  MinusCircle,
  X,
  Check,
} from 'lucide-react';

const HORIZON_OPTIONS: SelectMenuOption[] = [
  { value: 'court_terme', label: PESTEL_HORIZON_LABELS.court_terme },
  { value: 'moyen_terme', label: PESTEL_HORIZON_LABELS.moyen_terme },
  { value: 'long_terme', label: PESTEL_HORIZON_LABELS.long_terme },
];

export const PestelAnalysisSection: React.FC = () => {
  const { pestelAnalysis, updatePestelCategory, resetPestelAnalysis } = useFinancial();

  const [selectedFilter, setSelectedFilter] = useState<'all' | PestelCategoryKey>('all');
  const [newTagInputs, setNewTagInputs] = useState<Partial<Record<PestelCategoryKey, string>>>({});

  const summary = useMemo(() => {
    const entries = Object.values(pestelAnalysis);
    const opportunities = entries.filter((e) => e.impact === 'opportunite').length;
    const threats = entries.filter((e) => e.impact === 'menace').length;
    const neutral = entries.filter((e) => e.impact === 'neutre').length;
    const avgSeverity =
      entries.reduce((acc, e) => acc + e.severity, 0) / Math.max(1, entries.length);
    return { opportunities, threats, neutral, avgSeverity };
  }, [pestelAnalysis]);

  const visibleMeta = useMemo(
    () =>
      selectedFilter === 'all'
        ? PESTEL_CATEGORIES_META
        : PESTEL_CATEGORIES_META.filter((m) => m.key === selectedFilter),
    [selectedFilter]
  );

  const handleAddFactor = (cat: PestelCategoryKey, value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const current = pestelAnalysis[cat].keyFactors;
    if (!current.some((f) => f.toLowerCase() === clean.toLowerCase())) {
      updatePestelCategory(cat, { keyFactors: [...current, clean] });
    }
    setNewTagInputs((prev) => ({ ...prev, [cat]: '' }));
  };

  const handleRemoveFactor = (cat: PestelCategoryKey, factor: string) => {
    const current = pestelAnalysis[cat].keyFactors;
    updatePestelCategory(cat, {
      keyFactors: current.filter((f) => f !== factor),
    });
  };

  return (
    <section
      aria-label="Analyse PESTEL marché du riz à Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Globe2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Analyse PESTEL — Marché du Riz à Madagascar
              </h2>
              <Tooltip
                align="left"
                label="Analyse PESTEL"
                content="Consignez les facteurs macro-environnementaux (Politique, Économique, Social, Technologique, Environnemental, Légal) propres au projet actif. Enregistrés localement par projet et inclus dans l’export PDF."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Évaluez l’impact, la criticité (/5), l’horizon et vos plans d’atténuation pour la filière paddy &amp; riz.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums no-print">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {summary.opportunities} Opportunité{summary.opportunities > 1 ? 's' : ''}
          </span>
          <span className="text-zinc-400" aria-hidden="true">·</span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {summary.neutral} Neutre{summary.neutral > 1 ? 's' : ''}
          </span>
          <span className="text-zinc-400" aria-hidden="true">·</span>
          <span className="text-rose-700 dark:text-rose-400 font-semibold">
            {summary.threats} Menace{summary.threats > 1 ? 's' : ''}
          </span>
          <span className="text-zinc-400" aria-hidden="true">·</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
            Criticité moy. {summary.avgSeverity.toFixed(1)}/5
          </span>

          <button
            type="button"
            onClick={resetPestelAnalysis}
            className="min-h-9 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-sans font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Référentiel Madagascar</span>
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div
        role="tablist"
        aria-label="Filtrer les piliers PESTEL"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-print"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedFilter === 'all'}
          onClick={() => setSelectedFilter('all')}
          className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            selectedFilter === 'all'
              ? 'border-indigo-500/45 bg-indigo-600 text-white'
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Tous les piliers (6)
        </button>
        {PESTEL_CATEGORIES_META.map((meta) => {
          const active = selectedFilter === meta.key;
          const entry = pestelAnalysis[meta.key];
          return (
            <button
              key={meta.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedFilter(meta.key)}
              className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? 'border-indigo-500/45 bg-indigo-600 text-white'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="font-mono font-bold">{meta.letter}</span>
              <span>{meta.title}</span>
              <span
                className={`text-[10px] font-mono ${
                  active
                    ? 'text-indigo-100'
                    : entry.impact === 'opportunite'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : entry.impact === 'menace'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-500'
                }`}
              >
                {entry.severity}/5
              </span>
            </button>
          );
        })}
      </div>

      {/* 6 PESTEL Factor Cards */}
      <div
        className={`grid grid-cols-1 ${
          selectedFilter === 'all' ? 'lg:grid-cols-2' : ''
        } gap-4`}
      >
        {visibleMeta.map((meta) => {
          const entry = pestelAnalysis[meta.key];
          const inputVal = newTagInputs[meta.key] || '';
          const unusedSuggestions = meta.suggestedFactors.filter(
            (s) => !entry.keyFactors.some((k) => k.toLowerCase() === s.toLowerCase())
          );

          return (
            <article
              key={meta.key}
              className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141323]/70 space-y-3.5"
            >
              {/* Card Title + Letter Marker */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600/12 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-sm inline-flex items-center justify-center shrink-0">
                    {meta.letter}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {meta.title}
                    </h3>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-[11px] font-semibold inline-flex items-center gap-1 ${
                    entry.impact === 'opportunite'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : entry.impact === 'menace'
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {entry.impact === 'opportunite' ? (
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : entry.impact === 'menace' ? (
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <MinusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{PESTEL_IMPACT_LABELS[entry.impact]}</span>
                </span>
              </div>

              {/* Impact, Severity Rating & Horizon Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Impact Segmented Control */}
                <div>
                  <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Orientation
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#0D0C18]">
                    {(['opportunite', 'neutre', 'menace'] as PestelImpact[]).map((imp) => {
                      const active = entry.impact === imp;
                      const shortLbl =
                        imp === 'opportunite' ? 'Opp.' : imp === 'neutre' ? 'Neutre' : 'Risque';
                      return (
                        <button
                          key={imp}
                          type="button"
                          onClick={() => updatePestelCategory(meta.key, { impact: imp })}
                          aria-pressed={active}
                          className={`min-h-8 px-1.5 rounded-md text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            active
                              ? imp === 'opportunite'
                                ? 'bg-emerald-600 text-white'
                                : imp === 'menace'
                                ? 'bg-rose-600 text-white'
                                : 'bg-zinc-800 dark:bg-zinc-700 text-white'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          {shortLbl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Severity 1-5 Scale */}
                <div>
                  <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Criticité ({entry.severity}/5)
                  </span>
                  <div className="grid grid-cols-5 gap-1 p-0.5 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#0D0C18]">
                    {([1, 2, 3, 4, 5] as const).map((lvl) => {
                      const filled = entry.severity >= lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updatePestelCategory(meta.key, { severity: lvl })}
                          aria-label={`Définir la criticité à ${lvl} sur 5`}
                          aria-pressed={entry.severity === lvl}
                          className={`min-h-8 rounded-md text-[11px] font-mono font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            filled
                              ? entry.severity >= 4
                                ? 'bg-rose-500/80 text-white'
                                : entry.severity === 3
                                ? 'bg-amber-500/80 text-zinc-950'
                                : 'bg-indigo-600 text-white'
                              : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Horizon SelectMenu */}
                <div>
                  <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Horizon
                  </span>
                  <SelectMenu
                    size="sm"
                    value={entry.horizon}
                    onChange={(val) =>
                      updatePestelCategory(meta.key, { horizon: val as PestelHorizon })
                    }
                    options={HORIZON_OPTIONS}
                    ariaLabel={`Horizon pour ${meta.title}`}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Key Factors Tag Editor */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`pestel-tag-${meta.key}`}
                  className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  Facteurs clés consignés ({entry.keyFactors.length})
                </label>

                {entry.keyFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.keyFactors.map((factor) => (
                      <span
                        key={factor}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#1D1B30] text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                      >
                        <span>{factor}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFactor(meta.key, factor)}
                          aria-label={`Retirer le facteur ${factor}`}
                          className="p-0.5 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <input
                    id={`pestel-tag-${meta.key}`}
                    type="text"
                    value={inputVal}
                    onChange={(e) =>
                      setNewTagInputs((prev) => ({ ...prev, [meta.key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFactor(meta.key, inputVal);
                      }
                    }}
                    placeholder="Ajouter un facteur clé (Entrée)..."
                    className="flex-1 min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFactor(meta.key, inputVal)}
                    disabled={!inputVal.trim()}
                    aria-label={`Ajouter un facteur ${meta.title}`}
                    className="min-h-9 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {unusedSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mr-0.5">
                      Suggestions :
                    </span>
                    {unusedSuggestions.slice(0, 2).map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => handleAddFactor(meta.key, sugg)}
                        className="px-1.5 py-0.5 rounded border border-dashed border-zinc-300 dark:border-white/[0.15] text-[10px] text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" aria-hidden="true" />
                        <span>{sugg}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Enriched Text Areas: Context & Mitigation */}
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label
                    htmlFor={`pestel-notes-${meta.key}`}
                    className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Observations &amp; impact marché riz Madagascar
                  </label>
                  <textarea
                    id={`pestel-notes-${meta.key}`}
                    rows={2}
                    value={entry.notes}
                    onChange={(e) =>
                      updatePestelCategory(meta.key, { notes: e.target.value })
                    }
                    placeholder={meta.notesPlaceholder}
                    className="w-full px-2.5 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`pestel-mitigation-${meta.key}`}
                    className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Mesure d’atténuation / Action terrain
                  </label>
                  <textarea
                    id={`pestel-mitigation-${meta.key}`}
                    rows={2}
                    value={entry.mitigationPlan}
                    onChange={(e) =>
                      updatePestelCategory(meta.key, { mitigationPlan: e.target.value })
                    }
                    placeholder={meta.mitigationPlaceholder}
                    className="w-full px-2.5 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end text-[10px] font-mono text-zinc-500 dark:text-zinc-400 gap-1">
                <Check className="w-3 h-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <span>
                  Enregistré ({new Date(entry.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
