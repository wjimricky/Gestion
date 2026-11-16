import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import {
  ClimateImpactAssumptions,
  FinancialAssumptions,
  FullFinancialModel,
  FxRiskAssumptions,
  KpiAlertThresholds,
  LogisticsAssumptions,
  PaddyStockAssumptions,
  PartnersEcosystemAssumptions,
  SensitivityMatrix,
  StorageOptimizationAssumptions,
  SubsidiesAssumptions,
  TraceabilityCertificationAssumptions,
  MarketComparisonAssumptions,
  MachineMaintenanceSchedule,
  VatAssumptions,
} from '../types/finance';
import {
  ExcelImportMetadata,
  FinancingPlanAnchorId,
  KpiNoteItem,
  KpiNoteTag,
  PestelAnalysisData,
  PestelCategoryKey,
  PestelFactorEntry,
  ProjectRecord,
  ScenarioVoiceNote,
} from '../types/project';
import { DEFAULT_ASSUMPTIONS } from '../engine/defaultAssumptions';
import { calculateFullModel, computeSensitivityMatrix } from '../engine/calculator';
import { exportModelToExcel } from '../utils/exportExcel';
import {
  exportFiveYearRawCsv,
  exportProjectionsToCsv as downloadProjectionsCsv,
  exportSeasonalIncomeStatementRawCsv,
} from '../utils/exportCsv';
import { validateAssumptions, ValidationResult } from '../utils/validation';
import { createDefaultPestelAnalysis } from '../utils/pestelDefaults';
import {
  computeSeasonLogisticsBreakdown,
  evaluateKpiThresholdAlerts,
  getResolvedKpiThresholds,
  getResolvedLogistics,
  KpiAlertsEvaluation,
  ROAD_CONDITION_META,
} from '../utils/logistics';
import {
  CLIMATE_HAZARD_META,
  getResolvedClimateImpact,
} from '../utils/climate';
import {
  applyFxRiskToAssumptions,
  getResolvedFxRisk,
} from '../utils/fxRisk';
import {
  applyClimateAndStorageToSeasons,
  computeStorageWeightLossRate,
  getResolvedStorageOptimization,
  STORAGE_METHOD_META,
} from '../utils/storage';
import {
  applyPartnersEcosystemToAssumptions,
  getResolvedPartnersEcosystem,
} from '../utils/partners';
import {
  evaluatePaddyStockSecurity,
  getResolvedPaddyStock,
  PaddyStockSecurityResult,
} from '../utils/stockSecurity';
import {
  applySubsidiesToAssumptions,
  getResolvedSubsidies,
  hasNonZeroSubsidy,
} from '../utils/subsidies';
import {
  DEFAULT_TREASURY_SETTINGS,
  TreasurySimulationSettings,
} from '../utils/treasury';
import {
  ConsecutiveNegativeTreasuryAlert,
  evaluateConsecutiveNegativeCashAlert,
} from '../utils/treasuryAlerts';
import {
  applyTraceabilityToAssumptions,
  getResolvedTraceability,
  hasActiveCertificationImpact,
} from '../utils/traceability';
import { getResolvedMarketComparison } from '../utils/marketComparison';
import {
  applyMaintenanceToAssumptions,
  computeMaintenanceCalendarMetrics,
  getResolvedMaintenanceSchedule,
} from '../utils/maintenance';
import {
  applyProductionZoneToAssumptions,
  getZoneProfileById,
  ProductionZoneId,
} from '../utils/productionZones';
import { getResolvedVatAssumptions } from '../utils/vatMadagascar';
import {
  EmailAlertHistoryEntry,
  EmailAlertRuleConfig,
  exportEmailAlertHistoryToCsv,
  loadEmailAlertConfig,
  loadEmailAlertHistory,
  saveEmailAlertConfig,
  saveEmailAlertHistory,
} from '../services/gmailAlerts';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SavedScenarioItem {
  id: string;
  name: string;
  description: string;
  assumptions: FinancialAssumptions;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AuditLogEntry {
  id: string;
  key: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  source: 'Formulaire' | 'Simulateur' | 'Scénario';
}

interface FinancialContextType {
  assumptions: FinancialAssumptions;
  model: FullFinancialModel;
  validation: ValidationResult;
  kpiAlerts: KpiAlertsEvaluation;
  paddyStockStatus: PaddyStockSecurityResult;
  treasurySettings: TreasurySimulationSettings;
  setTreasurySettings: React.Dispatch<React.SetStateAction<TreasurySimulationSettings>>;
  treasurySmartAlert: ConsecutiveNegativeTreasuryAlert;
  activeScenarioId: string;
  savedScenarios: SavedScenarioItem[];
  theme: 'dark' | 'light';
  themeMode: ThemeMode;
  systemPrefersDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  unitDisplay: 'standard' | 'millions';
  sensitivityType: 'rendement_vs_rotations' | 'prix_vente_vs_prix_paddy' | 'paddy_vs_transport_tri';
  sensitivityMatrix: SensitivityMatrix;
  lastRecalculatedAt: string;
  toasts: ToastMessage[];
  auditLog: AuditLogEntry[];
  clearAuditLog: () => void;
  emailAlertConfig: EmailAlertRuleConfig;
  updateEmailAlertConfig: (next: EmailAlertRuleConfig) => void;
  emailAlertHistory: EmailAlertHistoryEntry[];
  recordEmailAlertHistory: (entry: EmailAlertHistoryEntry) => void;
  clearEmailAlertHistory: () => void;
  exportEmailAlertHistoryCsv: () => void;
  pestelAnalysis: PestelAnalysisData;
  updatePestelCategory: (
    category: PestelCategoryKey,
    patch: Partial<Omit<PestelFactorEntry, 'category' | 'updatedAt'>>
  ) => void;
  resetPestelAnalysis: () => void;
  kpiNotes: KpiNoteItem[];
  analystName: string;
  setAnalystName: (name: string) => void;
  addKpiNote: (payload: {
    kpiId: string;
    kpiLabel: string;
    content: string;
    tag: KpiNoteTag;
    author?: string;
  }) => void;
  updateKpiNote: (
    noteId: string,
    patch: Partial<Pick<KpiNoteItem, 'content' | 'tag' | 'resolved' | 'author'>>
  ) => void;
  toggleKpiNoteResolved: (noteId: string) => void;
  deleteKpiNote: (noteId: string) => void;
  scenarioVoiceNotes: ScenarioVoiceNote[];
  addScenarioVoiceNote: (payload: {
    anchorId: FinancingPlanAnchorId;
    anchorLabel: string;
    anchorMetricSnapshot: string;
    scenarioContext: ScenarioVoiceNote['scenarioContext'];
    transcript: string;
    durationSeconds: number;
    expertRole: string;
    author?: string;
    audioDataUrl?: string;
    speechLang?: string;
  }) => void;
  toggleScenarioVoiceNoteResolved: (noteId: string) => void;
  deleteScenarioVoiceNote: (noteId: string) => void;
  dashboardReportNotes: string;
  setDashboardReportNotes: (notes: string) => void;
  autoBalanceSeasons: boolean;
  setAutoBalanceSeasons: React.Dispatch<React.SetStateAction<boolean>>;
  notify: (type: ToastMessage['type'], message: string) => void;
  dismissToast: (id: string) => void;
  // Updaters
  setAssumptions: React.Dispatch<React.SetStateAction<FinancialAssumptions>>;
  updateSeasonField: (
    season: 'hauteSaison' | 'basseSaison',
    field: keyof FinancialAssumptions['hauteSaison'],
    value: number,
    source?: 'Formulaire' | 'Simulateur'
  ) => void;
  updateInvestmentField: (field: keyof FinancialAssumptions['investment'], value: number) => void;
  updateGeneralField: (
    field:
      | 'selectedBagCapacityKg'
      | 'corporateTaxRate'
      | 'discountRate'
      | 'investorShare'
      | 'growthRateYear2'
      | 'growthRateYear3'
      | 'ambitiousGrowthRateYear2'
      | 'ambitiousGrowthRateYear3'
      | 'avgVolumePerClientKgMonthly',
    value: number
  ) => void;
  updateLogistics: (patch: Partial<LogisticsAssumptions>) => void;
  applyProductionRegion: (zoneId: ProductionZoneId, syncPaddyPrice?: boolean) => void;
  updateClimateImpact: (patch: Partial<ClimateImpactAssumptions>) => void;
  updateFxRisk: (patch: Partial<FxRiskAssumptions>) => void;
  updateStorageOptimization: (patch: Partial<StorageOptimizationAssumptions>) => void;
  updatePartnersEcosystem: (patch: Partial<PartnersEcosystemAssumptions>) => void;
  updatePaddyStock: (patch: Partial<PaddyStockAssumptions>) => void;
  updateSubsidies: (patch: Partial<SubsidiesAssumptions>) => void;
  updateTraceabilityCertification: (
    patch: Partial<TraceabilityCertificationAssumptions>
  ) => void;
  updateMarketComparison: (patch: Partial<MarketComparisonAssumptions>) => void;
  updateMachineMaintenance: (patch: Partial<MachineMaintenanceSchedule>) => void;
  updateVatSettings: (patch: Partial<VatAssumptions>) => void;
  updateKpiThresholds: (patch: Partial<KpiAlertThresholds>) => void;
  // Dynamic cost list updaters
  updateVariableCostPerKg: (id: string, field: 'costHS' | 'costBS' | 'label', value: string | number) => void;
  addVariableCostPerKg: (label: string, costHS: number, costBS: number) => void;
  removeVariableCostPerKg: (id: string) => void;
  updateCostPerRotation: (id: string, field: 'costHS' | 'costBS' | 'label', value: string | number) => void;
  addCostPerRotation: (label: string, costHS: number, costBS: number) => void;
  removeCostPerRotation: (id: string) => void;
  updateFixedMonthlyCharge: (id: string, field: 'amount' | 'label', value: string | number) => void;
  addFixedMonthlyCharge: (label: string, amount: number) => void;
  removeFixedMonthlyCharge: (id: string) => void;
  updateBagOption: (id: string, field: 'capacityKg' | 'unitPriceAr', value: number) => void;
  addBagOption: (capacityKg: number, unitPriceAr: number) => void;
  removeBagOption: (id: string) => void;
  // Scenarios management
  saveScenario: (name: string, description: string) => void;
  loadScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, newName: string, newDescription?: string) => void;
  resetToDefaults: () => void;
  // Import / Export
  exportToJson: () => string;
  importFromJson: (jsonStr: string) => boolean;
  exportToExcel: () => void;
  exportProjectionsToCsv: () => void;
  exportFiveYearProjectionsToCsv: () => void;
  exportSeasonalIncomeStatementToCsv: () => void;
  // Projects management
  projects: ProjectRecord[];
  activeProject: ProjectRecord;
  activeProjectId: string;
  isProjectNameTaken: (name: string, excludeId?: string) => boolean;
  switchProject: (projectId: string) => void;
  createExcelProject: (payload: {
    name: string;
    description: string;
    assumptions: FinancialAssumptions;
    excelMeta: ExcelImportMetadata;
  }) => { ok: boolean; error?: string; project?: ProjectRecord };
  duplicateProject: (
    projectId: string,
    customName?: string
  ) => { ok: boolean; error?: string; project?: ProjectRecord };
  renameProject: (
    projectId: string,
    newName: string,
    newDescription?: string
  ) => { ok: boolean; error?: string };
  deleteProject: (projectId: string) => void;
  // Controls
  toggleTheme: () => void;
  toggleUnitDisplay: () => void;
  setSensitivityType: (
    type: 'rendement_vs_rotations' | 'prix_vente_vs_prix_paddy' | 'paddy_vs_transport_tri'
  ) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_ASSUMPTIONS = 'rizi_assumptions_v6';
const LOCAL_STORAGE_KEY_SCENARIOS = 'rizi_scenarios_v6';
const LOCAL_STORAGE_KEY_ACTIVE_SCENARIO = 'rizi_active_scenario_v6';
const LOCAL_STORAGE_KEY_THEME = 'rizi_theme_v6';
const LOCAL_STORAGE_KEY_THEME_MODE = 'rizi_theme_mode_v6';
const LOCAL_STORAGE_KEY_UNIT = 'rizi_unit_v6';
const LOCAL_STORAGE_KEY_AUDIT_LOG = 'rizi_audit_log_v6';
const LOCAL_STORAGE_KEY_PROJECTS = 'rizi_projects_v6';
const LOCAL_STORAGE_KEY_ACTIVE_PROJECT = 'rizi_active_project_v6';
const LOCAL_STORAGE_KEY_ANALYST_NAME = 'rizi_analyst_name_v6';
export const DEFAULT_PROJECT_ID = 'default-riz-madagascar';

const formatInt = (n: number): string => Math.round(n).toLocaleString('fr-FR');
const formatPctVal = (ratio: number, decimals: number = 1): string =>
  `${(ratio * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;

function formatSeasonValue(
  field: keyof FinancialAssumptions['hauteSaison'],
  value: number
): { label: string; formatted: string } {
  switch (field) {
    case 'months':
      return { label: 'Durée', formatted: `${value} mois` };
    case 'rotationsPerMonth':
      return { label: 'Rotations / mois', formatted: `${value} rot/m` };
    case 'paddyBoughtKgPerRotation':
      return { label: 'Paddy acheté / rot.', formatted: `${formatInt(value)} kg` };
    case 'yieldPaddyToRice':
      return { label: 'Rendement paddy→riz', formatted: formatPctVal(value, 1) };
    case 'riceSellingPriceArPerKg':
      return { label: 'Prix vente riz', formatted: `${formatInt(value)} Ar/kg` };
    case 'byproductSellingPriceArPerKg':
      return { label: 'Prix sous-produits', formatted: `${formatInt(value)} Ar/kg` };
  }
}

function isValidAssumptionsShape(obj: unknown): obj is FinancialAssumptions {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.hauteSaison === 'object' &&
    candidate.hauteSaison !== null &&
    typeof candidate.basseSaison === 'object' &&
    candidate.basseSaison !== null &&
    Array.isArray(candidate.bagOptions) &&
    Array.isArray(candidate.costsPerKgPaddy) &&
    Array.isArray(candidate.costsPerRotation) &&
    Array.isArray(candidate.fixedMonthlyCharges) &&
    typeof candidate.investment === 'object' &&
    candidate.investment !== null
  );
}

function createDefaultProjectSnapshot(): ProjectRecord {
  let initialAssumptions = DEFAULT_ASSUMPTIONS;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ASSUMPTIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (isValidAssumptionsShape(parsed)) initialAssumptions = parsed;
    }
  } catch {
    // ignore
  }

  let initialScenarios: SavedScenarioItem[] = [
    {
      id: 'realiste-default',
      name: 'Scénario Réaliste (Standard)',
      description: 'Valeurs nominales validées du Dashboard v6.',
      assumptions: JSON.parse(JSON.stringify(initialAssumptions)),
      createdAt: new Date().toISOString(),
    },
  ];
  try {
    const savedSc = localStorage.getItem(LOCAL_STORAGE_KEY_SCENARIOS);
    if (savedSc) {
      const parsed = JSON.parse(savedSc);
      if (Array.isArray(parsed) && parsed.length > 0) initialScenarios = parsed;
    }
  } catch {
    // ignore
  }

  let initialActiveSc = initialScenarios[0].id;
  try {
    const savedId = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_SCENARIO);
    if (savedId && initialScenarios.some((s) => s.id === savedId)) {
      initialActiveSc = savedId;
    }
  } catch {
    // ignore
  }

  let initialAudit: AuditLogEntry[] = [];
  try {
    const savedLog = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT_LOG);
    if (savedLog) {
      const parsed = JSON.parse(savedLog);
      if (Array.isArray(parsed)) initialAudit = parsed.slice(0, 200);
    }
  } catch {
    // ignore
  }

  const now = new Date().toISOString();
  return {
    id: DEFAULT_PROJECT_ID,
    name: 'RizMadagascar — Modèle v6.0',
    description: 'Projet de référence filière paddy & riz à Madagascar (HS/BS).',
    source: 'default',
    createdAt: now,
    updatedAt: now,
    assumptions: initialAssumptions,
    savedScenarios: initialScenarios,
    activeScenarioId: initialActiveSc,
    auditLog: initialAudit,
    pestelAnalysis: createDefaultPestelAnalysis(),
    kpiNotes: [],
    scenarioVoiceNotes: [],
    dashboardReportNotes: '',
  };
}

function loadInitialProjects(): { projects: ProjectRecord[]; activeProjectId: string } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validProjects = parsed.filter(
          (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && isValidAssumptionsShape(p.assumptions)
        ) as ProjectRecord[];
        if (validProjects.length > 0) {
          const savedActive = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_PROJECT);
          const activeId =
            savedActive && validProjects.some((p) => p.id === savedActive)
              ? savedActive
              : validProjects[0].id;
          return { projects: validProjects, activeProjectId: activeId };
        }
      }
    }
  } catch {
    // ignore
  }

  const def = createDefaultProjectSnapshot();
  return { projects: [def], activeProjectId: def.id };
}

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialBootstrap = useMemo(() => loadInitialProjects(), []);

  const [projects, setProjects] = useState<ProjectRecord[]>(initialBootstrap.projects);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialBootstrap.activeProjectId);

  const initialActiveProject =
    initialBootstrap.projects.find((p) => p.id === initialBootstrap.activeProjectId) ||
    initialBootstrap.projects[0];

  // 1. Assumptions state initialized from active project
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    initialActiveProject.assumptions
  );

  // 2. Saved Scenarios list initialized from active project
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioItem[]>(
    initialActiveProject.savedScenarios
  );

  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    initialActiveProject.activeScenarioId
  );

  // 3. Theme with automatic prefers-color-scheme detection + manual override
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const savedMode = localStorage.getItem(LOCAL_STORAGE_KEY_THEME_MODE);
      if (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark') {
        return savedMode;
      }
    } catch {
      // ignore
    }
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  const theme: 'dark' | 'light' =
    themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  // 4. Unit display (now persisted!)
  const [unitDisplay, setUnitDisplay] = useState<'standard' | 'millions'>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_UNIT);
      if (saved === 'standard' || saved === 'millions') return saved;
    } catch {
      // ignore
    }
    return 'standard';
  });

  // 5. Sensitivity matrix type
  const [sensitivityType, setSensitivityType] = useState<
    'rendement_vs_rotations' | 'prix_vente_vs_prix_paddy' | 'paddy_vs_transport_tri'
  >('rendement_vs_rotations');

  // 6. Auto-balance HS + BS = 12 months
  const [autoBalanceSeasons, setAutoBalanceSeasons] = useState<boolean>(true);

  // 6b. Treasury stress-test settings (shared between Dashboard alerts and Gestion de Trésorerie)
  const [treasurySettings, setTreasurySettings] = useState<TreasurySimulationSettings>(
    DEFAULT_TREASURY_SETTINGS
  );

  // 7. Non-blocking Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 8. Audit Log initialized from active project
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(
    initialActiveProject.auditLog || []
  );

  // 9. PESTEL Analysis initialized from active project
  const [pestelAnalysis, setPestelAnalysis] = useState<PestelAnalysisData>(
    () => initialActiveProject.pestelAnalysis || createDefaultPestelAnalysis()
  );

  // 10. Collaborative KPI Notes, Scenario Voice Notes & active Analyst Name
  const [kpiNotes, setKpiNotes] = useState<KpiNoteItem[]>(
    () => initialActiveProject.kpiNotes || []
  );
  const [scenarioVoiceNotes, setScenarioVoiceNotes] = useState<ScenarioVoiceNote[]>(
    () => initialActiveProject.scenarioVoiceNotes || []
  );
  const [dashboardReportNotes, setDashboardReportNotes] = useState<string>(
    () => initialActiveProject.dashboardReportNotes || ''
  );
  const [lastRecalculatedAt, setLastRecalculatedAt] = useState<string>(() =>
    new Date().toISOString()
  );

  const [analystName, setAnalystNameState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ANALYST_NAME);
      if (saved && saved.trim()) return saved.trim();
    } catch {
      // ignore
    }
    return 'Analyste financier';
  });

  const setAnalystName = useCallback((name: string) => {
    const clean = name.trim() || 'Analyste financier';
    setAnalystNameState(clean);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ANALYST_NAME, clean);
    } catch {
      // ignore
    }
  }, []);

  const skipProjectSyncRef = useRef(false);

  const assumptionsRef = useRef(assumptions);
  useEffect(() => {
    assumptionsRef.current = assumptions;
  }, [assumptions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT_LOG, JSON.stringify(auditLog));
    } catch {
      // ignore
    }
  }, [auditLog]);

  const recordAuditChange = useCallback(
    (
      key: string,
      fieldLabel: string,
      oldValue: string,
      newValue: string,
      source: AuditLogEntry['source'] = 'Formulaire'
    ) => {
      if (oldValue === newValue) return;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      setAuditLog((prev) => {
        const latest = prev[0];
        if (
          latest &&
          latest.key === key &&
          latest.source === source &&
          nowMs - new Date(latest.timestamp).getTime() <= 1500
        ) {
          if (latest.oldValue === newValue) {
            return prev.slice(1);
          }
          const updatedLatest: AuditLogEntry = {
            ...latest,
            fieldLabel,
            newValue,
            timestamp: nowIso,
          };
          return [updatedLatest, ...prev.slice(1)];
        }

        const entry: AuditLogEntry = {
          id: `audit-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
          key,
          fieldLabel,
          oldValue,
          newValue,
          timestamp: nowIso,
          source,
        };
        return [entry, ...prev].slice(0, 200);
      });
    },
    []
  );

  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
  }, []);

  const [emailAlertConfig, setEmailAlertConfig] = useState<EmailAlertRuleConfig>(() =>
    loadEmailAlertConfig()
  );
  const [emailAlertHistory, setEmailAlertHistory] = useState<EmailAlertHistoryEntry[]>(() =>
    loadEmailAlertHistory()
  );

  const updateEmailAlertConfig = useCallback((next: EmailAlertRuleConfig) => {
    setEmailAlertConfig(next);
    saveEmailAlertConfig(next);
  }, []);

  const recordEmailAlertHistory = useCallback((entry: EmailAlertHistoryEntry) => {
    setEmailAlertHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 100);
      saveEmailAlertHistory(updated);
      return updated;
    });
  }, []);

  const clearEmailAlertHistory = useCallback(() => {
    setEmailAlertHistory([]);
    saveEmailAlertHistory([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  // Sync resolved theme & themeMode to document element and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME_MODE, themeMode);
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme, themeMode]);

  // Persist unitDisplay to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_UNIT, unitDisplay);
    } catch {
      // ignore
    }
  }, [unitDisplay]);

  // Persist assumptions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ASSUMPTIONS, JSON.stringify(assumptions));
    } catch {
      // ignore
    }
  }, [assumptions]);

  // Persist scenarios to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SCENARIOS, JSON.stringify(savedScenarios));
    } catch {
      // ignore
    }
  }, [savedScenarios]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_SCENARIO, activeScenarioId);
    } catch {
      // ignore
    }
  }, [activeScenarioId]);

  // Keep active project synchronized with edits & persist all projects
  useEffect(() => {
    if (skipProjectSyncRef.current) {
      skipProjectSyncRef.current = false;
      return;
    }
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProjectId
          ? {
              ...proj,
              assumptions,
              savedScenarios,
              activeScenarioId,
              auditLog,
              pestelAnalysis,
              kpiNotes,
              scenarioVoiceNotes,
              dashboardReportNotes,
              updatedAt: new Date().toISOString(),
            }
          : proj
      )
    );
  }, [
    activeProjectId,
    assumptions,
    savedScenarios,
    activeScenarioId,
    auditLog,
    pestelAnalysis,
    kpiNotes,
    scenarioVoiceNotes,
    dashboardReportNotes,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_PROJECT, activeProjectId);
    } catch {
      // ignore
    }
  }, [activeProjectId]);

  // Validation
  const validation = useMemo(() => validateAssumptions(assumptions), [assumptions]);

  // Recalculate full financial model in real time
  const model = useMemo(() => {
    return calculateFullModel(assumptions);
  }, [assumptions]);

  useEffect(() => {
    setLastRecalculatedAt(new Date().toISOString());
  }, [assumptions]);

  // Real-time KPI Threshold Alerts (VAN, TRI, Payback)
  const kpiAlerts = useMemo(
    () => evaluateKpiThresholdAlerts(model, assumptions),
    [model, assumptions]
  );

  // Real-time Paddy Stock vs Safety Threshold Monitoring
  const paddyStockStatus = useMemo(
    () => evaluatePaddyStockSecurity(assumptions, model),
    [assumptions, model]
  );

  const prevStockStatusRef = useRef<PaddyStockSecurityResult['status'] | null>(null);
  const lastStockProjectRef = useRef<string>(activeProjectId);

  useEffect(() => {
    if (prevStockStatusRef.current === null || lastStockProjectRef.current !== activeProjectId) {
      prevStockStatusRef.current = paddyStockStatus.status;
      lastStockProjectRef.current = activeProjectId;
      return;
    }
    if (
      prevStockStatusRef.current === 'securise' &&
      (paddyStockStatus.status === 'critique' || paddyStockStatus.status === 'vigilance')
    ) {
      notify(
        'error',
        `Alerte stock paddy : ${formatInt(paddyStockStatus.usableStockKg)} kg disponibles sous le seuil de sécurité (${formatInt(paddyStockStatus.safetyThresholdKg)} kg).`
      );
    }
    prevStockStatusRef.current = paddyStockStatus.status;
  }, [paddyStockStatus, activeProjectId, notify]);

  // Real-time Intelligent Treasury Alert (2+ consecutive negative months)
  const treasurySmartAlert = useMemo(
    () => evaluateConsecutiveNegativeCashAlert(model, treasurySettings),
    [model, treasurySettings]
  );

  const prevTreasuryStreakRef = useRef<boolean | null>(null);
  const lastTreasuryProjectRef = useRef<string>(activeProjectId);

  useEffect(() => {
    if (
      prevTreasuryStreakRef.current === null ||
      lastTreasuryProjectRef.current !== activeProjectId
    ) {
      prevTreasuryStreakRef.current = treasurySmartAlert.hasConsecutiveNegativeStreak;
      lastTreasuryProjectRef.current = activeProjectId;
      return;
    }
    if (!prevTreasuryStreakRef.current && treasurySmartAlert.hasConsecutiveNegativeStreak) {
      notify(
        'error',
        `Alerte trésorerie : solde négatif prévu pendant ${treasurySmartAlert.maxConsecutiveMonths} mois consécutifs (${treasurySmartAlert.streakStartLabel}–${treasurySmartAlert.streakEndLabel}). Ajustez le plan d’investissement ou les conditions de vente.`
      );
    }
    prevTreasuryStreakRef.current = treasurySmartAlert.hasConsecutiveNegativeStreak;
  }, [treasurySmartAlert, activeProjectId, notify]);

  const prevBreachedRef = useRef<Set<string> | null>(null);
  const lastTrackedProjectRef = useRef<string>(activeProjectId);

  useEffect(() => {
    const currentSet = new Set(kpiAlerts.breachedItems.map((i) => i.id));
    if (prevBreachedRef.current === null || lastTrackedProjectRef.current !== activeProjectId) {
      prevBreachedRef.current = currentSet;
      lastTrackedProjectRef.current = activeProjectId;
      return;
    }
    const newlyBreached = kpiAlerts.breachedItems.filter(
      (item) => !prevBreachedRef.current?.has(item.id)
    );
    if (newlyBreached.length > 0) {
      const summary = newlyBreached
        .map((b) => `${b.label} (${b.actualFormatted} vs ${b.thresholdFormatted})`)
        .join(' · ');
      notify('error', `Alerte seuil KPI : ${summary}`);
    }
    prevBreachedRef.current = currentSet;
  }, [kpiAlerts, activeProjectId, notify]);

  // Sensitivity matrix calculation
  const sensitivityMatrix = useMemo(() => {
    const matrixType =
      sensitivityType === 'paddy_vs_transport_tri'
        ? 'prix_vente_vs_prix_paddy'
        : sensitivityType;
    return computeSensitivityMatrix(assumptions, matrixType);
  }, [assumptions, sensitivityType]);

  // Updaters
  const updateSeasonField = (
    season: 'hauteSaison' | 'basseSaison',
    field: keyof FinancialAssumptions['hauteSaison'],
    value: number,
    source: 'Formulaire' | 'Simulateur' = 'Formulaire'
  ) => {
    const cleanVal = Number.isNaN(value) ? 0 : value;
    const prevSeasonVal = assumptionsRef.current[season][field];
    const seasonTag = season === 'hauteSaison' ? 'HS' : 'BS';
    const meta = formatSeasonValue(field, cleanVal);
    const prevMeta = formatSeasonValue(field, prevSeasonVal);

    if (field === 'months' && autoBalanceSeasons) {
      const clamped = Math.max(1, Math.min(11, Math.round(cleanVal)));
      const clampedMeta = formatSeasonValue(field, clamped);
      recordAuditChange(
        `${season}.${field}`,
        `${meta.label} (${seasonTag})`,
        prevMeta.formatted,
        clampedMeta.formatted,
        source
      );
    } else {
      recordAuditChange(
        `${season}.${field}`,
        `${meta.label} (${seasonTag})`,
        prevMeta.formatted,
        meta.formatted,
        source
      );
    }

    setAssumptions((prev) => {
      if (field === 'months' && autoBalanceSeasons) {
        const clamped = Math.max(1, Math.min(11, Math.round(cleanVal)));
        const otherSeason = season === 'hauteSaison' ? 'basseSaison' : 'hauteSaison';
        return {
          ...prev,
          [season]: {
            ...prev[season],
            months: clamped,
          },
          [otherSeason]: {
            ...prev[otherSeason],
            months: 12 - clamped,
          },
        };
      }
      const nextSeason = {
        ...prev[season],
        [field]: cleanVal,
      };
      const nextState: FinancialAssumptions = {
        ...prev,
        [season]: nextSeason,
      };
      // Keep climate baseline synced when user edits paddy/yield under normal conditions
      if (field === 'paddyBoughtKgPerRotation' || field === 'yieldPaddyToRice') {
        const currentClimate = getResolvedClimateImpact(prev);
        const currentStorage = getResolvedStorageOptimization(prev);
        const storageLossActive =
          currentStorage.enabled &&
          computeStorageWeightLossRate(currentStorage).totalLossRate > 1e-6;
        const climateActive =
          currentClimate.enabled &&
          (currentClimate.hazardType !== 'normal' ||
            Math.abs(currentClimate.fieldYieldShockPercent) > 1e-6 ||
            Math.abs(currentClimate.millingYieldDeltaPoints) > 1e-6);

        if (!climateActive && (field === 'paddyBoughtKgPerRotation' || !storageLossActive)) {
          nextState.climateImpact = {
            ...currentClimate,
            baselinePaddyKgHS:
              season === 'hauteSaison' && field === 'paddyBoughtKgPerRotation'
                ? cleanVal
                : currentClimate.baselinePaddyKgHS,
            baselinePaddyKgBS:
              season === 'basseSaison' && field === 'paddyBoughtKgPerRotation'
                ? cleanVal
                : currentClimate.baselinePaddyKgBS,
            baselineMillingYieldHS:
              season === 'hauteSaison' && field === 'yieldPaddyToRice'
                ? cleanVal
                : currentClimate.baselineMillingYieldHS,
            baselineMillingYieldBS:
              season === 'basseSaison' && field === 'yieldPaddyToRice'
                ? cleanVal
                : currentClimate.baselineMillingYieldBS,
          };
        }
      }
      // Keep traceability baseline selling price synced when certification premium is inactive
      if (field === 'riceSellingPriceArPerKg') {
        const currentCert = getResolvedTraceability(prev);
        if (!currentCert.enabled || !hasActiveCertificationImpact(currentCert)) {
          nextState.traceabilityCertification = {
            ...currentCert,
            baselinePriceHS:
              season === 'hauteSaison' ? cleanVal : currentCert.baselinePriceHS,
            baselinePriceBS:
              season === 'basseSaison' ? cleanVal : currentCert.baselinePriceBS,
          };
        }
      }
      // Keep maintenance baseline rotations synced when production loss impact is off
      if (field === 'rotationsPerMonth') {
        const currentMaint = getResolvedMaintenanceSchedule(prev);
        if (!currentMaint.applyProductionLossToModel) {
          nextState.machineMaintenance = {
            ...currentMaint,
            baselineRotationsHS:
              season === 'hauteSaison' ? cleanVal : currentMaint.baselineRotationsHS,
            baselineRotationsBS:
              season === 'basseSaison' ? cleanVal : currentMaint.baselineRotationsBS,
          };
        }
      }
      return nextState;
    });
  };

  const updateInvestmentField = (
    field: keyof FinancialAssumptions['investment'],
    value: number
  ) => {
    const cleanVal = Number.isNaN(value) ? 0 : value;
    const prevVal = assumptionsRef.current.investment[field];
    const labelMap: Record<keyof FinancialAssumptions['investment'], string> = {
      materielAr: 'Matériel & Équipement',
      enregistrementAr: 'Frais d’enregistrement légal',
      cashBufferAr: 'Cash buffer (trésorerie)',
    };
    recordAuditChange(
      `investment.${field}`,
      labelMap[field],
      `${formatInt(prevVal)} Ar`,
      `${formatInt(cleanVal)} Ar`,
      'Formulaire'
    );
    setAssumptions((prev) => {
      const nextState: FinancialAssumptions = {
        ...prev,
        investment: {
          ...prev.investment,
          [field]: cleanVal,
        },
      };
      if (field === 'materielAr') {
        const currentFx = getResolvedFxRisk(prev);
        if (!currentFx.enabled || Math.abs(currentFx.ariaryFluctuationPercent) < 1e-6) {
          nextState.fxRisk = {
            ...currentFx,
            baselineMaterielAr: cleanVal,
          };
        }
      }
      if (field === 'materielAr' || field === 'enregistrementAr') {
        const currentSub = getResolvedSubsidies(prev);
        if (!currentSub.enabled || !hasNonZeroSubsidy(currentSub)) {
          nextState.subsidies = {
            ...currentSub,
            baselineMaterielAr:
              field === 'materielAr' ? cleanVal : currentSub.baselineMaterielAr,
            baselineEnregistrementAr:
              field === 'enregistrementAr' ? cleanVal : currentSub.baselineEnregistrementAr,
          };
        }
      }
      return nextState;
    });
  };

  const updateGeneralField = (
    field:
      | 'selectedBagCapacityKg'
      | 'corporateTaxRate'
      | 'discountRate'
      | 'investorShare'
      | 'growthRateYear2'
      | 'growthRateYear3'
      | 'ambitiousGrowthRateYear2'
      | 'ambitiousGrowthRateYear3'
      | 'avgVolumePerClientKgMonthly',
    value: number
  ) => {
    const cleanVal = Number.isNaN(value) ? 0 : value;
    const prevVal = assumptionsRef.current[field];
    const formatGeneral = (f: typeof field, v: number): { label: string; text: string } => {
      switch (f) {
        case 'selectedBagCapacityKg':
          return { label: 'Format sac actif', text: `${v} kg` };
        case 'corporateTaxRate':
          return { label: 'Taux d’impôt (IR)', text: formatPctVal(v, 1) };
        case 'discountRate':
          return { label: 'Taux d’actualisation (r)', text: formatPctVal(v, 1) };
        case 'investorShare':
          return { label: 'Part Investisseur', text: formatPctVal(v, 0) };
        case 'growthRateYear2':
          return { label: 'Croissance Réaliste A2', text: formatPctVal(v, 0) };
        case 'growthRateYear3':
          return { label: 'Croissance Réaliste A3', text: formatPctVal(v, 0) };
        case 'ambitiousGrowthRateYear2':
          return { label: 'Croissance Ambitieuse A2', text: formatPctVal(v, 0) };
        case 'ambitiousGrowthRateYear3':
          return { label: 'Croissance Ambitieuse A3', text: formatPctVal(v, 0) };
        case 'avgVolumePerClientKgMonthly':
          return { label: 'Volume moyen / client', text: `${formatInt(v)} kg/mois` };
      }
    };
    const prevFmt = formatGeneral(field, prevVal);
    const nextFmt = formatGeneral(field, cleanVal);
    recordAuditChange(`general.${field}`, nextFmt.label, prevFmt.text, nextFmt.text, 'Formulaire');

    setAssumptions((prev) => ({
      ...prev,
      [field]: cleanVal,
    }));
  };

  const updateLogistics = (patch: Partial<LogisticsAssumptions>) => {
    const prevLog = getResolvedLogistics(assumptionsRef.current);
    const nextLog: LogisticsAssumptions = {
      ...prevLog,
      ...patch,
    };

    if (patch.enabled !== undefined && patch.enabled !== prevLog.enabled) {
      recordAuditChange(
        'logistics.enabled',
        'Logistique auto → Compte de résultat',
        prevLog.enabled ? 'Activée' : 'Manuelle',
        nextLog.enabled ? 'Activée' : 'Manuelle',
        'Formulaire'
      );
    }
    if (
      patch.distanceOneWayKmHS !== undefined &&
      patch.distanceOneWayKmHS !== prevLog.distanceOneWayKmHS
    ) {
      recordAuditChange(
        'logistics.distanceHS',
        'Distance collecte (HS)',
        `${prevLog.distanceOneWayKmHS} km`,
        `${nextLog.distanceOneWayKmHS} km`,
        'Formulaire'
      );
    }
    if (
      patch.distanceOneWayKmBS !== undefined &&
      patch.distanceOneWayKmBS !== prevLog.distanceOneWayKmBS
    ) {
      recordAuditChange(
        'logistics.distanceBS',
        'Distance collecte (BS)',
        `${prevLog.distanceOneWayKmBS} km`,
        `${nextLog.distanceOneWayKmBS} km`,
        'Formulaire'
      );
    }
    if (patch.roadConditionHS !== undefined && patch.roadConditionHS !== prevLog.roadConditionHS) {
      recordAuditChange(
        'logistics.roadHS',
        'État route (HS)',
        ROAD_CONDITION_META[prevLog.roadConditionHS].shortLabel,
        ROAD_CONDITION_META[nextLog.roadConditionHS].shortLabel,
        'Formulaire'
      );
    }
    if (patch.roadConditionBS !== undefined && patch.roadConditionBS !== prevLog.roadConditionBS) {
      recordAuditChange(
        'logistics.roadBS',
        'État route (BS)',
        ROAD_CONDITION_META[prevLog.roadConditionBS].shortLabel,
        ROAD_CONDITION_META[nextLog.roadConditionBS].shortLabel,
        'Formulaire'
      );
    }
    if (
      patch.fuelPriceArPerLiter !== undefined &&
      patch.fuelPriceArPerLiter !== prevLog.fuelPriceArPerLiter
    ) {
      recordAuditChange(
        'logistics.fuelPrice',
        'Prix carburant (Gasoil)',
        `${formatInt(prevLog.fuelPriceArPerLiter)} Ar/L`,
        `${formatInt(nextLog.fuelPriceArPerLiter)} Ar/L`,
        'Formulaire'
      );
    }
    if (
      patch.fuelConsumptionLPer100Km !== undefined &&
      patch.fuelConsumptionLPer100Km !== prevLog.fuelConsumptionLPer100Km
    ) {
      recordAuditChange(
        'logistics.consumption',
        'Consommation camion',
        `${prevLog.fuelConsumptionLPer100Km} L/100km`,
        `${nextLog.fuelConsumptionLPer100Km} L/100km`,
        'Formulaire'
      );
    }
    if (
      patch.truckTollAndWearArPerKm !== undefined &&
      patch.truckTollAndWearArPerKm !== prevLog.truckTollAndWearArPerKm
    ) {
      recordAuditChange(
        'logistics.wear',
        'Usure & mission / km',
        `${formatInt(prevLog.truckTollAndWearArPerKm)} Ar/km`,
        `${formatInt(nextLog.truckTollAndWearArPerKm)} Ar/km`,
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const mergedLog: LogisticsAssumptions = {
        ...getResolvedLogistics(prev),
        ...patch,
      };
      if (!mergedLog.enabled) {
        return {
          ...prev,
          logistics: mergedLog,
        };
      }

      const hsCost = computeSeasonLogisticsBreakdown(mergedLog, 'hauteSaison').totalCostPerRotationAr;
      const bsCost = computeSeasonLogisticsBreakdown(mergedLog, 'basseSaison').totalCostPerRotationAr;
      const hasFuelItem = prev.costsPerRotation.some((c) => c.id === 'rot-carburant');
      const nextCostsPerRotation = hasFuelItem
        ? prev.costsPerRotation.map((c) =>
            c.id === 'rot-carburant'
              ? { ...c, costHS: hsCost, costBS: bsCost }
              : c
          )
        : [
            {
              id: 'rot-carburant',
              label: 'Carburant & Collecte paddy',
              costHS: hsCost,
              costBS: bsCost,
            },
            ...prev.costsPerRotation,
          ];

      return {
        ...prev,
        logistics: mergedLog,
        costsPerRotation: nextCostsPerRotation,
        ...(prev.partnersEcosystem
          ? {
              partnersEcosystem: {
                ...prev.partnersEcosystem,
                syncTransportCosts: false,
              },
            }
          : {}),
      };
    });
  };

  const applyProductionRegion = (zoneId: ProductionZoneId, syncPaddyPrice = true) => {
    const prevZone = getZoneProfileById(assumptionsRef.current.selectedRegionId);
    const nextZone = getZoneProfileById(zoneId);
    if (prevZone.id !== nextZone.id) {
      recordAuditChange(
        'region.selectedRegionId',
        'Région rizicole (Madagascar)',
        prevZone.shortName,
        nextZone.shortName,
        'Formulaire'
      );
    }
    setAssumptions((prev) =>
      applyProductionZoneToAssumptions(prev, zoneId, { syncPaddyPrice })
    );
    notify(
      'success',
      `Région « ${nextZone.shortName} » appliquée : transport (${nextZone.distanceKmHS}/${nextZone.distanceKmBS} km) et rendement (${(nextZone.avgFieldYieldKgPerHa / 1000).toFixed(1)} t/ha) calibrés.`
    );
  };

  const updateClimateImpact = (patch: Partial<ClimateImpactAssumptions>) => {
    const prevClimate = getResolvedClimateImpact(assumptionsRef.current);
    let nextPatch = { ...patch };

    if (patch.hazardType !== undefined && patch.hazardType !== prevClimate.hazardType) {
      const meta = CLIMATE_HAZARD_META[patch.hazardType];
      if (patch.fieldYieldShockPercent === undefined) {
        nextPatch.fieldYieldShockPercent = meta.defaultFieldShockPercent;
      }
      if (patch.millingYieldDeltaPoints === undefined) {
        nextPatch.millingYieldDeltaPoints = meta.defaultMillingDeltaPoints;
      }
      recordAuditChange(
        'climate.hazardType',
        'Aléa climatique',
        CLIMATE_HAZARD_META[prevClimate.hazardType].shortLabel,
        meta.shortLabel,
        'Formulaire'
      );
    } else if (
      patch.fieldYieldShockPercent !== undefined &&
      patch.fieldYieldShockPercent !== prevClimate.fieldYieldShockPercent
    ) {
      recordAuditChange(
        'climate.fieldYieldShockPercent',
        'Choc rendement paddy/ha',
        `${(prevClimate.fieldYieldShockPercent * 100).toFixed(0)} %`,
        `${(patch.fieldYieldShockPercent * 100).toFixed(0)} %`,
        'Formulaire'
      );
    } else if (patch.enabled !== undefined && patch.enabled !== prevClimate.enabled) {
      recordAuditChange(
        'climate.enabled',
        'Répercussion climatique → CA',
        prevClimate.enabled ? 'Active' : 'Simulée seule',
        patch.enabled ? 'Active' : 'Simulée seule',
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const resolvedPrev = getResolvedClimateImpact(prev);
      const mergedClimate: ClimateImpactAssumptions = {
        ...resolvedPrev,
        ...nextPatch,
      };
      const resolvedStorage = getResolvedStorageOptimization(prev);
      const syncedSeasons = applyClimateAndStorageToSeasons(
        prev,
        mergedClimate,
        resolvedStorage
      );
      return {
        ...prev,
        climateImpact: mergedClimate,
        ...syncedSeasons,
      };
    });
  };

  const updateFxRisk = (patch: Partial<FxRiskAssumptions>) => {
    const prevFx = getResolvedFxRisk(assumptionsRef.current);
    const nextFx: FxRiskAssumptions = {
      ...prevFx,
      ...patch,
    };

    if (
      patch.ariaryFluctuationPercent !== undefined &&
      patch.ariaryFluctuationPercent !== prevFx.ariaryFluctuationPercent
    ) {
      recordAuditChange(
        'fxRisk.ariaryFluctuationPercent',
        'Fluctuation Ariary (Change)',
        formatPctVal(prevFx.ariaryFluctuationPercent, 0),
        formatPctVal(nextFx.ariaryFluctuationPercent, 0),
        'Formulaire'
      );
    } else if (
      patch.referenceCurrency !== undefined &&
      patch.referenceCurrency !== prevFx.referenceCurrency
    ) {
      recordAuditChange(
        'fxRisk.referenceCurrency',
        'Devise de référence (FX)',
        prevFx.referenceCurrency,
        nextFx.referenceCurrency,
        'Formulaire'
      );
    } else if (patch.enabled !== undefined && patch.enabled !== prevFx.enabled) {
      recordAuditChange(
        'fxRisk.enabled',
        'Impact change → Coûts & Matériel',
        prevFx.enabled ? 'Actif' : 'Simulé seul',
        nextFx.enabled ? 'Actif' : 'Simulé seul',
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const mergedFx: FxRiskAssumptions = {
        ...getResolvedFxRisk(prev),
        ...patch,
      };
      const fxPatch = applyFxRiskToAssumptions(prev, mergedFx);
      const nextWithFx: FinancialAssumptions = {
        ...prev,
        fxRisk: mergedFx,
        ...fxPatch,
      };
      const currentSub = getResolvedSubsidies(nextWithFx);
      if (currentSub.enabled && hasNonZeroSubsidy(currentSub)) {
        const subPatch = applySubsidiesToAssumptions(nextWithFx, currentSub);
        return {
          ...nextWithFx,
          ...subPatch,
        };
      }
      return nextWithFx;
    });
  };

  const updateStorageOptimization = (patch: Partial<StorageOptimizationAssumptions>) => {
    const prevSt = getResolvedStorageOptimization(assumptionsRef.current);
    const nextSt: StorageOptimizationAssumptions = {
      ...prevSt,
      ...patch,
    };

    if (
      patch.storageDurationDays !== undefined &&
      patch.storageDurationDays !== prevSt.storageDurationDays
    ) {
      recordAuditChange(
        'storage.duration',
        'Durée de stockage post-récolte',
        `${prevSt.storageDurationDays} j`,
        `${nextSt.storageDurationDays} j`,
        'Formulaire'
      );
    } else if (
      patch.moisturePercent !== undefined &&
      patch.moisturePercent !== prevSt.moisturePercent
    ) {
      recordAuditChange(
        'storage.moisture',
        'Humidité du paddy stocké',
        `${prevSt.moisturePercent.toFixed(1)} %`,
        `${nextSt.moisturePercent.toFixed(1)} %`,
        'Formulaire'
      );
    } else if (
      patch.storageMethod !== undefined &&
      patch.storageMethod !== prevSt.storageMethod
    ) {
      recordAuditChange(
        'storage.method',
        'Mode de stockage',
        STORAGE_METHOD_META[prevSt.storageMethod].shortLabel,
        STORAGE_METHOD_META[nextSt.storageMethod].shortLabel,
        'Formulaire'
      );
    } else if (patch.enabled !== undefined && patch.enabled !== prevSt.enabled) {
      recordAuditChange(
        'storage.enabled',
        'Pertes stockage → Stock valorisable',
        prevSt.enabled ? 'Actif' : 'Simulé seul',
        nextSt.enabled ? 'Actif' : 'Simulé seul',
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const mergedStorage: StorageOptimizationAssumptions = {
        ...getResolvedStorageOptimization(prev),
        ...patch,
      };
      const resolvedClimate = getResolvedClimateImpact(prev);
      const syncedSeasons = applyClimateAndStorageToSeasons(
        prev,
        resolvedClimate,
        mergedStorage
      );
      return {
        ...prev,
        storageOptimization: mergedStorage,
        ...syncedSeasons,
      };
    });
  };

  const updatePartnersEcosystem = (patch: Partial<PartnersEcosystemAssumptions>) => {
    const prevEco = getResolvedPartnersEcosystem(assumptionsRef.current);
    const nextEco: PartnersEcosystemAssumptions = {
      ...prevEco,
      ...patch,
    };

    if (patch.syncPaddyCosts !== undefined && patch.syncPaddyCosts !== prevEco.syncPaddyCosts) {
      recordAuditChange(
        'partners.syncPaddy',
        'Coopératives → Coût paddy',
        prevEco.syncPaddyCosts ? 'Synchronisé' : 'Manuel',
        nextEco.syncPaddyCosts ? 'Synchronisé' : 'Manuel',
        'Formulaire'
      );
    }
    if (
      patch.syncTransportCosts !== undefined &&
      patch.syncTransportCosts !== prevEco.syncTransportCosts
    ) {
      recordAuditChange(
        'partners.syncTransport',
        'Transporteurs → Coût rotation',
        prevEco.syncTransportCosts ? 'Synchronisé' : 'Manuel',
        nextEco.syncTransportCosts ? 'Synchronisé' : 'Manuel',
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const mergedEco: PartnersEcosystemAssumptions = {
        ...getResolvedPartnersEcosystem(prev),
        ...patch,
      };
      const syncedCosts = applyPartnersEcosystemToAssumptions(prev, mergedEco, false);
      const touchesTransporters =
        patch.syncTransportCosts === true || patch.transporters !== undefined;
      return {
        ...prev,
        partnersEcosystem: mergedEco,
        ...syncedCosts,
        ...(touchesTransporters && mergedEco.syncTransportCosts && prev.logistics
          ? {
              logistics: {
                ...prev.logistics,
                enabled: false,
              },
            }
          : {}),
      };
    });
  };

  const updatePaddyStock = (patch: Partial<PaddyStockAssumptions>) => {
    const prevStock = getResolvedPaddyStock(assumptionsRef.current);
    const nextStock: PaddyStockAssumptions = {
      ...prevStock,
      ...patch,
    };
    if (
      patch.currentStockKg !== undefined &&
      patch.currentStockKg !== prevStock.currentStockKg
    ) {
      recordAuditChange(
        'paddyStock.currentStockKg',
        'Stock physique paddy',
        `${formatInt(prevStock.currentStockKg)} kg`,
        `${formatInt(nextStock.currentStockKg)} kg`,
        'Formulaire'
      );
    }
    if (
      patch.upcomingOrdersRiceKg !== undefined &&
      patch.upcomingOrdersRiceKg !== prevStock.upcomingOrdersRiceKg
    ) {
      recordAuditChange(
        'paddyStock.upcomingOrdersRiceKg',
        'Commandes riz à honorer',
        `${formatInt(prevStock.upcomingOrdersRiceKg)} kg`,
        `${formatInt(nextStock.upcomingOrdersRiceKg)} kg`,
        'Formulaire'
      );
    }

    setAssumptions((prev) => ({
      ...prev,
      paddyStock: {
        ...getResolvedPaddyStock(prev),
        ...patch,
      },
    }));
  };

  const updateSubsidies = (patch: Partial<SubsidiesAssumptions>) => {
    const prevSub = getResolvedSubsidies(assumptionsRef.current);
    const nextSub: SubsidiesAssumptions = {
      ...prevSub,
      ...patch,
    };

    if (patch.enabled !== undefined && patch.enabled !== prevSub.enabled) {
      recordAuditChange(
        'subsidies.enabled',
        'Aides & subventions → Modèle',
        prevSub.enabled ? 'Actives' : 'Simulées seules',
        nextSub.enabled ? 'Actives' : 'Simulées seules',
        'Formulaire'
      );
    } else if (patch.programName !== undefined && patch.programName !== prevSub.programName) {
      recordAuditChange(
        'subsidies.programName',
        'Programme de soutien',
        prevSub.programName,
        nextSub.programName,
        'Formulaire'
      );
    } else if (
      patch.capexGrantPercent !== undefined &&
      patch.capexGrantPercent !== prevSub.capexGrantPercent
    ) {
      recordAuditChange(
        'subsidies.capexGrantPercent',
        'Subvention CAPEX (%)',
        formatPctVal(prevSub.capexGrantPercent, 0),
        formatPctVal(nextSub.capexGrantPercent, 0),
        'Formulaire'
      );
    } else if (
      patch.capexGrantFixedAr !== undefined &&
      patch.capexGrantFixedAr !== prevSub.capexGrantFixedAr
    ) {
      recordAuditChange(
        'subsidies.capexGrantFixedAr',
        'Subvention CAPEX fixe',
        `${formatInt(prevSub.capexGrantFixedAr)} Ar`,
        `${formatInt(nextSub.capexGrantFixedAr)} Ar`,
        'Formulaire'
      );
    } else if (
      patch.opexPaddySubsidyArPerKg !== undefined &&
      patch.opexPaddySubsidyArPerKg !== prevSub.opexPaddySubsidyArPerKg
    ) {
      recordAuditChange(
        'subsidies.opexPaddy',
        'Subvention OPEX / kg paddy',
        `${formatInt(prevSub.opexPaddySubsidyArPerKg)} Ar/kg`,
        `${formatInt(nextSub.opexPaddySubsidyArPerKg)} Ar/kg`,
        'Formulaire'
      );
    } else if (
      patch.opexFixedMonthlySubsidyAr !== undefined &&
      patch.opexFixedMonthlySubsidyAr !== prevSub.opexFixedMonthlySubsidyAr
    ) {
      recordAuditChange(
        'subsidies.opexFixed',
        'Appui charges fixes / mois',
        `${formatInt(prevSub.opexFixedMonthlySubsidyAr)} Ar/m`,
        `${formatInt(nextSub.opexFixedMonthlySubsidyAr)} Ar/m`,
        'Formulaire'
      );
    } else if (
      patch.bfrWorkingCapitalGrantAr !== undefined &&
      patch.bfrWorkingCapitalGrantAr !== (prevSub.bfrWorkingCapitalGrantAr ?? 0)
    ) {
      recordAuditChange(
        'subsidies.bfrGrant',
        'Dotation BFR État / Projet',
        `${formatInt(prevSub.bfrWorkingCapitalGrantAr ?? 0)} Ar`,
        `${formatInt(nextSub.bfrWorkingCapitalGrantAr ?? 0)} Ar`,
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const resolvedPrev = getResolvedSubsidies(prev);
      const mergedSub: SubsidiesAssumptions = {
        ...resolvedPrev,
        ...patch,
      };
      const subPatch = applySubsidiesToAssumptions(prev, mergedSub);
      return {
        ...prev,
        subsidies: mergedSub,
        ...subPatch,
      };
    });
  };

  const updateTraceabilityCertification = (
    patch: Partial<TraceabilityCertificationAssumptions>
  ) => {
    const prevCert = getResolvedTraceability(assumptionsRef.current);
    const nextCert: TraceabilityCertificationAssumptions = {
      ...prevCert,
      ...patch,
    };

    if (patch.certificationType !== undefined && patch.certificationType !== prevCert.certificationType) {
      recordAuditChange(
        'traceability.type',
        'Certification & traçabilité',
        prevCert.labelName,
        nextCert.labelName,
        'Formulaire'
      );
    } else if (patch.enabled !== undefined && patch.enabled !== prevCert.enabled) {
      recordAuditChange(
        'traceability.enabled',
        'Certification → Prix & Coûts',
        prevCert.enabled ? 'Active' : 'Simulée seule',
        nextCert.enabled ? 'Active' : 'Simulée seule',
        'Formulaire'
      );
    } else if (
      patch.sellingPricePremiumPercent !== undefined &&
      patch.sellingPricePremiumPercent !== prevCert.sellingPricePremiumPercent
    ) {
      recordAuditChange(
        'traceability.premium',
        'Prime prix certifié (%)',
        formatPctVal(prevCert.sellingPricePremiumPercent, 0),
        formatPctVal(nextCert.sellingPricePremiumPercent, 0),
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const resolvedPrev = getResolvedTraceability(prev);
      const mergedCert: TraceabilityCertificationAssumptions = {
        ...resolvedPrev,
        ...patch,
      };
      const certPatch = applyTraceabilityToAssumptions(prev, mergedCert);
      return {
        ...prev,
        traceabilityCertification: mergedCert,
        ...certPatch,
      };
    });
  };

  const updateMarketComparison = (patch: Partial<MarketComparisonAssumptions>) => {
    const prevMkt = getResolvedMarketComparison(assumptionsRef.current);
    if (
      patch.positioningStrategy !== undefined &&
      patch.positioningStrategy !== prevMkt.positioningStrategy
    ) {
      recordAuditChange(
        'market.strategy',
        'Stratégie positionnement marché',
        prevMkt.positioningStrategy,
        patch.positioningStrategy,
        'Formulaire'
      );
    }
    setAssumptions((prev) => ({
      ...prev,
      marketComparison: {
        ...getResolvedMarketComparison(prev),
        ...patch,
      },
    }));
  };

  const updateMachineMaintenance = (patch: Partial<MachineMaintenanceSchedule>) => {
    const prevMaint = getResolvedMaintenanceSchedule(assumptionsRef.current);
    const nextMaint: MachineMaintenanceSchedule = {
      ...prevMaint,
      ...patch,
    };

    if (
      patch.applyProductionLossToModel !== undefined &&
      patch.applyProductionLossToModel !== prevMaint.applyProductionLossToModel
    ) {
      recordAuditChange(
        'maintenance.apply',
        'Arrêts maintenance → Volumes',
        prevMaint.applyProductionLossToModel ? 'Répercutés' : 'Simulés seuls',
        nextMaint.applyProductionLossToModel ? 'Répercutés' : 'Simulés seuls',
        'Formulaire'
      );
    }

    setAssumptions((prev) => {
      const resolvedPrev = getResolvedMaintenanceSchedule(prev);
      const mergedMaint: MachineMaintenanceSchedule = {
        ...resolvedPrev,
        ...patch,
      };
      const tempModel = calculateFullModel(prev);
      const maintSummary = computeMaintenanceCalendarMetrics(
        prev,
        tempModel,
        mergedMaint
      );
      const maintPatch = applyMaintenanceToAssumptions(prev, mergedMaint, maintSummary);
      return {
        ...prev,
        machineMaintenance: mergedMaint,
        ...maintPatch,
      };
    });
  };

  const updateVatSettings = (patch: Partial<VatAssumptions>) => {
    const prevVat = getResolvedVatAssumptions(assumptionsRef.current);
    const nextVat: VatAssumptions = {
      ...prevVat,
      ...patch,
    };

    if (patch.regime !== undefined && patch.regime !== prevVat.regime) {
      recordAuditChange(
        'vatSettings.regime',
        'Régime TVA Madagascar',
        prevVat.regime,
        nextVat.regime,
        'Formulaire'
      );
    } else if (patch.enabled !== undefined && patch.enabled !== prevVat.enabled) {
      recordAuditChange(
        'vatSettings.enabled',
        'Calculatrice TVA agricole',
        prevVat.enabled ? 'Activée' : 'Désactivée',
        nextVat.enabled ? 'Activée' : 'Désactivée',
        'Formulaire'
      );
    } else if (patch.applyToCashFlow !== undefined && patch.applyToCashFlow !== prevVat.applyToCashFlow) {
      recordAuditChange(
        'vatSettings.applyToCashFlow',
        'Répercussion TVA → Cash-Flow',
        prevVat.applyToCashFlow ? 'Active' : 'Simulation seule',
        nextVat.applyToCashFlow ? 'Active' : 'Simulation seule',
        'Formulaire'
      );
    }

    setAssumptions((prev) => ({
      ...prev,
      vatSettings: {
        ...getResolvedVatAssumptions(prev),
        ...patch,
      },
    }));
  };

  const updateKpiThresholds = (patch: Partial<KpiAlertThresholds>) => {
    const prevT = getResolvedKpiThresholds(assumptionsRef.current);
    const nextT: KpiAlertThresholds = {
      ...prevT,
      ...patch,
    };
    if (patch.minNpvAr !== undefined && patch.minNpvAr !== prevT.minNpvAr) {
      recordAuditChange(
        'kpiThresholds.minNpvAr',
        'Seuil alerte VAN min.',
        `${formatInt(prevT.minNpvAr)} Ar`,
        `${formatInt(nextT.minNpvAr)} Ar`,
        'Formulaire'
      );
    }
    if (patch.minIrrRate !== undefined && patch.minIrrRate !== prevT.minIrrRate) {
      recordAuditChange(
        'kpiThresholds.minIrrRate',
        'Seuil alerte TRI min.',
        formatPctVal(prevT.minIrrRate, 1),
        formatPctVal(nextT.minIrrRate, 1),
        'Formulaire'
      );
    }
    if (
      patch.maxPaybackMonths !== undefined &&
      patch.maxPaybackMonths !== prevT.maxPaybackMonths
    ) {
      recordAuditChange(
        'kpiThresholds.maxPaybackMonths',
        'Seuil alerte Payback max.',
        `${prevT.maxPaybackMonths} mois`,
        `${nextT.maxPaybackMonths} mois`,
        'Formulaire'
      );
    }
    if (
      patch.minOperatingMarginRate !== undefined &&
      patch.minOperatingMarginRate !== (prevT.minOperatingMarginRate ?? 0.1)
    ) {
      recordAuditChange(
        'kpiThresholds.minOperatingMarginRate',
        'Seuil alerte Marge opérationnelle min.',
        formatPctVal(prevT.minOperatingMarginRate ?? 0.1, 1),
        formatPctVal(nextT.minOperatingMarginRate ?? 0.1, 1),
        'Formulaire'
      );
    }
    if (
      patch.minGrossMarginRate !== undefined &&
      patch.minGrossMarginRate !== (prevT.minGrossMarginRate ?? 0.2)
    ) {
      recordAuditChange(
        'kpiThresholds.minGrossMarginRate',
        'Seuil alerte Marge brute min.',
        formatPctVal(prevT.minGrossMarginRate ?? 0.2, 1),
        formatPctVal(nextT.minGrossMarginRate ?? 0.2, 1),
        'Formulaire'
      );
    }

    setAssumptions((prev) => ({
      ...prev,
      kpiThresholds: {
        ...getResolvedKpiThresholds(prev),
        ...patch,
      },
    }));
  };

  const updateVariableCostPerKg = (
    id: string,
    field: 'costHS' | 'costBS' | 'label',
    value: string | number
  ) => {
    const existing = assumptionsRef.current.costsPerKgPaddy.find((c) => c.id === id);
    if (existing) {
      const seasonTag = field === 'costHS' ? 'HS' : field === 'costBS' ? 'BS' : 'Libellé';
      const oldText =
        field === 'label' ? existing.label : `${formatInt(Number(existing[field]))} Ar/kg`;
      const newText =
        field === 'label' ? String(value) : `${formatInt(Number(value) || 0)} Ar/kg`;
      recordAuditChange(
        `costKg.${id}.${field}`,
        `Coût/kg · ${existing.label} (${seasonTag})`,
        oldText,
        newText,
        'Formulaire'
      );
    }
    setAssumptions((prev) => {
      const updatedCosts = prev.costsPerKgPaddy.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      const nextState: FinancialAssumptions = {
        ...prev,
        costsPerKgPaddy: updatedCosts,
      };
      if ((id === 'cost-paddy' || id === 'cost-decorticage') && (field === 'costHS' || field === 'costBS')) {
        const currentSub = getResolvedSubsidies(prev);
        if (!currentSub.enabled || !hasNonZeroSubsidy(currentSub)) {
          const numVal = Number(value) || 0;
          nextState.subsidies = {
            ...currentSub,
            baselineCostPaddyHS:
              id === 'cost-paddy' && field === 'costHS' ? numVal : currentSub.baselineCostPaddyHS,
            baselineCostPaddyBS:
              id === 'cost-paddy' && field === 'costBS' ? numVal : currentSub.baselineCostPaddyBS,
            baselineCostDecorticageHS:
              id === 'cost-decorticage' && field === 'costHS'
                ? numVal
                : currentSub.baselineCostDecorticageHS,
            baselineCostDecorticageBS:
              id === 'cost-decorticage' && field === 'costBS'
                ? numVal
                : currentSub.baselineCostDecorticageBS,
          };
        }
      }
      return nextState;
    });
  };

  const addVariableCostPerKg = (label: string, costHS: number, costBS: number) => {
    const newItem = {
      id: `cost-${Date.now()}`,
      label: label.trim() || 'Nouveau coût / kg',
      costHS: Math.max(0, Number(costHS) || 0),
      costBS: Math.max(0, Number(costBS) || 0),
    };
    recordAuditChange(
      `costKg.add.${newItem.id}`,
      `Ajout coût/kg · ${newItem.label}`,
      '—',
      `${formatInt(newItem.costHS)} / ${formatInt(newItem.costBS)} Ar/kg`,
      'Formulaire'
    );
    setAssumptions((prev) => ({
      ...prev,
      costsPerKgPaddy: [...prev.costsPerKgPaddy, newItem],
    }));
    notify('success', `Poste « ${newItem.label} » ajouté aux coûts au kg.`);
  };

  const removeVariableCostPerKg = (id: string) => {
    if (id === 'cost-paddy') return;
    const existing = assumptionsRef.current.costsPerKgPaddy.find((c) => c.id === id);
    if (existing) {
      recordAuditChange(
        `costKg.del.${id}`,
        `Suppression coût/kg · ${existing.label}`,
        `${formatInt(existing.costHS)} / ${formatInt(existing.costBS)} Ar/kg`,
        'Supprimé',
        'Formulaire'
      );
    }
    setAssumptions((prev) => ({
      ...prev,
      costsPerKgPaddy: prev.costsPerKgPaddy.filter((c) => c.id !== id),
    }));
    notify('info', 'Poste de coût au kg supprimé.');
  };

  const updateCostPerRotation = (
    id: string,
    field: 'costHS' | 'costBS' | 'label',
    value: string | number
  ) => {
    const existing = assumptionsRef.current.costsPerRotation.find((c) => c.id === id);
    if (existing) {
      const seasonTag = field === 'costHS' ? 'HS' : field === 'costBS' ? 'BS' : 'Libellé';
      const oldText =
        field === 'label' ? existing.label : `${formatInt(Number(existing[field]))} Ar`;
      const newText =
        field === 'label' ? String(value) : `${formatInt(Number(value) || 0)} Ar`;
      recordAuditChange(
        `costRot.${id}.${field}`,
        `Frais/rot · ${existing.label} (${seasonTag})`,
        oldText,
        newText,
        'Formulaire'
      );
    }
    setAssumptions((prev) => ({
      ...prev,
      costsPerRotation: prev.costsPerRotation.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
      logistics:
        id === 'rot-carburant' && (field === 'costHS' || field === 'costBS') && prev.logistics
          ? { ...prev.logistics, enabled: false }
          : prev.logistics,
    }));
  };

  const addCostPerRotation = (label: string, costHS: number, costBS: number) => {
    const newItem = {
      id: `rot-${Date.now()}`,
      label: label.trim() || 'Nouveau frais / rotation',
      costHS: Math.max(0, Number(costHS) || 0),
      costBS: Math.max(0, Number(costBS) || 0),
    };
    recordAuditChange(
      `costRot.add.${newItem.id}`,
      `Ajout frais/rot · ${newItem.label}`,
      '—',
      `${formatInt(newItem.costHS)} / ${formatInt(newItem.costBS)} Ar`,
      'Formulaire'
    );
    setAssumptions((prev) => ({
      ...prev,
      costsPerRotation: [...prev.costsPerRotation, newItem],
    }));
    notify('success', `Frais « ${newItem.label} » ajouté.`);
  };

  const removeCostPerRotation = (id: string) => {
    const existing = assumptionsRef.current.costsPerRotation.find((c) => c.id === id);
    if (existing) {
      recordAuditChange(
        `costRot.del.${id}`,
        `Suppression frais/rot · ${existing.label}`,
        `${formatInt(existing.costHS)} / ${formatInt(existing.costBS)} Ar`,
        'Supprimé',
        'Formulaire'
      );
    }
    setAssumptions((prev) => ({
      ...prev,
      costsPerRotation: prev.costsPerRotation.filter((c) => c.id !== id),
    }));
    notify('info', 'Frais par rotation supprimé.');
  };

  const updateFixedMonthlyCharge = (
    id: string,
    field: 'amount' | 'label',
    value: string | number
  ) => {
    const existing = assumptionsRef.current.fixedMonthlyCharges.find((c) => c.id === id);
    if (existing) {
      const oldText =
        field === 'label' ? existing.label : `${formatInt(existing.amount)} Ar/mois`;
      const newText =
        field === 'label' ? String(value) : `${formatInt(Number(value) || 0)} Ar/mois`;
      recordAuditChange(
        `fixed.${id}.${field}`,
        `Charge fixe · ${existing.label}`,
        oldText,
        newText,
        'Formulaire'
      );
    }
    setAssumptions((prev) => {
      const updatedFixed = prev.fixedMonthlyCharges.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      const nextState: FinancialAssumptions = {
        ...prev,
        fixedMonthlyCharges: updatedFixed,
      };
      const currentSub = getResolvedSubsidies(prev);
      if (!currentSub.enabled || !hasNonZeroSubsidy(currentSub)) {
        nextState.subsidies = {
          ...currentSub,
          baselineFixedCharges: updatedFixed.map((f) => ({ id: f.id, amount: f.amount })),
        };
      }
      return nextState;
    });
  };

  const addFixedMonthlyCharge = (label: string, amount: number) => {
    const newItem = {
      id: `fix-${Date.now()}`,
      label: label.trim() || 'Nouvelle charge fixe',
      amount: Math.max(0, Number(amount) || 0),
    };
    recordAuditChange(
      `fixed.add.${newItem.id}`,
      `Ajout charge fixe · ${newItem.label}`,
      '—',
      `${formatInt(newItem.amount)} Ar/mois`,
      'Formulaire'
    );
    setAssumptions((prev) => ({
      ...prev,
      fixedMonthlyCharges: [...prev.fixedMonthlyCharges, newItem],
    }));
    notify('success', `Charge fixe « ${newItem.label} » ajoutée.`);
  };

  const removeFixedMonthlyCharge = (id: string) => {
    const existing = assumptionsRef.current.fixedMonthlyCharges.find((c) => c.id === id);
    if (existing) {
      recordAuditChange(
        `fixed.del.${id}`,
        `Suppression charge fixe · ${existing.label}`,
        `${formatInt(existing.amount)} Ar/mois`,
        'Supprimé',
        'Formulaire'
      );
    }
    setAssumptions((prev) => ({
      ...prev,
      fixedMonthlyCharges: prev.fixedMonthlyCharges.filter((c) => c.id !== id),
    }));
    notify('info', 'Charge fixe supprimée.');
  };

  const updateBagOption = (
    id: string,
    field: 'capacityKg' | 'unitPriceAr',
    value: number
  ) => {
    const cleanVal = Number.isNaN(value) ? 0 : value;
    const existing = assumptionsRef.current.bagOptions.find((b) => b.id === id);
    if (existing) {
      recordAuditChange(
        `bag.${id}.${field}`,
        field === 'capacityKg'
          ? `Contenance sac (${existing.capacityKg} kg)`
          : `Prix sac ${existing.capacityKg} kg`,
        field === 'capacityKg' ? `${existing.capacityKg} kg` : `${formatInt(existing.unitPriceAr)} Ar/sac`,
        field === 'capacityKg' ? `${cleanVal} kg` : `${formatInt(cleanVal)} Ar/sac`,
        'Formulaire'
      );
    }
    setAssumptions((prev) => {
      const target = prev.bagOptions.find((b) => b.id === id);
      const updated = prev.bagOptions.map((item) =>
        item.id === id ? { ...item, [field]: cleanVal } : item
      );
      const keepSelected =
        field === 'capacityKg' && target && prev.selectedBagCapacityKg === target.capacityKg
          ? cleanVal <= 0
            ? prev.selectedBagCapacityKg
            : cleanVal
          : prev.selectedBagCapacityKg;
      return {
        ...prev,
        bagOptions: updated,
        selectedBagCapacityKg: keepSelected,
      };
    });
  };

  const addBagOption = (capacityKg: number, unitPriceAr: number) => {
    const cleanCap = Math.max(1, Number(capacityKg) || 50);
    const cleanPrice = Math.max(0, Number(unitPriceAr) || 1500);
    const newItem = {
      id: `sac-${Date.now()}`,
      capacityKg: cleanCap,
      unitPriceAr: cleanPrice,
    };
    recordAuditChange(
      `bag.add.${newItem.id}`,
      `Ajout format sac ${cleanCap} kg`,
      '—',
      `${formatInt(cleanPrice)} Ar/sac`,
      'Formulaire'
    );
    setAssumptions((prev) => ({
      ...prev,
      bagOptions: [...prev.bagOptions, newItem],
    }));
    notify('success', `Format sac ${cleanCap} kg ajouté au barème.`);
  };

  const removeBagOption = (id: string) => {
    if (assumptions.bagOptions.length <= 1) return;
    const existing = assumptionsRef.current.bagOptions.find((b) => b.id === id);
    if (existing) {
      recordAuditChange(
        `bag.del.${id}`,
        `Suppression sac ${existing.capacityKg} kg`,
        `${formatInt(existing.unitPriceAr)} Ar/sac`,
        'Supprimé',
        'Formulaire'
      );
    }
    setAssumptions((prev) => {
      const remaining = prev.bagOptions.filter((b) => b.id !== id);
      const newSelected =
        prev.selectedBagCapacityKg === prev.bagOptions.find((b) => b.id === id)?.capacityKg
          ? remaining[0].capacityKg
          : prev.selectedBagCapacityKg;
      return {
        ...prev,
        bagOptions: remaining,
        selectedBagCapacityKg: newSelected,
      };
    });
    notify('info', 'Format de sac supprimé.');
  };

  // Scenario management
  const saveScenario = (name: string, description: string) => {
    const id = `scenario-${Date.now()}`;
    const finalName = name.trim() || `Scénario ${savedScenarios.length + 1}`;
    const newScenario: SavedScenarioItem = {
      id,
      name: finalName,
      description: description.trim() || 'Scénario personnalisé',
      assumptions: JSON.parse(JSON.stringify(assumptions)),
      createdAt: new Date().toISOString(),
    };
    setSavedScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(id);
    notify('success', `Scénario « ${finalName} » enregistré.`);
  };

  const loadScenario = (id: string) => {
    const found = savedScenarios.find((s) => s.id === id);
    if (found) {
      setAssumptions(JSON.parse(JSON.stringify(found.assumptions)));
      setActiveScenarioId(id);
      notify('info', `Scénario « ${found.name} » chargé.`);
    }
  };

  const duplicateScenario = (id: string) => {
    const found = savedScenarios.find((s) => s.id === id);
    if (found) {
      const newId = `scenario-${Date.now()}`;
      const duplicated: SavedScenarioItem = {
        ...found,
        id: newId,
        name: `${found.name} (Copie)`,
        assumptions: JSON.parse(JSON.stringify(found.assumptions)),
        createdAt: new Date().toISOString(),
      };
      setSavedScenarios((prev) => [...prev, duplicated]);
      setActiveScenarioId(newId);
      setAssumptions(JSON.parse(JSON.stringify(found.assumptions)));
      notify('success', `Scénario dupliqué sous « ${duplicated.name} ».`);
    }
  };

  const deleteScenario = (id: string) => {
    if (savedScenarios.length <= 1) {
      notify('error', 'Impossible de supprimer le dernier scénario restant.');
      return;
    }
    const target = savedScenarios.find((s) => s.id === id);
    const remaining = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(remaining);
    if (activeScenarioId === id && remaining.length > 0) {
      setAssumptions(JSON.parse(JSON.stringify(remaining[0].assumptions)));
      setActiveScenarioId(remaining[0].id);
    }
    notify('info', `Scénario « ${target?.name || ''} » supprimé.`);
  };

  const renameScenario = (id: string, newName: string, newDescription?: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSavedScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: trimmed,
              description: newDescription !== undefined ? newDescription.trim() || s.description : s.description,
            }
          : s
      )
    );
    notify('success', `Scénario renommé en « ${trimmed} ».`);
  };

  const resetToDefaults = () => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setActiveScenarioId('realiste-default');
    notify('info', 'Hypothèses réinitialisées aux valeurs de référence Dashboard v6.');
  };

  // JSON Import/Export
  const exportToJson = (): string => {
    return JSON.stringify(
      {
        version: '6.0',
        exportedAt: new Date().toISOString(),
        assumptions,
        savedScenarios,
        dashboardReportNotes,
      },
      null,
      2
    );
  };

  const importFromJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && isValidAssumptionsShape(parsed.assumptions)) {
        setAssumptions(parsed.assumptions);
        if (Array.isArray(parsed.savedScenarios) && parsed.savedScenarios.length > 0) {
          setSavedScenarios(parsed.savedScenarios);
          setActiveScenarioId(parsed.savedScenarios[0].id);
        }
        if (typeof parsed.dashboardReportNotes === 'string') {
          setDashboardReportNotes(parsed.dashboardReportNotes);
        }
        notify('success', 'Modèle et hypothèses importés avec succès.');
        return true;
      }
      notify('error', 'Format JSON invalide : structure d’hypothèses manquante.');
    } catch (err) {
      console.error('Erreur importation JSON:', err);
      notify('error', 'Impossible de lire le fichier JSON sélectionné.');
    }
    return false;
  };

  // Excel Export
  const handleExportToExcel = () => {
    try {
      const activeSc = savedScenarios.find((s) => s.id === activeScenarioId);
      exportModelToExcel(model, activeSc?.name || 'Scénario courant');
      notify('success', 'Classeur Excel (.xlsx) généré et téléchargé.');
    } catch (err) {
      console.error('Erreur export Excel:', err);
      notify('error', 'Erreur lors de la génération du fichier Excel.');
    }
  };

  // CSV Projections Export (CF A1–A3)
  const handleExportProjectionsToCsv = () => {
    try {
      const activeSc = savedScenarios.find((s) => s.id === activeScenarioId);
      downloadProjectionsCsv(model, activeSc?.name || 'Scénario courant');
      notify('success', 'Données de projection (CF A1–A3) exportées en CSV.');
    } catch (err) {
      console.error('Erreur export CSV:', err);
      notify('error', 'Erreur lors de l’export des projections au format CSV.');
    }
  };

  // CSV 5-Year Raw Projections Export (A1–A5, 60 months)
  const handleExportFiveYearProjectionsToCsv = () => {
    try {
      const activeSc = savedScenarios.find((s) => s.id === activeScenarioId);
      exportFiveYearRawCsv(model, activeSc?.name || 'Scénario courant');
      notify('success', 'Projections financières brutes sur 5 ans (60 mois) exportées en CSV.');
    } catch (err) {
      console.error('Erreur export CSV 5 ans:', err);
      notify('error', 'Erreur lors de l’export CSV sur 5 ans.');
    }
  };

  // CSV Raw Seasonal Income Statement Export (HS & BS + 12-month detail)
  const handleExportSeasonalIncomeStatementToCsv = () => {
    try {
      const activeSc = savedScenarios.find((s) => s.id === activeScenarioId);
      exportSeasonalIncomeStatementRawCsv(
        model,
        activeProject?.name || 'Projet actif',
        activeSc?.name || 'Scénario courant'
      );
      notify(
        'success',
        'Compte de résultat saisonnier brut (HS & BS) exporté en CSV pour Excel/Sheets.'
      );
    } catch (err) {
      console.error('Erreur export CSV compte de résultat saisonnier:', err);
      notify('error', 'Erreur lors de l’export CSV du compte de résultat saisonnier.');
    }
  };

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const isProjectNameTaken = useCallback(
    (name: string, excludeId?: string) => {
      const norm = name.trim().toLowerCase();
      if (!norm) return false;
      return projects.some(
        (p) => p.id !== excludeId && p.name.trim().toLowerCase() === norm
      );
    },
    [projects]
  );

  const switchProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target || target.id === activeProjectId) return;

      skipProjectSyncRef.current = true;
      setActiveProjectId(target.id);
      setAssumptions(JSON.parse(JSON.stringify(target.assumptions)));
      setSavedScenarios(JSON.parse(JSON.stringify(target.savedScenarios)));
      setActiveScenarioId(target.activeScenarioId);
      setAuditLog(JSON.parse(JSON.stringify(target.auditLog || [])));
      setPestelAnalysis(
        JSON.parse(JSON.stringify(target.pestelAnalysis || createDefaultPestelAnalysis()))
      );
      setKpiNotes(JSON.parse(JSON.stringify(target.kpiNotes || [])));
      setScenarioVoiceNotes(JSON.parse(JSON.stringify(target.scenarioVoiceNotes || [])));
      setDashboardReportNotes(target.dashboardReportNotes || '');
      notify('info', `Projet « ${target.name} » activé.`);
    },
    [projects, activeProjectId, notify]
  );

  const createExcelProject = useCallback(
    (payload: {
      name: string;
      description: string;
      assumptions: FinancialAssumptions;
      excelMeta: ExcelImportMetadata;
    }): { ok: boolean; error?: string; project?: ProjectRecord } => {
      const cleanName = payload.name.trim();
      if (!cleanName) {
        return { ok: false, error: 'Veuillez saisir un nom de projet valide.' };
      }
      if (isProjectNameTaken(cleanName)) {
        return {
          ok: false,
          error: `Un projet nommé « ${cleanName} » existe déjà. Veuillez choisir un nom unique.`,
        };
      }

      const now = new Date().toISOString();
      const newId = `excel-${Date.now()}`;
      const baseScenarioId = `base-${Date.now()}`;
      const clonedAssumptions: FinancialAssumptions = JSON.parse(
        JSON.stringify(payload.assumptions)
      );
      const initialPestel = createDefaultPestelAnalysis();

      const newProject: ProjectRecord = {
        id: newId,
        name: cleanName,
        description:
          payload.description.trim() ||
          `Import Excel : ${payload.excelMeta.fileName} (${payload.excelMeta.selectedSheets.join(', ')})`,
        source: 'excel',
        createdAt: now,
        updatedAt: now,
        assumptions: clonedAssumptions,
        savedScenarios: [
          {
            id: baseScenarioId,
            name: 'Base Importée (Excel)',
            description: `Données mappées depuis ${payload.excelMeta.fileName}`,
            assumptions: JSON.parse(JSON.stringify(clonedAssumptions)),
            createdAt: now,
          },
        ],
        activeScenarioId: baseScenarioId,
        auditLog: [],
        excelMeta: payload.excelMeta,
        pestelAnalysis: initialPestel,
        kpiNotes: [],
        scenarioVoiceNotes: [],
        dashboardReportNotes: '',
      };

      skipProjectSyncRef.current = true;
      setProjects((prev) => [...prev, newProject]);
      setActiveProjectId(newProject.id);
      setAssumptions(JSON.parse(JSON.stringify(clonedAssumptions)));
      setSavedScenarios(JSON.parse(JSON.stringify(newProject.savedScenarios)));
      setActiveScenarioId(baseScenarioId);
      setAuditLog([]);
      setPestelAnalysis(JSON.parse(JSON.stringify(initialPestel)));
      setKpiNotes([]);
      setScenarioVoiceNotes([]);
      setDashboardReportNotes('');
      notify('success', `Projet Excel « ${cleanName} » créé et activé.`);
      return { ok: true, project: newProject };
    },
    [isProjectNameTaken, notify]
  );

  const duplicateProject = useCallback(
    (
      projectId: string,
      customName?: string
    ): { ok: boolean; error?: string; project?: ProjectRecord } => {
      const sourceProj = projects.find((p) => p.id === projectId);
      if (!sourceProj) {
        return { ok: false, error: 'Projet source introuvable.' };
      }

      const baseLabel = (customName || `${sourceProj.name} (Variante)`).trim();
      let candidateName = baseLabel;
      let counter = 2;
      while (isProjectNameTaken(candidateName)) {
        candidateName = `${baseLabel} ${counter}`;
        counter += 1;
      }

      const now = new Date().toISOString();
      const sourceAssumptions =
        sourceProj.id === activeProjectId ? assumptions : sourceProj.assumptions;
      const sourceScenarios =
        sourceProj.id === activeProjectId ? savedScenarios : sourceProj.savedScenarios;
      const sourceActiveScenario =
        sourceProj.id === activeProjectId ? activeScenarioId : sourceProj.activeScenarioId;
      const sourcePestel =
        sourceProj.id === activeProjectId
          ? pestelAnalysis
          : sourceProj.pestelAnalysis || createDefaultPestelAnalysis();

      const copiedProject: ProjectRecord = {
        id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: candidateName,
        description: `Variante comparative issue de « ${sourceProj.name} »`,
        source: 'copy',
        createdAt: now,
        updatedAt: now,
        assumptions: JSON.parse(JSON.stringify(sourceAssumptions)),
        savedScenarios: JSON.parse(JSON.stringify(sourceScenarios)),
        activeScenarioId: sourceActiveScenario,
        auditLog: [],
        pestelAnalysis: JSON.parse(JSON.stringify(sourcePestel)),
        kpiNotes: [],
        scenarioVoiceNotes: [],
        dashboardReportNotes:
          sourceProj.id === activeProjectId
            ? dashboardReportNotes
            : sourceProj.dashboardReportNotes || '',
      };

      setProjects((prev) => [...prev, copiedProject]);
      notify('success', `Projet dupliqué sous « ${candidateName} ».`);
      return { ok: true, project: copiedProject };
    },
    [
      projects,
      activeProjectId,
      assumptions,
      savedScenarios,
      activeScenarioId,
      pestelAnalysis,
      dashboardReportNotes,
      isProjectNameTaken,
      notify,
    ]
  );

  const renameProject = useCallback(
    (
      projectId: string,
      newName: string,
      newDescription?: string
    ): { ok: boolean; error?: string } => {
      const cleanName = newName.trim();
      if (!cleanName) {
        return { ok: false, error: 'Le nom du projet ne peut pas être vide.' };
      }
      if (isProjectNameTaken(cleanName, projectId)) {
        return {
          ok: false,
          error: `Le nom « ${cleanName} » est déjà utilisé par un autre projet.`,
        };
      }
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                name: cleanName,
                description:
                  newDescription !== undefined
                    ? newDescription.trim() || p.description
                    : p.description,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      notify('success', `Projet renommé en « ${cleanName} ».`);
      return { ok: true };
    },
    [isProjectNameTaken, notify]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      if (target.id === DEFAULT_PROJECT_ID || target.source === 'default' || projects.length <= 1) {
        notify('error', 'Le projet de référence par défaut ne peut pas être supprimé.');
        return;
      }

      const remaining = projects.filter((p) => p.id !== projectId);
      if (activeProjectId === projectId && remaining.length > 0) {
        const fallback =
          remaining.find((p) => p.source === 'default') || remaining[0];
        skipProjectSyncRef.current = true;
        setActiveProjectId(fallback.id);
        setAssumptions(JSON.parse(JSON.stringify(fallback.assumptions)));
        setSavedScenarios(JSON.parse(JSON.stringify(fallback.savedScenarios)));
        setActiveScenarioId(fallback.activeScenarioId);
        setAuditLog(JSON.parse(JSON.stringify(fallback.auditLog || [])));
        setPestelAnalysis(
          JSON.parse(JSON.stringify(fallback.pestelAnalysis || createDefaultPestelAnalysis()))
        );
        setKpiNotes(JSON.parse(JSON.stringify(fallback.kpiNotes || [])));
        setScenarioVoiceNotes(JSON.parse(JSON.stringify(fallback.scenarioVoiceNotes || [])));
        setDashboardReportNotes(fallback.dashboardReportNotes || '');
      }
      setProjects(remaining);
      notify('info', `Projet « ${target.name} » supprimé.`);
    },
    [projects, activeProjectId, notify]
  );

  const updatePestelCategory = useCallback(
    (
      category: PestelCategoryKey,
      patch: Partial<Omit<PestelFactorEntry, 'category' | 'updatedAt'>>
    ) => {
      setPestelAnalysis((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          ...patch,
          category,
          updatedAt: new Date().toISOString(),
        },
      }));
    },
    []
  );

  const resetPestelAnalysis = useCallback(() => {
    setPestelAnalysis(createDefaultPestelAnalysis());
    notify('info', 'Analyse PESTEL réinitialisée sur le référentiel filière riz Madagascar.');
  }, [notify]);

  const addKpiNote = useCallback(
    (payload: {
      kpiId: string;
      kpiLabel: string;
      content: string;
      tag: KpiNoteTag;
      author?: string;
    }) => {
      const cleanContent = payload.content.trim();
      if (!cleanContent) return;
      const author = (payload.author || analystName).trim() || 'Analyste financier';
      if (payload.author && payload.author.trim()) {
        setAnalystName(payload.author);
      }
      const now = new Date().toISOString();
      const newNote: KpiNoteItem = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kpiId: payload.kpiId,
        kpiLabel: payload.kpiLabel,
        author,
        content: cleanContent,
        tag: payload.tag,
        resolved: false,
        createdAt: now,
      };
      setKpiNotes((prev) => [newNote, ...prev]);
      notify('success', `Note ajoutée sur « ${payload.kpiLabel} ».`);
    },
    [analystName, notify, setAnalystName]
  );

  const updateKpiNote = useCallback(
    (
      noteId: string,
      patch: Partial<Pick<KpiNoteItem, 'content' | 'tag' | 'resolved' | 'author'>>
    ) => {
      setKpiNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      );
    },
    []
  );

  const toggleKpiNoteResolved = useCallback((noteId: string) => {
    setKpiNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, resolved: !note.resolved, updatedAt: new Date().toISOString() }
          : note
      )
    );
  }, []);

  const deleteKpiNote = useCallback(
    (noteId: string) => {
      setKpiNotes((prev) => prev.filter((n) => n.id !== noteId));
      notify('info', 'Note supprimée.');
    },
    [notify]
  );

  const addScenarioVoiceNote = useCallback(
    (payload: {
      anchorId: FinancingPlanAnchorId;
      anchorLabel: string;
      anchorMetricSnapshot: string;
      scenarioContext: ScenarioVoiceNote['scenarioContext'];
      transcript: string;
      durationSeconds: number;
      expertRole: string;
      author?: string;
      audioDataUrl?: string;
      speechLang?: string;
    }) => {
      const cleanTranscript = payload.transcript.trim();
      if (!cleanTranscript) return;
      const author = (payload.author || analystName).trim() || 'Analyste financier';
      if (payload.author && payload.author.trim()) {
        setAnalystName(payload.author);
      }
      const newVoiceNote: ScenarioVoiceNote = {
        id: `vnote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        anchorId: payload.anchorId,
        anchorLabel: payload.anchorLabel,
        anchorMetricSnapshot: payload.anchorMetricSnapshot,
        scenarioContext: payload.scenarioContext,
        author,
        expertRole: payload.expertRole || 'Analyste financier',
        transcript: cleanTranscript,
        durationSeconds: Math.max(1, Math.round(payload.durationSeconds || 1)),
        audioDataUrl: payload.audioDataUrl,
        speechLang: payload.speechLang || 'fr-FR',
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      setScenarioVoiceNotes((prev) => [newVoiceNote, ...prev]);
      notify('success', `Note vocale attachée à « ${payload.anchorLabel} ».`);
    },
    [analystName, notify, setAnalystName]
  );

  const toggleScenarioVoiceNoteResolved = useCallback((noteId: string) => {
    setScenarioVoiceNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, resolved: !note.resolved } : note
      )
    );
  }, []);

  const deleteScenarioVoiceNote = useCallback(
    (noteId: string) => {
      setScenarioVoiceNotes((prev) => prev.filter((n) => n.id !== noteId));
      notify('info', 'Note vocale supprimée.');
    },
    [notify]
  );

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prevMode) => {
      const currentResolved: 'dark' | 'light' =
        prevMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : prevMode;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, [systemPrefersDark]);

  const toggleUnitDisplay = () => {
    setUnitDisplay((prev) => (prev === 'standard' ? 'millions' : 'standard'));
  };

  const exportEmailAlertHistoryCsv = useCallback(() => {
    try {
      exportEmailAlertHistoryToCsv(emailAlertHistory);
      notify(
        'success',
        emailAlertHistory.length > 0
          ? `Journal des alertes e-mail (${emailAlertHistory.length} entrée(s)) exporté en CSV.`
          : 'Fichier CSV du journal des alertes e-mail généré (aucun envoi enregistré).'
      );
    } catch (err) {
      console.error('Erreur export CSV journal e-mail:', err);
      notify('error', 'Impossible d’exporter le journal des alertes e-mail en CSV.');
    }
  }, [emailAlertHistory, notify]);

  return (
    <FinancialContext.Provider
      value={{
        assumptions,
        model,
        validation,
        kpiAlerts,
        paddyStockStatus,
        treasurySettings,
        setTreasurySettings,
        treasurySmartAlert,
        activeScenarioId,
        savedScenarios,
        theme,
        themeMode,
        systemPrefersDark,
        setThemeMode,
        unitDisplay,
        sensitivityType,
        sensitivityMatrix,
        lastRecalculatedAt,
        toasts,
        auditLog,
        clearAuditLog,
        emailAlertConfig,
        updateEmailAlertConfig,
        emailAlertHistory,
        recordEmailAlertHistory,
        clearEmailAlertHistory,
        exportEmailAlertHistoryCsv,
        pestelAnalysis,
        updatePestelCategory,
        resetPestelAnalysis,
        kpiNotes,
        analystName,
        setAnalystName,
        addKpiNote,
        updateKpiNote,
        toggleKpiNoteResolved,
        deleteKpiNote,
        scenarioVoiceNotes,
        addScenarioVoiceNote,
        toggleScenarioVoiceNoteResolved,
        deleteScenarioVoiceNote,
        dashboardReportNotes,
        setDashboardReportNotes,
        autoBalanceSeasons,
        setAutoBalanceSeasons,
        notify,
        dismissToast,
        setAssumptions,
        updateSeasonField,
        updateInvestmentField,
        updateGeneralField,
        updateLogistics,
        applyProductionRegion,
        updateClimateImpact,
        updateFxRisk,
        updateStorageOptimization,
        updatePartnersEcosystem,
        updatePaddyStock,
        updateSubsidies,
        updateTraceabilityCertification,
        updateMarketComparison,
        updateMachineMaintenance,
        updateVatSettings,
        updateKpiThresholds,
        updateVariableCostPerKg,
        addVariableCostPerKg,
        removeVariableCostPerKg,
        updateCostPerRotation,
        addCostPerRotation,
        removeCostPerRotation,
        updateFixedMonthlyCharge,
        addFixedMonthlyCharge,
        removeFixedMonthlyCharge,
        updateBagOption,
        addBagOption,
        removeBagOption,
        saveScenario,
        loadScenario,
        duplicateScenario,
        deleteScenario,
        renameScenario,
        resetToDefaults,
        exportToJson,
        importFromJson,
        exportToExcel: handleExportToExcel,
        exportProjectionsToCsv: handleExportProjectionsToCsv,
        exportFiveYearProjectionsToCsv: handleExportFiveYearProjectionsToCsv,
        exportSeasonalIncomeStatementToCsv: handleExportSeasonalIncomeStatementToCsv,
        projects,
        activeProject,
        activeProjectId,
        isProjectNameTaken,
        switchProject,
        createExcelProject,
        duplicateProject,
        renameProject,
        deleteProject,
        toggleTheme,
        toggleUnitDisplay,
        setSensitivityType,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
