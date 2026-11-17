import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { NAV_ITEMS } from './components/layout/navItems';
import { ToastContainer } from './components/ui/ToastContainer';
import { ScenarioManagerModal } from './components/ui/ScenarioManagerModal';
import { CommandPaletteModal } from './components/ui/CommandPaletteModal';
import { ExcelImportModal } from './components/ui/ExcelImportModal';
import { ProjectManagerModal } from './components/ui/ProjectManagerModal';
import { ProjectComparatorModal } from './components/ui/ProjectComparatorModal';
import { FinancialGlossaryModal } from './components/ui/FinancialGlossaryModal';
import { GoogleSheetsExportModal } from './components/ui/GoogleSheetsExportModal';
import { CustomPdfExportModal } from './components/ui/CustomPdfExportModal';
import { DashboardChartExportModal } from './components/ui/DashboardChartExportModal';
import { OfflineIndicator } from './components/ui/OfflineIndicator';
import { InteractiveTour, TOUR_STORAGE_KEY } from './components/ui/InteractiveTour';
import { TooltipProvider } from './components/ui/Tooltip';
import { FirestoreErrorBoundary } from './components/ui/FirestoreErrorBoundary';
import { GeminiAdvisorDrawer } from './components/ui/GeminiAdvisorDrawer';
import { MadagascarRiceMapSection } from './components/maps/MadagascarRiceMapSection';
import { RiceMill3DScene } from './components/three/RiceMill3DScene';
import { formatAriary, formatMonths, formatPercent } from './utils/formatters';
import { exportDashboardToPdf, PdfExportSectionsConfig } from './utils/exportPdf';
import { exportModelToDocx } from './utils/exportDocx';
import {
  exportExecutiveSummaryMarkdown,
  exportStructuredCooperativeJson,
} from './utils/exportMarkdownAndJson';
import { buildMonthlyTreasuryPlan } from './utils/treasury';
import { computeGeneralLiquidityRatio } from './utils/liquidityAndCampaign';
import { AlertTriangle, X } from 'lucide-react';
import { DashboardTab } from './components/tabs/DashboardTab';
import { HypothesesTab } from './components/tabs/HypothesesTab';
import { PartnersEcosystemTab } from './components/tabs/PartnersEcosystemTab';
import { ConcurrenceTab } from './components/tabs/ConcurrenceTab';
import { ScenariosTab } from './components/tabs/ScenariosTab';
import { SensibilityTab } from './components/tabs/SensibilityTab';
import { BreakEvenTab } from './components/tabs/BreakEvenTab';
import { PaybackTab } from './components/tabs/PaybackTab';
import { TreasuryTab } from './components/tabs/TreasuryTab';
import { ProjectionsTab } from './components/tabs/ProjectionsTab';
import { VanTriTab } from './components/tabs/VanTriTab';
import { MonteCarloTab } from './components/tabs/MonteCarloTab';
import { MethodologyTab } from './components/tabs/MethodologyTab';
import { PestelTab } from './components/tabs/PestelTab';
import { SettingsTab } from './components/tabs/SettingsTab';

function isTypingOrInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (target.isContentEditable) return true;
  if (
    target.closest(
      '[role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="menuitem"], [role="tab"], nav[aria-label="Navigation des modules financiers"]'
    )
  ) {
    return true;
  }
  return false;
}

