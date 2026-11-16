import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layers, PackageCheck } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { Tooltip } from '../ui/Tooltip';

interface BagValueSliceRow {
  key: 'hs' | 'bs' | 'avg';
  label: string;
  bagPriceAr: number;
  paddyAr: number;
  logisticsAr: number;
  transformationAr: number;
  fixedChargesAr: number;
  taxAr: number;
  netMarginAr: number;
  isLoss: boolean;
}

const VALUE_LEVERS = [
  { key: 'paddyAr', label: 'Coût du paddy', color: '#6366f1', dotClass: 'bg-indigo-500' },
  { key: 'logisticsAr', label: 'Frais logistiques', color: '#f59e0b', dotClass: 'bg-amber-500' },
  {
    key: 'transformationAr',
    label: 'Transformation & ensachage',
    color: '#0ea5e9',
    dotClass: 'bg-sky-500',
  },
  {
    key: 'fixedChargesAr',
    label: 'Structure & charges fixes',
    color: '#8b5cf6',
    dotClass: 'bg-violet-500',
  },
  { key: 'taxAr', label: 'Taxes (IR)', color: '#f43f5e', dotClass: 'bg-rose-500' },
  { key: 'netMarginAr', label: 'Marge nette', color: '#14b8a6', dotClass: 'bg-teal-500' },
] as const;

