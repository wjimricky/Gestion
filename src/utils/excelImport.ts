import * as XLSX from 'xlsx';
import { DEFAULT_ASSUMPTIONS } from '../engine/defaultAssumptions';
import { FinancialAssumptions } from '../types/finance';
import {
  AnalyzedColumn,
  AnalyzedSheet,
  AnalyzedWorkbook,
  ColumnDataType,
  ExcelSheetPreviewSnapshot,
  MappingTargetField,
} from '../types/project';

export const MAX_EXCEL_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_EXCEL_EXTENSIONS = ['xlsx', 'xls', 'csv'] as const;

export const DATA_TYPE_LABELS: Record<ColumnDataType, string> = {
  number: 'Nombre',
  currency: 'Devise (Ar)',
  percent: 'Pourcentage',
  date: 'Date',
  text: 'Texte',
  mixed: 'Mixte / Incohérent',
  empty: 'Vide',
};

export const MAPPING_TARGET_OPTIONS: Array<{
  value: MappingTargetField;
  label: string;
  description: string;
  group: string;
}> = [
  {
    value: 'ignore',
    label: 'Ignorer cette colonne',
    description: 'Ne pas mapper dans les calculs financiers',
    group: 'Général',
  },
  {
    value: 'label_name',
    label: 'Libellé / Poste / Produit',
    description: 'Nom d’indicateur, poste de charge ou article',
    group: 'Général',
  },
  {
    value: 'season_tag',
    label: 'Saison (HS / BS)',
    description: 'Identifie Haute Saison vs Basse Saison',
    group: 'Saisonnalité & Volumes',
  },
  {
    value: 'months_duration',
    label: 'Durée saisonnière (mois)',
    description: 'Nombre de mois d’activité (ex: 5 HS / 7 BS)',
    group: 'Saisonnalité & Volumes',
  },
  {
    value: 'rotations_per_month',
    label: 'Rotations par mois',
    description: 'Cadence commerciale mensuelle',
    group: 'Saisonnalité & Volumes',
  },
  {
    value: 'paddy_kg_per_rotation',
    label: 'Volume paddy / rotation (kg)',
    description: 'Quantité achetée ou traitée par cycle',
    group: 'Saisonnalité & Volumes',
  },
  {
    value: 'yield_ratio',
    label: 'Rendement paddy → riz (%)',
    description: 'Ratio ou pourcentage de transformation',
    group: 'Saisonnalité & Volumes',
  },
  {
    value: 'rice_selling_price',
    label: 'Prix de vente riz (Ar/kg)',
    description: 'Prix unitaire de vente du produit fini',
    group: 'Prix & Revenus',
  },
  {
    value: 'byproduct_selling_price',
    label: 'Prix sous-produits (Ar/kg)',
    description: 'Prix de valorisation du son / brisures',
    group: 'Prix & Revenus',
  },
  {
    value: 'total_revenue',
    label: 'Chiffre d’affaires / Revenu (Ar)',
    description: 'Revenu total utilisé pour dériver les ventes',
    group: 'Prix & Revenus',
  },
  {
    value: 'paddy_purchase_price',
    label: 'Prix d’achat paddy (Ar/kg)',
    description: 'Coût unitaire matière première',
    group: 'Coûts & Charges',
  },
  {
    value: 'processing_cost_per_kg',
    label: 'Coût usinage / transport (Ar/kg)',
    description: 'Frais variables par kg traité',
    group: 'Coûts & Charges',
  },
  {
    value: 'fixed_monthly_charge',
    label: 'Charges fixes mensuelles (Ar)',
    description: 'Salaires, loyers, maintenance mensuels',
    group: 'Coûts & Charges',
  },
  {
    value: 'total_cost',
    label: 'Coût total / Dépense (Ar)',
    description: 'Total des coûts d’exploitation importés',
    group: 'Coûts & Charges',
  },
  {
    value: 'investment_materiel',
    label: 'Investissement matériel (Ar)',
    description: 'Capex / équipements initiaux',
    group: 'Investissement & Finance',
  },
  {
    value: 'investment_cash_buffer',
    label: 'Trésorerie / Cash buffer (Ar)',
    description: 'Réserve initiale de sécurité',
    group: 'Investissement & Finance',
  },
  {
    value: 'tax_rate',
    label: 'Taux d’impôt IR (%)',
    description: 'Taux d’imposition sur les bénéfices',
    group: 'Investissement & Finance',
  },
  {
    value: 'discount_rate',
    label: 'Taux d’actualisation r (%)',
    description: 'Taux utilisé pour la VAN / TRI',
    group: 'Investissement & Finance',
  },
];