function MainApp() {
  const {
    activeProject,
    pestelAnalysis,
    model,
    assumptions,
    treasurySettings,
    savedScenarios,
    activeScenarioId,
    theme,
    toggleTheme,
    unitDisplay,
    toggleUnitDisplay,
    exportToExcel,
    exportProjectionsToCsv,
    exportFiveYearProjectionsToCsv,
    exportSeasonalIncomeStatementToCsv,
    exportToJson,
    importFromJson,
    dashboardReportNotes,
    notify,
  } = useFinancial();

  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarioModalMode, setScenarioModalMode] = useState<'list' | 'create'>('list');
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [projectComparatorOpen, setProjectComparatorOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [customPdfModalOpen, setCustomPdfModalOpen] = useState(false);
  const [chartExportModalOpen, setChartExportModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [geminiDrawerOpen, setGeminiDrawerOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const ensureDashboardReady = useCallback(async () => {
    if (currentTab !== 'dashboard') {
      setCurrentTab('dashboard');
    }
    window.dispatchEvent(new CustomEvent('riz:dashboard-overview'));
    await new Promise((r) => window.setTimeout(r, currentTab !== 'dashboard' ? 500 : 120));
  }, [currentTab]);

  const handleOpenScenarioManager = useCallback((mode: 'list' | 'create' = 'list') => {
    setScenarioModalMode(mode);
    setScenarioModalOpen(true);
  }, []);

  const handleStartTour = useCallback(() => {
    setCurrentTab('dashboard');
    setTourOpen(true);
  }, []);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (completed !== 'true') {
        const timer = window.setTimeout(() => {
          setTourOpen(true);
        }, 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      try {
        if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
          Promise.resolve(document.documentElement.requestFullscreen()).catch(() => {
            // Fallback silencieux si l'API Fullscreen native est restreinte par l'iframe
          });
        } else if (!next && document.fullscreenElement && document.exitFullscreen) {
          Promise.resolve(document.exitFullscreen()).catch(() => {
            // Ignorer si déjà hors plein écran
          });
        }
      } catch {
        // Le mode plein écran de l'espace de travail reste actif via l'état React
      }
      return next;
    });
  }, []);

  const handleDownloadJson = useCallback(() => {
    const jsonStr = exportToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hypotheses_riz_madagascar_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Fichier JSON exporté.');
  }, [exportToJson, notify]);

  const handleExportExecutiveMarkdown = useCallback(() => {
    const scenarioName =
      savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';
    const treasuryPlan = buildMonthlyTreasuryPlan(model, treasurySettings);
    const liquidity = computeGeneralLiquidityRatio(
      assumptions,
      model,
      treasuryPlan,
      treasurySettings
    );
    exportExecutiveSummaryMarkdown({
      model,
      projectName: activeProject.name,
      scenarioName,
      liquidity,
      dashboardNotes: dashboardReportNotes,
    });
    notify('success', 'Executive Summary (.md) exporté.');
  }, [
    activeProject.name,
    activeScenarioId,
    assumptions,
    dashboardReportNotes,
    model,
    notify,
    savedScenarios,
    treasurySettings,
  ]);

  const handleExportStructuredCoopJson = useCallback(() => {
    const scenarioName =
      savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';
    const treasuryPlan = buildMonthlyTreasuryPlan(model, treasurySettings);
    const liquidity = computeGeneralLiquidityRatio(
      assumptions,
      model,
      treasuryPlan,
      treasurySettings
    );
    exportStructuredCooperativeJson({
      model,
      projectName: activeProject.name,
      scenarioName,
      liquidity,
    });
    notify('success', 'JSON structuré Coopératives (.json) exporté.');
  }, [
    activeProject.name,
    activeScenarioId,
    assumptions,
    model,
    notify,
    savedScenarios,
    treasurySettings,
  ]);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setMapsQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const handleExportPdf = useCallback(async (customSections?: PdfExportSectionsConfig) => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const sectionsArg =
        customSections && typeof customSections.dashboard === 'boolean'
          ? customSections
          : undefined;
      const shouldCaptureCharts = sectionsArg?.charts ?? true;

      // Ensure Dashboard Recharts SVGs are rendered in DOM only when charts are included
      if (shouldCaptureCharts) {
        if (currentTab !== 'dashboard') {
          setCurrentTab('dashboard');
          await new Promise((resolve) => window.setTimeout(resolve, 420));
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 60));
        }
      }
      const scenarioName =
        savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';
      await exportDashboardToPdf({
        model,
        projectName: activeProject.name,
        scenarioName,
        unitDisplay,
        pestelAnalysis,
        dashboardNotes: dashboardReportNotes,
        sections: sectionsArg,
      });
      notify(
        'success',
        sectionsArg
          ? 'Rapport PDF personnalisé exporté avec les sections sélectionnées.'
          : 'Tableau de bord exporté en PDF (graphiques et synthèses inclus).'
      );
    } catch (err) {
      console.error('Erreur export PDF:', err);
      notify('error', 'Impossible de générer le PDF du tableau de bord.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    activeProject.name,
    activeScenarioId,
    currentTab,
    dashboardReportNotes,
    isExportingPdf,
    model,
    notify,
    pestelAnalysis,
    savedScenarios,
    unitDisplay,
  ]);

  const handleExportDocx = useCallback(async () => {
    if (isExportingDocx) return;
    setIsExportingDocx(true);
    try {
      const scenarioName =
        savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';
      await exportModelToDocx({
        model,
        projectName: activeProject.name,
        scenarioName,
        unitDisplay,
        pestelAnalysis,
      });
      notify(
        'success',
        'Rapport Word (.docx) exporté avec tableaux de synthèse et analyse automatisée.'
      );
    } catch (err) {
      console.error('Erreur export DOCX:', err);
      notify('error', 'Impossible de générer le rapport Word (.docx).');
    } finally {
      setIsExportingDocx(false);
    }
  }, [
    activeProject.name,
    activeScenarioId,
    isExportingDocx,
    model,
    notify,
    pestelAnalysis,
    savedScenarios,
    unitDisplay,
  ]);

  // Synchronise la sortie native du plein écran navigateur
  useEffect(() => {
    const handleNativeFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen((prev) => (prev ? false : prev));
      }
    };
    document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
  }, []);

  // Gestion globale des raccourcis clavier (Ctrl+S, Ctrl+K, Flèches Gauche/Droite, Échap)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+K / Cmd+K : Palette de commandes
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+S / Cmd+S : Sauvegarder le scénario actuel
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setCommandPaletteOpen(false);
        handleOpenScenarioManager('create');
        return;
      }

      // Ne pas intercepter les flèches si une boîte de dialogue est ouverte ou si l'utilisateur saisit dans un champ
      const hasOpenDialog = Boolean(document.querySelector('[role="dialog"]'));
      if (hasOpenDialog) return;

      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }

      if (
        !isMod &&
        !e.altKey &&
        !e.shiftKey &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        !isTypingOrInteractiveTarget(e.target)
      ) {
        const currentIndex = NAV_ITEMS.findIndex((item) => item.id === currentTab);
        if (currentIndex === -1) return;
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (currentIndex + delta + NAV_ITEMS.length) % NAV_ITEMS.length;
        setCurrentTab(NAV_ITEMS[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentTab, handleOpenScenarioManager, handleToggleFullscreen, isFullscreen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090912] text-zinc-900 dark:text-zinc-100 transition-colors duration-150 relative">
      {/* Subtle ambient top radial glow in dark mode */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-radial-[at_50%_0%] from-indigo-500/[0.08] via-transparent to-transparent dark:from-indigo-500/[0.12] -z-0 no-print"
      />

      {/* Skip link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-semibold"
      >
        Aller au contenu principal
      </a>

      {/* Google Maps Platform Quota Exceeded Sticky Banner */}
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-50 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-700 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-100 no-print"
        >
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" aria-hidden="true" />
              <p className="leading-snug">
                Le quota Google Maps Platform de cette prévisualisation a été dépassé. Consultez{' '}
                <a
                  href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-amber-700 dark:hover:text-amber-200"
                >
                  la documentation sur les limites de quota Google Maps
                </a>{' '}
                ou basculez vers votre propre projet facturé.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMapsQuotaExceeded(false)}
              aria-label="Fermer l’avertissement de quota Maps"
              className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        onSelectTab={setCurrentTab}
        onOpenScenarioManager={handleOpenScenarioManager}
        onOpenExcelImport={() => setExcelImportOpen(true)}
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        onExportPdf={() => void handleExportPdf()}
        onOpenCustomPdfModal={() => setCustomPdfModalOpen(true)}
        isExportingPdf={isExportingPdf}
        onExportDocx={handleExportDocx}
        isExportingDocx={isExportingDocx}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onStartTour={handleStartTour}
        onOpenGoogleSheetsExport={() => setGoogleSheetsModalOpen(true)}
        onExportExecutiveMarkdown={handleExportExecutiveMarkdown}
        onExportStructuredCoopJson={handleExportStructuredCoopJson}
        onOpenGeminiDrawer={() => setGeminiDrawerOpen(true)}
        onOpenChartExportModal={() => setChartExportModalOpen(true)}
      />

      {/* Main Workspace: Sidebar + Content (Sidebar masquée en mode plein écran) */}
      <div
        className={`relative z-10 flex-1 flex flex-col lg:flex-row w-full mx-auto ${
          isFullscreen ? 'max-w-none' : 'max-w-[1600px]'
        }`}
      >
        {!isFullscreen && (
          <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-w-0 pb-24 sm:pb-8 focus:outline-none ${
            isFullscreen ? 'p-4 sm:p-6 lg:px-8 lg:py-6' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {/* En-tête officiel visible uniquement lors de l'impression / export PDF */}
          <div className="hidden print-only mb-5 pb-4 border-b-2 border-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                  RizMadagascar · Modèle Financier v6.0
                </div>
                <h1 className="text-lg font-bold text-zinc-950 mt-0.5">
                  Rapport de Synthèse Financière — {NAV_ITEMS.find((n) => n.id === currentTab)?.label || 'Synthèse'}
                </h1>
                <p className="text-xs text-zinc-700 mt-0.5">
                  Projet actif : <span className="font-semibold">{activeProject.name}</span>
                  {' · '}Scénario :{' '}
                  <span className="font-semibold">
                    {savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant'}
                  </span>
                  {' · '}Unité : {unitDisplay === 'millions' ? 'Millions d’Ariary (M Ar)' : 'Ariary (Ar)'}
                </p>
              </div>
              <div className="text-right text-xs font-mono text-zinc-700 shrink-0">
                <div>Édité le {new Date().toLocaleDateString('fr-FR')}</div>
                <div className="text-[11px] text-zinc-600">
                  IR {formatPercent(assumptions.corporateTaxRate, 0)} · r = {formatPercent(assumptions.discountRate, 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-zinc-300 text-xs font-mono">
              <div>
                <div className="text-[10px] font-sans uppercase text-zinc-600">Chiffre d&apos;affaires A1</div>
                <div className="font-bold text-zinc-950">
                  {formatAriary(model.year1.totalTurnoverAr, { inMillions: unitDisplay === 'millions' })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase text-zinc-600">Bénéfice net après IR</div>
                <div className="font-bold text-zinc-950">
                  {formatAriary(model.year1.netResultAfterTaxAr, { inMillions: unitDisplay === 'millions' })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase text-zinc-600">Fonds à lever (I₀)</div>
                <div className="font-bold text-zinc-950">
                  {formatAriary(model.investment.fundsToRaiseAr, { inMillions: unitDisplay === 'millions' })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-sans uppercase text-zinc-600">VAN / TRI / Payback</div>
                <div className="font-bold text-zinc-950">
                  {formatAriary(model.npv.npvAr, { inMillions: true })} ·{' '}
                  {Number.isFinite(model.irr.irrValue) ? formatPercent(model.irr.irrValue, 1) : 'N/A'} ·{' '}
                  {formatMonths(model.payback.paybackMonths)}
                </div>
              </div>
            </div>
          </div>

          {currentTab === 'dashboard' && (
            <DashboardTab
              onNavigate={setCurrentTab}
              onExportPdf={() => void handleExportPdf()}
              onOpenCustomPdfModal={() => setCustomPdfModalOpen(true)}
              isExportingPdf={isExportingPdf}
              onExportDocx={handleExportDocx}
              isExportingDocx={isExportingDocx}
              onSaveScenario={() => handleOpenScenarioManager('create')}
              onOpenGoogleSheetsExport={() => setGoogleSheetsModalOpen(true)}
              onExportExecutiveMarkdown={handleExportExecutiveMarkdown}
              onExportStructuredCoopJson={handleExportStructuredCoopJson}
              onOpenGeminiDrawer={() => setGeminiDrawerOpen(true)}
              onOpenChartExportModal={() => setChartExportModalOpen(true)}
            />
          )}
          {currentTab === 'hypotheses' && <HypothesesTab />}
          {currentTab === 'partenaires' && <PartnersEcosystemTab />}
          {currentTab === 'concurrence' && <ConcurrenceTab />}
          {currentTab === 'carte' && <MadagascarRiceMapSection />}
          {currentTab === 'usine3d' && <RiceMill3DScene />}
          {currentTab === 'scenarios' && (
            <ScenariosTab onOpenScenarioManager={() => handleOpenScenarioManager('list')} />
          )}
          {currentTab === 'sensibilite' && <SensibilityTab />}
          {currentTab === 'breakeven' && <BreakEvenTab />}
          {currentTab === 'payback' && <PaybackTab />}
          {currentTab === 'tresorerie' && <TreasuryTab />}
          {currentTab === 'projections' && <ProjectionsTab />}
          {currentTab === 'vantri' && <VanTriTab />}
          {currentTab === 'montecarlo' && <MonteCarloTab />}
          {currentTab === 'methodologie' && <MethodologyTab />}
          {currentTab === 'pestel' && <PestelTab />}
          {currentTab === 'parametres' && <SettingsTab />}
        </main>
      </div>

      {/* Footer (masqué en mode plein écran pour maximiser l'affichage) */}
      {!isFullscreen && (
        <footer className="relative z-10 border-t border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#090912] text-zinc-600 dark:text-zinc-400 py-4 px-6 pb-20 sm:pb-4 text-xs text-center no-print">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Modélisation Financière — Filière Paddy & Riz Madagascar · Dashboard v6.0
            </span>
            <span className="font-mono text-xs">
              Raccourcis : Ctrl+K palette · Ctrl+S sauvegarder · ←/→ onglets
            </span>
          </div>
        </footer>
      )}

      {/* Mobile Bottom Navigation (<640px) */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenScenarioManager={handleOpenScenarioManager}
        onOpenExcelImport={() => setExcelImportOpen(true)}
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
        onExportDocx={handleExportDocx}
        isExportingDocx={isExportingDocx}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onStartTour={handleStartTour}
        onOpenGoogleSheetsExport={() => setGoogleSheetsModalOpen(true)}
        onExportExecutiveMarkdown={handleExportExecutiveMarkdown}
        onExportStructuredCoopJson={handleExportStructuredCoopJson}
        onOpenGeminiDrawer={() => setGeminiDrawerOpen(true)}
        onOpenChartExportModal={() => setChartExportModalOpen(true)}
      />

      {/* Scenario Manager Modal */}
      <ScenarioManagerModal
        open={scenarioModalOpen}
        onClose={() => setScenarioModalOpen(false)}
        initialView={scenarioModalMode}
      />

      {/* Excel Project Import Wizard Modal */}
      <ExcelImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        onProjectCreated={() => setCurrentTab('dashboard')}
      />

      {/* Project Manager Modal */}
      <ProjectManagerModal
        open={projectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
        onOpenExcelImport={() => setExcelImportOpen(true)}
        onOpenProjectComparator={() => setProjectComparatorOpen(true)}
      />

      {/* Project Comparator Modal */}
      <ProjectComparatorModal
        open={projectComparatorOpen}
        onClose={() => setProjectComparatorOpen(false)}
        onOpenExcelImport={() => setExcelImportOpen(true)}
      />

      {/* Financial Glossary Modal */}
      <FinancialGlossaryModal
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      {/* Google Sheets Export Modal */}
      <GoogleSheetsExportModal
        open={googleSheetsModalOpen}
        onClose={() => setGoogleSheetsModalOpen(false)}
      />

      {/* Custom PDF Export Section Selector Modal */}
      <CustomPdfExportModal
        open={customPdfModalOpen}
        onClose={() => setCustomPdfModalOpen(false)}
        projectName={activeProject.name}
        scenarioName={
          savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant'
        }
        hasNotes={dashboardReportNotes.trim().length > 0}
        isExporting={isExportingPdf}
        onExport={(sections) => void handleExportPdf(sections)}
      />

      {/* Dashboard Charts Individual Export Modal (PNG / SVG for PowerPoint) */}
      <DashboardChartExportModal
        open={chartExportModalOpen}
        onClose={() => setChartExportModalOpen(false)}
        ensureDashboardReady={ensureDashboardReady}
        notify={notify}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onSaveScenario={() => handleOpenScenarioManager('create')}
        onOpenScenarioManager={() => handleOpenScenarioManager('list')}
        onOpenExcelImport={() => setExcelImportOpen(true)}
        onOpenProjectManager={() => setProjectManagerOpen(true)}
        onOpenProjectComparator={() => setProjectComparatorOpen(true)}
        onOpenGlossary={() => setGlossaryOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExportExcel={exportToExcel}
        onExportPdf={() => void handleExportPdf()}
        onOpenCustomPdfModal={() => setCustomPdfModalOpen(true)}
        onExportDocx={handleExportDocx}
        onExportSeasonalCsv={exportSeasonalIncomeStatementToCsv}
        onExportCsv={exportProjectionsToCsv}
        onExportCsv5Y={exportFiveYearProjectionsToCsv}
        onExportJson={handleDownloadJson}
        onImportJson={() => jsonImportInputRef.current?.click()}
        onExportExecutiveMarkdown={handleExportExecutiveMarkdown}
        onExportStructuredCoopJson={handleExportStructuredCoopJson}
        onOpenGeminiDrawer={() => setGeminiDrawerOpen(true)}
        onExportGoogleSheets={() => setGoogleSheetsModalOpen(true)}
        onOpenChartExportModal={() => setChartExportModalOpen(true)}
        onPrintReport={() => window.print()}
        theme={theme}
        onToggleTheme={toggleTheme}
        unitDisplay={unitDisplay}
        onToggleUnit={toggleUnitDisplay}
        onStartTour={handleStartTour}
      />

      {/* Interactive Onboarding Tour */}
      <InteractiveTour
        open={tourOpen}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onClose={() => setTourOpen(false)}
      />

      {/* Conseiller Financier IA Drawer */}
      <GeminiAdvisorDrawer
        open={geminiDrawerOpen}
        onClose={() => setGeminiDrawerOpen(false)}
      />

      {/* Offline Field Indicator */}
      <OfflineIndicator />

      {/* Hidden JSON File Input for Command Palette & Global Restore */}
      <input
        ref={jsonImportInputRef}
        type="file"
        accept=".json,application/json"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              importFromJson(reader.result);
            } else {
              notify('error', 'Impossible de lire le contenu du fichier JSON.');
            }
          };
          reader.onerror = () => {
            notify('error', 'Erreur lors de la lecture du fichier JSON.');
          };
          reader.readAsText(file);
          e.target.value = '';
        }}
      />

      {/* Non-blocking Toasts */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <FirestoreErrorBoundary>
      <TooltipProvider delayDuration={150}>
        <FinancialProvider>
          <MainApp />
        </FinancialProvider>
      </TooltipProvider>
    </FirestoreErrorBoundary>
  );
}
