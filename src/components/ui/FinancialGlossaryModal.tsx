import React, { useMemo, useState } from 'react';
import { BookOpen, Search, Calculator, MapPin, Activity } from 'lucide-react';
import { Modal } from './Modal';
import { useFinancial } from '../../context/FinancialContext';
import {
  FINANCIAL_GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  GlossaryCategory,
} from '../../utils/glossary';

interface FinancialGlossaryModalProps {
  open: boolean;
  onClose: () => void;
}

export const FinancialGlossaryModal: React.FC<FinancialGlossaryModalProps> = ({
  open,
  onClose,
}) => {
  const { model, activeProject } = useFinancial();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | GlossaryCategory>('all');

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FINANCIAL_GLOSSARY_TERMS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.acronym.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.madagascarContext.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Glossaire Financier — Filière Riz Madagascar"
      description={`Définitions, formules et repères contextuels appliqués au projet « ${activeProject.name} ».`}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Search & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un terme (VAN, TRI, BFR, soudure, IR, rendement...)"
              aria-label="Rechercher dans le glossaire financier"
              className="w-full min-h-10 pl-9 pr-3 py-1.5 text-sm rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#141323] text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div
            role="tablist"
            aria-label="Catégories du glossaire"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              className={`min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#141323] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              Tous ({FINANCIAL_GLOSSARY_TERMS.length})
            </button>
            {GLOSSARY_CATEGORIES.map((cat) => {
              const count = FINANCIAL_GLOSSARY_TERMS.filter(
                (t) => t.category === cat
              ).length;
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(cat)}
                  className={`min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600 text-white'
                      : 'border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#141323] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Terms Grid */}
        {filteredTerms.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.12] text-center space-y-1">
            <BookOpen className="w-6 h-6 text-zinc-400 mx-auto" aria-hidden="true" />
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Aucun terme ne correspond à « {query} »
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Essayez un autre mot-clé (ex: VAN, TRI, Seuil, Payback, Soudure, IR).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTerms.map((item) => {
              const live = item.liveMetric ? item.liveMetric(model) : null;
              return (
                <article
                  key={item.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.09] bg-zinc-50/70 dark:bg-[#141322] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-semibold">
                          {item.category}
                        </span>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug mt-0.5">
                          {item.term}
                        </h3>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-md border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0D0C18] text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {item.acronym}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {item.definition}
                    </p>

                    <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#0B0A14] flex items-start gap-2">
                      <Calculator
                        className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <code className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 break-words leading-snug">
                        {item.formula}
                      </code>
                    </div>

                    <div className="p-2.5 rounded-lg border border-teal-500/25 bg-teal-500/[0.06] flex items-start gap-2">
                      <MapPin
                        className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        <span className="font-semibold text-teal-900 dark:text-teal-300">
                          Contexte Madagascar :{' '}
                        </span>
                        {item.madagascarContext}
                      </p>
                    </div>
                  </div>

                  {live && (
                    <div className="pt-2 border-t border-zinc-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                        <span>{live.label}</span>
                      </span>
                      <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                        {live.value}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
