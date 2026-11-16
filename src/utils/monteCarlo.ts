import {
  computeIRR,
  computeInvestment,
  computeNPV,
  computeProjections,
  computeSeason,
  computeYear1,
} from '../engine/calculator';
import { FinancialAssumptions } from '../types/finance';

export type MonteCarloDistributionType = 'normal' | 'triangular';

export interface MonteCarloConfig {
  iterations: number; // default 1000
  seed: number;
  distribution: MonteCarloDistributionType;
  paddyPriceVolatilityPct: number; // sigma as decimal, e.g. 0.12 = ±12%
  harvestYieldVolatilityPct: number; // sigma on paddy volume collected, e.g. 0.10 = ±10%
  millingYieldStdPts: number; // sigma on milling yield ratio, e.g. 0.035 = ±3.5 pts
  priceHarvestCorrelation: number; // -0.8 to +0.8, default -0.35 (scarce harvest -> higher price)
  applySoudurePriceStress: boolean; // Basse Saison price volatility × 1.25
}

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  iterations: 1000,
  seed: 202611,
  distribution: 'normal',
  paddyPriceVolatilityPct: 0.12,
  harvestYieldVolatilityPct: 0.10,
  millingYieldStdPts: 0.035,
  priceHarvestCorrelation: -0.35,
  applySoudurePriceStress: true,
};

export interface MonteCarloIterationPoint {
  iteration: number;
  paddyPriceHS: number;
  paddyPriceBS: number;
  harvestVolumeMultiplier: number;
  millingYieldHS: number;
  millingYieldBS: number;
  netResultY1Ar: number;
  npvAr: number;
  irrRate: number;
}

export interface DistributionStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface HistogramBin {
  index: number;
  minEdge: number;
  maxEdge: number;
  midpoint: number;
  label: string;
  count: number;
  frequencyPct: number;
  cumulativePct: number;
  aboveThreshold: boolean;
}

export interface MonteCarloSimulationResult {
  config: MonteCarloConfig;
  durationMs: number;
  validIrrCount: number;
  baseNpvAr: number;
  baseIrrRate: number;
  discountRate: number;
  minNpvThresholdAr: number;
  minIrrThresholdRate: number;
  npvStats: DistributionStats;
  irrStats: DistributionStats;
  probNpvPositive: number; // 0..1
  probNpvAboveThreshold: number; // 0..1
  probIrrAboveDiscount: number; // 0..1
  probIrrAboveThreshold: number; // 0..1
  npvBins: HistogramBin[];
  irrBins: HistogramBin[];
  scatterSample: MonteCarloIterationPoint[];
  allIterations: MonteCarloIterationPoint[];
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Maps a standard normal variate into a standardized [-sqrt(6), +sqrt(6)] symmetric triangular variate
 * with mean 0 and variance 1 so both distribution shapes can share sigma & correlation cleanly.
 */
function sampleStandardizedVariate(
  rng: () => number,
  distribution: MonteCarloDistributionType
): number {
  if (distribution === 'normal') {
    return sampleStandardNormal(rng);
  }
  const u = rng();
  const halfRange = Math.sqrt(6); // stdDev of symmetric Triangular(-a, 0, a) is a / sqrt(6)
  if (u < 0.5) {
    return -halfRange + halfRange * Math.sqrt(2 * u);
  }
  return halfRange - halfRange * Math.sqrt(2 * (1 - u));
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

function computeStats(values: number[]): DistributionStats {
  if (values.length === 0) {
    return {
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p5: 0,
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      p95: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((acc, v) => acc + v, 0) / n;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / n;
  return {
    mean,
    stdDev: Math.sqrt(Math.max(0, variance)),
    min: sorted[0],
    max: sorted[n - 1],
    p5: quantile(sorted, 0.05),
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
  };
}

function buildHistogram(
  values: number[],
  binCount: number,
  threshold: number,
  formatEdge: (v: number) => string
): HistogramBin[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  // Trim extreme 0.5% outliers from bin range only if range is wide, or clamp nicely using P0.5–P99.5
  const rawMin = sorted[0];
  const rawMax = sorted[sorted.length - 1];
  const span = rawMax - rawMin;
  const safeSpan = span > 1e-6 ? span : Math.max(Math.abs(rawMin) * 0.1, 1);
  const minVal = span > 1e-6 ? rawMin : rawMin - safeSpan / 2;
  const maxVal = span > 1e-6 ? rawMax : rawMax + safeSpan / 2;
  const step = (maxVal - minVal) / binCount;

  const counts = new Array<number>(binCount).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - minVal) / step);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx] += 1;
  }

  let running = 0;
  return counts.map((count, i) => {
    const minEdge = minVal + i * step;
    const maxEdge = minVal + (i + 1) * step;
    const midpoint = (minEdge + maxEdge) / 2;
    running += count;
    return {
      index: i,
      minEdge,
      maxEdge,
      midpoint,
      label: formatEdge(midpoint),
      count,
      frequencyPct: (count / values.length) * 100,
      cumulativePct: (running / values.length) * 100,
      aboveThreshold: midpoint >= threshold,
    };
  });
}

