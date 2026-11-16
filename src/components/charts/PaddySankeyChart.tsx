import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip } from 'recharts';
import { GitFork, Info } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { computeStorageWeightLossRate, getResolvedStorageOptimization } from '../../utils/storage';
import { formatKg, formatPercent } from '../../utils/formatters';

type SankeyPeriodScope = 'year1' | 'hauteSaison' | 'basseSaison' | 'threeYears';

interface SankeyNodeItem {
  name: string;
  color: string;
  category: string;
}

export const PaddySankeyChart: React.FC = () => {
  const { assumptions, model, theme } = useFinancial();
  const [scope, setScope] = useState<SankeyPeriodScope>('year1');
  // Standard physical handling/moisture drying shrinkage (2.0% nominal when excess storage loss is 0)
  const [technicalHandlingLossPct, setTechnicalHandlingLossPct] = useState<number>(2.0);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);

  const isDark = theme === 'dark';

  const storageConfig = useMemo(() => getResolvedStorageOptimization(assumptions), [assumptions]);
  const storageLossRate = useMemo(
    () => (storageConfig.enabled ? computeStorageWeightLossRate(storageConfig).totalLossRate : 0),
    [storageConfig]
  );

  const flowMetrics = useMemo(() => {
    const hs = model.hauteSaison;
    const bs = model.basseSaison;

    // 3-year scale factor derived from cumulative realistic growth vs Year 1
    const y1Net = Math.max(1, model.projections.realistic[0]?.netResultAfterTaxAr || 1);
    const y2Scale = 1 + assumptions.growthRateYear2 * 0.65; // volume component of growth
    const y3Scale = y2Scale * (1 + assumptions.growthRateYear3 * 0.6);
    const threeYearMultiplier = 1 + y2Scale + y3Scale;

    let milledPaddyHS = 0;
    let milledPaddyBS = 0;
    let finalRiceKg = 0;
    let byproductsKg = 0;

    if (scope === 'hauteSaison') {
      milledPaddyHS = hs.totalPaddyKg;
      finalRiceKg = hs.totalRiceKg;
      byproductsKg = hs.totalByproductsKg;
    } else if (scope === 'basseSaison') {
      milledPaddyBS = bs.totalPaddyKg;
      finalRiceKg = bs.totalRiceKg;
      byproductsKg = bs.totalByproductsKg;
    } else if (scope === 'threeYears') {
      milledPaddyHS = Math.round(hs.totalPaddyKg * threeYearMultiplier);
      milledPaddyBS = Math.round(bs.totalPaddyKg * threeYearMultiplier);
      finalRiceKg = Math.round((hs.totalRiceKg + bs.totalRiceKg) * threeYearMultiplier);
      byproductsKg = Math.round((hs.totalByproductsKg + bs.totalByproductsKg) * threeYearMultiplier);
    } else {
      milledPaddyHS = hs.totalPaddyKg;
      milledPaddyBS = bs.totalPaddyKg;
      finalRiceKg = hs.totalRiceKg + bs.totalRiceKg;
      byproductsKg = hs.totalByproductsKg + bs.totalByproductsKg;
    }

    const totalMilledPaddyKg = Math.max(1, milledPaddyHS + milledPaddyBS);
    // Combine baseline technical drying/cleaning shrinkage + excess post-harvest storage loss from StorageOptimization
    const combinedStorageLossRate = Math.min(
      0.45,
      Math.max(0.005, storageLossRate + technicalHandlingLossPct / 100)
    );

    const collectedHSKg = Math.round(milledPaddyHS / (1 - combinedStorageLossRate));
    const collectedBSKg = Math.round(milledPaddyBS / (1 - combinedStorageLossRate));
    const totalCollectedKg = collectedHSKg + collectedBSKg;
    const storageLossKg = Math.max(1, totalCollectedKg - totalMilledPaddyKg);

    const effectiveYieldRatio = totalCollectedKg > 0 ? finalRiceKg / totalCollectedKg : 0;

    return {
      collectedHSKg,
      collectedBSKg,
      totalCollectedKg,
      storageLossKg,
      combinedStorageLossRate,
      totalMilledPaddyKg,
      finalRiceKg: Math.max(1, finalRiceKg),
      byproductsKg: Math.max(1, byproductsKg),
      effectiveYieldRatio,
      y1Net,
    };
  }, [model, assumptions.growthRateYear2, assumptions.growthRateYear3, scope, storageLossRate, technicalHandlingLossPct]);

  const sankeyData = useMemo(() => {
    const nodes: SankeyNodeItem[] = [];
    const links: Array<{ source: number; target: number; value: number }> = [];

    const addNode = (item: SankeyNodeItem): number => {
      nodes.push(item);
      return nodes.length - 1;
    };

    const hasHS = flowMetrics.collectedHSKg > 0;
    const hasBS = flowMetrics.collectedBSKg > 0;

    const idxCollectHS = hasHS
      ? addNode({
          name: 'Paddy collecté HS',
          color: '#6366f1',
          category: 'Collecte bord-champ',
        })
      : -1;
    const idxCollectBS = hasBS
      ? addNode({
          name: 'Paddy collecté BS',
          color: '#0ea5e9',
          category: 'Collecte contre-saison',
        })
      : -1;

    const idxStorage = addNode({
      name: 'Stockage & Séchage',
      color: '#8b5cf6',
      category: 'Magasin & Tamisage',
    });

    const idxStorageLoss = addNode({
      name: 'Pertes techniques stockage',
      color: '#f43f5e',
      category: 'Freinte humidité / ravageurs',
    });

    const idxMilling = addNode({
      name: 'Paddy net usiné',
      color: '#3b82f6',
      category: 'Décorticage & Blanchiment',
    });

    const idxFinalRice = addNode({
      name: 'Production finale Riz Blanc',
      color: '#14b8a6',
      category: 'Stock commercialisable',
    });

    const idxByproducts = addNode({
      name: 'Son, balles & brisures',
      color: '#f59e0b',
      category: 'Sous-produits usinage',
    });

    if (idxCollectHS !== -1) {
      links.push({
        source: idxCollectHS,
        target: idxStorage,
        value: flowMetrics.collectedHSKg,
      });
    }
    if (idxCollectBS !== -1) {
      links.push({
        source: idxCollectBS,
        target: idxStorage,
        value: flowMetrics.collectedBSKg,
      });
    }

    links.push({
      source: idxStorage,
      target: idxStorageLoss,
      value: flowMetrics.storageLossKg,
    });
    links.push({
      source: idxStorage,
      target: idxMilling,
      value: flowMetrics.totalMilledPaddyKg,
    });
    links.push({
      source: idxMilling,
      target: idxFinalRice,
      value: flowMetrics.finalRiceKg,
    });
    links.push({
      source: idxMilling,
      target: idxByproducts,
      value: flowMetrics.byproductsKg,
    });

    return { nodes, links };
  }, [flowMetrics]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderSankeyNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    if (
      !Number.isFinite(Number(x)) ||
      !Number.isFinite(Number(y)) ||
      !Number.isFinite(Number(width))
    ) {
      return <g />;
    }
    const safeX = Number(x);
    const safeY = Number(y);
    const safeW = Math.max(1, Number(width));
    const nodeItem = sankeyData.nodes[index] || payload;
    const safeHeight = Math.max(6, Number(height) || 6);
    const valKg = Number(payload?.value || 0);
    const pct =
      flowMetrics.totalCollectedKg > 0
        ? ((valKg / flowMetrics.totalCollectedKg) * 100).toFixed(1)
        : '0.0';

    const labelX = safeX + safeW + 8;
    const textAnchor = 'start';

    return (
      <g key={`sankey-node-${index}`}>
        <rect
          x={safeX}
          y={safeY}
          width={safeW}
          height={safeHeight}
          rx={4}
          fill={nodeItem?.color || '#6366f1'}
          fillOpacity={0.92}
          stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(24,24,27,0.18)'}
          strokeWidth={1}
        />
        <text
          x={labelX}
          y={safeY + safeHeight / 2 - 4}
          textAnchor={textAnchor}
          fill={isDark ? '#f4f4f5' : '#18181b'}
          fontSize={11}
          fontWeight={600}
        >
          {nodeItem?.name}
        </text>
        <text
          x={labelX}
          y={safeY + safeHeight / 2 + 10}
          textAnchor={textAnchor}
          fill={isDark ? '#a1a1aa' : '#52525b'}
          fontSize={10}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {`${(valKg / 1000).toFixed(1)} t (${pct} %)`}
        </text>
      </g>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderSankeyLink = (props: any) => {
    const {
      sourceX,
      targetX,
      sourceY,
      targetY,
      sourceControlX,
      targetControlX,
      linkWidth,
      index,
      payload,
    } = props;

    if (
      !Number.isFinite(Number(sourceX)) ||
      !Number.isFinite(Number(targetX)) ||
      !Number.isFinite(Number(sourceY)) ||
      !Number.isFinite(Number(targetY)) ||
      !Number.isFinite(Number(sourceControlX)) ||
      !Number.isFinite(Number(targetControlX))
    ) {
      return <g />;
    }

    const sourceColor = payload?.source?.color || '#6366f1';
    const targetColor = payload?.target?.color || '#14b8a6';
    const isLossLink = payload?.target?.name?.toLowerCase().includes('pertes');
    const strokeColor = isLossLink ? targetColor : sourceColor;
    const isHovered = hoveredLinkIndex === index;

    return (
      <path
        key={`sankey-link-${index}`}
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={strokeColor}
        strokeWidth={Math.max(2, Number(linkWidth) || 2)}
        strokeOpacity={isHovered ? 0.55 : isLossLink ? 0.42 : 0.25}
        onMouseEnter={() => setHoveredLinkIndex(index)}
        onMouseLeave={() => setHoveredLinkIndex(null)}
        style={{ transition: 'stroke-opacity 150ms ease' }}
      />
    );
  };

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Diagramme Sankey — Flux de Transformation du Paddy au Riz Blanc</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Bilan matière complet : collecte saisonnière, stockage, pertes techniques de conservation, usinage et production finale de riz.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex flex-wrap items-center gap-1.5 no-print">
          {(
            [
              { id: 'year1', label: 'Année 1' },
              { id: 'hauteSaison', label: 'Haute Saison' },
              { id: 'basseSaison', label: 'Basse Saison' },
              { id: 'threeYears', label: 'Cumul 3 Ans' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScope(item.id)}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                scope === item.id
                  ? 'border-indigo-500/45 bg-indigo-600 text-white'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mass Balance KPI Strip + Technical Storage Loss Calibration */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Paddy collecté brut</div>
          <div className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-white mt-0.5">
            {formatKg(flowMetrics.totalCollectedKg)}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.05]">
          <div className="text-[11px] text-rose-700 dark:text-rose-300">Pertes techniques stockage</div>
          <div className="text-sm font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400 mt-0.5">
            −{formatKg(flowMetrics.storageLossKg)} ({formatPercent(flowMetrics.combinedStorageLossRate, 1)})
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Paddy net usiné</div>
          <div className="text-sm font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-400 mt-0.5">
            {formatKg(flowMetrics.totalMilledPaddyKg)}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06]">
          <div className="text-[11px] text-teal-800 dark:text-teal-300">Production finale riz</div>
          <div className="text-sm font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-0.5">
            {formatKg(flowMetrics.finalRiceKg)}
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
            <span>Freinte séchage/tri</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {technicalHandlingLossPct.toFixed(1)} %
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={technicalHandlingLossPct}
            onChange={(e) => setTechnicalHandlingLossPct(Number(e.target.value))}
            aria-label="Freinte technique séchage et nettoyage"
            className="w-full accent-rose-500"
          />
        </div>
      </div>

      {/* Recharts Sankey Diagram */}
      <div className="w-full overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0D0C18] p-2">
        <div className="h-[340px] sm:h-[370px] min-w-[640px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={14}
              nodePadding={34}
              linkCurvature={0.5}
              margin={{ top: 20, right: 195, bottom: 20, left: 16 }}
              node={renderSankeyNode}
              link={renderSankeyLink}
            >
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0]?.payload as {
                  source?: { name?: string };
                  target?: { name?: string };
                  name?: string;
                  value?: number;
                };
                const val = Number(payload[0]?.value ?? item?.value ?? 0);
                const pct =
                  flowMetrics.totalCollectedKg > 0
                    ? ((val / flowMetrics.totalCollectedKg) * 100).toFixed(1)
                    : '0.0';
                const label =
                  item?.source?.name && item?.target?.name
                    ? `${item.source.name} → ${item.target.name}`
                    : item?.name || 'Flux matière';

                return (
                  <div className="rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141323] px-3 py-2 shadow-lg text-xs">
                    <div className="font-semibold text-zinc-900 dark:text-white">{label}</div>
                    <div className="mt-1 font-mono tabular-nums text-teal-700 dark:text-teal-300 font-bold">
                      {formatKg(val)} ({(val / 1000).toFixed(2)} t)
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Soit {pct} % du volume brut collecté
                    </div>
                  </div>
                );
              }}
            />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanatory Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
          <span>
            Rendement global net (Riz blanc / Paddy collecté brut) :{' '}
            <strong className="font-mono text-zinc-900 dark:text-zinc-100">
              {formatPercent(flowMetrics.effectiveYieldRatio, 1)}
            </strong>{' '}
            (inclut {formatPercent(storageLossRate, 1)} de perte post-récolte du module Stockage +{' '}
            {technicalHandlingLossPct.toFixed(1)} % de freinte de séchage/nettoyage).
          </span>
        </span>
        <span className="font-mono">
          Co-produits valorisables : {formatKg(flowMetrics.byproductsKg)}
        </span>
      </div>
    </section>
  );
};