export const BagValueBreakdownChart: React.FC = () => {
  const { assumptions, model } = useFinancial();
  const [bagCapacityKg, setBagCapacityKg] = useState<number>(
    assumptions.selectedBagCapacityKg || 60
  );
  const [displayMode, setDisplayMode] = useState<'ariary' | 'percent'>('ariary');

  const activeBagOption = useMemo(
    () =>
      assumptions.bagOptions.find((b) => b.capacityKg === bagCapacityKg) ||
      assumptions.bagOptions[0] || { id: 'default', capacityKg: 60, unitPriceAr: 1700 },
    [assumptions.bagOptions, bagCapacityKg]
  );

  const breakdownRows = useMemo((): BagValueSliceRow[] => {
    const buildSeasonRow = (
      key: 'hs' | 'bs',
      label: string
    ): BagValueSliceRow => {
      const seasonAssump =
        key === 'hs' ? assumptions.hauteSaison : assumptions.basseSaison;
      const seasonResult =
        key === 'hs' ? model.hauteSaison : model.basseSaison;

      const cap = Math.max(1, activeBagOption.capacityKg);
      const yieldRatio = Math.max(0.1, Math.min(1, seasonAssump.yieldPaddyToRice));
      const paddyPerBag = cap / yieldRatio;
      const bagsPerRotation = Math.max(1e-6, seasonResult.riceKgPerRotation / cap);

      const getKgCost = (id: string) => {
        const found = assumptions.costsPerKgPaddy.find((c) => c.id === id);
        if (!found) return 0;
        return key === 'hs' ? found.costHS : found.costBS;
      };

      const paddyCostUnit = getKgCost('cost-paddy');
      const dockerCostUnit = getKgCost('cost-docker');
      const otherKgCostsUnit = assumptions.costsPerKgPaddy
        .filter((c) => c.id !== 'cost-paddy' && c.id !== 'cost-docker')
        .reduce((s, c) => s + (key === 'hs' ? c.costHS : c.costBS), 0);

      const fuelRotCost = assumptions.costsPerRotation
        .filter((c) => c.id === 'rot-carburant')
        .reduce((s, c) => s + (key === 'hs' ? c.costHS : c.costBS), 0);

      const otherRotCost = assumptions.costsPerRotation
        .filter((c) => c.id !== 'rot-carburant')
        .reduce((s, c) => s + (key === 'hs' ? c.costHS : c.costBS), 0);

      const paddyAr = paddyPerBag * paddyCostUnit;
      const logisticsAr = paddyPerBag * dockerCostUnit + fuelRotCost / bagsPerRotation;
      const transformationAr =
        paddyPerBag * otherKgCostsUnit +
        activeBagOption.unitPriceAr +
        otherRotCost / bagsPerRotation;

      const bagsInSeason = Math.max(1e-6, seasonResult.totalRiceKg / cap);
      const fixedChargesAr = seasonResult.seasonFixedChargesAr / bagsInSeason;

      // Byproduct credit offsets net operating requirement if byproductPrice > 0
      const byproductCreditPerBag =
        (seasonResult.totalByproductsKg * seasonAssump.byproductSellingPriceArPerKg) /
        bagsInSeason;

      const bagPriceAr = cap * seasonAssump.riceSellingPriceArPerKg;
      const preTaxProfit =
        bagPriceAr +
        byproductCreditPerBag -
        (paddyAr + logisticsAr + transformationAr + fixedChargesAr);

      const effectiveTaxRate =
        model.year1.netResultBeforeTaxAr > 0
          ? model.year1.corporateTaxAr / model.year1.netResultBeforeTaxAr
          : 0;
      const taxAr = preTaxProfit > 0 ? preTaxProfit * effectiveTaxRate : 0;
      const netMarginAr = preTaxProfit - taxAr;

      return {
        key,
        label,
        bagPriceAr,
        paddyAr,
        logisticsAr,
        transformationAr,
        fixedChargesAr,
        taxAr,
        netMarginAr,
        isLoss: netMarginAr < 0,
      };
    };

    const hsRow = buildSeasonRow('hs', 'Haute Saison');
    const bsRow = buildSeasonRow('bs', 'Basse Saison');

    const hsWeight = model.hauteSaison.totalRiceKg;
    const bsWeight = model.basseSaison.totalRiceKg;
    const totalWeight = Math.max(1, hsWeight + bsWeight);

    const wAvg = (a: number, b: number) => (a * hsWeight + b * bsWeight) / totalWeight;
    const avgNet = wAvg(hsRow.netMarginAr, bsRow.netMarginAr);

    const avgRow: BagValueSliceRow = {
      key: 'avg',
      label: 'Moyenne Année 1',
      bagPriceAr: wAvg(hsRow.bagPriceAr, bsRow.bagPriceAr),
      paddyAr: wAvg(hsRow.paddyAr, bsRow.paddyAr),
      logisticsAr: wAvg(hsRow.logisticsAr, bsRow.logisticsAr),
      transformationAr: wAvg(hsRow.transformationAr, bsRow.transformationAr),
      fixedChargesAr: wAvg(hsRow.fixedChargesAr, bsRow.fixedChargesAr),
      taxAr: wAvg(hsRow.taxAr, bsRow.taxAr),
      netMarginAr: avgNet,
      isLoss: avgNet < 0,
    };

    return [hsRow, bsRow, avgRow];
  }, [assumptions, model, activeBagOption]);

  const chartData = useMemo(
    () =>
      breakdownRows.map((row) => {
        const denom = Math.max(1, row.bagPriceAr);
        const conv = (v: number) =>
          displayMode === 'percent'
            ? Number(((Math.max(0, v) / denom) * 100).toFixed(1))
            : Math.round(Math.max(0, v));

        return {
          label: row.label,
          paddyAr: conv(row.paddyAr),
          logisticsAr: conv(row.logisticsAr),
          transformationAr: conv(row.transformationAr),
          fixedChargesAr: conv(row.fixedChargesAr),
          taxAr: conv(row.taxAr),
          netMarginAr: conv(row.netMarginAr),
          rawPriceAr: row.bagPriceAr,
          rawNetMarginAr: row.netMarginAr,
        };
      }),
    [breakdownRows, displayMode]
  );

  const avgRow = breakdownRows[2];

  return (
    <section
      aria-label="Répartition de la valeur du sac de riz"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Répartition de la Valeur du Sac de Riz ({activeBagOption.capacityKg} kg)</span>
            <Tooltip
              align="left"
              label="Décomposition du prix final"
              content="Décompose le prix de vente final d’un sac de riz entre le coût d’achat du paddy, les frais logistiques (collecte & docker), la transformation/ensachage, la quote-part de charges fixes, l’IR et la marge nette finale."
            />
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Visualisez les leviers de profitabilité sur chaque sac vendu selon la saison (HS, BS et moyenne annuelle).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Bag capacity selector */}
          <div
            role="group"
            aria-label="Format de sac"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60"
          >
            {assumptions.bagOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBagCapacityKg(opt.capacityKg)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  activeBagOption.capacityKg === opt.capacityKg
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {opt.capacityKg} kg
              </button>
            ))}
          </div>

          {/* Ar vs % toggle */}
          <div
            role="group"
            aria-label="Unité d'affichage"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60"
          >
            <button
              type="button"
              onClick={() => setDisplayMode('ariary')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                displayMode === 'ariary'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Ar / sac
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('percent')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                displayMode === 'percent'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              % du prix
            </button>
          </div>
        </div>
      </div>

      {/* Custom HTML Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
        {VALUE_LEVERS.map((lever) => (
          <span key={lever.key} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-xs ${lever.dotClass}`} />
            <span>{lever.label}</span>
          </span>
        ))}
      </div>

      {/* Stacked Bar Chart + Decomposition Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        <div className="xl:col-span-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 6, right: 18, left: 10, bottom: 6 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" horizontal={false} />
              <XAxis
                type="number"
                domain={displayMode === 'percent' ? [0, 100] : [0, 'auto']}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) =>
                  displayMode === 'percent'
                    ? `${Number(v)}%`
                    : `${Math.round(Number(v) / 1000)}k`
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={108}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value, name) => {
                  const found = VALUE_LEVERS.find((l) => l.key === String(name));
                  const label = found ? found.label : String(name);
                  const num = Number(value ?? 0);
                  return [
                    displayMode === 'percent'
                      ? `${num.toFixed(1)} %`
                      : formatAriary(num),
                    label,
                  ];
                }}
              />
              {VALUE_LEVERS.map((lever) => (
                <Bar
                  key={lever.key}
                  dataKey={lever.key}
                  stackId="bagValue"
                  fill={lever.color}
                  barSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exact Value Breakdown Table */}
        <div className="xl:col-span-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">Composante / sac ({activeBagOption.capacityKg} kg)</th>
                <th className="py-2.5 px-3 text-right font-semibold">HS</th>
                <th className="py-2.5 px-3 text-right font-semibold">BS</th>
                <th className="py-2.5 px-3 text-right font-semibold">Moy. A1</th>
                <th className="py-2.5 px-3 text-right font-semibold">% Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {VALUE_LEVERS.map((lever) => {
                const hsVal = breakdownRows[0][lever.key];
                const bsVal = breakdownRows[1][lever.key];
                const avgVal = breakdownRows[2][lever.key];
                const share =
                  avgRow.bagPriceAr > 0 ? avgVal / avgRow.bagPriceAr : 0;
                const isNet = lever.key === 'netMarginAr';

                return (
                  <tr
                    key={lever.key}
                    className={
                      isNet
                        ? 'bg-teal-500/[0.06] font-semibold'
                        : 'hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]'
                    }
                  >
                    <td className="py-2 px-3 font-sans text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-xs shrink-0 ${lever.dotClass}`} />
                      <span>{lever.label}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(hsVal)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(bsVal)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-semibold ${
                        isNet
                          ? avgVal >= 0
                            ? 'text-teal-700 dark:text-teal-400'
                            : 'text-rose-700 dark:text-rose-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {formatAriary(avgVal)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {formatPercent(share, 1)}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-zinc-100/70 dark:bg-zinc-800/50 font-bold border-t border-zinc-200 dark:border-zinc-700">
                <td className="py-2.5 px-3 font-sans text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span>Prix de vente final du sac</span>
                </td>
                <td className="py-2.5 px-3 text-right text-zinc-900 dark:text-white">
                  {formatAriary(breakdownRows[0].bagPriceAr)}
                </td>
                <td className="py-2.5 px-3 text-right text-zinc-900 dark:text-white">
                  {formatAriary(breakdownRows[1].bagPriceAr)}
                </td>
                <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-300">
                  {formatAriary(avgRow.bagPriceAr)}
                </td>
                <td className="py-2.5 px-3 text-right text-zinc-900 dark:text-white">100,0 %</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
