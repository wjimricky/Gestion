import { SavedScenarioItem } from '../context/FinancialContext';
import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { SparklinePoint } from '../components/charts/SparklineChart';

export interface ScenarioTrendSnapshot {
  id: string;
  label: string;
  shortLabel: string;
  caAr: number;
  grossMarginAr: number;
  netResultAr: number;
  vanAr: number;
  triPct: number;
  breakEvenAr: number;
  paybackMonths: number;
}

export interface ThreeScenarioTrendsResult {
  snapshots: ScenarioTrendSnapshot[];
  savedUsedCount: number;
  usesLiveFallback: boolean;
  series: {
    ca: SparklinePoint[];
    grossMargin: SparklinePoint[];
    netResult: SparklinePoint[];
    van: SparklinePoint[];
    tri: SparklinePoint[];
    breakEven: SparklinePoint[];
    payback: SparklinePoint[];
  };
  deltas: {
    caPct: number;
    grossMarginPct: number;
    netResultPct: number;
    vanAr: number;
    triPts: number;
    breakEvenPct: number;
    paybackMonths: number;
  };
}

function compactName(name: string, idx: number): string {
  const cleaned = name
    .replace(/^Scénario\s+/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim();
  if (!cleaned) return `Scén. ${idx + 1}`;
  return cleaned.length > 16 ? `${cleaned.slice(0, 14)}…` : cleaned;
}

function toSnapshot(
  id: string,
  name: string,
  shortLabel: string,
  m: FullFinancialModel
): ScenarioTrendSnapshot {
  return {
    id,
    label: name,
    shortLabel,
    caAr: m.year1.totalTurnoverAr,
    grossMarginAr: m.year1.annualGrossProfitAr,
    netResultAr: m.year1.netResultAfterTaxAr,
    vanAr: m.npv.npvAr,
    triPct: Number.isFinite(m.irr.irrValue) ? m.irr.irrValue * 100 : 0,
    breakEvenAr: m.breakEven.annualBreakEvenTurnoverAr,
    paybackMonths: m.payback.paybackMonths,
  };
}

function buildStressAssumptions(
  base: FinancialAssumptions,
  mode: 'pessimiste' | 'optimiste'
): FinancialAssumptions {
  const riceMult = mode === 'pessimiste' ? 0.94 : 1.06;
  const paddyMult = mode === 'pessimiste' ? 1.06 : 0.95;
  return {
    ...base,
    hauteSaison: {
      ...base.hauteSaison,
      riceSellingPriceArPerKg: Math.round(base.hauteSaison.riceSellingPriceArPerKg * riceMult),
    },
    basseSaison: {
      ...base.basseSaison,
      riceSellingPriceArPerKg: Math.round(base.basseSaison.riceSellingPriceArPerKg * riceMult),
    },
    costsPerKgPaddy: base.costsPerKgPaddy.map((c) =>
      c.id === 'cost-paddy'
        ? {
            ...c,
            costHS: Math.round(c.costHS * paddyMult),
            costBS: Math.round(c.costBS * paddyMult),
          }
        : c
    ),
  };
}

/**
 * Computes micro-trend sparkline series across the last 3 saved scenarios.
 * When fewer than 3 saved scenarios exist, supplements cleanly with active simulation
 * or stress baseline so a readable 3-point trend line is always available.
 */
export function buildLastThreeScenariosTrends(
  savedScenarios: SavedScenarioItem[],
  currentAssumptions: FinancialAssumptions,
  currentModel: FullFinancialModel
): ThreeScenarioTrendsResult {
  const lastSaved = savedScenarios.slice(-3);
  const savedUsedCount = lastSaved.length;
  let snapshots: ScenarioTrendSnapshot[] = lastSaved.map((sc, idx) =>
    toSnapshot(sc.id, sc.name, compactName(sc.name, idx), calculateFullModel(sc.assumptions))
  );

  let usesLiveFallback = false;

  if (snapshots.length === 2) {
    usesLiveFallback = true;
    snapshots = [
      ...snapshots,
      toSnapshot('live-active', 'Simulation en cours', 'Actuel', currentModel),
    ];
  } else if (snapshots.length === 1) {
    usesLiveFallback = true;
    const pessModel = calculateFullModel(buildStressAssumptions(currentAssumptions, 'pessimiste'));
    snapshots = [
      toSnapshot('ref-pessimiste', 'Référence Pessimiste (-6% prix)', 'Pessimiste', pessModel),
      snapshots[0],
      toSnapshot('live-active', 'Simulation en cours', 'Actuel', currentModel),
    ];
  } else if (snapshots.length === 0) {
    usesLiveFallback = true;
    const pessModel = calculateFullModel(buildStressAssumptions(currentAssumptions, 'pessimiste'));
    const optModel = calculateFullModel(buildStressAssumptions(currentAssumptions, 'optimiste'));
    snapshots = [
      toSnapshot('ref-pessimiste', 'Référence Pessimiste', 'Pessimiste', pessModel),
      toSnapshot('live-active', 'Simulation en cours', 'Actuel', currentModel),
      toSnapshot('ref-optimiste', 'Référence Optimiste', 'Optimiste', optModel),
    ];
  }

  const mapSeries = (pick: (s: ScenarioTrendSnapshot) => number): SparklinePoint[] =>
    snapshots.map((s) => ({
      label: s.label,
      value: pick(s),
    }));

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const pctDelta = (a: number, b: number) =>
    Math.abs(a) > 1e-6 ? ((b - a) / Math.abs(a)) * 100 : 0;

  return {
    snapshots,
    savedUsedCount,
    usesLiveFallback,
    series: {
      ca: mapSeries((s) => s.caAr),
      grossMargin: mapSeries((s) => s.grossMarginAr),
      netResult: mapSeries((s) => s.netResultAr),
      van: mapSeries((s) => s.vanAr),
      tri: mapSeries((s) => s.triPct),
      breakEven: mapSeries((s) => s.breakEvenAr),
      payback: mapSeries((s) => s.paybackMonths),
    },
    deltas: {
      caPct: pctDelta(first.caAr, last.caAr),
      grossMarginPct: pctDelta(first.grossMarginAr, last.grossMarginAr),
      netResultPct: pctDelta(first.netResultAr, last.netResultAr),
      vanAr: last.vanAr - first.vanAr,
      triPts: last.triPct - first.triPct,
      breakEvenPct: pctDelta(first.breakEvenAr, last.breakEvenAr),
      paybackMonths: last.paybackMonths - first.paybackMonths,
    },
  };
}
