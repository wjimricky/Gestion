import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { ProjectRecord } from '../types/project';
import { calculateFullModel } from '../engine/calculator';
import { formatAriary, formatKg, formatMonths, formatPercent } from './formatters';

export interface ProjectComparisonMetricRow {
  id: string;
  label: string;
  category: 'Rentabilité' | 'Exploitation (A1)' | 'Capital & Risque' | 'Trajectoire';
  valueA: number;
  valueB: number;
  formattedA: string;
  formattedB: string;
  deltaRaw: number;
  formattedDelta: string;
  deltaPercent: number | null;
  polarity: 'higher_better' | 'lower_better' | 'neutral';
  winner: 'A' | 'B' | 'tie';
  highlight?: boolean;
}

export interface ProjectComparisonResult {
  projectA: ProjectRecord;
  projectB: ProjectRecord;
  modelA: FullFinancialModel;
  modelB: FullFinancialModel;
  metrics: ProjectComparisonMetricRow[];
  chartData: Array<{
    indicator: string;
    projetA: number;
    projetB: number;
  }>;
}

function getEffectiveProjectAssumptions(
  project: ProjectRecord,
  activeProjectId?: string,
  liveAssumptions?: FinancialAssumptions
): FinancialAssumptions {
  if (activeProjectId && liveAssumptions && project.id === activeProjectId) {
    return liveAssumptions;
  }
  return project.assumptions;
}

