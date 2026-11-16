import * as XLSX from 'xlsx';
import {
  FinancialAssumptions,
  FullFinancialModel,
  ImportedRiceBenchmark,
  ImportedRiceGrade,
  MarketComparisonAssumptions,
  MarketPositioningStrategy,
} from '../types/finance';
import { DEFAULT_ASSUMPTIONS } from '../engine/defaultAssumptions';

export const IMPORTED_GRADE_META: Record<
  ImportedRiceGrade,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  brise: {
    label: 'Riz brisé (économique)',
    shortLabel: 'Brisé',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  standard: {
    label: 'Riz standard importé (5%)',
    shortLabel: 'Standard',
    badgeClass: 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  },
  parfume: {
    label: 'Riz parfumé importé',
    shortLabel: 'Parfumé',
    badgeClass: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300',
  },
  premium: {
    label: 'Riz supérieur / spécialisé',
    shortLabel: 'Premium',
    badgeClass: 'border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300',
  },
};

export const POSITIONING_STRATEGY_META: Record<
  MarketPositioningStrategy,
  {
    label: string;
    shortLabel: string;
    targetDeltaPctVsAvgImport: number;
    description: string;
  }
> = {
  competitif: {
    label: 'Pénétration compétitive (−5 % sous importé moyen)',
    shortLabel: 'Compétitif (−5 %)',
    targetDeltaPctVsAvgImport: -0.05,
    description:
      'Capter rapidement les parts du riz indien/pakistanais en offrant un prix local inférieur de 5 %.',
  },
  parite: {
    label: 'Parité tarifaire (aligné sur importé standard)',
    shortLabel: 'Parité (0 %)',
    targetDeltaPctVsAvgImport: 0,
    description:
      'Maintenir le même niveau de prix que le riz importé tout en mettant en avant la fraîcheur locale.',
  },
  premium_qualite: {
    label: 'Différenciation Qualité / Bio (+12 % vs importé)',
    shortLabel: 'Premium (+12 %)',
    targetDeltaPctVsAvgImport: 0.12,
    description:
      'Valoriser le riz malgache traçable/Makalioka face au riz parfumé et urbain supérieur.',
  },
};

export function getResolvedMarketComparison(
  assumptions: FinancialAssumptions
): MarketComparisonAssumptions {
  const fallback = DEFAULT_ASSUMPTIONS.marketComparison!;
  return {
    positioningStrategy:
      assumptions.marketComparison?.positioningStrategy ?? fallback.positioningStrategy,
    benchmarks:
      assumptions.marketComparison?.benchmarks &&
      assumptions.marketComparison.benchmarks.length > 0
        ? assumptions.marketComparison.benchmarks
        : fallback.benchmarks,
  };
}

export interface BenchmarkGapRow {
  benchmark: ImportedRiceBenchmark;
  gapVsLocalHSAr: number;
  gapVsLocalHSPct: number;
  gapVsLocalBSAr: number;
  gapVsLocalBSPct: number;
  gapVsLocalWeightedAr: number;
  gapVsLocalWeightedPct: number;
}

export interface MarketComparisonSummary {
  localPriceHS: number;
  localPriceBS: number;
  localWeightedAvgPrice: number;
  importedAvgPrice: number;
  importedWeightedAvgPrice: number;
  importedMinPrice: number;
  importedMaxPrice: number;
  avgGapAr: number;
  avgGapPct: number;
  competitivenessIndex: number; // < 100 means local is cheaper than imported avg
  recommendedTargetPriceAr: number;
  recommendedHSPriceAr: number;
  recommendedBSPriceAr: number;
  rows: BenchmarkGapRow[];
}

