import React, { useMemo, useState } from 'react';
import { Dices, RefreshCw, TrendingUp } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { runMonteCarloSimulation } from '../../utils/monteCarlo';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

export const QuickMonteCarloDashboardCard: React.FC<{
  onNavigate: (tabId: string) => void;
}> = ({ onNavigate }) => {
  const { assumptions } = useFinancial();
  const [paddyVolatilityPct, setPaddyVolatilityPct] = useState<number>(12);
  const [seed, setSeed] = useState<number>(202611);
  const [runVersion, setRunVersion] = useState<number>(0);

  const mcResult = useMemo(
    () =>
      runMonteCarloSimulation(assumptions, {
        iterations: 100,
        paddyPriceVolatilityPct: paddyVolatilityPct / 100,
        harvestYieldVolatilityPct: 0,
        millingYieldStdPts: 0,
        priceHarvestCorrelation: 0,
        distribution: 'normal',
        applySoudurePriceStress: true,
        seed: seed + runVersion * 97,
      }),
    [assumptions, paddyVolatilityPct, seed, runVersion]
  );

  const handleRerun = () => {
    setSeed((prev) => (prev * 1664525 + 1013904223) % 999983);
    setRunVersion((v) => v + 1);
  };

  // Compute position percentages for confidence range bars (P5 -> P95)
  const computeBarPositions = (
    p5: number,
    p25: number,
    p50: number,
    p75: number,
    p95: number,
    base: number
  ) => {
    const min = Math.min(p5, base);
    const max = Math.max(p95, base);
    const span = Math.max(max - min, 1e-6);
    const toPct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
    return {
      p5Pct: toPct(p5),
      p25Pct: toPct(p25),
      p50Pct: toPct(p50),
      p75Pct: toPct(p75),
      p95Pct: toPct(p95),
      basePct: toPct(base),
    };
  };

  const npvPos = computeBarPositions(
    mcResult.npvStats.p5,
    mcResult.npvStats.p25,
    mcResult.npvStats.p50,
    mcResult.npvStats.p75,
    mcResult.npvStats.p95,
    mcResult.baseNpvAr
  );
  const irrPos = computeBarPositions(
    mcResult.irrStats.p5,
    mcResult.irrStats.p25,
    mcResult.irrStats.p50,
    mcResult.irrStats.p75,
    mcResult.irrStats.p95,
    mcResult.baseIrrRate
  );

  return (
    <section
      aria-label="Simulation Monte Carlo rapide sur 100 itérations"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Dices
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Monte Carlo Rapide (100 itérations · Volatilité Prix Paddy)
            </h2>
            <Tooltip
              align="left"
              label="Monte Carlo 100 itérations"
              content="Exécute 100 tirages stochastiques sur les prix d’achat du paddy (HS et Basse Saison avec stress soudure) pour encadrer la plage de confiance à 90 % (P5–P95) de la VAN et du TRI."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Intervalle de confiance 90 % (P5–P95) calculé en{' '}
            <span className="font-mono tabular-nums font-medium">{mcResult.durationMs} ms</span> ·
            σ prix paddy = <span className="font-mono tabular-nums font-semibold">±{paddyVolatilityPct} %</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={handleRerun}
            className="min-h-10 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simuler 100 itérations</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('montecarlo')}
            className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <span>Analyse avancée →</span>
          </button>
        </div>
      </div>

      {/* Volatility slider */}
      <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#171627]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label
          htmlFor="quick-mc-volatility"
          className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0"
        >
          Volatilité du prix du paddy (± %)
        </label>
        <div className="flex-1 flex items-center gap-3 max-w-md">
          <input
            id="quick-mc-volatility"
            type="range"
            min={5}
            max={35}
            step={1}
            value={paddyVolatilityPct}
            onChange={(e) => setPaddyVolatilityPct(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="font-mono tabular-nums text-xs font-bold text-indigo-700 dark:text-indigo-300 w-14 text-right">
            ±{paddyVolatilityPct} %
          </span>
        </div>
      </div>

      {/* 2 Confidence Interval Cards: VAN & TRI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VAN Confidence Range */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#141322] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Plage de confiance VAN (3 ans)
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                mcResult.probNpvPositive >= 0.8
                  ? 'text-teal-700 dark:text-teal-400'
                  : mcResult.probNpvPositive >= 0.5
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              P(VAN &gt; 0) = {(mcResult.probNpvPositive * 100).toFixed(0)} %
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                Médiane (P50)
              </div>
              <div className="text-base font-bold text-zinc-900 dark:text-white">
                {formatAriary(mcResult.npvStats.p50, { inMillions: true })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                IC 90 % (P5 – P95)
              </div>
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {formatAriary(mcResult.npvStats.p5, { inMillions: true })} à{' '}
                {formatAriary(mcResult.npvStats.p95, { inMillions: true })}
              </div>
            </div>
          </div>

          {/* Confidence Bar Visual */}
          <div className="relative h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            {/* P5-P95 span */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-500/25 dark:bg-indigo-400/25 rounded-full"
              style={{
                left: `${npvPos.p5Pct}%`,
                width: `${Math.max(4, npvPos.p95Pct - npvPos.p5Pct)}%`,
              }}
            />
            {/* P25-P75 interquartile span */}
            <div
              className="absolute top-0 bottom-0 bg-indigo-600 dark:bg-indigo-400 rounded-full"
              style={{
                left: `${npvPos.p25Pct}%`,
                width: `${Math.max(4, npvPos.p75Pct - npvPos.p25Pct)}%`,
              }}
            />
            {/* Median marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-zinc-950"
              style={{ left: `${npvPos.p50Pct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            <span>P25 : {formatAriary(mcResult.npvStats.p25, { inMillions: true })}</span>
            <span>Base : {formatAriary(mcResult.baseNpvAr, { inMillions: true })}</span>
            <span>P75 : {formatAriary(mcResult.npvStats.p75, { inMillions: true })}</span>
          </div>
        </div>

        {/* TRI Confidence Range */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-[#141322] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Plage de confiance TRI (%)</span>
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                mcResult.probIrrAboveDiscount >= 0.8
                  ? 'text-teal-700 dark:text-teal-400'
                  : mcResult.probIrrAboveDiscount >= 0.5
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              P(TRI ≥ {formatPercent(mcResult.discountRate, 0)}) ={' '}
              {(mcResult.probIrrAboveDiscount * 100).toFixed(0)} %
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                Médiane (P50)
              </div>
              <div className="text-base font-bold text-zinc-900 dark:text-white">
                {formatPercent(mcResult.irrStats.p50, 1)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                IC 90 % (P5 – P95)
              </div>
              <div className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                {formatPercent(mcResult.irrStats.p5, 1)} à {formatPercent(mcResult.irrStats.p95, 1)}
              </div>
            </div>
          </div>

          {/* Confidence Bar Visual */}
          <div className="relative h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-teal-500/25 dark:bg-teal-400/25 rounded-full"
              style={{
                left: `${irrPos.p5Pct}%`,
                width: `${Math.max(4, irrPos.p95Pct - irrPos.p5Pct)}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-teal-600 dark:bg-teal-400 rounded-full"
              style={{
                left: `${irrPos.p25Pct}%`,
                width: `${Math.max(4, irrPos.p75Pct - irrPos.p25Pct)}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-zinc-950"
              style={{ left: `${irrPos.p50Pct}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            <span>P25 : {formatPercent(mcResult.irrStats.p25, 1)}</span>
            <span>Base : {formatPercent(mcResult.baseIrrRate, 1)}</span>
            <span>P75 : {formatPercent(mcResult.irrStats.p75, 1)}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