function formatDeltaAr(delta: number, inMillions: boolean): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatAriary(delta, { inMillions })}`;
}

export function compareTwoProjects(
  projectA: ProjectRecord,
  projectB: ProjectRecord,
  options?: {
    activeProjectId?: string;
    liveAssumptions?: FinancialAssumptions;
    inMillions?: boolean;
  }
): ProjectComparisonResult {
  const inMillions = options?.inMillions ?? true;
  const assumpA = getEffectiveProjectAssumptions(
    projectA,
    options?.activeProjectId,
    options?.liveAssumptions
  );
  const assumpB = getEffectiveProjectAssumptions(
    projectB,
    options?.activeProjectId,
    options?.liveAssumptions
  );

  const modelA = calculateFullModel(assumpA);
  const modelB = calculateFullModel(assumpB);

  const buildRow = (params: {
    id: string;
    label: string;
    category: ProjectComparisonMetricRow['category'];
    valueA: number;
    valueB: number;
    formatValue: (v: number) => string;
    formatDelta: (d: number) => string;
    polarity: ProjectComparisonMetricRow['polarity'];
    highlight?: boolean;
    tolerance?: number;
  }): ProjectComparisonMetricRow => {
    const tol = params.tolerance ?? 1e-4;
    const deltaRaw = params.valueB - params.valueA;
    const deltaPercent =
      Math.abs(params.valueA) > 1e-6 ? (deltaRaw / Math.abs(params.valueA)) * 100 : null;

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (Math.abs(deltaRaw) > tol && params.polarity !== 'neutral') {
      if (params.polarity === 'higher_better') {
        winner = deltaRaw > 0 ? 'B' : 'A';
      } else {
        winner = deltaRaw < 0 ? 'B' : 'A';
      }
    }

    return {
      id: params.id,
      label: params.label,
      category: params.category,
      valueA: params.valueA,
      valueB: params.valueB,
      formattedA: params.formatValue(params.valueA),
      formattedB: params.formatValue(params.valueB),
      deltaRaw,
      formattedDelta: Math.abs(deltaRaw) <= tol ? '0' : params.formatDelta(deltaRaw),
      deltaPercent,
      polarity: params.polarity,
      winner,
      highlight: params.highlight,
    };
  };

  const irrA = Number.isFinite(modelA.irr.irrValue) ? modelA.irr.irrValue : 0;
  const irrB = Number.isFinite(modelB.irr.irrValue) ? modelB.irr.irrValue : 0;

  const cf2A = modelA.projections.realistic[1]?.netResultAfterTaxAr ?? 0;
  const cf2B = modelB.projections.realistic[1]?.netResultAfterTaxAr ?? 0;
  const cf3A = modelA.projections.realistic[2]?.netResultAfterTaxAr ?? 0;
  const cf3B = modelB.projections.realistic[2]?.netResultAfterTaxAr ?? 0;

  const metrics: ProjectComparisonMetricRow[] = [
    buildRow({
      id: 'van',
      label: 'VAN (3 ans)',
      category: 'Rentabilité',
      valueA: modelA.npv.npvAr,
      valueB: modelB.npv.npvAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      highlight: true,
      tolerance: 100,
    }),
    buildRow({
      id: 'tri',
      label: 'TRI (Taux de rentabilité interne)',
      category: 'Rentabilité',
      valueA: irrA,
      valueB: irrB,
      formatValue: (v) => (v > 0 ? formatPercent(v, 1) : 'N/A'),
      formatDelta: (d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`,
      polarity: 'higher_better',
      highlight: true,
      tolerance: 0.0005,
    }),
    buildRow({
      id: 'ca_a1',
      label: 'Chiffre d’affaires Année 1',
      category: 'Exploitation (A1)',
      valueA: modelA.year1.totalTurnoverAr,
      valueB: modelB.year1.totalTurnoverAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      highlight: true,
      tolerance: 100,
    }),
    buildRow({
      id: 'marge_brute',
      label: 'Marge brute annuelle (A1)',
      category: 'Exploitation (A1)',
      valueA: modelA.year1.annualGrossProfitAr,
      valueB: modelB.year1.annualGrossProfitAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      tolerance: 100,
    }),
    buildRow({
      id: 'taux_marge_brute',
      label: 'Taux de marge brute',
      category: 'Exploitation (A1)',
      valueA: modelA.year1.grossMarginRate,
      valueB: modelB.year1.grossMarginRate,
      formatValue: (v) => formatPercent(v, 1),
      formatDelta: (d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)} pts`,
      polarity: 'higher_better',
      tolerance: 0.0005,
    }),
    buildRow({
      id: 'benefice_net',
      label: 'Résultat net après IR (A1)',
      category: 'Exploitation (A1)',
      valueA: modelA.year1.netResultAfterTaxAr,
      valueB: modelB.year1.netResultAfterTaxAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      tolerance: 100,
    }),
    buildRow({
      id: 'volume_riz',
      label: 'Volume de riz vendu (A1)',
      category: 'Exploitation (A1)',
      valueA: modelA.year1.totalRiceKgSold,
      valueB: modelB.year1.totalRiceKgSold,
      formatValue: (v) => formatKg(v),
      formatDelta: (d) => `${d > 0 ? '+' : ''}${formatKg(d)}`,
      polarity: 'higher_better',
      tolerance: 1,
    }),
    buildRow({
      id: 'investissement_i0',
      label: 'Fonds à lever (Investissement I₀)',
      category: 'Capital & Risque',
      valueA: modelA.investment.fundsToRaiseAr,
      valueB: modelB.investment.fundsToRaiseAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'lower_better',
      tolerance: 100,
    }),
    buildRow({
      id: 'payback',
      label: 'Payback saisonnier',
      category: 'Capital & Risque',
      valueA: modelA.payback.paybackMonths,
      valueB: modelB.payback.paybackMonths,
      formatValue: (v) => formatMonths(v),
      formatDelta: (d) => `${d > 0 ? '+' : ''}${d.toFixed(2)} mois`,
      polarity: 'lower_better',
      tolerance: 0.02,
    }),
    buildRow({
      id: 'breakeven',
      label: 'Seuil de rentabilité annuel (CA)',
      category: 'Capital & Risque',
      valueA: modelA.breakEven.annualBreakEvenTurnoverAr,
      valueB: modelB.breakEven.annualBreakEvenTurnoverAr,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'lower_better',
      tolerance: 100,
    }),
    buildRow({
      id: 'roi_y1',
      label: 'ROI Année 1 (sur I₀)',
      category: 'Rentabilité',
      valueA: modelA.investment.roiRatio,
      valueB: modelB.investment.roiRatio,
      formatValue: (v) => `${v.toFixed(2)}×`,
      formatDelta: (d) => `${d > 0 ? '+' : ''}${d.toFixed(2)}×`,
      polarity: 'higher_better',
      tolerance: 0.01,
    }),
    buildRow({
      id: 'cf_a2',
      label: 'Cash-Flow net Année 2 (Réaliste)',
      category: 'Trajectoire',
      valueA: cf2A,
      valueB: cf2B,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      tolerance: 100,
    }),
    buildRow({
      id: 'cf_a3',
      label: 'Cash-Flow net Année 3 (Réaliste)',
      category: 'Trajectoire',
      valueA: cf3A,
      valueB: cf3B,
      formatValue: (v) => formatAriary(v, { inMillions }),
      formatDelta: (d) => formatDeltaAr(d, inMillions),
      polarity: 'higher_better',
      tolerance: 100,
    }),
  ];

  const toM = (v: number) => Number((v / 1e6).toFixed(2));
  const chartData = [
    {
      indicator: 'CA A1',
      projetA: toM(modelA.year1.totalTurnoverAr),
      projetB: toM(modelB.year1.totalTurnoverAr),
    },
    {
      indicator: 'Marge brute',
      projetA: toM(modelA.year1.annualGrossProfitAr),
      projetB: toM(modelB.year1.annualGrossProfitAr),
    },
    {
      indicator: 'Résultat net A1',
      projetA: toM(modelA.year1.netResultAfterTaxAr),
      projetB: toM(modelB.year1.netResultAfterTaxAr),
    },
    {
      indicator: 'Fonds I₀',
      projetA: toM(modelA.investment.fundsToRaiseAr),
      projetB: toM(modelB.investment.fundsToRaiseAr),
    },
    {
      indicator: 'VAN (3 ans)',
      projetA: toM(modelA.npv.npvAr),
      projetB: toM(modelB.npv.npvAr),
    },
  ];

  return {
    projectA,
    projectB,
    modelA,
    modelB,
    metrics,
    chartData,
  };
}
