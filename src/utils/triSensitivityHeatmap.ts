import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions } from '../types/finance';
import { getResolvedKpiThresholds } from './logistics';

export type HeatmapAmplitudeMode = 'standard' | 'stress';
export type HeatmapSeasonScope = 'both' | 'hauteSaison' | 'basseSaison';
export type TriRiskTier = 'critique' | 'vigilance' | 'modere' | 'robuste';

export interface TriHeatmapCell {
  rowIdx: number;
  colIdx: number;
  paddyDelta: number; // Y axis (rows): e.g. -0.20..+0.40
  transportDelta: number; // X axis (cols): e.g. -0.30..+1.20
  paddyPriceHS: number;
  paddyPriceBS: number;
  transportCostHS: number;
  transportCostBS: number;
  irrValue: number;
  irrFinite: boolean;
  npvAr: number;
  year1NetAfterTaxAr: number;
  fundsToRaiseAr: number;
  paybackMonths: number;
  isRecoveredWithin36Months: boolean;
  riskTier: TriRiskTier;
  isBase: boolean;
}

export interface TriSensitivityHeatmapResult {
  amplitude: HeatmapAmplitudeMode;
  scope: HeatmapSeasonScope;
  paddyDeltas: number[]; // rows (Y)
  transportDeltas: number[]; // cols (X)
  cells: TriHeatmapCell[][];
  baseIrr: number;
  discountRate: number;
  minIrrThreshold: number;
  basePaddyHS: number;
  basePaddyBS: number;
  baseTransportHS: number;
  baseTransportBS: number;
  criticalCount: number;
  vigilanceCount: number;
  totalCells: number;
  minIrrFound: number;
  maxIrrFound: number;
  maxSafePaddyDeltaAtBaseTransport: number | null;
}

const AMPLITUDE_AXES: Record<
  HeatmapAmplitudeMode,
  { paddyDeltas: number[]; transportDeltas: number[] }
> = {
  standard: {
    paddyDeltas: [-0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4],
    transportDeltas: [-0.3, -0.15, 0, 0.25, 0.5, 0.8, 1.2],
  },
  stress: {
    paddyDeltas: [-0.1, 0, 0.15, 0.25, 0.35, 0.45, 0.55],
    transportDeltas: [0, 0.4, 0.8, 1.2, 1.8, 2.4, 3.0],
  },
};

