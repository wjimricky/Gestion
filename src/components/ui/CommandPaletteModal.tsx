import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Search,
  Save,
  FolderCog,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileDown,
  Download,
  Sun,
  Moon,
  Monitor,
  ArrowRight,
  Coins,
  X,
  Printer,
  Table,
  Compass,
  FolderKanban,
  FileUp,
  Check,
  BookOpen,
  GitCompareArrows,
  FileText,
  Upload,
  SlidersHorizontal,
  Sparkles,
  FileJson,
  Image as ImageIcon,
} from 'lucide-react';
import { NAV_ITEMS } from '../layout/navItems';
import { useFinancial } from '../../context/FinancialContext';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SECTION_LABEL_CLASSES,
  MENU_SHORTCUT_KBD_CLASSES,
  MENU_SURFACE_CLASSES,
} from './menuTokens';

interface CommandItem {
  id: string;
  group: 'Projets' | 'Navigation' | 'Actions rapides';
  label: string;
  description: string;
  shortcut?: string;
  badge?: string;
  isActive?: boolean;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onSaveScenario: () => void;
  onOpenScenarioManager: () => void;
  onOpenExcelImport: () => void;
  onOpenProjectManager: () => void;
  onOpenProjectComparator: () => void;
  onOpenGlossary: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onOpenCustomPdfModal?: () => void;
  onExportDocx?: () => void;
  onExportSeasonalCsv?: () => void;
  onExportCsv: () => void;
  onExportCsv5Y?: () => void;
  onExportJson: () => void;
  onImportJson?: () => void;
  onExportExecutiveMarkdown?: () => void;
  onExportStructuredCoopJson?: () => void;
  onOpenGeminiDrawer?: () => void;
  onExportGoogleSheets?: () => void;
  onOpenChartExportModal?: () => void;
  onPrintReport: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  unitDisplay: 'standard' | 'millions';
  onToggleUnit: () => void;
  onStartTour: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  open,
  onClose,
  currentTab,
  onSelectTab,
  onSaveScenario,
  onOpenScenarioManager,
  onOpenExcelImport,
  onOpenProjectManager,
  onOpenProjectComparator,
  onOpenGlossary,
  isFullscreen,
  onToggleFullscreen,
  onExportExcel,
  onExportPdf,
  onOpenCustomPdfModal,
  onExportDocx,
  onExportSeasonalCsv,
  onExportCsv,
  onExportCsv5Y,
  onExportJson,
  onImportJson,
  onExportExecutiveMarkdown,
  onExportStructuredCoopJson,
  onOpenGeminiDrawer,
  onExportGoogleSheets,
  onOpenChartExportModal,
  onPrintReport,
  theme,
  onToggleTheme,
  unitDisplay,
  onToggleUnit,
  onStartTour,
}) => {
  const { projects, activeProjectId, switchProject, themeMode, setThemeMode } = useFinancial();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const commands = useMemo<CommandItem[]>(() => {
    const projectCommands: CommandItem[] = projects.map((proj) => {
      const isCurrent = proj.id === activeProjectId;
      return {
        id: `project-${proj.id}`,
        group: 'Projets',
        label: proj.name,
        description: proj.excelMeta
          ? `Excel · ${proj.excelMeta.fileName} (${proj.excelMeta.selectedSheets.join(', ')})`
          : proj.description,
        badge: proj.source === 'default' ? 'Défaut' : 'Excel',
        isActive: isCurrent,
        keywords: `projet basculer ouvrir ${proj.name} ${proj.excelMeta?.fileName || ''}`.toLowerCase(),
        icon: FolderKanban,
        onSelect: () => {
          if (!isCurrent) {
            switchProject(proj.id);
          }
          onClose();
        },
      };
    });

    const navCommands: CommandItem[] = NAV_ITEMS.map((item, idx) => ({
      id: `nav-${item.id}`,
      group: 'Navigation',
      label: item.label,
      description: item.desc,
      shortcut: `${idx + 1}`,
      isActive: item.id === currentTab,
      keywords: `${item.label} ${item.shortLabel} ${item.desc} ${item.id}`.toLowerCase(),
      icon: item.icon,
      onSelect: () => {
        onSelectTab(item.id);
        onClose();
      },
    }));

    const actionCommands: CommandItem[] = [
      {
        id: 'action-import-excel-project',
        group: 'Actions rapides',
        label: 'Importer un projet Excel (.xlsx / .xls / .csv)',
        description: 'Analyser un classeur externe, mapper les colonnes et créer un projet',
        keywords: 'importer excel xlsx xls csv projet nouveau fichier analyser mapper',
        icon: FileUp,
        onSelect: () => {
          onClose();
          onOpenExcelImport();
        },
      },
      {
        id: 'action-manage-projects',
        group: 'Actions rapides',
        label: 'Gérer / Renommer / Supprimer des projets',
        description: 'Ouvrir le gestionnaire complet des projets enregistrés en local',
        keywords: 'projets changer basculer renommer supprimer gerer',
        icon: FolderKanban,
        onSelect: () => {
          onClose();
          onOpenProjectManager();
        },
      },
      {
        id: 'action-compare-projects',
        group: 'Actions rapides',
        label: 'Comparateur de Projets (VAN, TRI, CA côte à côte)',
        description: 'Comparer deux projets sauvegardés avec mise en évidence des écarts',
        keywords: 'comparer comparateur projets van tri ca ecarts cote a cote',
        icon: GitCompareArrows,
        onSelect: () => {
          onClose();
          onOpenProjectComparator();
        },
      },
      {
        id: 'action-glossary',
        group: 'Actions rapides',
        label: 'Glossaire Financier (VAN, TRI, Seuil de rentabilité, BFR…)',
        description: 'Définitions, formules et repères adaptés à la filière riz à Madagascar',
        keywords: 'glossaire definitions dictionnaire van tri seuil rentabilite bfr soudure ir paddy madagascar',
        icon: BookOpen,
        onSelect: () => {
          onClose();
          onOpenGlossary();
        },
      },
      {
        id: 'action-save',
        group: 'Actions rapides',
        label: 'Sauvegarder le scénario actuel',
        description: 'Enregistrer les hypothèses actives comme nouveau scénario',
        shortcut: 'Ctrl+S',
        keywords: 'sauvegarder enregistrer scenario creer nouveau',
        icon: Save,
        onSelect: () => {
          onClose();
          onSaveScenario();
        },
      },
      {
        id: 'action-manage',
        group: 'Actions rapides',
        label: 'Gérer les scénarios enregistrés',
        description: 'Charger, renommer, dupliquer ou supprimer un scénario',
        keywords: 'gerer charger dupliquer renommer supprimer scenarios',
        icon: FolderCog,
        onSelect: () => {
          onClose();
          onOpenScenarioManager();
        },
      },
      {
        id: 'action-fullscreen',
        group: 'Actions rapides',
        label: isFullscreen
          ? 'Quitter le mode plein écran'
          : 'Activer le mode plein écran',
        description:
          'Maximiser ou restaurer la largeur de l’espace de travail principal',
        shortcut: 'Échap',
        keywords: 'plein ecran maximiser reduire focus tableau',
        icon: isFullscreen ? Minimize2 : Maximize2,
        onSelect: () => {
          onClose();
          onToggleFullscreen();
        },
      },
      {
        id: 'action-excel',
        group: 'Actions rapides',
        label: 'Exporter le classeur Excel (.xlsx)',
        description: 'Télécharger toutes les feuilles de calcul du modèle',
        keywords: 'exporter excel xlsx classeur telecharger',
        icon: FileSpreadsheet,
        onSelect: () => {
          onClose();
          onExportExcel();
        },
      },
      ...(onExportGoogleSheets
        ? [
            {
              id: 'action-google-sheets',
              group: 'Actions rapides' as const,
              label: 'Exporter vers Google Sheets (Partage Drive)',
              description: 'Créer une feuille Google Sheets partagée avec les 4 onglets du modèle',
              keywords: 'exporter google sheets drive partage cloud collaboratif',
              icon: FileSpreadsheet,
              onSelect: () => {
                onClose();
                onExportGoogleSheets();
              },
            },
          ]
        : []),
      ...(onExportDocx
        ? [
            {
              id: 'action-docx',
              group: 'Actions rapides' as const,
              label: 'Exporter le rapport structuré Word (.docx)',
              description:
                'Générer un document Word avec tableaux de synthèse, P&L 5 ans et analyse automatisée',
              keywords: 'exporter word docx rapport synthese analyse texte document',
              icon: FileText,
              onSelect: () => {
                onClose();
                window.setTimeout(() => onExportDocx(), 60);
              },
            },
          ]
        : []),
      {
        id: 'action-pdf',
        group: 'Actions rapides',
        label: 'Exporter le tableau de bord intégral en PDF',
        description: 'Générer un rapport A4 avec graphiques Recharts, KPI, CF A1–A3 et PESTEL',
        keywords: 'exporter pdf rapport tableau de bord graphiques recharts pestel synthese',
        icon: FileDown,
        onSelect: () => {
          onClose();
          window.setTimeout(() => onExportPdf(), 80);
        },
      },
      ...(onOpenCustomPdfModal
        ? [
            {
              id: 'action-custom-pdf',
              group: 'Actions rapides' as const,
              label: 'Export PDF personnalisé (sélection de sections)',
              description: 'Choisir les sections à inclure : Tableau de bord, PESTEL, Sensibilité 2D…',
              keywords: 'exporter pdf personnalise sections tableau de bord pestel sensibilite choix',
              icon: SlidersHorizontal,
              onSelect: () => {
                onClose();
                window.setTimeout(() => onOpenCustomPdfModal(), 60);
              },
            },
          ]
        : []),
      ...(onOpenChartExportModal
        ? [
            {
              id: 'action-export-charts-img',
              group: 'Actions rapides' as const,
              label: 'Exporter les graphiques du Dashboard (PNG / SVG)',
              description: 'Télécharger chaque graphique individuellement pour PowerPoint',
              keywords: 'exporter graphique image png svg powerpoint chart dashboard',
              icon: ImageIcon,
              onSelect: () => {
                onClose();
                window.setTimeout(() => onOpenChartExportModal(), 60);
              },
            },
          ]
        : []),
      {
        id: 'action-csv',
        group: 'Actions rapides',
        label: 'Exporter les projections (CF A1–A3) en CSV',
        description: 'Télécharger les flux nets A1–A3 pour Excel ou Google Sheets',
        keywords: 'exporter csv projections cf a1 a2 a3 sheets excel',
        icon: Table,
        onSelect: () => {
          onClose();
          onExportCsv();
        },
      },
      ...(onExportSeasonalCsv
        ? [
            {
              id: 'action-csv-seasonal',
              group: 'Actions rapides' as const,
              label: 'Exporter le compte de résultat saisonnier brut (CSV)',
              description: 'Toutes les données HS, BS, Année 1 et 12 mois pour Excel / Sheets',
              keywords: 'exporter csv brut saisonnier compte resultat hs bs excel sheets',
              icon: Table,
              onSelect: () => {
                onClose();
                onExportSeasonalCsv();
              },
            },
          ]
        : []),
      ...(onExportCsv5Y
        ? [
            {
              id: 'action-csv-5y',
              group: 'Actions rapides' as const,
              label: 'Exporter les projections brutes sur 5 ans (CSV)',
              description: 'Données brutes annuelles (A1–A5) et mensuelles (60 mois) pour tableur',
              keywords: 'exporter csv brut 5 ans 60 mois flux tresorerie excel sheets',
              icon: Table,
              onSelect: () => {
                onClose();
                onExportCsv5Y();
              },
            },
          ]
        : []),
      {
        id: 'action-print',
        group: 'Actions rapides',
        label: 'Imprimer le rapport financier',
        description: 'Ouvrir la mise en page dédiée sans barre latérale ni contrôles',
        shortcut: 'Ctrl+P',
        keywords: 'imprimer rapport pdf synthese document papier',
        icon: Printer,
        onSelect: () => {
          onClose();
          window.setTimeout(() => onPrintReport(), 100);
        },
      },
      ...(onExportExecutiveMarkdown
        ? [
            {
              id: 'action-export-exec-md',
              group: 'Actions rapides' as const,
              label: 'Exporter Executive Summary (.md)',
              description: 'Matrice décisionnelle VAN, TRI, Payback pour investisseurs',
              keywords: 'exporter executive summary markdown md investisseurs matrice decision',
              icon: FileText,
              onSelect: () => {
                onClose();
                onExportExecutiveMarkdown();
              },
            },
          ]
        : []),
      ...(onExportStructuredCoopJson
        ? [
            {
              id: 'action-export-coop-json',
              group: 'Actions rapides' as const,
              label: 'Exporter JSON structuré Coopératives (.json)',
              description: 'Format normalisé pour intégration outils coopératives agricoles',
              keywords: 'exporter json structure cooperatives normalisation integration',
              icon: FileJson,
              onSelect: () => {
                onClose();
                onExportStructuredCoopJson();
              },
            },
          ]
        : []),
      ...(onOpenGeminiDrawer
        ? [
            {
              id: 'action-open-gemini-advisor',
              group: 'Actions rapides' as const,
              label: 'Ouvrir le Conseiller Financier IA',
              description: 'Analyser VAN, TRI, trésorerie de soudure et corridors rizicoles',
              keywords: 'ia conseiller financier analyse gemini assistant recommandations',
              icon: Sparkles,
              onSelect: () => {
                onClose();
                onOpenGeminiDrawer();
              },
            },
          ]
        : []),
      {
        id: 'action-json',
        group: 'Actions rapides',
        label: 'Exporter les hypothèses en JSON',
        description: 'Sauvegarder un fichier JSON portable de vos paramètres',
        keywords: 'exporter json sauvegarde fichier portable',
        icon: Download,
        onSelect: () => {
          onClose();
          onExportJson();
        },
      },
      ...(onImportJson
        ? [
            {
              id: 'action-import-json',
              group: 'Actions rapides' as const,
              label: 'Importer JSON',
              description:
                'Restaurer rapidement un modèle et ses scénarios sauvegardés localement (.json)',
              keywords: 'importer json restaurer sauvegarde charger modele projet fichier',
              icon: Upload,
              onSelect: () => {
                onClose();
                onImportJson();
              },
            },
          ]
        : []),
      {
        id: 'action-unit',
        group: 'Actions rapides',
        label:
          unitDisplay === 'standard'
            ? 'Afficher les montants en Millions d’Ariary (M Ar)'
            : 'Afficher les montants en Ariary bruts (Ar)',
        description: 'Basculer le format d’unité monétaire sur toute l’application',
        keywords: 'unite ariary millions m ar devise',
        icon: Coins,
        onSelect: () => {
          onToggleUnit();
          onClose();
        },
      },
      {
        id: 'action-tour',
        group: 'Actions rapides',
        label: 'Lancer le guide interactif (Tour)',
        description: 'Découvrir étape par étape Dashboard, Comparaison, Hypothèses et Sensibilité',
        keywords: 'guide tour interactif aide onboarding decouvrir tutoriel',
        icon: Compass,
        onSelect: () => {
          onClose();
          window.setTimeout(() => onStartTour(), 80);
        },
      },
      {
        id: 'action-theme-auto',
        group: 'Actions rapides',
        label: 'Thème : Automatique (Préférences système)',
        description: 'Adapter automatiquement selon le mode clair/sombre du système',
        isActive: themeMode === 'system',
        keywords: 'theme auto systeme os prefers color scheme apparence',
        icon: Monitor,
        onSelect: () => {
          setThemeMode('system');
          onClose();
        },
      },
      {
        id: 'action-theme',
        group: 'Actions rapides',
        label:
          theme === 'dark'
            ? 'Forcer le thème clair'
            : 'Forcer le thème sombre',
        description: 'Verrouiller manuellement le contraste clair ou sombre',
        keywords: 'theme clair sombre dark light apparence manuel',
        icon: theme === 'dark' ? Sun : Moon,
        onSelect: () => {
          onToggleTheme();
          onClose();
        },
      },
    ];

    return [...actionCommands.slice(0, 2), ...navCommands, ...projectCommands, ...actionCommands.slice(2)];
  }, [
    activeProjectId,
    currentTab,
    isFullscreen,
    onClose,
    onExportCsv,
    onExportCsv5Y,
    onExportDocx,
    onExportExcel,
    onExportExecutiveMarkdown,
    onExportGoogleSheets,
    onExportJson,
    onExportPdf,
    onExportSeasonalCsv,
    onExportStructuredCoopJson,
    onImportJson,
    onOpenCustomPdfModal,
    onOpenExcelImport,
    onOpenGeminiDrawer,
    onOpenGlossary,
    onOpenProjectComparator,
    onOpenProjectManager,
    onOpenScenarioManager,
    onPrintReport,
    onSaveScenario,
    onSelectTab,
    onStartTour,
    onToggleFullscreen,
    onToggleTheme,
    onToggleUnit,
    projects,
    setThemeMode,
    switchProject,
    theme,
    themeMode,
    unitDisplay,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords.includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    setQuery('');
    setSelectedIndex(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 15);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep highlighted option visible when navigating with keyboard
  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${selectedIndex}"]`
    );
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIndex, filtered.length]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(Math.max(0, filtered.length - 1));
      return;
    }
    if (e.key === 'Tab') {
      // Keep focus trapped between search input and close button inside dialog
      e.preventDefault();
      if (document.activeElement === inputRef.current) {
        closeBtnRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
      return;
    }
    if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].onSelect();
    }
  };

  const quickImportAndProjects = filtered.filter(
    (item) =>
      item.id === 'action-import-excel-project' ||
      item.id === 'action-manage-projects' ||
      item.id === 'action-compare-projects'
  );
  const projectItems = filtered.filter((item) => item.group === 'Projets');
  const navItems = filtered.filter((item) => item.group === 'Navigation');
  const otherActionItems = filtered.filter(
    (item) =>
      item.group === 'Actions rapides' &&
      item.id !== 'action-import-excel-project' &&
      item.id !== 'action-manage-projects' &&
      item.id !== 'action-compare-projects'
  );

  const renderGroup = (title: string, items: CommandItem[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={MENU_SECTION_LABEL_CLASSES}>{title}</div>
        <div className="space-y-0.5 mt-0.5">
          {items.map((item) => {
            const idx = filtered.indexOf(item);
            const isHighlighted = idx === selectedIndex;
            const Icon = item.icon;
            const stateCls = isHighlighted
              ? MENU_ITEM_STATE_CLASSES.active
              : MENU_ITEM_STATE_CLASSES.idle;

            return (
              <button
                key={item.id}
                id={`${listboxId}-opt-${idx}`}
                data-cmd-index={idx}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={item.onSelect}
                className={`${MENU_ITEM_BASE_CLASSES} min-h-11 px-3 py-2 ${stateCls}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon
                    aria-hidden="true"
                    className={`w-4 h-4 shrink-0 ${
                      isHighlighted || item.isActive
                        ? 'text-indigo-600 dark:text-indigo-300'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300">
                          {item.badge}
                        </span>
                      )}
                      {item.isActive && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 inline-flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>Actif</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>
                {item.shortcut ? (
                  <kbd className={MENU_SHORTCUT_KBD_CLASSES}>{item.shortcut}</kbd>
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[6vh] sm:pt-[10vh] bg-zinc-950/70 backdrop-blur-xs px-3 sm:px-4 no-print"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes et navigation rapide"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={`w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[84vh] sm:max-h-[78vh] ${MENU_SURFACE_CLASSES}`}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={
              filtered.length > 0 ? `${listboxId}-opt-${selectedIndex}` : undefined
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un projet, un onglet ou une action..."
            aria-label="Rechercher un projet, un onglet ou une action"
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la palette"
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Listbox */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Commandes disponibles"
          className="overflow-y-auto p-2 space-y-3"
        >
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucune commande ne correspond à « {query} ».
            </div>
          ) : (
            <>
              {renderGroup('Import & Gestion des projets', quickImportAndProjects)}
              {renderGroup('Projets enregistrés (local)', projectItems)}
              {renderGroup('Onglets d’analyse', navItems)}
              {renderGroup('Actions rapides', otherActionItems)}
            </>
          )}
        </div>

        {/* Footer Shortcuts Legend */}
        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-[#0B0A16] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              <kbd className={MENU_SHORTCUT_KBD_CLASSES}>↑ ↓</kbd> choisir
            </span>
            <span>
              <kbd className={MENU_SHORTCUT_KBD_CLASSES}>Début / Fin</kbd> bornes
            </span>
            <span>
              <kbd className={MENU_SHORTCUT_KBD_CLASSES}>Entrée</kbd> valider
            </span>
          </div>
          <span>
            <kbd className={MENU_SHORTCUT_KBD_CLASSES}>Ctrl+S</kbd> sauver ·{' '}
            <kbd className={MENU_SHORTCUT_KBD_CLASSES}>Échap</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  );
};
