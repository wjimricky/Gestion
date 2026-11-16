import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions } from '../types/finance';

export type CorrelationVariableId =
  | 'sellingPrice'
  | 'paddyCost'
  | 'millingYield'
  | 'rotations'
  | 'transportCost'
  | 'discountRate';

export interface CorrelationVariableMeta {
  id: CorrelationVariableId;
  label: string;
  shortLabel: string;
  unitHint: string;
  xSteps: number[]; // 7 relative delta steps for X axis
  ySteps: number[]; // 5 curve levels for Y axis (multi-curve + scatter)
  formatStep: (delta: number) => string;
  describeActualValue: (assumptions: FinancialAssumptions, delta: number) => string;
}

function cloneAssumptions(a: FinancialAssumptions): FinancialAssumptions {
  return JSON.parse(JSON.stringify(a)) as FinancialAssumptions;
}

function isTransportRow(id: string, label: string): boolean {
  if (id === 'rot-carburant') return true;
  const norm = label.toLowerCase();
  return (
    norm.includes('carburant') ||
    norm.includes('transport') ||
    norm.includes('collecte') ||
    norm.includes('camion') ||
    norm.includes('logistique')
  );
}

function formatSignedPercent(delta: number, decimals = 0): string {
  const pct = delta * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)} %`;
}

export const CORRELATION_VARIABLES: Record<CorrelationVariableId, CorrelationVariableMeta> = {
  sellingPrice: {
    id: 'sellingPrice',
    label: 'Prix de vente du riz',
    shortLabel: 'Prix riz',
    unitHint: 'Variation % (HS & BS)',
    xSteps: [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15],
    ySteps: [-0.15, -0.075, 0, 0.075, 0.15],
    formatStep: (d) => formatSignedPercent(d, d % 0.01 !== 0 ? 1 : 0),
    describeActualValue: (a, d) => {
      const hs = Math.round(a.hauteSaison.riceSellingPriceArPerKg * (1 + d));
      const bs = Math.round(a.basseSaison.riceSellingPriceArPerKg * (1 + d));
      return `${hs.toLocaleString('fr-FR')} / ${bs.toLocaleString('fr-FR')} Ar/kg`;
    },
  },
  paddyCost: {
    id: 'paddyCost',
    label: 'Coût d’achat du paddy',
    shortLabel: 'Coût paddy',
    unitHint: 'Variation % (HS & BS)',
    xSteps: [-0.2, -0.12, -0.06, 0, 0.06, 0.12, 0.2],
    ySteps: [-0.15, -0.075, 0, 0.075, 0.15],
    formatStep: (d) => formatSignedPercent(d, d % 0.01 !== 0 ? 1 : 0),
    describeActualValue: (a, d) => {
      const row = a.costsPerKgPaddy.find((c) => c.id === 'cost-paddy') || a.costsPerKgPaddy[0];
      const hs = Math.round((row?.costHS ?? 800) * (1 + d));
      const bs = Math.round((row?.costBS ?? 1400) * (1 + d));
      return `${hs.toLocaleString('fr-FR')} / ${bs.toLocaleString('fr-FR')} Ar/kg`;
    },
  },
  millingYield: {
    id: 'millingYield',
    label: 'Rendement d’usinage',
    shortLabel: 'Rendement',
    unitHint: 'Variation pts de %',
    xSteps: [-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06],
    ySteps: [-0.04, -0.02, 0, 0.02, 0.04],
    formatStep: (d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)} pts`,
    describeActualValue: (a, d) => {
      const y = Math.min(0.85, Math.max(0.45, a.hauteSaison.yieldPaddyToRice + d));
      return `${(y * 100).toFixed(1)} %`;
    },
  },
  rotations: {
    id: 'rotations',
    label: 'Rotations mensuelles',
    shortLabel: 'Rotations',
    unitHint: 'Variation % cadence HS/BS',
    xSteps: [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3],
    ySteps: [-0.2, -0.1, 0, 0.1, 0.2],
    formatStep: (d) => formatSignedPercent(d, 0),
    describeActualValue: (a, d) => {
      const hs = Math.max(0.25, a.hauteSaison.rotationsPerMonth * (1 + d));
      const bs = Math.max(0.25, a.basseSaison.rotationsPerMonth * (1 + d));
      return `${hs.toFixed(1)} / ${bs.toFixed(1)} rot/m`;
    },
  },
  transportCost: {
    id: 'transportCost',
    label: 'Coût transport & carburant',
    shortLabel: 'Transport',
    unitHint: 'Variation % logistique',
    xSteps: [-0.3, -0.15, 0, 0.15, 0.3, 0.5, 0.75],
    ySteps: [-0.25, 0, 0.25, 0.5, 0.75],
    formatStep: (d) => formatSignedPercent(d, 0),
    describeActualValue: (a, d) => {
      const transportRows = a.costsPerRotation.filter((r) => isTransportRow(r.id, r.label));
      const hs = Math.round(transportRows.reduce((s, r) => s + r.costHS, 0) * (1 + d));
      return `${(hs / 1_000_000).toFixed(2)} M Ar/rot (HS)`;
    },
  },
  discountRate: {
    id: 'discountRate',
    label: 'Taux d’actualisation (r)',
    shortLabel: 'Taux r',
    unitHint: 'Variation pts de %',
    xSteps: [-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06],
    ySteps: [-0.04, -0.02, 0, 0.02, 0.04],
    formatStep: (d) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)} pts`,
    describeActualValue: (a, d) => {
      const r = Math.min(0.45, Math.max(0.03, a.discountRate + d));
      return `${(r * 100).toFixed(1)} %`;
    },
  },
};

export const CORRELATION_VARIABLE_LIST: CorrelationVariableMeta[] = Object.values(
  CORRELATION_VARIABLES
);

function applyVariablePerturbation(
  draft: FinancialAssumptions,
  varId: CorrelationVariableId,
  delta: number
): void {
  if (delta === 0) return;
  switch (varId) {
    case 'sellingPrice': {
      const factor = Math.max(0.4, 1 + delta);
      draft.hauteSaison.riceSellingPriceArPerKg = Math.round(
        draft.hauteSaison.riceSellingPriceArPerKg * factor
      );
      draft.basseSaison.riceSellingPriceArPerKg = Math.round(
        draft.basseSaison.riceSellingPriceArPerKg * factor
      );
      break;
    }
    case 'paddyCost': {
      const factor = Math.max(0.3, 1 + delta);
      draft.costsPerKgPaddy = draft.costsPerKgPaddy.map((row) =>
        row.id === 'cost-paddy' || row.label.toLowerCase().includes('paddy')
          ? {
              ...row,
              costHS: Math.round(row.costHS * factor),
              costBS: Math.round(row.costBS * factor),
            }
          : row
      );
      break;
    }
    case 'millingYield': {
      draft.hauteSaison.yieldPaddyToRice = Math.min(
        0.85,
        Math.max(0.45, Number((draft.hauteSaison.yieldPaddyToRice + delta).toFixed(4)))
      );
      draft.basseSaison.yieldPaddyToRice = Math.min(
        0.85,
        Math.max(0.45, Number((draft.basseSaison.yieldPaddyToRice + delta).toFixed(4)))
      );
      break;
    }
    case 'rotations': {
      const factor = Math.max(0.25, 1 + delta);
      draft.hauteSaison.rotationsPerMonth = Number(
        (draft.hauteSaison.rotationsPerMonth * factor).toFixed(3)
      );
      draft.basseSaison.rotationsPerMonth = Number(
        (draft.basseSaison.rotationsPerMonth * factor).toFixed(3)
      );
      break;
    }
    case 'transportCost': {
      const factor = Math.max(0.2, 1 + delta);
      draft.costsPerRotation = draft.costsPerRotation.map((row) =>
        isTransportRow(row.id, row.label)
          ? {
              ...row,
              costHS: Math.round(row.costHS * factor),
              costBS: Math.round(row.costBS * factor),
            }
          : row
      );
      break;
    }
    case 'discountRate': {
      draft.discountRate = Math.min(
        0.45,
        Math.max(0.03, Number((draft.discountRate + delta).toFixed(4)))
      );
      break;
    }
  }
}

export interface NpvCorrelationPoint {
  xIdx: number;
  yIdx: number;
  xDelta: number;
  yDelta: number;
  xLabel: string;
  yLabel: string;
  xActual: string;
  yActual: string;
  xPct: number;
  yPct: number;
  npvAr: number;
  npvMAr: number;
  irrValue: number;
  irrFinite: boolean;
  year1NetAfterTaxAr: number;
  isBase: boolean;
  tier: 'negative' | 'low' | 'solid' | 'high';
}

export interface NpvCorrelationCurveSeries {
  yIdx: number;
  yDelta: number;
  seriesKey: string;
  label: string;
  actualLabel: string;
  color: string;
  isBaseLevel: boolean;
}

export interface NpvCorrelationResult {
  varX: CorrelationVariableMeta;
  varY: CorrelationVariableMeta;
  points: NpvCorrelationPoint[];
  lineChartRows: Array<Record<string, number | string>>;
  ySeries: NpvCorrelationCurveSeries[];
  baseNpvAr: number;
  minNpvAr: number;
  maxNpvAr: number;
  positiveCount: number;
  totalPoints: number;
  positiveSharePct: number;
  xAmplitudeAr: number;
  yAmplitudeAr: number;
  pearsonX: number;
  pearsonY: number;
}

const CURVE_COLORS = ['#059669', '#0d9488', '#4f46e5', '#d97706', '#e11d48'];

function computePearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

export function computeNpvCorrelationGrid(
  baseAssumptions: FinancialAssumptions,
  varXId: CorrelationVariableId,
  varYId: CorrelationVariableId
): NpvCorrelationResult {
  const varX = CORRELATION_VARIABLES[varXId];
  const varY = CORRELATION_VARIABLES[varYId];
  const xSteps = varX.xSteps;
  const ySteps = varY.ySteps;

  const points: NpvCorrelationPoint[] = [];
  const lineChartRows: Array<Record<string, number | string>> = [];

  const ySeries: NpvCorrelationCurveSeries[] = ySteps.map((yDelta, yIdx) => ({
    yIdx,
    yDelta,
    seriesKey: `y_${yIdx}`,
    label: `${varY.shortLabel} ${varY.formatStep(yDelta)}`,
    actualLabel: varY.describeActualValue(baseAssumptions, yDelta),
    color: CURVE_COLORS[yIdx % CURVE_COLORS.length],
    isBaseLevel: Math.abs(yDelta) < 1e-9,
  }));

  let baseNpvAr = 0;
  let minNpvAr = Infinity;
  let maxNpvAr = -Infinity;
  let positiveCount = 0;

  for (let xIdx = 0; xIdx < xSteps.length; xIdx++) {
    const xDelta = xSteps[xIdx];
    const rowObj: Record<string, number | string> = {
      xLabel: varX.formatStep(xDelta),
      xDelta,
      xPct: Number((xDelta * 100).toFixed(1)),
      xActual: varX.describeActualValue(baseAssumptions, xDelta),
    };

    for (let yIdx = 0; yIdx < ySteps.length; yIdx++) {
      const yDelta = ySteps[yIdx];
      const perturbed = cloneAssumptions(baseAssumptions);
      applyVariablePerturbation(perturbed, varXId, xDelta);
      applyVariablePerturbation(perturbed, varYId, yDelta);

      const m = calculateFullModel(perturbed);
      const npvAr = Number.isFinite(m.npv.npvAr) ? m.npv.npvAr : 0;
      const npvMAr = Number((npvAr / 1_000_000).toFixed(2));
      const isBase = Math.abs(xDelta) < 1e-9 && Math.abs(yDelta) < 1e-9;

      if (isBase) {
        baseNpvAr = npvAr;
      }
      if (npvAr < minNpvAr) minNpvAr = npvAr;
      if (npvAr > maxNpvAr) maxNpvAr = npvAr;
      if (npvAr > 0) positiveCount += 1;

      let tier: NpvCorrelationPoint['tier'] = 'low';
      if (npvAr < 0) tier = 'negative';
      else if (npvAr >= 500_000_000) tier = 'high';
      else if (npvAr >= 200_000_000) tier = 'solid';

      points.push({
        xIdx,
        yIdx,
        xDelta,
        yDelta,
        xLabel: varX.formatStep(xDelta),
        yLabel: varY.formatStep(yDelta),
        xActual: varX.describeActualValue(baseAssumptions, xDelta),
        yActual: varY.describeActualValue(baseAssumptions, yDelta),
        xPct: Number((xDelta * 100).toFixed(1)),
        yPct: Number((yDelta * 100).toFixed(1)),
        npvAr,
        npvMAr,
        irrValue: m.irr.irrValue,
        irrFinite: Number.isFinite(m.irr.irrValue),
        year1NetAfterTaxAr: m.year1.netResultAfterTaxAr,
        isBase,
        tier,
      });

      rowObj[`y_${yIdx}`] = npvMAr;
    }

    lineChartRows.push(rowObj);
  }

  // Compute amplitude across X (at base Y) and across Y (at base X)
  const baseYPoints = points.filter((p) => Math.abs(p.yDelta) < 1e-9);
  const baseXPoints = points.filter((p) => Math.abs(p.xDelta) < 1e-9);
  const xAmplitudeAr =
    baseYPoints.length > 0
      ? Math.max(...baseYPoints.map((p) => p.npvAr)) -
        Math.min(...baseYPoints.map((p) => p.npvAr))
      : 0;
  const yAmplitudeAr =
    baseXPoints.length > 0
      ? Math.max(...baseXPoints.map((p) => p.npvAr)) -
        Math.min(...baseXPoints.map((p) => p.npvAr))
      : 0;

  const pearsonX = computePearson(
    points.map((p) => p.xDelta),
    points.map((p) => p.npvAr)
  );
  const pearsonY = computePearson(
    points.map((p) => p.yDelta),
    points.map((p) => p.npvAr)
  );

  return {
    varX,
    varY,
    points,
    lineChartRows,
    ySeries,
    baseNpvAr,
    minNpvAr,
    maxNpvAr,
    positiveCount,
    totalPoints: points.length,
    positiveSharePct: points.length > 0 ? (positiveCount / points.length) * 100 : 0,
    xAmplitudeAr,
    yAmplitudeAr,
    pearsonX,
    pearsonY,
  };
}
