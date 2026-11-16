import React, { useMemo, useRef, useState } from 'react';
import { NAV_ITEMS } from './navItems';
import { useFinancial } from '../../context/FinancialContext';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SelectMenu, SelectMenuOption } from '../ui/SelectMenu';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SECTION_LABEL_CLASSES,
} from '../ui/menuTokens';
import {
  Menu,
  FolderCog,
  Plus,
  Download,
  Upload,
  Printer,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  FileDown,
  Search,
  Compass,
  FolderKanban,
  FileUp,
  ChevronRight,
} from 'lucide-react';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeToggle } from '../ui/ThemeToggle';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenScenarioManager: (mode: 'list' | 'create') => void;
  onOpenExcelImport: () => void;
  onOpenProjectManager: () => void;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  onOpenCommandPalette: () => void;
  onStartTour: () => void;
  onOpenGoogleSheetsExport?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenScenarioManager,
  onOpenExcelImport,
  onOpenProjectManager,
  onExportPdf,
  isExportingPdf = false,
  onExportDocx,
  isExportingDocx = false,
  onOpenCommandPalette,
  onStartTour,
  onOpenGoogleSheetsExport,
}) => {
  const {
    projects,
    activeProjectId,
    switchProject,
    exportToExcel,
    exportSeasonalIncomeStatementToCsv,
    exportToJson,
    importFromJson,
    resetToDefaults,
    notify,
  } = useFinancial();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerNavRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const primaryIds = ['dashboard', 'hypotheses', 'scenarios'];
  const primaryItems = NAV_ITEMS.filter((item) => primaryIds.includes(item.id));
  const isMoreActive = !primaryIds.includes(currentTab);

  const projectOptions = useMemo<SelectMenuOption[]>(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        badge: p.source === 'default' ? 'Défaut' : p.source === 'copy' ? 'Copie' : 'Excel',
        group: p.source === 'default' ? 'Référence' : p.source === 'copy' ? 'Variantes' : 'Projets Excel',
      })),
    [projects]
  );

  const handleDrawerNavKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowDown') nextIdx = (idx + 1) % NAV_ITEMS.length;
    else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = NAV_ITEMS.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      e.stopPropagation();
      drawerNavRefs.current[nextIdx]?.focus();
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = exportToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hypotheses_riz_madagascar_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Fichier JSON exporté.');
    setDrawerOpen(false);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importFromJson(text);
          setDrawerOpen(false);
        }
      };
      reader.onerror = () => {
        notify('error', 'Erreur lors de la lecture du fichier JSON.');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const actionBtnClass =
    'min-h-12 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] active:scale-[0.99] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75';

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0B0A16]/95 backdrop-blur-md pb-safe no-print"
      >
        <div className="grid grid-cols-4 gap-1 px-2 pt-1.5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-12 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 active:scale-[0.98] ${
                  isActive
                    ? MENU_ITEM_STATE_CLASSES.active
                    : MENU_ITEM_STATE_CLASSES.idle
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate max-w-full leading-none">{item.shortLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className={`min-h-12 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 active:scale-[0.98] ${
              isMoreActive
                ? MENU_ITEM_STATE_CLASSES.active
                : MENU_ITEM_STATE_CLASSES.idle
            }`}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="leading-none">Plus</span>
          </button>
        </div>
      </nav>

      {/* Mobile Full Modules & Actions Drawer */}
      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Projets, Modules & Outils"
        description="Changez de projet, importez un classeur Excel ou naviguez entre les analyses."
      >
        <div className="space-y-5">
          {/* Project Switcher & Excel Import */}
          <div className="p-3.5 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Projet actif
            </div>
            <SelectMenu
              id="mobile-project-select"
              ariaLabel="Changer de projet actif"
              value={activeProjectId}
              onChange={(val) => {
                switchProject(val);
              }}
              options={projectOptions}
              tone="indigo"
              leadingIcon={<FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenExcelImport();
                }}
                className="min-h-11 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <FileUp className="w-4 h-4" aria-hidden="true" />
                <span>Importer Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenProjectManager();
                }}
                className={actionBtnClass}
              >
                <FolderCog className="w-4 h-4" aria-hidden="true" />
                <span>Gérer projets</span>
              </button>
            </div>
          </div>

          <div>
            <div className={MENU_SECTION_LABEL_CLASSES}>Tous les modules d’analyse</div>
            <div className="grid grid-cols-1 gap-1 mt-1" role="menu" aria-label="Modules d’analyse">
              {NAV_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      drawerNavRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectTab(item.id);
                      setDrawerOpen(false);
                    }}
                    onKeyDown={(e) => handleDrawerNavKeyDown(e, idx)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`${MENU_ITEM_BASE_CLASSES} min-h-12 px-3 py-2.5 ${
                      isActive ? MENU_ITEM_STATE_CLASSES.active : MENU_ITEM_STATE_CLASSES.idle
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-tight truncate">{item.label}</div>
                        <div
                          className={`text-xs mt-0.5 truncate ${
                            isActive
                              ? 'text-indigo-900/75 dark:text-zinc-300'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] space-y-2">
            <div className={MENU_SECTION_LABEL_CLASSES}>Scénarios &amp; Exports</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenScenarioManager('create');
                }}
                className={actionBtnClass}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Sauvegarder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenScenarioManager('list');
                }}
                className={actionBtnClass}
              >
                <FolderCog className="w-4 h-4" aria-hidden="true" />
                <span>Gérer scénarios</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportToExcel();
                  setDrawerOpen(false);
                }}
                className="min-h-12 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                disabled={isExportingPdf}
                onClick={() => {
                  setDrawerOpen(false);
                  window.setTimeout(() => onExportPdf(), 160);
                }}
                className={`${actionBtnClass} disabled:opacity-60`}
              >
                <FileDown className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                <span>{isExportingPdf ? 'Export PDF…' : 'Export PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  window.setTimeout(() => window.print(), 150);
                }}
                className={actionBtnClass}
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSeasonalIncomeStatementToCsv();
                  setDrawerOpen(false);
                }}
                className={actionBtnClass}
              >
                <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <span>CSV Résultat Saisonnier</span>
              </button>

              <button type="button" onClick={handleDownloadJson} className={actionBtnClass}>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={actionBtnClass}
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Import JSON</span>
              </button>

              {onExportDocx && (
                <button
                  type="button"
                  disabled={isExportingDocx}
                  onClick={() => {
                    setDrawerOpen(false);
                    window.setTimeout(() => onExportDocx(), 120);
                  }}
                  className={`col-span-2 ${actionBtnClass} disabled:opacity-60`}
                >
                  <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span>{isExportingDocx ? 'Export Word…' : 'Rapport Word structuré (.docx)'}</span>
                </button>
              )}

              {onOpenGoogleSheetsExport && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenGoogleSheetsExport();
                  }}
                  className={`col-span-2 ${actionBtnClass}`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Exporter vers Google Sheets</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full min-h-12 px-3 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>Palette de commandes rapide</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  window.setTimeout(() => onStartTour(), 140);
                }}
                className={`w-full ${actionBtnClass}`}
              >
                <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Lancer le guide interactif</span>
              </button>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323]">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Apparence / Thème
                </span>
                <ThemeToggle />
              </div>

              <PWAInstallButton compact />

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setConfirmResetOpen(true);
                }}
                className="w-full min-h-12 px-3 py-2 rounded-xl border border-red-300 dark:border-red-900/60 hover:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Réinitialiser aux valeurs par défaut</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={resetToDefaults}
        title="Réinitialiser les hypothèses ?"
        message="Toutes vos modifications non sauvegardées dans un scénario seront remplacées par les valeurs initiales du Dashboard v6."
        confirmLabel="Réinitialiser"
        variant="warning"
      />
    </>
  );
};