export function computeMarketComparisonMetrics(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  market: MarketComparisonAssumptions
): MarketComparisonSummary {
  const localPriceHS = assumptions.hauteSaison.riceSellingPriceArPerKg;
  const localPriceBS = assumptions.basseSaison.riceSellingPriceArPerKg;

  const hsKg = model.hauteSaison.totalRiceKg;
  const bsKg = model.basseSaison.totalRiceKg;
  const totalKg = Math.max(1, hsKg + bsKg);
  const localWeightedAvgPrice = (localPriceHS * hsKg + localPriceBS * bsKg) / totalKg;

  const validBenchmarks = market.benchmarks.filter((b) => b.priceArPerKg > 0);
  const count = validBenchmarks.length;

  const importedAvgPrice =
    count > 0
      ? validBenchmarks.reduce((s, b) => s + b.priceArPerKg, 0) / count
      : localWeightedAvgPrice;

  const shareSum = validBenchmarks.reduce(
    (s, b) => s + Math.max(0, b.marketShareEstimatePct),
    0
  );
  const importedWeightedAvgPrice =
    count > 0 && shareSum > 0
      ? validBenchmarks.reduce(
          (s, b) => s + b.priceArPerKg * Math.max(0, b.marketShareEstimatePct),
          0
        ) / shareSum
      : importedAvgPrice;

  const importedMinPrice =
    count > 0 ? Math.min(...validBenchmarks.map((b) => b.priceArPerKg)) : 0;
  const importedMaxPrice =
    count > 0 ? Math.max(...validBenchmarks.map((b) => b.priceArPerKg)) : 0;

  const avgGapAr = localWeightedAvgPrice - importedWeightedAvgPrice;
  const avgGapPct =
    importedWeightedAvgPrice > 0 ? (avgGapAr / importedWeightedAvgPrice) * 100 : 0;
  const competitivenessIndex =
    importedWeightedAvgPrice > 0
      ? (localWeightedAvgPrice / importedWeightedAvgPrice) * 100
      : 100;

  const stratMeta = POSITIONING_STRATEGY_META[market.positioningStrategy];
  const recommendedTargetPriceAr = Math.max(
    500,
    Math.round((importedWeightedAvgPrice * (1 + stratMeta.targetDeltaPctVsAvgImport)) / 50) * 50
  );

  // Preserve seasonal HS/BS spread around recommended target
  const currentRatio = localWeightedAvgPrice > 0 ? recommendedTargetPriceAr / localWeightedAvgPrice : 1;
  const recommendedHSPriceAr = Math.max(
    500,
    Math.round((localPriceHS * currentRatio) / 50) * 50
  );
  const recommendedBSPriceAr = Math.max(
    500,
    Math.round((localPriceBS * currentRatio) / 50) * 50
  );

  const rows: BenchmarkGapRow[] = market.benchmarks.map((b) => {
    const p = Math.max(1, b.priceArPerKg);
    return {
      benchmark: b,
      gapVsLocalHSAr: localPriceHS - b.priceArPerKg,
      gapVsLocalHSPct: ((localPriceHS - b.priceArPerKg) / p) * 100,
      gapVsLocalBSAr: localPriceBS - b.priceArPerKg,
      gapVsLocalBSPct: ((localPriceBS - b.priceArPerKg) / p) * 100,
      gapVsLocalWeightedAr: localWeightedAvgPrice - b.priceArPerKg,
      gapVsLocalWeightedPct: ((localWeightedAvgPrice - b.priceArPerKg) / p) * 100,
    };
  });

  return {
    localPriceHS,
    localPriceBS,
    localWeightedAvgPrice,
    importedAvgPrice,
    importedWeightedAvgPrice,
    importedMinPrice,
    importedMaxPrice,
    avgGapAr,
    avgGapPct,
    competitivenessIndex,
    recommendedTargetPriceAr,
    recommendedHSPriceAr,
    recommendedBSPriceAr,
    rows,
  };
}

function normalizeGrade(raw: string): ImportedRiceGrade {
  const s = raw.toLowerCase();
  if (s.includes('bris')) return 'brise';
  if (s.includes('parfum') || s.includes('jasmin') || s.includes('basmati')) return 'parfume';
  if (s.includes('prem') || s.includes('sup')) return 'premium';
  return 'standard';
}

export async function parseImportedRiceFile(file: File): Promise<ImportedRiceBenchmark[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Le fichier ne contient aucune feuille exploitable.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const parsed: ImportedRiceBenchmark[] = [];
  rows.forEach((row, idx) => {
    const keys = Object.keys(row);
    const findVal = (patterns: string[]): unknown => {
      const matchedKey = keys.find((k) =>
        patterns.some((p) => k.toLowerCase().includes(p))
      );
      return matchedKey ? row[matchedKey] : '';
    };

    const rawName = String(
      findVal(['nom', 'vari', 'libel', 'produit', 'riz', 'name']) || ''
    ).trim();
    const rawOrigin = String(findVal(['orig', 'pays', 'provenance']) || 'Import').trim();
    const rawGrade = String(findVal(['cat', 'grade', 'qual', 'type']) || 'standard').trim();
    const rawPrice = String(findVal(['prix', 'price', 'tarif', 'ar']) || '')
      .replace(/\s+/g, '')
      .replace(',', '.');
    const rawShare = String(findVal(['part', 'share', 'poids', '%']) || '20')
      .replace(/\s+/g, '')
      .replace(',', '.');
    const rawNotes = String(findVal(['note', 'obs', 'comment']) || '').trim();

    const price = Number(rawPrice.replace(/[^0-9.]/g, ''));
    const share = Number(rawShare.replace(/[^0-9.]/g, ''));

    if (rawName && Number.isFinite(price) && price > 0) {
      parsed.push({
        id: `mkt-imp-${Date.now()}-${idx}`,
        name: rawName,
        origin: rawOrigin || 'Import',
        grade: normalizeGrade(`${rawGrade} ${rawName}`),
        priceArPerKg: Math.round(price),
        marketShareEstimatePct:
          Number.isFinite(share) && share > 0 ? Math.min(100, Math.round(share)) : 20,
        notes: rawNotes || `Importé depuis ${file.name}`,
      });
    }
  });

  if (parsed.length === 0) {
    throw new Error(
      'Aucune ligne valide détectée. Colonnes attendues : Nom, Origine, Catégorie, Prix Ar/kg, Part %.'
    );
  }

  return parsed;
}

export function downloadMarketTemplateCsv(): void {
  const lines = [
    'Nom;Origine;Catégorie;Prix Ar/kg;Part %;Notes',
    'Riz brisé importé 25%;Inde / Pakistan;brise;2250;35;Segment économique urbain',
    'Riz indien 5% brisures;Inde;standard;2550;30;Concurrent direct grossistes',
    'Riz pakistanais long grain;Pakistan;standard;2450;20;Arrivages port Toamasina',
    'Riz thaï parfumé Jasmin;Thaïlande;parfume;3800;15;Segment supérieur hôtellerie',
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modele_prix_riz_importe_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
