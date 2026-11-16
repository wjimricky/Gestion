import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Table,
} from 'lucide-react';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SECTION_LABEL_CLASSES,
  MENU_SURFACE_CLASSES,
} from './menuTokens';

interface ExportMenuProps {
  onExportExcel: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  onExportSeasonalCsv: () => void;
  onExportCsv5Y: () => void;
  onExportCsv3Y: () => void;
  onExportJson: () => void;
  onExportGoogleSheets?: () => void;
  variant?: 'header' | 'dashboard';
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportExcel,
  onExportPdf,
  isExportingPdf = false,
  onExportDocx,
  isExportingDocx = false,
  onExportSeasonalCsv,
  onExportCsv5Y,
  onExportCsv3Y,
  onExportJson,
  onExportGoogleSheets,
  variant = 'header',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const runAction = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        title="Ouvrir le menu d’export (Excel, PDF, CSV bruts saisonniers & projections, JSON)"
        className={
          variant === 'header'
            ? 'min-h-10 px-2.5 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70'
            : 'min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70'
        }
      >
        <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
        <span>Menu Export</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Options d'exportation"
          className={`absolute right-0 mt-2 w-80 max-w-[92vw] rounded-2xl p-2 z-50 space-y-1.5 ${MENU_SURFACE_CLASSES}`}
        >
          <div className={MENU_SECTION_LABEL_CLASSES}>Données Brutes CSV (Excel / Sheets)</div>

          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onExportSeasonalCsv)}
            className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Table className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  CSV brut — Compte de résultat saisonnier
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Toutes les rubriques HS, BS, Année 1 et ventilation mensuelle (M1–M12) sans formatage
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onExportCsv5Y)}
            className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  CSV brut — Projections 5 ans (60 mois)
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Flux annuels A1–A5 et trésorerie mensuelle M0–M60
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onExportCsv3Y)}
            className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Table className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  CSV — Synthèse CF A1–A3 (36 mois)
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Trajectoires Réaliste &amp; Ambitieuse + Payback
                </div>
              </div>
            </div>
          </button>

          <div className="pt-1 border-t border-zinc-200/80 dark:border-white/[0.08]">
            <div className={MENU_SECTION_LABEL_CLASSES}>Rapports &amp; Sauvegarde</div>
          </div>

          {onExportGoogleSheets && (
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onExportGoogleSheets)}
              className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Exporter vers Google Sheets (Partagé)
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                    Créer un classeur 4 onglets en ligne avec partage Drive
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onExportExcel)}
            className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Classeur Excel complet (.xlsx)
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Toutes les feuilles financières pré-calculées
                </div>
              </div>
            </div>
          </button>

          {onExportDocx && (
            <button
              type="button"
              role="menuitem"
              disabled={isExportingDocx}
              onClick={() => runAction(onExportDocx)}
              className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle} disabled:opacity-60`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {isExportingDocx
                      ? 'Génération Word (.docx)…'
                      : 'Rapport structuré Word (.docx)'}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                    Tableaux de synthèse, P&amp;L 5 ans et analyse textuelle automatisée
                  </div>
                </div>
              </div>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              role="menuitem"
              disabled={isExportingPdf}
              onClick={() => runAction(onExportPdf)}
              className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle} disabled:opacity-60`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <FileDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {isExportingPdf ? 'Génération PDF en cours…' : 'Rapport PDF complet (A4)'}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                    Graphiques Recharts, KPI, CF A1–A3 et PESTEL
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onExportJson)}
            className={`${MENU_ITEM_BASE_CLASSES} px-3 py-2 ${MENU_ITEM_STATE_CLASSES.idle}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <FileJson className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Hypothèses brutes (.json)
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                  Sauvegarde portable réimportable
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