function isTransportCostRow(id: string, label: string): boolean {
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

function classifyTriRisk(
  irrValue: number,
  irrFinite: boolean,
  npvAr: number,
  discountRate: number,
  minIrrThreshold: number
): TriRiskTier {
  const effectiveFloor = Math.max(discountRate, minIrrThreshold);
  if (!irrFinite || irrValue <= 0 || irrValue < discountRate || npvAr < 0) {
    return 'critique';
  }
  if (irrValue < Math.max(effectiveFloor, discountRate * 2)) {
    return 'vigilance';
  }
  if (irrValue < 1.0) {
    return 'modere';
  }
  return 'robuste';
}

export function computeTriSensitivityHeatmap(
  baseAssumptions: FinancialAssumptions,
  amplitude: HeatmapAmplitudeMode = 'standard',
  scope: HeatmapSeasonScope = 'both'
): TriSensitivityHeatmapResult {
  const { paddyDeltas, transportDeltas } = AMPLITUDE_AXES[amplitude];
  const thresholds = getResolvedKpiThresholds(baseAssumptions);
  const discountRate = baseAssumptions.discountRate;
  const minIrrThreshold = thresholds.minIrrRate;

  const paddyRow =
    baseAssumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy') ||
    baseAssumptions.costsPerKgPaddy[0];
  const basePaddyHS = paddyRow?.costHS ?? 800;
  const basePaddyBS = paddyRow?.costBS ?? 1400;

  const transportIndices = baseAssumptions.costsPerRotation
    .map((c, idx) => (isTransportCostRow(c.id, c.label) ? idx : -1))
    .filter((idx) => idx >= 0);

  const effectiveTransportIndices =
    transportIndices.length > 0
      ? transportIndices
      : baseAssumptions.costsPerRotation.length > 0
      ? [0]
      : [];

  const baseTransportHS = effectiveTransportIndices.reduce(
    (sum, idx) => sum + baseAssumptions.costsPerRotation[idx].costHS,
    0
  );
  const baseTransportBS = effectiveTransportIndices.reduce(
    (sum, idx) => sum + baseAssumptions.costsPerRotation[idx].costBS,
    0
  );

  const applyHS = scope === 'both' || scope === 'hauteSaison';
  const applyBS = scope === 'both' || scope === 'basseSaison';

  const cells: TriHeatmapCell[][] = [];
  let criticalCount = 0;
  let vigilanceCount = 0;
  let minIrrFound = Infinity;
  let maxIrrFound = -Infinity;
  let baseIrr = 0;

  for (let rowIdx = 0; rowIdx < paddyDeltas.length; rowIdx++) {
    const paddyDelta = paddyDeltas[rowIdx];
    const rowCells: TriHeatmapCell[] = [];

    for (let colIdx = 0; colIdx < transportDeltas.length; colIdx++) {
      const transportDelta = transportDeltas[colIdx];

      const factorPaddyHS = applyHS ? 1 + paddyDelta : 1;
      const factorPaddyBS = applyBS ? 1 + paddyDelta : 1;
      const factorTransportHS = applyHS ? 1 + transportDelta : 1;
      const factorTransportBS = applyBS ? 1 + transportDelta : 1;

      const perturbedAssumptions: FinancialAssumptions = {
        ...baseAssumptions,
        costsPerKgPaddy: baseAssumptions.costsPerKgPaddy.map((item, idx) => {
          const isTarget = paddyRow ? item.id === paddyRow.id : idx === 0;
          if (!isTarget) return item;
          return {
            ...item,
            costHS: Math.max(0, item.costHS * factorPaddyHS),
            costBS: Math.max(0, item.costBS * factorPaddyBS),
          };
        }),
        costsPerRotation: baseAssumptions.costsPerRotation.map((item, idx) => {
          if (!effectiveTransportIndices.includes(idx)) return item;
          return {
            ...item,
            costHS: Math.max(0, item.costHS * factorTransportHS),
            costBS: Math.max(0, item.costBS * factorTransportBS),
          };
        }),
      };

      const m = calculateFullModel(perturbedAssumptions);
      const irrFinite = Number.isFinite(m.irr.irrValue);
      const irrValue = irrFinite ? m.irr.irrValue : 0;
      const npvAr = m.npv.npvAr;
      const riskTier = classifyTriRisk(
        irrValue,
        irrFinite,
        npvAr,
        discountRate,
        minIrrThreshold
      );

      if (riskTier === 'critique') criticalCount += 1;
      if (riskTier === 'vigilance') vigilanceCount += 1;
      if (irrValue < minIrrFound) minIrrFound = irrValue;
      if (irrValue > maxIrrFound) maxIrrFound = irrValue;

      const isBase = Math.abs(paddyDelta) < 1e-6 && Math.abs(transportDelta) < 1e-6;
      if (isBase) {
        baseIrr = irrValue;
      }

      rowCells.push({
        rowIdx,
        colIdx,
        paddyDelta,
        transportDelta,
        paddyPriceHS: basePaddyHS * factorPaddyHS,
        paddyPriceBS: basePaddyBS * factorPaddyBS,
        transportCostHS: baseTransportHS * factorTransportHS,
        transportCostBS: baseTransportBS * factorTransportBS,
        irrValue,
        irrFinite,
        npvAr,
        year1NetAfterTaxAr: m.year1.netResultAfterTaxAr,
        fundsToRaiseAr: m.investment.fundsToRaiseAr,
        paybackMonths: m.payback.paybackMonths,
        isRecoveredWithin36Months: m.payback.isRecoveredWithin36Months,
        riskTier,
        isBase,
      });
    }
    cells.push(rowCells);
  }

  // Find max paddy delta at base transport (0%) where IRR stays >= effective floor
  const baseColIdx = transportDeltas.findIndex((d) => Math.abs(d) < 1e-6);
  let maxSafePaddyDeltaAtBaseTransport: number | null = null;
  if (baseColIdx >= 0) {
    for (let r = 0; r < cells.length; r++) {
      const c = cells[r][baseColIdx];
      if (c.riskTier !== 'critique') {
        maxSafePaddyDeltaAtBaseTransport = c.paddyDelta;
      }
    }
  }

  return {
    amplitude,
    scope,
    paddyDeltas,
    transportDeltas,
    cells,
    baseIrr,
    discountRate,
    minIrrThreshold,
    basePaddyHS,
    basePaddyBS,
    baseTransportHS,
    baseTransportBS,
    criticalCount,
    vigilanceCount,
    totalCells: paddyDeltas.length * transportDeltas.length,
    minIrrFound: Number.isFinite(minIrrFound) ? minIrrFound : 0,
    maxIrrFound: Number.isFinite(maxIrrFound) ? maxIrrFound : 0,
    maxSafePaddyDeltaAtBaseTransport,
  };
}
