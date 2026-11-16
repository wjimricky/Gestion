import React, { useMemo, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  computeTriSensitivityHeatmap,
  HeatmapAmplitudeMode,
  HeatmapSeasonScope,
  TriHeatmapCell,
  TriRiskTier,
} from '../../utils/triSensitivityHeatmap';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { SelectMenu } from './SelectMenu';
import {
  AlertTriangle,
  Flame,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

const RISK_TIER_META: Record<
  TriRiskTier,
  {
    label: string;
    cellClasses: string;
    badgeClasses: string;
  }
> = {
  critique: {
    label: 'Risque majeur',
    cellClasses:
      'bg-rose-600/25 dark:bg-rose-950/80 text-rose-950 dark:text-rose-200 border border-rose-500/50',
    badgeClasses:
      'bg-rose-600/15 text-rose-800 dark:text-rose-300 border border-rose-500/35',
  },
  vigilance: {
    label: 'Zone fragile',
    cellClasses:
      'bg-amber-500/25 dark:bg-amber-950/65 text-amber-950 dark:text-amber-200 border border-amber-500/45',
    badgeClasses:
      'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/35',
  },
  modere: {
    label: 'Rentable',
    cellClasses:
      'bg-emerald-500/18 dark:bg-emerald-950/45 text-emerald-950 dark:text-emerald-200 border border-emerald-500/30',
    badgeClasses:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
  },
  robuste: {
    label: 'Optimal',
    cellClasses:
      'bg-emerald-600/32 dark:bg-emerald-800/60 text-emerald-950 dark:text-emerald-100 border border-emerald-600/45',
    badgeClasses:
      'bg-emerald-600/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40',
  },
};

function formatDeltaPct(val: number): string {
  const pct = Math.round(val * 100);
  if (pct > 0) return `+${pct} %`;
  if (pct === 0) return '0 %';
  return `${pct} %`;
}

export const TriSensitivityHeatmap: React.FC = () => {
  const { assumptions, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [amplitude, setAmplitude] = useState<HeatmapAmplitudeMode>('standard');
  const [scope, setScope] = useState<HeatmapSeasonScope>('both');
  const [selectedCoords, setSelectedCoords] = useState<{
    paddyDelta: number;
    transportDelta: number;
  }>({ paddyDelta: 0, transportDelta: 0 });
  const [hoveredCell, setHoveredCell] = useState<TriHeatmapCell | null>(null);

  const heatmap = useMemo(
    () => computeTriSensitivityHeatmap(assumptions, amplitude, scope),
    [assumptions, amplitude, scope]
  );

  const selectedCell = useMemo(() => {
    for (const row of heatmap.cells) {
      for (const cell of row) {
        if (
          Math.abs(cell.paddyDelta - selectedCoords.paddyDelta) < 1e-6 &&
          Math.abs(cell.transportDelta - selectedCoords.transportDelta) < 1e-6
        ) {
          return cell;
        }
      }
    }
    // Fallback to base cell (0,0) or center cell
    return (
      heatmap.cells.flat().find((c) => c.isBase) ||
      heatmap.cells[Math.floor(heatmap.cells.length / 2)][
        Math.floor(heatmap.transportDeltas.length / 2)
      ]
    );
  }, [heatmap, selectedCoords]);

  const inspectedCell = hoveredCell || selectedCell;
  const criticalPct =
    heatmap.totalCells > 0
      ? Math.round((heatmap.criticalCount / heatmap.totalCells) * 100)
      : 0;
  const irrDeltaVsBase = inspectedCell.irrValue - heatmap.baseIrr;
  const inspectedMeta = RISK_TIER_META[inspectedCell.riskTier];

  return (
    <div className="space-y-5">
      {/* Controls & Risk Summary Strip */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>Matrice de Sensibilité TRI — Prix du Paddy × Coût du Transport</span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Chaque cellule recalcule le modèle complet (résultat, BFR I₀ et projections 3 ans) pour mesurer le <strong>TRI exact (%)</strong> et repérer les zones de risque majeur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Amplitude :</span>
              <SelectMenu
                id="heatmap-amplitude-select"
                size="sm"
                ariaLabel="Amplitude de variation"
                value={amplitude}
                onChange={(val) => {
                  setAmplitude(val as HeatmapAmplitudeMode);
                  setSelectedCoords({ paddyDelta: 0, transportDelta: 0 });
                }}
                options={[
                  { value: 'standard', label: 'Standard (Paddy -20/+40% · Transp. -30/+120%)' },
                  { value: 'stress', label: 'Stress Test (Paddy -10/+55% · Transp. 0/+300%)' },
                ]}
                className="w-[265px]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Saison :</span>
              <SelectMenu
                id="heatmap-scope-select"
                size="sm"
                ariaLabel="Périmètre saisonnier"
                value={scope}
                onChange={(val) => setScope(val as HeatmapSeasonScope)}
                align="right"
                options={[
                  { value: 'both', label: 'Année complète (HS + BS)' },
                  { value: 'hauteSaison', label: 'Haute Saison seule' },
                  { value: 'basseSaison', label: 'Basse Saison seule' },
                ]}
                className="w-[185px]"
              />
            </div>
          </div>
        </div>

        {/* 4 Summary Diagnostic Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="text-zinc-600 dark:text-zinc-400">TRI de référence (0 % / 0 %)</div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatPercent(heatmap.baseIrr, 1)}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Seuil r = {formatPercent(heatmap.discountRate, 0)} · Cible KPI {formatPercent(heatmap.minIrrThreshold, 0)}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="text-zinc-600 dark:text-zinc-400">Zones de risque majeur</div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                heatmap.criticalCount > 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {heatmap.criticalCount} / {heatmap.totalCells} ({criticalPct} %)
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {heatmap.vigilanceCount} cellule(s) en zone fragile
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="text-zinc-600 dark:text-zinc-400">Tolérance hausse paddy (base transp.)</div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {heatmap.maxSafePaddyDeltaAtBaseTransport !== null
                ? `Jusqu'à ${formatDeltaPct(heatmap.maxSafePaddyDeltaAtBaseTransport)}`
                : 'Seuil critique atteint'}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Base : {formatAriary(heatmap.basePaddyHS)} HS / {formatAriary(heatmap.basePaddyBS)} BS
            </div>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            <div className="text-zinc-600 dark:text-zinc-400">Amplitude TRI observée</div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatPercent(heatmap.minIrrFound, 1)} → {formatPercent(heatmap.maxIrrFound, 1)}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Transport base : {formatAriary(heatmap.baseTransportHS)} HS / {formatAriary(heatmap.baseTransportBS)} BS
            </div>
          </div>
        </div>

        {/* Thermal Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-600/35 border border-rose-500/60 inline-block" />
            <span>
              <strong>Risque majeur</strong> (TRI &lt; r ou VAN &lt; 0)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/30 border border-amber-500/60 inline-block" />
            <span>
              <strong>Zone fragile</strong> (TRI proche du seuil)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
            <span>
              <strong>Rentable</strong> (2×r ≤ TRI &lt; 100 %)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600/40 border border-emerald-500/60 inline-block" />
            <span>
              <strong>Optimal</strong> (TRI ≥ 100 %)
            </span>
          </span>
        </div>
      </section>

      {/* Main Grid: 7x7 Heatmap + Cell Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Interactive 7x7 Heatmap */}
        <section className="xl:col-span-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Δ Prix du Paddy (Lignes) × Δ Coût du Transport (Colonnes) → TRI (%)
            </h3>
            <button
              type="button"
              onClick={() => setSelectedCoords({ paddyDelta: 0, transportDelta: 0 })}
              className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Centrer sur 0 % / 0 %</span>
            </button>
          </div>

          <div className="overflow-x-auto p-3 sm:p-4">
            <table className="w-full text-xs border-separate border-spacing-1.5 font-mono tabular-nums">
              <thead>
                <tr>
                  <th className="p-2 text-left font-sans font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg whitespace-nowrap">
                    Δ Paddy ↓ / Δ Transp. →
                  </th>
                  {heatmap.transportDeltas.map((tDelta, cIdx) => {
                    const isBaseCol = Math.abs(tDelta) < 1e-6;
                    return (
                      <th
                        key={cIdx}
                        className={`p-2 text-center font-bold rounded-lg whitespace-nowrap ${
                          isBaseCol
                            ? 'bg-indigo-600/15 text-indigo-800 dark:text-indigo-200'
                            : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {formatDeltaPct(tDelta)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {heatmap.cells.map((rowCells, rIdx) => {
                  const paddyDelta = heatmap.paddyDeltas[rIdx];
                  const isBaseRow = Math.abs(paddyDelta) < 1e-6;
                  return (
                    <tr key={rIdx}>
                      <th
                        scope="row"
                        className={`p-2 text-left font-bold rounded-lg whitespace-nowrap ${
                          isBaseRow
                            ? 'bg-indigo-600/15 text-indigo-800 dark:text-indigo-200'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        <div>{formatDeltaPct(paddyDelta)}</div>
                        <div className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                          {Math.round(rowCells[0].paddyPriceHS)} / {Math.round(rowCells[0].paddyPriceBS)} Ar
                        </div>
                      </th>
                      {rowCells.map((cell, cIdx) => {
                        const isSelected =
                          Math.abs(cell.paddyDelta - selectedCell.paddyDelta) < 1e-6 &&
                          Math.abs(cell.transportDelta - selectedCell.transportDelta) < 1e-6;
                        const tierMeta = RISK_TIER_META[cell.riskTier];
                        return (
                          <td key={cIdx} className="p-0">
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredCell(cell)}
                              onMouseLeave={() => setHoveredCell(null)}
                              onFocus={() => setHoveredCell(cell)}
                              onBlur={() => setHoveredCell(null)}
                              onClick={() =>
                                setSelectedCoords({
                                  paddyDelta: cell.paddyDelta,
                                  transportDelta: cell.transportDelta,
                                })
                              }
                              aria-pressed={isSelected}
                              aria-label={`Paddy ${formatDeltaPct(cell.paddyDelta)}, Transport ${formatDeltaPct(cell.transportDelta)} : TRI ${cell.irrFinite ? formatPercent(cell.irrValue, 1) : 'Non calculable'}, ${tierMeta.label}`}
                              className={`w-full min-h-12 px-2 py-1.5 rounded-lg text-center transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-none ${
                                tierMeta.cellClasses
                              } ${
                                isSelected
                                  ? 'ring-2 ring-zinc-950 dark:ring-white font-bold'
                                  : cell.isBase
                                  ? 'ring-2 ring-indigo-500 font-bold'
                                  : ''
                              }`}
                            >
                              <div className="text-xs font-bold leading-tight">
                                {cell.irrFinite && cell.irrValue > -0.89
                                  ? formatPercent(cell.irrValue, 1)
                                  : 'Négatif'}
                              </div>
                              <div className="text-[9px] font-sans opacity-80 leading-tight mt-0.5 truncate">
                                {cell.riskTier === 'critique'
                                  ? 'Risque'
                                  : cell.isBase
                                  ? 'Base'
                                  : cell.riskTier === 'vigilance'
                                  ? 'Fragile'
                                  : 'OK'}
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Detailed Cell Inspector */}
        <aside
          aria-label="Inspecteur détaillé de la cellule sélectionnée"
          className="xl:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {hoveredCell ? 'Aperçu au survol' : 'Cellule verrouillée'}
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono tabular-nums">
                Paddy {formatDeltaPct(inspectedCell.paddyDelta)} · Transport{' '}
                {formatDeltaPct(inspectedCell.transportDelta)}
              </h3>
            </div>
            <span
              className={`px-2 py-1 rounded-md text-[11px] font-semibold shrink-0 ${inspectedMeta.badgeClasses}`}
            >
              {inspectedMeta.label}
            </span>
          </div>

          {/* Primary TRI result */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <span>TRI exact résultant</span>
              <span className="font-mono tabular-nums">
                {irrDeltaVsBase >= 0 ? '+' : ''}
                {(irrDeltaVsBase * 100).toFixed(1)} pts vs base
              </span>
            </div>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                inspectedCell.riskTier === 'critique'
                  ? 'text-rose-700 dark:text-rose-300'
                  : inspectedCell.riskTier === 'vigilance'
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {inspectedCell.irrFinite && inspectedCell.irrValue > -0.89
                ? formatPercent(inspectedCell.irrValue, 1)
                : 'TRI négatif / non solvable'}
            </div>
          </div>

          {/* Perturbed Cost Parameters */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Prix paddy HS / BS</span>
              <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {formatAriary(inspectedCell.paddyPriceHS)} /{' '}
                {formatAriary(inspectedCell.paddyPriceBS)}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Transport / rot. HS / BS</span>
              <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {formatAriary(inspectedCell.transportCostHS, { inMillions: inM })} /{' '}
                {formatAriary(inspectedCell.transportCostBS, { inMillions: inM })}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">VAN (3 ans à r)</span>
              <span
                className={`font-mono tabular-nums font-bold ${
                  inspectedCell.npvAr < 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {formatAriary(inspectedCell.npvAr, { inMillions: true })}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Bénéfice net Année 1</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  inspectedCell.year1NetAfterTaxAr < 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {formatAriary(inspectedCell.year1NetAfterTaxAr, { inMillions: inM })}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Fonds à lever (I₀)</span>
              <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {formatAriary(inspectedCell.fundsToRaiseAr, { inMillions: true })}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Payback saisonnier</span>
              <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {inspectedCell.isRecoveredWithin36Months
                  ? formatMonths(inspectedCell.paybackMonths)
                  : '> 36 mois'}
              </span>
            </div>
          </div>

          {/* Risk Interpretation Box */}
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              inspectedCell.riskTier === 'critique'
                ? 'border-rose-500/40 bg-rose-500/[0.08] text-rose-900 dark:text-rose-200'
                : inspectedCell.riskTier === 'vigilance'
                ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-900 dark:text-amber-200'
                : 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {inspectedCell.riskTier === 'critique' ? (
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : inspectedCell.riskTier === 'vigilance' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>Diagnostic de sensibilité</span>
            </div>
            <p className="leading-relaxed">
              {inspectedCell.riskTier === 'critique'
                ? `Zone de risque majeur : le TRI passe sous le coût du capital (${formatPercent(heatmap.discountRate, 0)}). Sécurisez des contrats d'achat paddy plafonnés ou optimisez le taux de remplissage des camions.`
                : inspectedCell.riskTier === 'vigilance'
                ? `Marge de manœuvre réduite : la rentabilité reste positive mais vulnérable à une hausse combinée du carburant et du paddy en période de soudure.`
                : `Combinaison robuste : le projet absorbe confortablement cette variation conjointe du paddy et du transport tout en préservant un TRI supérieur au seuil exigé.`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