export function runMonteCarloSimulation(
  baseAssumptions: FinancialAssumptions,
  config: MonteCarloConfig
): MonteCarloSimulationResult {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const iterations = Math.max(100, Math.min(10000, Math.round(config.iterations)));
  const rng = createMulberry32(config.seed || 202611);

  const rho = Math.max(-0.9, Math.min(0.9, config.priceHarvestCorrelation));
  const rhoComp = Math.sqrt(Math.max(0, 1 - rho * rho));

  // Baseline exact evaluation
  const baseHS = computeSeason(baseAssumptions, 'hauteSaison');
  const baseBS = computeSeason(baseAssumptions, 'basseSaison');
  const baseY1 = computeYear1(
    baseHS,
    baseBS,
    baseAssumptions.corporateTaxRate,
    baseAssumptions.investorShare
  );
  const baseInv = computeInvestment(baseHS, baseAssumptions, baseY1);
  const baseProj = computeProjections(
    baseY1,
    baseAssumptions.corporateTaxRate,
    baseAssumptions.growthRateYear2,
    baseAssumptions.growthRateYear3,
    baseAssumptions.ambitiousGrowthRateYear2,
    baseAssumptions.ambitiousGrowthRateYear3
  );
  const baseNpv = computeNPV(baseInv.fundsToRaiseAr, baseProj, baseAssumptions.discountRate);
  const baseIrr = computeIRR(baseInv.fundsToRaiseAr, baseProj, baseAssumptions.discountRate);

  const basePaddyItem = baseAssumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const basePaddyPriceHS = basePaddyItem ? basePaddyItem.costHS : 800;
  const basePaddyPriceBS = basePaddyItem ? basePaddyItem.costBS : 1400;

  const npvValues: number[] = [];
  const irrValues: number[] = [];
  const allIterations: MonteCarloIterationPoint[] = [];

  const minNpvThresholdAr = baseAssumptions.kpiThresholds?.minNpvAr ?? 0;
  const minIrrThresholdRate =
    baseAssumptions.kpiThresholds?.minIrrRate ?? baseAssumptions.discountRate;

  for (let i = 0; i < iterations; i++) {
    // Correlated shock draws: Harvest yield shock vs Paddy price shock
    const zHarvest = sampleStandardizedVariate(rng, config.distribution);
    const zPriceIndep = sampleStandardizedVariate(rng, config.distribution);
    const zPriceMacro = rho * zHarvest + rhoComp * zPriceIndep;

    // Slight seasonal idiosyncratic noise between HS and BS
    const zPriceSeasonBS = 0.78 * zPriceMacro + 0.62 * sampleStandardizedVariate(rng, config.distribution);
    const zMillingHS = 0.65 * zHarvest + 0.76 * sampleStandardizedVariate(rng, config.distribution);
    const zMillingBS = 0.6 * zMillingHS + 0.8 * sampleStandardizedVariate(rng, config.distribution);

    const harvestMult = Math.max(
      0.4,
      Math.min(1.6, 1 + zHarvest * config.harvestYieldVolatilityPct)
    );

    const priceSigmaHS = config.paddyPriceVolatilityPct;
    const priceSigmaBS = config.applySoudurePriceStress
      ? config.paddyPriceVolatilityPct * 1.25
      : config.paddyPriceVolatilityPct;

    const simPriceHS = Math.max(
      150,
      basePaddyPriceHS * Math.max(0.45, Math.min(2.1, 1 + zPriceMacro * priceSigmaHS))
    );
    const simPriceBS = Math.max(
      200,
      basePaddyPriceBS * Math.max(0.45, Math.min(2.3, 1 + zPriceSeasonBS * priceSigmaBS))
    );

    const simYieldHS = Math.max(
      0.38,
      Math.min(0.86, baseAssumptions.hauteSaison.yieldPaddyToRice + zMillingHS * config.millingYieldStdPts)
    );
    const simYieldBS = Math.max(
      0.38,
      Math.min(0.86, baseAssumptions.basseSaison.yieldPaddyToRice + zMillingBS * config.millingYieldStdPts)
    );

    const simAssumptions: FinancialAssumptions = {
      ...baseAssumptions,
      hauteSaison: {
        ...baseAssumptions.hauteSaison,
        paddyBoughtKgPerRotation: baseAssumptions.hauteSaison.paddyBoughtKgPerRotation * harvestMult,
        yieldPaddyToRice: simYieldHS,
      },
      basseSaison: {
        ...baseAssumptions.basseSaison,
        paddyBoughtKgPerRotation: baseAssumptions.basseSaison.paddyBoughtKgPerRotation * harvestMult,
        yieldPaddyToRice: simYieldBS,
      },
      costsPerKgPaddy: baseAssumptions.costsPerKgPaddy.map((c) =>
        c.id === 'cost-paddy'
          ? { ...c, costHS: simPriceHS, costBS: simPriceBS }
          : c
      ),
    };

    const hs = computeSeason(simAssumptions, 'hauteSaison');
    const bs = computeSeason(simAssumptions, 'basseSaison');
    const y1 = computeYear1(
      hs,
      bs,
      simAssumptions.corporateTaxRate,
      simAssumptions.investorShare
    );
    const inv = computeInvestment(hs, simAssumptions, y1);
    const proj = computeProjections(
      y1,
      simAssumptions.corporateTaxRate,
      simAssumptions.growthRateYear2,
      simAssumptions.growthRateYear3,
      simAssumptions.ambitiousGrowthRateYear2,
      simAssumptions.ambitiousGrowthRateYear3
    );
    const npv = computeNPV(inv.fundsToRaiseAr, proj, simAssumptions.discountRate);
    const irr = computeIRR(inv.fundsToRaiseAr, proj, simAssumptions.discountRate);

    const safeIrr =
      Number.isFinite(irr.irrValue) && irr.irrValue > -0.95 && irr.irrValue < 50
        ? irr.irrValue
        : y1.netResultAfterTaxAr <= 0
        ? -0.9
        : NaN;

    npvValues.push(npv.npvAr);
    if (Number.isFinite(safeIrr)) {
      irrValues.push(safeIrr);
    }

    allIterations.push({
      iteration: i + 1,
      paddyPriceHS: simPriceHS,
      paddyPriceBS: simPriceBS,
      harvestVolumeMultiplier: harvestMult,
      millingYieldHS: simYieldHS,
      millingYieldBS: simYieldBS,
      netResultY1Ar: y1.netResultAfterTaxAr,
      npvAr: npv.npvAr,
      irrRate: Number.isFinite(safeIrr) ? safeIrr : 0,
    });
  }

  const npvStats = computeStats(npvValues);
  const irrStats = computeStats(irrValues);

  const probNpvPositive =
    npvValues.filter((v) => v > 0).length / Math.max(1, npvValues.length);
  const probNpvAboveThreshold =
    npvValues.filter((v) => v >= minNpvThresholdAr).length / Math.max(1, npvValues.length);

  const probIrrAboveDiscount =
    irrValues.length > 0
      ? irrValues.filter((v) => v > baseAssumptions.discountRate).length / irrValues.length
      : 0;
  const probIrrAboveThreshold =
    irrValues.length > 0
      ? irrValues.filter((v) => v >= minIrrThresholdRate).length / irrValues.length
      : 0;

  const npvBins = buildHistogram(npvValues, 22, 0, (v) =>
    `${(v / 1e6).toFixed(0)} M`
  );
  const irrBins = buildHistogram(
    irrValues,
    22,
    baseAssumptions.discountRate,
    (v) => `${(v * 100).toFixed(0)} %`
  );

  // Sample up to 240 points evenly for crisp scatter visualization
  const stride = Math.max(1, Math.floor(allIterations.length / 240));
  const scatterSample = allIterations.filter((_, idx) => idx % stride === 0).slice(0, 240);

  const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    config: { ...config, iterations },
    durationMs: Math.max(1, Math.round(finishedAt - startedAt)),
    validIrrCount: irrValues.length,
    baseNpvAr: baseNpv.npvAr,
    baseIrrRate: Number.isFinite(baseIrr.irrValue) ? baseIrr.irrValue : 0,
    discountRate: baseAssumptions.discountRate,
    minNpvThresholdAr,
    minIrrThresholdRate,
    npvStats,
    irrStats,
    probNpvPositive,
    probNpvAboveThreshold,
    probIrrAboveDiscount,
    probIrrAboveThreshold,
    npvBins,
    irrBins,
    scatterSample,
    allIterations,
  };
}

export function exportMonteCarloCsv(result: MonteCarloSimulationResult): void {
  const sep = ';';
  const lines: string[] = [
    [
      'Iteration',
      'Prix_Paddy_HS_Ar_kg',
      'Prix_Paddy_BS_Ar_kg',
      'Multiplicateur_Recolte',
      'Rendement_Usinage_HS_Pct',
      'Rendement_Usinage_BS_Pct',
      'Benefice_Net_A1_Ar',
      'VAN_3ans_Ar',
      'TRI_Pct',
    ].join(sep),
  ];

  for (const row of result.allIterations) {
    lines.push(
      [
        row.iteration,
        row.paddyPriceHS.toFixed(2),
        row.paddyPriceBS.toFixed(2),
        row.harvestVolumeMultiplier.toFixed(4),
        (row.millingYieldHS * 100).toFixed(2),
        (row.millingYieldBS * 100).toFixed(2),
        row.netResultY1Ar.toFixed(2),
        row.npvAr.toFixed(2),
        (row.irrRate * 100).toFixed(2),
      ].join(sep)
    );
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `simulation_monte_carlo_${result.config.iterations}it_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