export function validateExcelFile(file: File): string | null {
  if (!file) {
    return 'Aucun fichier sélectionné.';
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXCEL_EXTENSIONS.includes(ext as (typeof ALLOWED_EXCEL_EXTENSIONS)[number])) {
    return `Format non pris en charge (.${ext || 'inconnu'}). Veuillez importer un fichier .xlsx, .xls ou .csv.`;
  }
  if (file.size === 0) {
    return 'Le fichier sélectionné est vide (0 octet).';
  }
  if (file.size > MAX_EXCEL_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Fichier trop volumineux (${sizeMb} Mo). La taille maximale autorisée est de 10 Mo.`;
  }
  return null;
}

function normalizeStr(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

function parseFlexibleNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/(ar|mga|ariary|kg|t|mois|rot\/m|rotations?)/gi, '')
    .trim();
  if (!cleaned) return null;

  const isPercent = cleaned.includes('%');
  const numericStr = cleaned.replace('%', '').replace(',', '.');
  const val = Number(numericStr);
  if (!Number.isFinite(val)) return null;
  return isPercent ? val / 100 : val;
}

function isDateLike(raw: unknown): boolean {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return true;
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  return (
    /^\d{4}-\d{2}-\d{2}/.test(trimmed) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)
  );
}

function inferColumnType(values: unknown[], header: string): {
  detectedType: ColumnDataType;
  nonEmptyCount: number;
  emptyCount: number;
  invalidCount: number;
  sampleValues: string[];
} {
  let nonEmptyCount = 0;
  let emptyCount = 0;
  let numberCount = 0;
  let currencyCount = 0;
  let percentCount = 0;
  let dateCount = 0;
  let textCount = 0;
  const samples: string[] = [];

  const normHeader = normalizeStr(header);
  const headerSuggestsCurrency =
    normHeader.includes('prix') ||
    normHeader.includes('price') ||
    normHeader.includes('cout') ||
    normHeader.includes('cost') ||
    normHeader.includes('montant') ||
    normHeader.includes('ca') ||
    normHeader.includes('chiffre') ||
    normHeader.includes('charge') ||
    normHeader.includes('revenu') ||
    normHeader.includes('ariary') ||
    normHeader.includes('ar');
  const headerSuggestsPercent =
    normHeader.includes('%') ||
    normHeader.includes('taux') ||
    normHeader.includes('rate') ||
    normHeader.includes('rendement') ||
    normHeader.includes('yield') ||
    normHeader.includes('marge');

  for (const val of values) {
    const str = val === null || val === undefined ? '' : String(val).trim();
    if (str === '') {
      emptyCount++;
      continue;
    }

    nonEmptyCount++;
    if (samples.length < 4) {
      samples.push(str);
    }

    if (isDateLike(val)) {
      dateCount++;
      continue;
    }

    if (typeof val === 'string' && val.includes('%') && parseFlexibleNumber(val) !== null) {
      percentCount++;
      continue;
    }

    const parsedNum = parseFlexibleNumber(val);
    if (parsedNum !== null) {
      if (typeof val === 'string' && /(ar|mga|ariary)/i.test(val)) {
        currencyCount++;
      } else {
        numberCount++;
      }
      continue;
    }

    textCount++;
  }

  if (nonEmptyCount === 0) {
    return {
      detectedType: 'empty',
      nonEmptyCount: 0,
      emptyCount,
      invalidCount: 0,
      sampleValues: [],
    };
  }

  const totalNumeric = numberCount + currencyCount + percentCount;
  let detectedType: ColumnDataType = 'text';
  let invalidCount = 0;

  if (dateCount >= nonEmptyCount * 0.7) {
    detectedType = 'date';
    invalidCount = nonEmptyCount - dateCount;
  } else if (totalNumeric >= nonEmptyCount * 0.7) {
    if (percentCount > 0 || (headerSuggestsPercent && numberCount > 0)) {
      detectedType = 'percent';
    } else if (currencyCount > 0 || headerSuggestsCurrency) {
      detectedType = 'currency';
    } else {
      detectedType = 'number';
    }
    invalidCount = textCount + dateCount;
  } else if (textCount >= nonEmptyCount * 0.7) {
    detectedType = 'text';
    invalidCount = 0;
  } else {
    detectedType = 'mixed';
    invalidCount = Math.min(textCount, totalNumeric);
  }

  return {
    detectedType,
    nonEmptyCount,
    emptyCount,
    invalidCount,
    sampleValues: samples,
  };
}

export function detectTargetField(
  header: string,
  detectedType: ColumnDataType
): { target: MappingTargetField; confidence: 'high' | 'medium' | 'low' } {
  const h = normalizeStr(header);
  if (!h || detectedType === 'empty') {
    return { target: 'ignore', confidence: 'low' };
  }

  if (h.includes('saison') || h.includes('season') || h === 'periode') {
    return { target: 'season_tag', confidence: 'high' };
  }
  if (
    (h.includes('prix') || h.includes('price') || h.includes('tarif')) &&
    (h.includes('vente') || h.includes('riz') || h.includes('rice') || h.includes('sell'))
  ) {
    return { target: 'rice_selling_price', confidence: 'high' };
  }
  if (h.includes('sous produit') || h.includes('byproduct') || h.includes('son ')) {
    return { target: 'byproduct_selling_price', confidence: 'high' };
  }
  if (
    (h.includes('prix') || h.includes('price') || h.includes('cout') || h.includes('cost')) &&
    (h.includes('achat') || h.includes('paddy') || h.includes('matiere') || h.includes('buy'))
  ) {
    return { target: 'paddy_purchase_price', confidence: 'high' };
  }
  if (h.includes('decortic') || h.includes('usinage') || h.includes('transport') || h.includes('process')) {
    return { target: 'processing_cost_per_kg', confidence: 'high' };
  }
  if (
    (h.includes('paddy') &&
      (h.includes('kg') || h.includes('vol') || h.includes('quant') || h.includes('qte') || h.includes('par rot'))) ||
    h.includes('volume') ||
    h.includes('quantite') ||
    h.includes('tonnage')
  ) {
    return { target: 'paddy_kg_per_rotation', confidence: 'high' };
  }
  if (h.includes('rotation') || h.includes('cycle') || h.includes('cadence')) {
    return { target: 'rotations_per_month', confidence: 'high' };
  }
  if ((h.includes('duree') || h.includes('mois') || h.includes('month')) && !h.includes('rot')) {
    return { target: 'months_duration', confidence: 'medium' };
  }
  if (h.includes('rendement') || h.includes('yield') || h.includes('conversion')) {
    return { target: 'yield_ratio', confidence: 'high' };
  }
  if (h.includes('charge') && (h.includes('fixe') || h.includes('mensuel') || h.includes('fixed'))) {
    return { target: 'fixed_monthly_charge', confidence: 'high' };
  }
  if (h.includes('materiel') || h.includes('equipement') || h.includes('capex') || h.includes('invest')) {
    return { target: 'investment_materiel', confidence: 'medium' };
  }
  if (h.includes('buffer') || h.includes('tresorerie') || h.includes('reserve')) {
    return { target: 'investment_cash_buffer', confidence: 'medium' };
  }
  if (h.includes('impot') || h === 'ir' || h.includes('tax')) {
    return { target: 'tax_rate', confidence: 'high' };
  }
  if (h.includes('actualisation') || h.includes('discount') || h === 'taux r') {
    return { target: 'discount_rate', confidence: 'high' };
  }
  if (h.includes('chiffre') || h === 'ca' || h.includes('revenu') || h.includes('turnover') || h.includes('ventes')) {
    return { target: 'total_revenue', confidence: 'medium' };
  }
  if (h.includes('cout') || h.includes('depense') || h.includes('cost')) {
    return { target: 'total_cost', confidence: 'medium' };
  }
  if (
    detectedType === 'text' &&
    (h.includes('indicateur') || h.includes('poste') || h.includes('libelle') || h.includes('nom') || h.includes('produit') || h.includes('label'))
  ) {
    return { target: 'label_name', confidence: 'high' };
  }
  if (detectedType === 'currency' || h.includes('prix')) {
    return { target: 'rice_selling_price', confidence: 'low' };
  }

  return { target: 'ignore', confidence: 'low' };
}

function analyzeSingleSheet(
  sheetName: string,
  ws: XLSX.WorkSheet
): AnalyzedSheet {
  const rawMatrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      sheetName,
      rowCount: 0,
      dataRowCount: 0,
      headerRowIndex: 0,
      isEmpty: true,
      hasMissingHeaders: true,
      columns: [],
      previewRows: [],
      rawRows: [],
      errors: [`La feuille « ${sheetName} » est entièrement vide.`],
    };
  }

  // Locate best header row (first row with >= 2 non-empty cells, else first non-empty row)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
    const nonEmptyCells = (rawMatrix[r] || []).filter(
      (c) => c !== null && c !== undefined && String(c).trim() !== ''
    );
    if (nonEmptyCells.length >= 2) {
      headerRowIndex = r;
      break;
    }
    if (nonEmptyCells.length === 1 && headerRowIndex === 0) {
      headerRowIndex = r;
    }
  }

  const headerRow = rawMatrix[headerRowIndex] || [];
  const maxCols = rawMatrix.reduce((max, row) => Math.max(max, row?.length || 0), headerRow.length);

  if (maxCols === 0) {
    return {
      sheetName,
      rowCount: rawMatrix.length,
      dataRowCount: 0,
      headerRowIndex,
      isEmpty: true,
      hasMissingHeaders: true,
      columns: [],
      previewRows: [],
      rawRows: rawMatrix,
      errors: [`La feuille « ${sheetName} » ne contient aucune colonne exploitable.`],
    };
  }

  const dataRows = rawMatrix.slice(headerRowIndex + 1).filter((row) =>
    (row || []).some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  );

  let nonEmptyHeadersCount = 0;
  const columns: AnalyzedColumn[] = [];

  for (let c = 0; c < maxCols; c++) {
    const rawHeader = headerRow[c];
    const headerText =
      rawHeader !== null && rawHeader !== undefined ? String(rawHeader).trim() : '';
    if (headerText) {
      nonEmptyHeadersCount++;
    }
    const finalHeader = headerText || `Colonne_${c + 1}`;
    const colValues = dataRows.map((row) => (row ? row[c] : null));
    const stats = inferColumnType(colValues, finalHeader);
    const suggestion = detectTargetField(finalHeader, stats.detectedType);

    columns.push({
      index: c,
      originalHeader: finalHeader,
      renamedHeader: finalHeader,
      detectedType: stats.detectedType,
      nonEmptyCount: stats.nonEmptyCount,
      emptyCount: stats.emptyCount,
      invalidCount: stats.invalidCount,
      sampleValues: stats.sampleValues,
      suggestedTarget: suggestion.target,
      confidence: suggestion.confidence,
    });
  }

  const hasMissingHeaders = nonEmptyHeadersCount === 0;
  const errors: string[] = [];
  if (hasMissingHeaders) {
    errors.push(`En-têtes de colonnes manquants sur la feuille « ${sheetName} ».`);
  }
  if (dataRows.length === 0) {
    errors.push(`La feuille « ${sheetName} » ne contient aucune ligne de données sous les en-têtes.`);
  }

  const previewRows = dataRows.slice(0, 8).map((row) => {
    const obj: Record<string, string | number | null> = {};
    columns.forEach((col) => {
      const val = row?.[col.index];
      if (val === undefined || val === null || String(val).trim() === '') {
        obj[col.originalHeader] = null;
      } else if (typeof val === 'number' || typeof val === 'string') {
        obj[col.originalHeader] = val;
      } else {
        obj[col.originalHeader] = String(val);
      }
    });
    return obj;
  });

  return {
    sheetName,
    rowCount: rawMatrix.length,
    dataRowCount: dataRows.length,
    headerRowIndex,
    isEmpty: dataRows.length === 0 && columns.every((c) => c.detectedType === 'empty'),
    hasMissingHeaders,
    columns,
    previewRows,
    rawRows: rawMatrix,
    errors,
  };
}

export async function analyzeExcelFile(file: File): Promise<AnalyzedWorkbook> {
  const fileError = validateExcelFile(file);
  if (fileError) {
    throw new Error(fileError);
  }

  const ext = (file.name.split('.').pop()?.toLowerCase() || 'xlsx') as 'xlsx' | 'xls' | 'csv';
  let workbook: XLSX.WorkBook;

  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      codepage: 65001,
    });
  } catch {
    throw new Error(
      'Impossible de décoder le fichier. Vérifiez que le classeur Excel/CSV n’est pas corrompu ou protégé par mot de passe.'
    );
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Le fichier ne contient aucune feuille de calcul exploitable.');
  }

  const sheets: AnalyzedSheet[] = workbook.SheetNames.map((name) =>
    analyzeSingleSheet(name, workbook.Sheets[name])
  );

  const importableSheets = sheets.filter((s) => !s.isEmpty && s.dataRowCount > 0);
  if (importableSheets.length === 0) {
    throw new Error(
      'Toutes les feuilles du fichier sont vides ou ne contiennent aucune ligne de données exploitable.'
    );
  }

  const detectedTemplateMatches = sheets.reduce((acc, sheet) => {
    const matchedCols = sheet.columns.filter((c) => c.suggestedTarget !== 'ignore').length;
    return acc + matchedCols;
  }, 0);

  const warnings: string[] = [];
  const emptyCount = sheets.filter((s) => s.isEmpty || s.dataRowCount === 0).length;
  if (emptyCount > 0) {
    warnings.push(`${emptyCount} feuille(s) vide(s) détectée(s) et exclue(s) par défaut.`);
  }
  const missingHeaderSheets = sheets.filter((s) => !s.isEmpty && s.hasMissingHeaders);
  if (missingHeaderSheets.length > 0) {
    warnings.push(
      `En-têtes non détectés sur : ${missingHeaderSheets.map((s) => s.sheetName).join(', ')}. Vérifiez le mapping.`
    );
  }

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    fileType: ext,
    sheets,
    detectedTemplateMatches,
    warnings,
  };
}

/**
 * Checks if a row label from an exported/key-value Excel dashboard matches a financial assumption
 */
function applyKeyValueRow(
  draft: FinancialAssumptions,
  labelRaw: string,
  hsVal: number | null,
  bsVal: number | null,
  singleVal: number | null,
  summary: Set<string>
) {
  const lbl = normalizeStr(labelRaw);
  if (!lbl) return;

  const firstNum = hsVal ?? singleVal;
  const secondNum = bsVal ?? singleVal;

  if (lbl.includes('duree') && lbl.includes('mois')) {
    if (hsVal && hsVal > 0 && hsVal < 12) {
      draft.hauteSaison.months = Math.round(hsVal);
      summary.add(`Durée HS (${draft.hauteSaison.months} mois)`);
    }
    if (bsVal && bsVal > 0 && bsVal < 12) {
      draft.basseSaison.months = Math.round(bsVal);
      summary.add(`Durée BS (${draft.basseSaison.months} mois)`);
    }
    return;
  }

  if (lbl.includes('rotations par mois')) {
    if (hsVal && hsVal > 0) draft.hauteSaison.rotationsPerMonth = hsVal;
    if (bsVal && bsVal > 0) draft.basseSaison.rotationsPerMonth = bsVal;
    summary.add('Rotations mensuelles HS/BS');
    return;
  }

  if (lbl.includes('paddy achete par rotation')) {
    if (hsVal && hsVal > 0) draft.hauteSaison.paddyBoughtKgPerRotation = hsVal;
    if (bsVal && bsVal > 0) draft.basseSaison.paddyBoughtKgPerRotation = bsVal;
    summary.add('Volume paddy par rotation');
    return;
  }

  if (lbl.includes('rendement paddy')) {
    const norm = (v: number) => (v > 1 ? Math.min(1, v / 100) : Math.max(0.05, Math.min(1, v)));
    if (hsVal && hsVal > 0) draft.hauteSaison.yieldPaddyToRice = norm(hsVal);
    if (bsVal && bsVal > 0) draft.basseSaison.yieldPaddyToRice = norm(bsVal);
    summary.add('Rendement paddy → riz');
    return;
  }

  if (lbl.includes('prix de vente du riz')) {
    if (hsVal && hsVal > 0) draft.hauteSaison.riceSellingPriceArPerKg = hsVal;
    if (bsVal && bsVal > 0) draft.basseSaison.riceSellingPriceArPerKg = bsVal;
    summary.add('Prix de vente du riz');
    return;
  }

  if (lbl.includes('charges fixes') && firstNum && firstNum > 0) {
    const months = Math.max(1, draft.hauteSaison.months);
    const monthly = firstNum > 20_000_000 ? Math.round(firstNum / months) : Math.round(firstNum);
    draft.fixedMonthlyCharges = [
      { id: 'fix-excel-1', label: 'Charges fixes importées', amount: monthly },
    ];
    summary.add('Charges fixes mensuelles');
    return;
  }

  if (lbl === 'materiel' && firstNum && firstNum >= 0) {
    draft.investment.materielAr = firstNum;
    summary.add('Investissement matériel');
    return;
  }
  if (lbl === 'enregistrement' && firstNum && firstNum >= 0) {
    draft.investment.enregistrementAr = firstNum;
    summary.add('Frais d’enregistrement');
    return;
  }
  if (lbl.includes('cash buffer') && firstNum && firstNum >= 0) {
    draft.investment.cashBufferAr = firstNum;
    summary.add('Cash buffer');
    return;
  }
  if (lbl.includes('taux d actualisation') && secondNum !== null && secondNum > 0) {
    draft.discountRate = secondNum > 1 ? secondNum / 100 : secondNum;
    summary.add('Taux d’actualisation r');
  }
}

export interface SheetColumnSelection {
  index: number;
  renamedHeader: string;
  targetField: MappingTargetField;
}

export function buildAssumptionsFromMappings(
  workbook: AnalyzedWorkbook,
  selectedSheetNames: string[],
  columnConfigs: Record<string, SheetColumnSelection[]>
): {
  assumptions: FinancialAssumptions;
  mappedFieldsSummary: string[];
  warnings: string[];
  snapshots: ExcelSheetPreviewSnapshot[];
} {
  const draft: FinancialAssumptions = JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS));
  const summarySet = new Set<string>();
  const warnings: string[] = [];
  const snapshots: ExcelSheetPreviewSnapshot[] = [];

  for (const sheetName of selectedSheetNames) {
    const sheet = workbook.sheets.find((s) => s.sheetName === sheetName);
    if (!sheet || sheet.isEmpty || sheet.dataRowCount === 0) {
      warnings.push(`Feuille ignorée car vide : ${sheetName}`);
      continue;
    }

    const colConfig =
      columnConfigs[sheetName] ||
      sheet.columns.map((c) => ({
        index: c.index,
        renamedHeader: c.renamedHeader,
        targetField: c.suggestedTarget,
      }));

    const dataRows = sheet.rawRows.slice(sheet.headerRowIndex + 1).filter((row) =>
      (row || []).some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );

    // 1. Check for RizMadagascar / Key-Value structured rows (e.g. Dashboard export)
    const isDashboardTemplate =
      normalizeStr(sheetName).includes('dashboard') ||
      dataRows.some((r) => normalizeStr(String(r?.[0] || '')).includes('chiffre d affaires'));

    if (isDashboardTemplate) {
      for (const row of dataRows) {
        const label = String(row?.[0] || '');
        const hsVal = parseFlexibleNumber(row?.[1]);
        const bsVal = parseFlexibleNumber(row?.[2]);
        const singleVal = parseFlexibleNumber(row?.[3]) ?? hsVal;
        applyKeyValueRow(draft, label, hsVal, bsVal, singleVal, summarySet);
      }
    }

    // 2. Columnar mapping aggregation (HS vs BS or Global)
    const getColByTarget = (target: MappingTargetField) =>
      colConfig.find((c) => c.targetField === target);

    const seasonCol = getColByTarget('season_tag');

    const collectTargetNumbers = (target: MappingTargetField) => {
      const col = getColByTarget(target);
      if (!col) return { all: [] as number[], hs: [] as number[], bs: [] as number[] };

      const all: number[] = [];
      const hs: number[] = [];
      const bs: number[] = [];

      for (const row of dataRows) {
        const num = parseFlexibleNumber(row?.[col.index]);
        if (num === null) continue;
        all.push(num);
        if (seasonCol) {
          const sTag = normalizeStr(String(row?.[seasonCol.index] || ''));
          if (sTag.includes('hs') || sTag.includes('haute') || sTag.includes('high')) {
            hs.push(num);
          } else if (sTag.includes('bs') || sTag.includes('basse') || sTag.includes('low')) {
            bs.push(num);
          }
        }
      }
      return { all, hs, bs };
    };

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const sum = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) : null;

    // Months
    const monthsRes = collectTargetNumbers('months_duration');
    if (monthsRes.hs.length > 0 || monthsRes.bs.length > 0) {
      const mHs = avg(monthsRes.hs);
      const mBs = avg(monthsRes.bs);
      if (mHs && mHs > 0 && mHs < 12) draft.hauteSaison.months = Math.round(mHs);
      if (mBs && mBs > 0 && mBs < 12) draft.basseSaison.months = Math.round(mBs);
      summarySet.add('Durée saisonnière');
    }

    // Rotations
    const rotRes = collectTargetNumbers('rotations_per_month');
    if (rotRes.all.length > 0) {
      const rHs = avg(rotRes.hs) ?? avg(rotRes.all);
      const rBs = avg(rotRes.bs) ?? avg(rotRes.all);
      if (rHs && rHs > 0) draft.hauteSaison.rotationsPerMonth = Number(rHs.toFixed(2));
      if (rBs && rBs > 0) draft.basseSaison.rotationsPerMonth = Number(rBs.toFixed(2));
      summarySet.add('Rotations / mois');
    }

    // Volume paddy
    const volRes = collectTargetNumbers('paddy_kg_per_rotation');
    if (volRes.all.length > 0) {
      const vHs = avg(volRes.hs) ?? avg(volRes.all);
      const vBs = avg(volRes.bs) ?? avg(volRes.all);
      if (vHs && vHs > 0) draft.hauteSaison.paddyBoughtKgPerRotation = Math.round(vHs);
      if (vBs && vBs > 0) draft.basseSaison.paddyBoughtKgPerRotation = Math.round(vBs);
      summarySet.add('Volume par rotation (kg)');
    }

    // Yield
    const yieldRes = collectTargetNumbers('yield_ratio');
    if (yieldRes.all.length > 0) {
      const normYield = (v: number) => (v > 1 ? Math.min(1, v / 100) : Math.max(0.05, Math.min(1, v)));
      const yHs = avg(yieldRes.hs) ?? avg(yieldRes.all);
      const yBs = avg(yieldRes.bs) ?? avg(yieldRes.all);
      if (yHs && yHs > 0) draft.hauteSaison.yieldPaddyToRice = Number(normYield(yHs).toFixed(4));
      if (yBs && yBs > 0) draft.basseSaison.yieldPaddyToRice = Number(normYield(yBs).toFixed(4));
      summarySet.add('Rendement paddy → riz');
    }

    // Rice selling price
    const sellRes = collectTargetNumbers('rice_selling_price');
    if (sellRes.all.length > 0) {
      const pHs = avg(sellRes.hs) ?? avg(sellRes.all);
      const pBs = avg(sellRes.bs) ?? avg(sellRes.all);
      if (pHs && pHs > 0) draft.hauteSaison.riceSellingPriceArPerKg = Math.round(pHs);
      if (pBs && pBs > 0) draft.basseSaison.riceSellingPriceArPerKg = Math.round(pBs);
      summarySet.add('Prix de vente unitaire');
    } else {
      // Derive unit selling price from total_revenue if provided without explicit unit price
      const revRes = collectTargetNumbers('total_revenue');
      if (revRes.all.length > 0) {
        const totalRev = sum(revRes.all) || 0;
        const annualRiceKg =
          draft.hauteSaison.months *
            draft.hauteSaison.rotationsPerMonth *
            draft.hauteSaison.paddyBoughtKgPerRotation *
            draft.hauteSaison.yieldPaddyToRice +
          draft.basseSaison.months *
            draft.basseSaison.rotationsPerMonth *
            draft.basseSaison.paddyBoughtKgPerRotation *
            draft.basseSaison.yieldPaddyToRice;
        if (totalRev > 0 && annualRiceKg > 0) {
          const derivedPrice = Math.max(100, Math.round(totalRev / annualRiceKg));
          draft.hauteSaison.riceSellingPriceArPerKg = derivedPrice;
          draft.basseSaison.riceSellingPriceArPerKg = Math.round(derivedPrice * 1.15);
          summarySet.add('Prix de vente dérivé du CA');
        }
      }
    }

    // Byproduct price
    const bypRes = collectTargetNumbers('byproduct_selling_price');
    if (bypRes.all.length > 0) {
      const bHs = avg(bypRes.hs) ?? avg(bypRes.all);
      const bBs = avg(bypRes.bs) ?? avg(bypRes.all);
      if (bHs !== null && bHs >= 0) draft.hauteSaison.byproductSellingPriceArPerKg = Math.round(bHs);
      if (bBs !== null && bBs >= 0) draft.basseSaison.byproductSellingPriceArPerKg = Math.round(bBs);
      summarySet.add('Prix sous-produits');
    }

    // Paddy purchase price
    const paddyBuyRes = collectTargetNumbers('paddy_purchase_price');
    if (paddyBuyRes.all.length > 0) {
      const cHs = avg(paddyBuyRes.hs) ?? avg(paddyBuyRes.all);
      const cBs = avg(paddyBuyRes.bs) ?? avg(paddyBuyRes.all);
      draft.costsPerKgPaddy = draft.costsPerKgPaddy.map((item) =>
        item.id === 'cost-paddy'
          ? {
              ...item,
              costHS: cHs !== null ? Math.round(cHs) : item.costHS,
              costBS: cBs !== null ? Math.round(cBs) : item.costBS,
            }
          : item
      );
      summarySet.add('Prix d’achat paddy');
    }

    // Processing cost per kg
    const procRes = collectTargetNumbers('processing_cost_per_kg');
    if (procRes.all.length > 0) {
      const prHs = avg(procRes.hs) ?? avg(procRes.all);
      const prBs = avg(procRes.bs) ?? avg(procRes.all);
      draft.costsPerKgPaddy = draft.costsPerKgPaddy.map((item) =>
        item.id !== 'cost-paddy'
          ? {
              ...item,
              costHS: prHs !== null ? Math.round(prHs) : item.costHS,
              costBS: prBs !== null ? Math.round(prBs) : item.costBS,
            }
          : item
      );
      summarySet.add('Coût transformation / kg');
    }

    // Fixed monthly charges
    const fixedRes = collectTargetNumbers('fixed_monthly_charge');
    if (fixedRes.all.length > 0) {
      const labelCol = getColByTarget('label_name');
      const chargeCol = getColByTarget('fixed_monthly_charge')!;
      const extractedCharges: { id: string; label: string; amount: number }[] = [];

      dataRows.forEach((row, idx) => {
        const amt = parseFlexibleNumber(row?.[chargeCol.index]);
        if (amt !== null && amt > 0) {
          const lbl = labelCol ? String(row?.[labelCol.index] || '').trim() : '';
          extractedCharges.push({
            id: `fix-imp-${idx + 1}`,
            label: lbl || `Charge fixe #${idx + 1}`,
            amount: Math.round(amt),
          });
        }
      });

      if (extractedCharges.length > 0 && extractedCharges.length <= 12) {
        draft.fixedMonthlyCharges = extractedCharges;
      } else {
        const avgFix = Math.round(avg(fixedRes.all) || 0);
        if (avgFix > 0) {
          draft.fixedMonthlyCharges = [
            { id: 'fix-imp-avg', label: 'Charges fixes mensuelles (Excel)', amount: avgFix },
          ];
        }
      }
      summarySet.add('Charges fixes mensuelles');
    }

    // Investment items
    const matRes = collectTargetNumbers('investment_materiel');
    if (matRes.all.length > 0) {
      draft.investment.materielAr = Math.round(sum(matRes.all) || draft.investment.materielAr);
      summarySet.add('Investissement matériel');
    }

    const bufRes = collectTargetNumbers('investment_cash_buffer');
    if (bufRes.all.length > 0) {
      draft.investment.cashBufferAr = Math.round(avg(bufRes.all) || draft.investment.cashBufferAr);
      summarySet.add('Cash buffer');
    }

    // Tax rate & Discount rate
    const taxRes = collectTargetNumbers('tax_rate');
    if (taxRes.all.length > 0) {
      const t = avg(taxRes.all)!;
      const normT = t > 1 ? t / 100 : t;
      if (normT >= 0 && normT < 1) {
        draft.corporateTaxRate = Number(normT.toFixed(4));
        summarySet.add('Taux d’impôt IR');
      }
    }

    const discRes = collectTargetNumbers('discount_rate');
    if (discRes.all.length > 0) {
      const d = avg(discRes.all)!;
      const normD = d > 1 ? d / 100 : d;
      if (normD >= 0 && normD <= 2) {
        draft.discountRate = Number(normD.toFixed(4));
        summarySet.add('Taux d’actualisation r');
      }
    }

    // Keep renamed headers in snapshot
    const renamedHeaders = colConfig.map((c) => c.renamedHeader);
    const sampleRows = dataRows.slice(0, 6).map((row) => {
      const obj: Record<string, string | number | null> = {};
      colConfig.forEach((c) => {
        const rawVal = row?.[c.index];
        obj[c.renamedHeader] =
          rawVal === undefined || rawVal === null || String(rawVal).trim() === ''
            ? null
            : typeof rawVal === 'number' || typeof rawVal === 'string'
            ? rawVal
            : String(rawVal);
      });
      return obj;
    });

    snapshots.push({
      sheetName,
      headers: renamedHeaders,
      sampleRows,
      totalRows: dataRows.length,
      mappedColumns: colConfig
        .filter((c) => c.targetField !== 'ignore')
        .map((c) => {
          const orig = sheet.columns.find((sc) => sc.index === c.index);
          return {
            originalHeader: orig?.originalHeader || c.renamedHeader,
            renamedHeader: c.renamedHeader,
            targetField: c.targetField,
            dataType: orig?.detectedType || 'text',
          };
        }),
    });
  }

  if (summarySet.size === 0) {
    warnings.push(
      'Aucune variable numérique financière directe n’a été mappée : les valeurs par défaut du modèle ont servi de base.'
    );
  }

  // Ensure HS + BS months remain valid (sum <= 12, at least 1 each)
  if (draft.hauteSaison.months + draft.basseSaison.months !== 12) {
    draft.basseSaison.months = Math.max(1, 12 - Math.min(11, Math.max(1, draft.hauteSaison.months)));
  }

  return {
    assumptions: draft,
    mappedFieldsSummary: Array.from(summarySet),
    warnings,
    snapshots,
  };
}
