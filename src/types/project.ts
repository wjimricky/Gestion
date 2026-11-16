import { FinancialAssumptions } from './finance';

export type ColumnDataType =
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'text'
  | 'mixed'
  | 'empty';

export type MappingTargetField =
  | 'ignore'
  | 'label_name'
  | 'season_tag'
  | 'months_duration'
  | 'rotations_per_month'
  | 'paddy_kg_per_rotation'
  | 'yield_ratio'
  | 'rice_selling_price'
  | 'byproduct_selling_price'
  | 'paddy_purchase_price'
  | 'processing_cost_per_kg'
  | 'fixed_monthly_charge'
  | 'investment_materiel'
  | 'investment_cash_buffer'
  | 'tax_rate'
  | 'discount_rate'
  | 'total_revenue'
  | 'total_cost';

export interface AnalyzedColumn {
  index: number;
  originalHeader: string;
  renamedHeader: string;
  detectedType: ColumnDataType;
  nonEmptyCount: number;
  emptyCount: number;
  invalidCount: number;
  sampleValues: string[];
  suggestedTarget: MappingTargetField;
  confidence: 'high' | 'medium' | 'low';
}

export interface AnalyzedSheet {
  sheetName: string;
  rowCount: number;
  dataRowCount: number;
  headerRowIndex: number;
  isEmpty: boolean;
  hasMissingHeaders: boolean;
  columns: AnalyzedColumn[];
  previewRows: Array<Record<string, string | number | null>>;
  rawRows: (string | number | boolean | null)[][];
  errors: string[];
}

export interface AnalyzedWorkbook {
  fileName: string;
  fileSizeBytes: number;
  fileType: 'xlsx' | 'xls' | 'csv';
  sheets: AnalyzedSheet[];
  detectedTemplateMatches: number;
  warnings: string[];
}

export interface ExcelSheetPreviewSnapshot {
  sheetName: string;
  headers: string[];
  sampleRows: Array<Record<string, string | number | null>>;
  totalRows: number;
  mappedColumns: Array<{
    originalHeader: string;
    renamedHeader: string;
    targetField: MappingTargetField;
    dataType: ColumnDataType;
  }>;
}

export interface ExcelImportMetadata {
  fileName: string;
  fileSizeBytes: number;
  importedAt: string;
  selectedSheets: string[];
  mappedFieldsSummary: string[];
  sheetSnapshots: ExcelSheetPreviewSnapshot[];
  warnings: string[];
}

export interface ProjectScenarioItem {
  id: string;
  name: string;
  description: string;
  assumptions: FinancialAssumptions;
  createdAt: string;
}

export interface ProjectAuditEntry {
  id: string;
  key: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  source: 'Formulaire' | 'Simulateur' | 'Scénario';
}

export type PestelCategoryKey =
  | 'politique'
  | 'economique'
  | 'social'
  | 'technologique'
  | 'environnemental'
  | 'legal';

export type PestelImpact = 'opportunite' | 'neutre' | 'menace';
export type PestelHorizon = 'court_terme' | 'moyen_terme' | 'long_terme';

export interface PestelFactorEntry {
  category: PestelCategoryKey;
  impact: PestelImpact;
  severity: 1 | 2 | 3 | 4 | 5;
  horizon: PestelHorizon;
  keyFactors: string[];
  notes: string;
  mitigationPlan: string;
  updatedAt: string;
}

export type PestelAnalysisData = Record<PestelCategoryKey, PestelFactorEntry>;

export type KpiNoteTag = 'observation' | 'alerte' | 'validation' | 'action';

export interface KpiNoteItem {
  id: string;
  kpiId: string;
  kpiLabel: string;
  author: string;
  content: string;
  tag: KpiNoteTag;
  resolved: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type FinancingPlanAnchorId =
  | 'capex_materiel'
  | 'bfr_soudure'
  | 'fonds_a_lever'
  | 'haute_saison'
  | 'basse_saison'
  | 'seuil_rentabilite'
  | 'van_tri_payback'
  | 'repartition_benefice';

export interface ScenarioVoiceNote {
  id: string;
  anchorId: FinancingPlanAnchorId;
  anchorLabel: string;
  anchorMetricSnapshot: string;
  scenarioContext: 'Plan global' | 'Pessimiste' | 'Réaliste' | 'Optimiste';
  author: string;
  expertRole: string;
  transcript: string;
  durationSeconds: number;
  audioDataUrl?: string;
  speechLang: string;
  createdAt: string;
  resolved: boolean;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  source: 'default' | 'excel' | 'copy';
  createdAt: string;
  updatedAt: string;
  assumptions: FinancialAssumptions;
  savedScenarios: ProjectScenarioItem[];
  activeScenarioId: string;
  auditLog: ProjectAuditEntry[];
  excelMeta?: ExcelImportMetadata;
  pestelAnalysis?: PestelAnalysisData;
  kpiNotes?: KpiNoteItem[];
  scenarioVoiceNotes?: ScenarioVoiceNote[];
  dashboardReportNotes?: string;
}
