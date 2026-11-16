import React, { useEffect, useState } from 'react';
import { CheckSquare, FileDown, Grid3X3, LayoutDashboard, MessageSquareText, Compass, BarChart3, Table } from 'lucide-react';
import { Modal } from './Modal';
import { DEFAULT_PDF_SECTIONS, PdfExportSectionsConfig } from '../../utils/exportPdf';

interface CustomPdfExportModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  scenarioName: string;
  hasNotes: boolean;
  isExporting: boolean;
  onExport: (sections: PdfExportSectionsConfig) => void;
}

const SECTION_META: Array<{
  key: keyof PdfExportSectionsConfig;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  groupBadge: string;
}> = [
  {
    key: 'dashboard',
    title: 'Tableau de bord — KPIs & Diagnostic sanitaire',
    description: 'Chiffre d’affaires, Marge nette, I₀, Seuil de rentabilité, Payback, VAN/TRI et feux de viabilité.',
    icon: LayoutDashboard,
    groupBadge: 'Tableau de bord',
  },
  {
    key: 'charts',
    title: 'Tableau de bord — Graphiques Recharts',
    description: 'Capture haute résolution des courbes de flux de trésorerie cumulés et P&L saisonnier.',
    icon: BarChart3,
    groupBadge: 'Tableau de bord',
  },
  {
    key: 'incomeStatement',
    title: 'Compte de résultat Année 1 (HS & BS)',
    description: 'Détail des revenus, coûts variables, charges fixes et impôt sur les revenus (IR).',
    icon: Table,
    groupBadge: 'États financiers',
  },
  {
    key: 'projections3Y',
    title: 'Projections de trésorerie triennales (CF A1–A3)',
    description: 'Trajectoires Réaliste & Ambitieuse et flux actualisés pour la VAN.',
    icon: CheckSquare,
    groupBadge: 'États financiers',
  },
  {
    key: 'pestel',
    title: 'Analyse PESTEL (Filière Riz Madagascar)',
    description: 'Synthèse des 6 piliers macro-économiques, scores Risque/Opportunité, criticité et facteurs clés.',
    icon: Compass,
    groupBadge: 'PESTEL',
  },
  {
    key: 'sensitivity',
    title: 'Analyse de Sensibilité 2D (Matrices croisées)',
    description: 'Matrice Prix de vente du riz × Prix du paddy et Matrice Rendement usinage × Rotations/mois.',
    icon: Grid3X3,
    groupBadge: 'Sensibilité',
  },
  {
    key: 'notes',
    title: 'Notes & commentaires d’analyse (Tableau de bord)',
    description: 'Observations textuelles rédigées dans le Tableau de bord pour le comité de décision.',
    icon: MessageSquareText,
    groupBadge: 'Notes',
  },
];

export const CustomPdfExportModal: React.FC<CustomPdfExportModalProps> = ({
  open,
  onClose,
  projectName,
  scenarioName,
  hasNotes,
  isExporting,
  onExport,
}) => {
  const [sections, setSections] = useState<PdfExportSectionsConfig>(DEFAULT_PDF_SECTIONS);

  useEffect(() => {
    if (open) {
      setSections({
        ...DEFAULT_PDF_SECTIONS,
        notes: hasNotes,
      });
    }
  }, [open, hasNotes]);

  const toggleSection = (key: keyof PdfExportSectionsConfig) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyQuickPreset = (preset: 'all' | 'board' | 'strategy' | 'sensitivity_only') => {
    if (preset === 'all') {
      setSections({ ...DEFAULT_PDF_SECTIONS, notes: hasNotes });
    } else if (preset === 'board') {
      setSections({
        dashboard: true,
        charts: true,
        incomeStatement: true,
        projections3Y: true,
        pestel: false,
        sensitivity: true,
        notes: hasNotes,
      });
    } else if (preset === 'strategy') {
      setSections({
        dashboard: true,
        charts: false,
        incomeStatement: false,
        projections3Y: false,
        pestel: true,
        sensitivity: true,
        notes: hasNotes,
      });
    } else {
      setSections({
        dashboard: false,
        charts: false,
        incomeStatement: false,
        projections3Y: false,
        pestel: true,
        sensitivity: true,
        notes: false,
      });
    }
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export PDF personnalisé (A4)"
      description={`Sélectionnez exactement les sections à inclure pour « ${projectName} » (${scenarioName}).`}
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-4">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyQuickPreset('all')}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={() => applyQuickPreset('board')}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Tableau de bord + Sensibilité
            </button>
            <button
              type="button"
              onClick={() => applyQuickPreset('strategy')}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Tableau de bord + PESTEL + Sensibilité
            </button>
          </div>

          <span className="text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">
            {selectedCount} / {SECTION_META.length} sections
          </span>
        </div>

        {/* Section Checkboxes */}
        <div className="space-y-2">
          {SECTION_META.map((item) => {
            const checked = sections[item.key];
            const Icon = item.icon;
            const noteEmptyHint = item.key === 'notes' && !hasNotes;

            return (
              <label
                key={item.key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? 'border-indigo-500/50 bg-indigo-500/[0.07] dark:bg-indigo-500/[0.12]'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSection(item.key)}
                  className="mt-1 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                      <span>{item.title}</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                      {item.groupBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-snug">
                    {item.description}
                    {noteEmptyHint && ' (Aucune note saisie pour le moment.)'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {selectedCount === 0 && (
          <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
            Veuillez sélectionner au moins une section à inclure dans le rapport PDF.
          </p>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || isExporting}
            onClick={() => {
              onExport(sections);
              onClose();
            }}
            className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isExporting ? 'Génération PDF…' : 'Générer le PDF personnalisé'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
