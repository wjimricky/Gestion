import React, { useMemo, useRef, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SelectMenu, SelectMenuOption } from '../ui/SelectMenu';
import {
  Upload,
  RotateCcw,
  Plus,
  FileSpreadsheet,
  FileDown,
  Printer,
  FolderCog,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Search,
  Compass,
  FolderKanban,
  FileUp,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ExportMenu } from '../ui/ExportMenu';

interface HeaderProps {
  onSelectTab: (tab: string) => void;
  onOpenScenarioManager: (mode: 'list' | 'create') => void;
  onOpenExcelImport: () => void;
  onOpenProjectManager: () => void;
  onExportPdf: () => void;
  onOpenCustomPdfModal?: () => void;
  isExportingPdf?: boolean;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenCommandPalette: () => void;
  onStartTour: () => void;
  onOpenGoogleSheetsExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
  onOpenScenarioManager,
  onOpenExcelImport,
  onOpenProjectManager,
  onExportPdf,
  onOpenCustomPdfModal,
  isExportingPdf = false,
  onExportDocx,
  isExportingDocx = false,
  isFullscreen,
  onToggleFullscreen,
  onOpenCommandPalette,
  onStartTour,
  onOpenGoogleSheetsExport,
}) => {
  const {
    projects,
    activeProjectId,
    switchProject,
    savedScenarios,
    activeScenarioId,
    loadScenario,
    resetToDefaults,
    unitDisplay,
    toggleUnitDisplay,
    exportToExcel,
    exportProjectionsToCsv,
    exportFiveYearProjectionsToCsv,
    exportSeasonalIncomeStatementToCsv,
    exportToJson,
    importFromJson,
    validation,
    notify,
  } = useFinancial();

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId);
  const issueCount = Object.keys(validation.errors).length + validation.warnings.length;

  const projectOptions = useMemo<SelectMenuOption[]>(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.excelMeta
          ? `${p.excelMeta.fileName} (${p.excelMeta.selectedSheets.join(', ')})`
          : p.description,
        badge:
          p.source === 'default'
            ? 'Défaut'
            : p.source === 'copy'
            ? 'Copie'
            : 'Excel',
        group:
          p.source === 'default'
            ? 'Projet de référence'
            : p.source === 'copy'
            ? 'Variantes comparatives'
            : 'Projets importés (Excel)',
      })),
    [projects]
  );

  const scenarioOptions = useMemo<SelectMenuOption[]>(
    () =>
      savedScenarios.map((sc) => ({
        value: sc.id,
        label: sc.name,
        description: sc.description,
        group: 'Scénarios du projet actif',
      })),
    [savedScenarios]
  );

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importFromJson(text);
        }
      };
      reader.onerror = () => {
        notify('error', 'Erreur lors de la lecture du fichier sélectionné.');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
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
  };

  const handlePrint = () => {
    window.print();
  };

  const iconBtnClass =
    'min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1D1B31] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0B0A16]/90 backdrop-blur-md no-print pt-safe">
        <div
          className={`${
            isFullscreen ? 'max-w-none' : 'max-w-[1600px]'
          } mx-auto flex items-center justify-between gap-2 sm:gap-3 px-4 lg:px-6 h-16 transition-all duration-150`}
        >
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className="text-left min-h-11 sm:min-h-10 flex flex-col justify-center rounded-xl px-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-400 rounded-sm shrink-0" />
                <span>RizMadagascar</span>
              </span>
              <span className="block text-xs text-zinc-600 dark:text-zinc-400 font-mono leading-none mt-0.5">
                Modèle v6.0
              </span>
            </button>
          </div>

          {/* Zone 2: Redesigned Project Selector & Scenario Switcher (Tablet/Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2 min-w-0">
            {/* Active Project Selector */}
            <SelectMenu
              id="header-project-select"
              ariaLabel="Sélectionner le projet actif"
              value={activeProjectId}
              onChange={switchProject}
              options={projectOptions}
              tone="indigo"
              leadingIcon={
                <FolderKanban
                  className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
                  aria-hidden="true"
                />
              }
              className="w-[165px] lg:w-[215px] xl:w-[240px]"
              footerAction={{
                label: 'Gérer / Renommer les projets',
                icon: <FolderCog className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: onOpenProjectManager,
              }}
            />

            {/* Import Excel Project CTA */}
            <button
              type="button"
              onClick={onOpenExcelImport}
              title="Importer un fichier Excel (.xlsx, .xls, .csv) comme nouveau projet"
              aria-label="Importer un projet Excel"
              className="h-10 px-2.5 lg:px-3 text-xs font-semibold rounded-xl border border-teal-600/35 dark:border-teal-400/30 bg-teal-500/[0.08] dark:bg-teal-500/[0.12] hover:bg-teal-500/[0.15] text-teal-900 dark:text-teal-200 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70"
            >
              <FileUp className="w-3.5 h-3.5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
              <span className="hidden lg:inline">Importer Excel</span>
            </button>

            <span className="hidden xl:block h-5 w-px bg-zinc-200 dark:bg-white/[0.1]" aria-hidden="true" />

            {/* Scenario Selector */}
            <SelectMenu
              id="header-scenario-select"
              ariaLabel="Sélectionner le scénario actif"
              value={activeScenarioId}
              onChange={loadScenario}
              options={scenarioOptions}
              className="w-[140px] lg:w-[175px] xl:w-[195px]"
              footerAction={{
                label: 'Gérer les scénarios',
                icon: <FolderCog className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: () => onOpenScenarioManager('list'),
              }}
            />

            <button
              type="button"
              onClick={() => onOpenScenarioManager('create')}
              title="Sauvegarder les hypothèses courantes comme nouveau scénario (Ctrl+S)"
              aria-label="Sauvegarder le scénario"
              className="h-10 px-2.5 text-xs font-medium rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors inline-flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline">Sauver</span>
            </button>
          </div>

          {/* Zone 3: Actions, Command Palette, Fullscreen & Theme Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {issueCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('hypotheses')}
                title="Voir les alertes de saisie dans Hypothèses"
                className="hidden sm:inline-flex h-10 px-2.5 text-xs font-semibold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{issueCount} alerte{issueCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {/* Command Palette Trigger (Ctrl+K) */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Palette de commandes et navigation rapide (Ctrl+K)"
              aria-label="Ouvrir la palette de commandes (Ctrl+K)"
              className="hidden sm:inline-flex min-h-10 px-2.5 text-xs font-medium rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors items-center gap-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              <Search className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
              <kbd className="hidden 2xl:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0B0A16] text-zinc-600 dark:text-zinc-400">
                Ctrl+K
              </kbd>
            </button>

            <PWAInstallButton />

            {/* Currency Unit Toggle */}
            <button
              type="button"
              onClick={toggleUnitDisplay}
              title="Basculer l'affichage en Ariary bruts ou en Millions d'Ariary (M Ar)"
              aria-label={`Unité d'affichage actuelle : ${unitDisplay === 'standard' ? 'Ariary' : 'Millions Ariary'}. Cliquer pour basculer.`}
              className="min-h-10 px-2.5 text-xs font-mono font-semibold rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors text-zinc-800 dark:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              {unitDisplay === 'standard' ? 'Ar' : 'M Ar'}
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={exportToExcel}
              title="Télécharger le classeur Excel (.xlsx) complet avec toutes les feuilles"
              aria-label="Exporter le modèle en fichier Excel"
              className="min-h-10 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-[#23213D] dark:hover:bg-[#2E2B50] dark:border dark:border-indigo-400/25 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" aria-hidden="true" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Export PDF complet du tableau de bord */}
            <button
              type="button"
              onClick={() => onExportPdf()}
              disabled={isExportingPdf}
              title="Exporter l’intégralité du tableau de bord, graphiques et synthèses en PDF"
              aria-label="Exporter le tableau de bord complet en PDF"
              className="hidden sm:inline-flex min-h-10 px-2.5 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              <FileDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">{isExportingPdf ? 'PDF…' : 'PDF'}</span>
            </button>

            {onOpenCustomPdfModal && (
              <button
                type="button"
                onClick={onOpenCustomPdfModal}
                disabled={isExportingPdf}
                title="Choisir les sections à exporter en PDF (Tableau de bord, PESTEL, Sensibilité…)"
                aria-label="Export PDF personnalisé"
                className="hidden lg:inline-flex min-h-10 px-2.5 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors whitespace-nowrap disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">PDF perso.</span>
              </button>
            )}

            {/* Imprimer le rapport */}
            <button
              type="button"
              onClick={handlePrint}
              title="Ouvrir l’aperçu d’impression dédié (synthèse financière sans menus ni éléments interactifs)"
              aria-label="Imprimer le rapport financier"
              className="hidden sm:inline-flex min-h-10 px-2.5 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#1D1B31] transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70"
            >
              <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
              <span className="hidden 2xl:inline">Imprimer le rapport</span>
            </button>

            {/* Menu d'export unifié (CSV brut compte de résultat saisonnier, 5 ans, 3 ans, Excel, PDF, JSON) */}
            <div className="hidden sm:inline-block">
              <ExportMenu
                onExportExcel={exportToExcel}
                onExportPdf={onExportPdf}
                onOpenCustomPdfModal={onOpenCustomPdfModal}
                isExportingPdf={isExportingPdf}
                onExportDocx={onExportDocx}
                isExportingDocx={isExportingDocx}
                onExportSeasonalCsv={exportSeasonalIncomeStatementToCsv}
                onExportCsv5Y={exportFiveYearProjectionsToCsv}
                onExportCsv3Y={exportProjectionsToCsv}
                onExportJson={handleDownloadJson}
                onExportGoogleSheets={onOpenGoogleSheetsExport}
                variant="header"
              />
            </div>

            {/* JSON Import */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importer un fichier JSON d'hypothèses"
              aria-label="Importer un fichier JSON d'hypothèses"
              className={`hidden xl:inline-flex ${iconBtnClass}`}
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              className="hidden"
              aria-hidden="true"
            />

            {/* Guide interactif */}
            <button
              type="button"
              onClick={onStartTour}
              title="Lancer le guide interactif de découverte"
              aria-label="Lancer le guide interactif"
              className={`hidden sm:inline-flex ${iconBtnClass}`}
            >
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            </button>

            {/* Reset to initial Excel baseline */}
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              title="Réinitialiser toutes les hypothèses aux valeurs initiales du Dashboard v6"
              aria-label="Réinitialiser les hypothèses par défaut"
              className={`hidden sm:inline-flex ${iconBtnClass}`}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Fullscreen / Workspace Maximize Toggle */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-pressed={isFullscreen}
              title={
                isFullscreen
                  ? 'Quitter le mode plein écran (Échap)'
                  : 'Maximiser l’espace de travail (Plein écran)'
              }
              aria-label={
                isFullscreen
                  ? 'Quitter le mode plein écran'
                  : 'Activer le mode plein écran'
              }
              className={`min-h-10 min-w-10 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border transition-colors text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 ${
                isFullscreen
                  ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25'
                  : 'border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1D1B31]'
              }`}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              {isFullscreen && (
                <span className="hidden lg:inline">Quitter plein écran</span>
              )}
            </button>

            {/* Paramètres (Gmail, Audit & Préférences) */}
            <button
              type="button"
              onClick={() => onSelectTab('parametres')}
              title="Paramètres : Intégration Gmail, Journal d’Audit et préférences"
              aria-label="Ouvrir les paramètres"
              className={`hidden sm:inline-flex ${iconBtnClass}`}
            >
              <Settings className="w-4 h-4 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
            </button>

            {/* Theme Toggle (Auto système + manuel) */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Persistent Header Selector Strip (< md) */}
        <div className="md:hidden border-t border-zinc-200 dark:border-white/[0.08] px-3 py-1.5 flex items-center justify-between gap-2 bg-zinc-50/90 dark:bg-[#11101C]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <SelectMenu
              id="header-project-select-mobile"
              ariaLabel="Sélectionner le projet actif"
              value={activeProjectId}
              onChange={switchProject}
              options={projectOptions}
              size="sm"
              tone="indigo"
              leadingIcon={
                <FolderKanban
                  className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
                  aria-hidden="true"
                />
              }
              className="flex-1 min-w-0 max-w-[230px]"
              footerAction={{
                label: 'Gérer / Renommer les projets',
                icon: <FolderCog className="w-3.5 h-3.5" aria-hidden="true" />,
                onClick: onOpenProjectManager,
              }}
            />
            <button
              type="button"
              onClick={() => onOpenScenarioManager('list')}
              title={`Scénario actif : ${activeScenario?.name || 'Scénario'}`}
              aria-label={`Gérer le scénario (${activeScenario?.name || 'Scénario'})`}
              className="min-h-9 px-2 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[115px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75"
            >
              {activeScenario?.name || 'Scénario'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenExcelImport}
              aria-label="Importer un projet Excel"
              className="min-h-9 px-2.5 rounded-xl border border-teal-600/35 dark:border-teal-400/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-900 dark:text-teal-200 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/75"
            >
              <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Importer</span>
            </button>

            {issueCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectTab('hypotheses')}
                aria-label={`${issueCount} alerte(s) de validation`}
                className="min-h-9 px-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-mono tabular-nums">{issueCount}</span>
              </button>
            )}
          </div>
        </div>
      </header>

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
